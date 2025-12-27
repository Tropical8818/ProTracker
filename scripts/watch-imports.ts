#!/usr/bin/env ts-node

import chokidar from 'chokidar';
import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Track processed files to avoid re-importing
const processedFiles = new Set<string>();

async function importExcelFile(filePath: string, productId: string) {
    console.log(`📥 Importing ${path.basename(filePath)} for product ${productId}...`);

    try {
        // Read the Excel file
        const buffer = fs.readFileSync(filePath);
        const workbook = XLSX.read(buffer, { type: 'buffer' });

        // Find the main sheet
        const sheetName = workbook.SheetNames.find(n =>
            n.toLowerCase().includes('schedule') ||
            n.toLowerCase().includes('master') ||
            n.toLowerCase().includes('dashboard')
        ) || workbook.SheetNames[0];

        const sheet = workbook.Sheets[sheetName];

        // Read headers from row 2 (index 1)
        const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as unknown[][];

        if (rawData.length < 2) {
            console.error(`❌ File must have at least 2 rows`);
            return;
        }

        const headers = (rawData[1] as (string | null)[])
            .map(h => h ? String(h).trim() : '')
            .filter(h => h && h.length > 0 && !h.includes('null') && !h.toLowerCase().includes('unnamed'));

        if (!headers.includes('WO ID')) {
            console.error(`❌ Excel must have a "WO ID" column`);
            return;
        }

        // Parse data rows (starting from row 3, index 2)
        const dataRows = rawData.slice(2);
        let importedCount = 0;
        let skippedCount = 0;

        for (const row of dataRows) {
            const rowData: Record<string, string> = {};
            headers.forEach((header, index) => {
                const value = row[index];

                if (value == null || value === '') {
                    rowData[header] = '';
                    return;
                }

                // Check if value is a number that might be a date
                if (typeof value === 'number' && value > 1 && value < 100000) {
                    // Convert Excel serial date to JS Date
                    const excelEpoch = new Date(1899, 11, 30);
                    const jsDate = new Date(excelEpoch.getTime() + value * 86400000);

                    // Format as dd-MMM, HH:mm
                    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    const day = String(jsDate.getDate()).padStart(2, '0');
                    const month = months[jsDate.getMonth()];

                    const hours = (value % 1) * 24;
                    if (hours > 0) {
                        const hour = String(jsDate.getHours()).padStart(2, '0');
                        const minute = String(jsDate.getMinutes()).padStart(2, '0');
                        rowData[header] = `${day}-${month}, ${hour}:${minute}`;
                    } else {
                        rowData[header] = `${day}-${month}`;
                    }
                    return;
                }

                rowData[header] = String(value).trim();
            });

            const woId = rowData['WO ID'];
            if (!woId || woId.length === 0) continue;

            // Check if order already exists (skip-existing mode)
            const existing = await prisma.order.findUnique({
                where: {
                    productId_woId: {
                        productId,
                        woId
                    }
                }
            });

            if (existing) {
                skippedCount++;
            } else {
                // Create new order
                await prisma.order.create({
                    data: {
                        woId,
                        productId,
                        data: JSON.stringify(rowData)
                    }
                });
                importedCount++;
            }
        }

        console.log(`✅ Import complete: ${importedCount} new, ${skippedCount} skipped`);
    } catch (error) {
        console.error(`❌ Import failed:`, error);
    }
}

async function startWatching() {
    console.log('🔍 Starting file watcher service...');

    // Fetch all products with watch folders
    const products = await prisma.product.findMany({
        where: {
            watchFolder: {
                not: null
            }
        }
    });

    if (products.length === 0) {
        console.log('⚠️  No products configured for auto-import. Configure watch folders in Settings.');
        // Check every 30 seconds for new products
        setTimeout(startWatching, 30000);
        return;
    }

    const watchPaths: string[] = [];
    const productMap = new Map<string, string>(); // folder -> productId

    for (const product of products) {
        if (product.watchFolder && fs.existsSync(product.watchFolder)) {
            watchPaths.push(product.watchFolder);
            productMap.set(product.watchFolder, product.id);
            console.log(`👁️  Watching: ${product.watchFolder} (${product.name})`);
        } else if (product.watchFolder) {
            console.warn(`⚠️  Folder does not exist: ${product.watchFolder}`);
        }
    }

    if (watchPaths.length === 0) {
        console.log('⚠️  No valid watch folders found. Retrying in 30 seconds...');
        setTimeout(startWatching, 30000);
        return;
    }

    // Watch for .xlsx files
    const watcher = chokidar.watch(watchPaths, {
        ignored: /(^|[\/\\])\../, // ignore dotfiles
        persistent: true,
        ignoreInitial: false,
        awaitWriteFinish: {
            stabilityThreshold: 2000,
            pollInterval: 100
        }
    });

    watcher.on('add', async (filePath) => {
        if (!filePath.match(/\.xlsx?$/i)) return;
        if (processedFiles.has(filePath)) return;

        // Find which folder this file belongs to
        const folder = watchPaths.find(p => filePath.startsWith(p));
        if (!folder) return;

        const productId = productMap.get(folder);
        if (!productId) return;

        processedFiles.add(filePath);
        await importExcelFile(filePath, productId);
    });

    watcher.on('error', error => console.error(`❌ Watcher error:`, error));

    console.log('✅ File watcher service started successfully');
}

// Start watching
startWatching().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
