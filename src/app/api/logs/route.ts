import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '50');
        const productId = searchParams.get('productId');

        // Base query
        const where: Record<string, unknown> = {};

        // Filter by product if specified (through order relation)
        if (productId) {
            where.order = {
                productId: productId
            };
        }

        const dbLogs = await prisma.operationLog.findMany({
            where,
            orderBy: { timestamp: 'desc' },
            take: limit,
            include: {
                user: {
                    select: { username: true }
                },
                order: {
                    select: {
                        woId: true,
                        product: {
                            select: { name: true, id: true }
                        }
                    }
                }
            }
        });

        // Transform to expected format
        const logs = dbLogs.map(log => {
            const details = log.details ? JSON.parse(log.details) : {};
            const snapshot = log.snapshot ? JSON.parse(log.snapshot) : {};

            return {
                id: log.id,
                timestamp: log.timestamp.toISOString(),
                productId: log.order?.product?.id || snapshot.productId || '',
                productName: log.order?.product?.name || snapshot.productName || 'Unknown',
                woId: log.order?.woId || snapshot.woId || '',
                step: details.step || '',
                action: log.action,
                previousValue: details.previousValue || '',
                newValue: details.newValue || '',
                operatorId: log.user?.username || 'System'
            };
        });

        return NextResponse.json({ logs });
    } catch (error) {
        console.error('Logs API Error:', error);
        const message = error instanceof Error ? error.message : 'Failed to fetch logs';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
