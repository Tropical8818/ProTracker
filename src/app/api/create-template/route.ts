'use server';

import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
    const session = await getSession();
    if (!session || (session.role !== 'admin' && session.role !== 'supervisor')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { productId, outputPath } = body;

        if (!productId) {
            return NextResponse.json({ error: 'productId is required' }, { status: 400 });
        }

        // Query product from Prisma database (instead of config file)
        const dbProduct = await prisma.product.findUnique({
            where: { id: productId }
        });

        if (!dbProduct) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 });
        }

        // Parse the JSON config stored in the product record
        const productConfig = JSON.parse(dbProduct.config);

        // Build column headers: Title row (empty) + Headers row
        const detailColumns = productConfig.detailColumns || ['WO ID', 'PN', 'Description', 'WO DUE', 'Priority'];
        const stepColumns = productConfig.steps || [];
        const allColumns = [...detailColumns, ...stepColumns];

        if (allColumns.length === 0) {
            return NextResponse.json({ error: 'No columns defined for this product' }, { status: 400 });
        }

        // Create workbook with proper structure
        const wb = XLSX.utils.book_new();

        // Row 0: Title row (product name)
        // Row 1: Headers
        // Row 2+: Data rows (empty for template)
        const wsData = [
            [dbProduct.name + ' - Production Schedule'], // Title row
            allColumns, // Header row
            Array(allColumns.length).fill(''), // Empty data row (placeholder)
        ];

        const ws = XLSX.utils.aoa_to_sheet(wsData);

        // Set column widths for better readability
        const colWidths = allColumns.map(col => ({ wch: Math.max(col.length + 2, 12) }));
        ws['!cols'] = colWidths;

        // Add sheet to workbook
        XLSX.utils.book_append_sheet(wb, ws, 'Schedule');

        // Determine output path
        let finalPath = outputPath;
        if (!finalPath) {
            // Default to data directory with product name
            const dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'data');
            const safeName = dbProduct.name.replace(/[^a-zA-Z0-9]/g, '_');
            finalPath = path.join(dataDir, `${safeName}_template.xlsx`);
        }

        // Ensure directory exists
        const dir = path.dirname(finalPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        // Write Excel file
        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        fs.writeFileSync(finalPath, buffer);

        // Update product config in Prisma database with the new excelPath
        const updatedConfig = { ...productConfig, excelPath: finalPath };
        await prisma.product.update({
            where: { id: productId },
            data: { config: JSON.stringify(updatedConfig) }
        });

        return NextResponse.json({
            success: true,
            path: finalPath,
            columns: allColumns.length,
            message: `Excel template created with ${detailColumns.length} detail columns and ${stepColumns.length} step columns`
        });
    } catch (error) {
        console.error('Error creating Excel template:', error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Failed to create Excel template'
        }, { status: 500 });
    }
}
