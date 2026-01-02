import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';
import { normalizeHeaders, getDefaultMappings, validateRequiredColumns, type ColumnMappings } from '@/lib/columnMapping';
import { validateOrderData, getDefaultValidationRules, type ValidationRules, type ValidationError } from '@/lib/validation';

export async function POST(request: NextRequest) {
    const session = await getSession();
    if (!session || (session.role !== 'admin' && session.role !== 'supervisor')) {
        return NextResponse.json({ error: 'Admin or Supervisor access required' }, { status: 403 });
    }

    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const productId = formData.get('productId') as string;

        if (!file || !productId) {
            return NextResponse.json({ error: 'File and product ID required' }, { status: 400 });
        }

        // Fetch product configuration (optional)
        const product = await prisma.product.findUnique({
            where: { id: productId }
        });

        // Use product config if available, otherwise defaults
        let columnMappings: ColumnMappings = getDefaultMappings();
        let validationRules: ValidationRules = getDefaultValidationRules();

        if (product) {
            try {
                const config = JSON.parse(product.config);
                if (config.columnMappings) columnMappings = config.columnMappings;
                if (config.validationRules) validationRules = config.validationRules;
            } catch (e) {
                console.warn('Failed to parse product config', e);
            }
        }

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

        // Validate against Product Config (detailColumns + steps)
        let missingColumns: string[] = [];
        if (product) {
            try {
                const config = JSON.parse(product.config);
                const expectedColumns = [
                    ...(config.detailColumns || []),
                    ...(config.steps || [])
                ];

                // Check if all expected columns are present in headers
                // Case-insensitive check handled by normalizeHeaders? 
                // No, headers are normalized to what was found. 
                // We need to check if 'expected' exists in 'headers'.
                // Ideally, we check normalized forms.

                missingColumns = expectedColumns.filter(col => {
                    // Check strict or loose? Loose (case-insensitive) is safer for user friendliness
                    const normCol = String(col).toLowerCase().trim();
                    return !headers.some(h => String(h).toLowerCase().trim() === normCol);
                });

            } catch (e) {
                console.warn('Config validation failed', e);
            }
        }

        // Parse data rows (starting from row 3, index 2) - PREVIEW ONLY, NO SAVING
        const dataRows = rawData.slice(2);
        const validationErrors: ValidationError[] = [];
        const preview: Record<string, string>[] = [];
        let newOrdersCount = 0;
        let existingOrdersCount = 0;
        let validRowsCount = 0;

        for (let rowIndex = 0; rowIndex < dataRows.length; rowIndex++) {
            const row = dataRows[rowIndex];
            const rowNumber = rowIndex + 3;
            const rowData: Record<string, string> = {};

            headers.forEach((header, index) => {
                const value = row[index];

                if (value == null || value === '') {
                    rowData[header] = '';
                    return;
                }

                // Check if value is a number that might be a date
                if (typeof value === 'number' && value > 1 && value < 100000) {
                    const excelEpoch = new Date(1899, 11, 30);
                    const jsDate = new Date(excelEpoch.getTime() + value * 86400000);

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

            // Validate row data
            const rowErrors = validateOrderData(rowData, validationRules, rowNumber);
            if (rowErrors.length > 0) {
                validationErrors.push(...rowErrors);
                continue;
            }

            validRowsCount++;

            // Check if order exists
            const existing = await prisma.order.findUnique({
                where: {
                    productId_woId: {
                        productId,
                        woId
                    }
                }
            });

            if (existing) {
                existingOrdersCount++;
            } else {
                newOrdersCount++;
            }

            // Add to preview (first 10 rows only)
            if (preview.length < 10) {
                preview.push({ ...rowData, _rowNumber: String(rowNumber) });
            }
        }

        return NextResponse.json({
            success: true,
            totalRows: dataRows.length,
            validRows: validRowsCount,
            invalidRows: validationErrors.length,
            newOrders: newOrdersCount,
            existingOrders: existingOrdersCount,
            missingColumns, // Add this
            validationErrors: validationErrors.slice(0, 20), // First 20 errors
            preview,
            headers,
            detectedHeaders,
            headerMapping,
            sheetName
        });
    } catch (error) {
        console.error('Preview error:', error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Failed to preview Excel'
        }, { status: 500 });
    }
}
