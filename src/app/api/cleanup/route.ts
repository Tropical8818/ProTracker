
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { format } from 'date-fns';

export async function POST() {
    const session = await getSession();
    if (!session || (session.role !== 'admin' && session.role !== 'supervisor')) {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    try {
        // Retention policy: 3 months
        const cutOffDate = new Date();
        cutOffDate.setMonth(cutOffDate.getMonth() - 3);

        // Delete old orders (will cascade delete related comments and logs)
        const deletedOrders = await prisma.order.deleteMany({
            where: {
                createdAt: {
                    lt: cutOffDate
                }
            }
        });

        // Clean up orphan operation logs (no associated order)
        const deletedOrphanLogs = await prisma.operationLog.deleteMany({
            where: {
                timestamp: { lt: cutOffDate },
                orderId: null
            }
        });

        return NextResponse.json({
            success: true,
            message: `Successfully deleted data older than ${format(cutOffDate, 'yyyy-MM-dd')}.`,
            details: {
                deletedOrders: deletedOrders.count,
                deletedOrphanLogs: deletedOrphanLogs.count,
                retentionPolicy: '3 months',
                cutOffDate: format(cutOffDate, 'yyyy-MM-dd')
            }
        });

    } catch (error) {
        console.error('Cleanup error:', error);
        return NextResponse.json({ error: 'Failed to cleanup data' }, { status: 500 });
    }
}
