import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import * as fs from 'fs';
import * as path from 'path';

export async function POST(request: Request) {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { apiKey } = await request.json();

        if (!apiKey || !apiKey.startsWith('sk-')) {
            return NextResponse.json({ error: 'Invalid API key format' }, { status: 400 });
        }

        // Save API key to .env file
        const envPath = path.join(process.cwd(), '.env');
        let envContent = '';

        try {
            envContent = fs.readFileSync(envPath, 'utf-8');
        } catch {
            // .env doesn't exist, create it
            envContent = '';
        }

        // Update or add OPENAI_API_KEY
        const lines = envContent.split('\n');
        let found = false;
        const updatedLines = lines.map(line => {
            if (line.startsWith('OPENAI_API_KEY=')) {
                found = true;
                return `OPENAI_API_KEY="${apiKey}"`;
            }
            return line;
        });

        if (!found) {
            updatedLines.push(`OPENAI_API_KEY="${apiKey}"`);
        }

        fs.writeFileSync(envPath, updatedLines.join('\n'));

        // Also set in process.env for immediate use
        process.env.OPENAI_API_KEY = apiKey;

        return NextResponse.json({ success: true, message: 'API key saved successfully' });
    } catch (error) {
        console.error('AI Config Save Error:', error);
        const message = error instanceof Error ? error.message : 'Failed to save API key';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function GET() {
    const session = await getSession();
    if (!session || session.role !== 'admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Return masked API key status
    const hasKey = !!process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.includes('your-');
    const maskedKey = hasKey ? 'sk-....' + process.env.OPENAI_API_KEY?.slice(-4) : '';

    return NextResponse.json({
        configured: hasKey,
        maskedKey
    });
}
