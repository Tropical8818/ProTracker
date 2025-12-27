import * as XLSX from 'xlsx';
import * as fs from 'fs';
import { getConfig, getProductById, Product } from './config';

// Columns that are NOT process steps
const NON_STEP_COLUMNS = ['WO ID', 'PN', 'Description', 'Remarks', 'Type', 'QCP', 'WO DUE', 'Priority', ' Priority'];

export interface Order {
    id: string;
    'WO ID': string;
    'PN': string;
    'Description': string;
    'WO DUE': string;
    'Priority': string;
    [key: string]: string | undefined;
}

export interface StepUpdate {
    woId: string;
    step: string;
    status: string;
}

export interface ExcelData {
    orders: Order[];
    steps: string[];
    detailColumns?: string[];
}

// Read orders for a specific product (or active product if not specified)
export function readOrders(productId?: string): ExcelData {
    const config = getConfig();

    // Get product config
    let product: Product | null;
    if (productId) {
        product = getProductById(productId);
    } else {
        product = config.products.find(p => p.id === config.activeProductId) || config.products[0];
    }

    if (!product) {
        throw new Error('No product configured');
    }

    if (!product.excelPath) {
        throw new Error(`Excel file path not configured for product: ${product.name} `);
    }

    if (!fs.existsSync(product.excelPath)) {
        throw new Error(`Excel file not found: ${product.excelPath} `);
    }

    try {
        const buffer = fs.readFileSync(product.excelPath);
        const workbook = XLSX.read(buffer, { type: 'buffer' });

        const sheetName = workbook.SheetNames.find(n =>
            n.toLowerCase().includes('schedule') ||
            n.toLowerCase().includes('master') ||
            n.toLowerCase().includes('dashboard')
        ) || workbook.SheetNames[0];

        const sheet = workbook.Sheets[sheetName];

        // Read as array of arrays to handle row 0 as title, row 1 as headers
        const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as unknown[][];

        if (rawData.length < 2) {
            return { orders: [], steps: product.steps };
        }

        // Row 1 (index 1) contains headers
        const headers = (rawData[1] as (string | null)[]).map(h => h ? String(h).trim() : '');

        // Use product-configured steps if available, otherwise auto-detect
        let steps: string[];
        if (product.steps && product.steps.length > 0) {
            // Filter to only include steps that actually exist in the Excel headers
            steps = product.steps.filter(s => headers.includes(s));
        } else {
            // Auto-detect steps from headers
            steps = headers.filter(h =>
                h &&
                !NON_STEP_COLUMNS.includes(h) &&
                h.length > 0 &&
                !h.includes('null')
            );
        }

        // Get detailColumns from product config (or use defaults)
        const detailColumns = product.detailColumns && product.detailColumns.length > 0
            ? product.detailColumns.filter(c => headers.includes(c))
            : NON_STEP_COLUMNS.filter(c => headers.includes(c));

        // Map row data to objects (starting from row 2, index 2)
        const orders: Order[] = [];
        for (let i = 2; i < rawData.length; i++) {
            const row = rawData[i] as (string | number | null)[];
            if (!row || row.length === 0) continue;

            const woId = row[headers.indexOf('WO ID')] ?? '';
            if (!woId) continue; // Skip rows without WO ID

            const order: Order = {
                id: String(woId),
                'WO ID': String(woId),
                'PN': String(row[headers.indexOf('PN')] ?? ''),
                'Description': String(row[headers.indexOf('Description')] ?? ''),
                'WO DUE': formatExcelDate(row[headers.indexOf('WO DUE')]),
                'Priority': String(row[headers.indexOf(' Priority')] ?? row[headers.indexOf('Priority')] ?? ''),
            };

            // Add all detail columns from config
            detailColumns.forEach(col => {
                const colIdx = headers.indexOf(col);
                if (colIdx >= 0 && !order[col]) { // Only add if not already set
                    order[col] = formatCellValue(row[colIdx]);
                }
            });

            // Add all step columns
            steps.forEach(step => {
                const colIdx = headers.indexOf(step);
                if (colIdx >= 0) {
                    order[step] = formatCellValue(row[colIdx]);
                }
            });

            orders.push(order);
        }

        return { orders, steps, detailColumns };
    } catch (err) {
        throw new Error(`Failed to read Excel file: ${err instanceof Error ? err.message : 'Unknown error'} `);
    }
}

// Convert Excel serial date to readable string
function formatExcelDate(value: unknown): string {
    if (!value) return '';
    if (typeof value === 'number') {
        // Excel serial date
        const date = new Date((value - 25569) * 86400 * 1000);
        if (!isNaN(date.getTime())) {
            return date.toISOString().slice(0, 10);
        }
    }
    return String(value);
}

// Format cell value - handle dates and strings
function formatCellValue(value: unknown): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'number') {
        // Check if it looks like an Excel date (serial number > 40000)
        if (value > 40000 && value < 60000) {
            const date = new Date((value - 25569) * 86400 * 1000);
            if (!isNaN(date.getTime())) {
                return date.toISOString().slice(0, 16).replace('T', ' ');
            }
        }
        return String(value);
    }
    return String(value);
}

// Update order step for a specific product
export function updateOrderStep(woId: string, step: string, status: string, operatorId?: string, productId?: string): Order | null {
    const config = getConfig();

    // Get product config
    let product: Product | null;
    if (productId) {
        product = getProductById(productId);
    } else {
        product = config.products.find(p => p.id === config.activeProductId) || config.products[0];
    }

    if (!product) {
        throw new Error('No product configured');
    }

    if (!product.excelPath) {
        throw new Error(`Excel file path not configured for product: ${product.name} `);
    }

    const buffer = fs.readFileSync(product.excelPath);
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    const sheetName = workbook.SheetNames.find(n =>
        n.toLowerCase().includes('schedule') ||
        n.toLowerCase().includes('master')
    ) || workbook.SheetNames[0];

    const sheet = workbook.Sheets[sheetName];

    // Get headers from row 1 (index 1)
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
    const headers: { [key: string]: number } = {};
    for (let c = range.s.c; c <= range.e.c; c++) {
        const cell = sheet[XLSX.utils.encode_cell({ r: 1, c })]; // Row 1 for headers
        if (cell) {
            headers[String(cell.v).trim()] = c;
        }
    }

    // Find the row (starting from row 2, index 2)
    let targetRow = -1;
    const woIdCol = headers['WO ID'] ?? 0;
    for (let r = 2; r <= range.e.r; r++) {
        const cell = sheet[XLSX.utils.encode_cell({ r, c: woIdCol })];
        if (cell && String(cell.v) === woId) {
            targetRow = r;
            break;
        }
    }

    if (targetRow === -1) {
        throw new Error(`Order ${woId} not found`);
    }

    // Determine cell value
    let cellValue: string;
    if (status === 'Done') {
        const now = new Date();
        const formatted = now.toISOString().slice(0, 16).replace('T', ' ');
        cellValue = operatorId ? `${formatted} (ID: ${operatorId})` : formatted;
    } else if (status === 'Reset') {
        cellValue = '';
    } else {
        cellValue = status;
    }

    // Update the cell
    const stepCol = headers[step];
    if (stepCol === undefined) {
        throw new Error(`Step ${step} not found in headers`);
    }

    const cellRef = XLSX.utils.encode_cell({ r: targetRow, c: stepCol });
    sheet[cellRef] = { t: 's', v: cellValue };

    // Write back using fs.writeFileSync for Next.js compatibility
    const outBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    fs.writeFileSync(product.excelPath, outBuffer);

    // Return updated order
    const { orders } = readOrders(productId);
    return orders.find(o => o['WO ID'] === woId) || null;
}

export function updateOrderStepsBatch(updates: StepUpdate[], operatorId?: string, productId?: string): void {
    const config = getConfig();
    let product: Product | null;
    if (productId) {
        product = getProductById(productId);
    } else {
        product = config.products.find(p => p.id === config.activeProductId) || config.products[0];
    }

    if (!product || !product.excelPath) throw new Error('Product not configured');

    // Read workbook ONCE
    const buffer = fs.readFileSync(product.excelPath);
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames.find(n => n.toLowerCase().includes('schedule') || n.toLowerCase().includes('master')) || workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Parse headers
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
    const headers: { [key: string]: number } = {};
    for (let c = range.s.c; c <= range.e.c; c++) {
        const cell = sheet[XLSX.utils.encode_cell({ r: 1, c })];
        if (cell) headers[String(cell.v).trim()] = c;
    }

    // Map WO IDs to Rows
    const woIdCol = headers['WO ID'] ?? 0;
    const woRowMap: Record<string, number> = {};
    for (let r = 2; r <= range.e.r; r++) {
        const cell = sheet[XLSX.utils.encode_cell({ r, c: woIdCol })];
        if (cell) woRowMap[String(cell.v)] = r;
    }

    // Apply updates
    updates.forEach(update => {
        const r = woRowMap[update.woId];
        const c = headers[update.step];
        if (r !== undefined && c !== undefined) {
            let cellValue = update.status;
            if (update.status === 'Reset') {
                cellValue = '';
            }
            // Update cell
            const cellAddr = XLSX.utils.encode_cell({ r, c });
            sheet[cellAddr] = { v: cellValue, t: 's' };
        }
    });

    // Write back ONCE
    const outBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    fs.writeFileSync(product.excelPath, outBuffer);
}
