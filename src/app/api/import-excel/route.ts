import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { importFromBuffer } from '@/lib/import-service';

export async function POST(request: NextRequest) {
    const session = await getSession();
    if (!session || (session.role !== 'admin' && session.role !== 'supervisor')) {
        return NextResponse.json({ error: 'Admin or Supervisor access required' }, { status: 403 });
    }

    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const productId = formData.get('productId') as string;
        const mode = (formData.get('mode') as string) || 'update';

        if (!file || !productId) {
            return NextResponse.json({ error: 'File and product ID required' }, { status: 400 });
        }

        // Convert file to buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Use the import service
        const result = await importFromBuffer(buffer, {
            productId,
            mode: mode as 'update' | 'skip-existing'
        });

        if (!result.success) {
            return NextResponse.json({
                error: result.error,
                detectedHeaders: result.detectedHeaders,
                mappedHeaders: result.headerMapping
            }, { status: 400 });
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error('Excel import error:', error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Failed to import Excel'
        }, { status: 500 });
    }
}
