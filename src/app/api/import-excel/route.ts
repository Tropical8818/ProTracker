import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';
import { normalizeHeaders, getDefaultMappings, validateRequiredColumns, type ColumnMappings } from '@/lib/columnMapping';
import { validateOrderData, getDefaultValidationRules, type ValidationRules, type ValidationError } from '@/lib/validation';

export async function POST(request: NextRequest) {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const productId = formData.get('productId') as string;
        const mode = (formData.get('mode') as string) || 'update'; // 'update' or 'skip-existing'

        if (!file || !productId) {
            return NextResponse.json({ error: 'File and product ID required' }, { status: 400 });
        }

        // Fetch product configuration
        const product = await prisma.product.findUnique({
            where: { id: productId }
        });

        if (!product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 });
        }

        // Parse product config
        const config = JSON.parse(product.config);
        const columnMappings: ColumnMappings = config.columnMappings || getDefaultMappings();
        const validationRules: ValidationRules = config.validationRules || getDefaultValidationRules();

        // Read the Excel file
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
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
            return NextResponse.json({ error: 'Excel file must have at least 2 rows' }, { status: 400 });
        }

        const detectedHeaders = (rawData[1] as (string | null)[])
            .map(h => h ? String(h).trim() : '')
            .filter(h => h && h.length > 0 && !h.includes('null') && !h.toLowerCase().includes('unnamed'));

        // Apply column mapping
        const { normalized: headers, mapping: headerMapping } = normalizeHeaders(detectedHeaders, columnMappings);

        // Validate required columns
        const requiredCheck = validateRequiredColumns(headers, ['WO ID']);
        if (!requiredCheck.valid) {
            return NextResponse.json({
                error: `Missing required columns: ${requiredCheck.missing.join(', ')}`,
                detectedHeaders,
                mappedHeaders: headerMapping
            }, { status: 400 });
        }

        // Parse data rows (starting from row 3, index 2)
        const dataRows = rawData.slice(2);
        const importedOrders = [];
        const updatedOrders = [];
        const skippedOrders = [];
        const validationErrors: ValidationError[] = [];

        for (let rowIndex = 0; rowIndex < dataRows.length; rowIndex++) {
            const row = dataRows[rowIndex];
            const rowNumber = rowIndex + 3; // Excel row number (header is row 2)
            const rowData: Record<string, string> = {};
            headers.forEach((header, index) => {
                const value = row[index];

                if (value == null || value === '') {
                    rowData[header] = '';
                    return;
                }

                // Check if value is a number that might be a date (Excel stores dates as numbers)
                if (typeof value === 'number' && value > 1) {
                    // Excel dates: serial 1 = 1/1/1900, 45000 ≈ 2023
                    // Reasonable date range: 1 (1900) to 100000 (2173)
                    if (value > 1 && value < 100000) {
                        // Convert Excel serial date to JS Date
                        const excelEpoch = new Date(1899, 11, 30); // Excel's epoch
                        const jsDate = new Date(excelEpoch.getTime() + value * 86400000);

                        // Format as dd-MMM, HH:mm
                        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                        const day = String(jsDate.getDate()).padStart(2, '0');
                        const month = months[jsDate.getMonth()];

                        const hours = (value % 1) * 24;
                        if (hours > 0) {
                            // Has time component: dd-MMM, HH:mm
                            const hour = String(jsDate.getHours()).padStart(2, '0');
                            const minute = String(jsDate.getMinutes()).padStart(2, '0');
                            rowData[header] = `${day}-${month}, ${hour}:${minute}`;
                        } else {
                            // Date only: dd-MMM
                            rowData[header] = `${day}-${month}`;
                        }
                        return;
                    }
                }

                // Otherwise, just convert to string
                rowData[header] = String(value).trim();
            });

            const woId = rowData['WO ID'];
            if (!woId || woId.length === 0) continue; // Skip empty rows

            // Auto-set WO Rel timestamp if column exists and is empty (for both new and existing orders)
            const woRelKey = Object.keys(rowData).find(k =>
                k.toLowerCase() === 'wo rel' ||
                k.toLowerCase() === 'wo rel.' ||
                k.toLowerCase() === 'wo released' ||
                k.toLowerCase() === 'release date'
            );

            if (woRelKey && !rowData[woRelKey]) {
                const now = new Date();
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const day = String(now.getDate()).padStart(2, '0');
                const month = months[now.getMonth()];
                const hour = String(now.getHours()).padStart(2, '0');
                const minute = String(now.getMinutes()).padStart(2, '0');
                rowData[woRelKey] = `${day}-${month}, ${hour}:${minute}`;
            }

            // Validate row data
            const rowErrors = validateOrderData(rowData, validationRules, rowNumber);
            if (rowErrors.length > 0) {
                validationErrors.push(...rowErrors);
                // Skip this row if it has validation errors
                continue;
            }

            // NEW LOGIC: Separate detail columns from step columns
            // Detail columns are what we import from Excel
            const detailData: Record<string, string> = {};
            const steps: string[] = config.steps || [];
            const detailColumns: string[] = config.detailColumns || [];

            // Only keep columns that are in detailColumns OR are WO ID
            Object.keys(rowData).forEach(key => {
                if (key === 'WO ID' || detailColumns.includes(key) ||
                    key.toLowerCase().includes('customer') ||
                    key.toLowerCase().includes('qty') ||
                    key.toLowerCase().includes('ecd') ||
                    key.toLowerCase() === woRelKey?.toLowerCase()) {
                    detailData[key] = rowData[key];
                }
            });

            // Check if order already exists
            const existing = await prisma.order.findUnique({
                where: {
                    productId_woId: {
                        productId,
                        woId
                    }
                }
            });

            // Prepare final order data: details + steps
            const finalOrderData = { ...detailData };

            // Initialize all steps from product config
            steps.forEach((step, index) => {
                if (existing) {
                    // If order exists, preserve existing step data
                    const existingData = JSON.parse(existing.data);
                    finalOrderData[step] = existingData[step] || '';
                } else {
                    // For new orders, auto-set first step timestamp to mark arrival at the first station
                    if (index === 0) {
                        const now = new Date();
                        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                        const day = String(now.getDate()).padStart(2, '0');
                        const month = months[now.getMonth()];
                        const hour = String(now.getHours()).padStart(2, '0');
                        const minute = String(now.getMinutes()).padStart(2, '0');
                        finalOrderData[step] = `${day}-${month}, ${hour}:${minute}`;
                    } else {
                        finalOrderData[step] = '';
                    }
                }
            });

            if (existing) {
                if (mode === 'skip-existing') {
                    skippedOrders.push(woId);
                    continue;
                } else {
                    // Update: merge new details with existing step progress
                    await prisma.order.update({
                        where: { id: existing.id },
                        data: {
                            data: JSON.stringify(finalOrderData)
                        }
                    });
                    updatedOrders.push(woId);
                }
            } else {
                // Create new order with empty steps
                await prisma.order.create({
                    data: {
                        woId,
                        productId,
                        data: JSON.stringify(finalOrderData)
                    }
                });
                importedOrders.push(woId);
            }
        }


        return NextResponse.json({
            success: true,
            imported: importedOrders.length,
            updated: updatedOrders.length,
            skipped: skippedOrders.length,
            validationErrors: validationErrors.length,
            errors: validationErrors.slice(0, 10), // Return first 10 errors
            headers,
            detectedHeaders,
            headerMapping,
            sheetName,
            mode
        });
    } catch (error) {
        console.error('Excel import error:', error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Failed to import Excel'
        }, { status: 500 });
    }
}
