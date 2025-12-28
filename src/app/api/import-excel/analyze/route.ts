import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';
import { getAIClient } from '@/lib/ai/client';
import { getConfig } from '@/lib/config';

const AI_ANALYSIS_PROMPT = `You are an intelligent data analyst. Analyze Excel column headers and suggest mappings to a production tracking system.

The system uses these field types:
1. **WO ID** (required): Work Order ID (e.g., "WO-123", "123456", "Order Number")
2. **Detail Columns**: Descriptive fields like "Customer", "Quantity", "Product Name", "ECD Date"
3. **Step Columns**: Production process steps (e.g., "Cutting", "Assembly", "QC", "Shipping")

Given the headers, return a JSON object:
{
  "woIdColumn": "exact header name for WO ID",
  "detailColumns": ["header1", "header2"],
  "stepColumns": ["step1", "step2", "step3"],
  "confidence": 0.0-1.0,
  "notes": "any observations"
}

Be smart. Common patterns:
- WO ID often contains: "WO", "Order", "Job", "Work Order", "ID"
- Date-like columns or short status names are usually steps
- Longer descriptive headers are usually details`;

export async function POST(request: NextRequest) {
    const session = await getSession();
    if (!session || (session.role !== 'admin' && session.role !== 'supervisor')) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const productId = formData.get('productId') as string;

        if (!file) {
            return NextResponse.json({ error: 'File is required' }, { status: 400 });
        }

        // Read Excel
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const workbook = XLSX.read(buffer, { type: 'buffer' });

        const sheetName = workbook.SheetNames.find(n =>
            n.toLowerCase().includes('schedule') ||
            n.toLowerCase().includes('master') ||
            n.toLowerCase().includes('dashboard')
        ) || workbook.SheetNames[0];

        const sheet = workbook.Sheets[sheetName];
        const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as unknown[][];

        if (rawData.length < 2) {
            return NextResponse.json({ error: 'Excel must have at least 2 rows' }, { status: 400 });
        }

        // Extract headers (assume row 2 is headers)
        const headers = (rawData[1] as (string | null)[])
            .map(h => h ? String(h).trim() : '')
            .filter(h => h && h.length > 0 && !h.includes('null'));

        // Get existing product config (if any) for context
        let existingSteps: string[] = [];
        if (productId) {
            const product = await prisma.product.findUnique({ where: { id: productId } });
            if (product) {
                const config = JSON.parse(product.config);
                existingSteps = config.steps || [];
            }
        }

        // Call AI to analyze
        const config = getConfig();
        const aiClient = getAIClient(config.aiProvider || 'openai');

        const contextMessage = existingSteps.length > 0
            ? `\n\nExisting product steps for reference: ${existingSteps.join(', ')}`
            : '';

        const response = await aiClient.chat.completions.create({
            model: config.aiModel || 'gpt-4o-mini',
            messages: [
                { role: 'system', content: AI_ANALYSIS_PROMPT },
                {
                    role: 'user',
                    content: `Analyze these Excel headers:\n${JSON.stringify(headers, null, 2)}${contextMessage}\n\nReturn JSON mapping.`
                }
            ],
            response_format: { type: 'json_object' }
        });

        const aiResult = response.choices[0]?.message?.content;
        let mapping = { woIdColumn: null, detailColumns: [], stepColumns: [], confidence: 0, notes: '' };

        try {
            mapping = JSON.parse(aiResult || '{}');
        } catch {
            mapping.notes = 'AI response parsing failed. Manual mapping required.';
        }

        // Preview: Get first 5 data rows
        const previewRows = rawData.slice(2, 7).map(row => {
            const rowObj: Record<string, string> = {};
            headers.forEach((h, i) => {
                rowObj[h] = row[i] ? String(row[i]) : '';
            });
            return rowObj;
        });

        return NextResponse.json({
            success: true,
            sheetName,
            headers,
            aiMapping: mapping,
            preview: previewRows,
            totalRows: rawData.length - 2
        });
    } catch (error) {
        console.error('AI Analysis Error:', error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Analysis failed'
        }, { status: 500 });
    }
}
