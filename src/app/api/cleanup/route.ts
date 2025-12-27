
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST() {
    const session = await getSession();
    if (!session || (session.role !== 'admin' && session.role !== 'supervisor')) {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    try {
        // Calculate date 2 years ago
        const twoYearsAgo = new Date();
        twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

        const result = await prisma.order.deleteMany({
            where: {
                createdAt: {
                    lt: twoYearsAgo
                }
            }
        });

        return NextResponse.json({
            success: true,
            message: `Successfully deleted ${result.count} old records.`,
            deletedCount: result.count
        });

    } catch (error) {
        console.error('Cleanup error:', error);
        return NextResponse.json({ error: 'Failed to cleanup data' }, { status: 500 });
    }
}
