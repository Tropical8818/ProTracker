import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

/**
 * GET /api/comments/stats?orderId=xxx&stepName=xxx
 * Get comment statistics for a specific step
 */
export async function GET(req: NextRequest) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(req.url);
        const orderId = searchParams.get('orderId');
        const stepName = searchParams.get('stepName');

        if (!orderId || !stepName) {
            return NextResponse.json({ error: 'orderId and stepName are required' }, { status: 400 });
        }

        // Try to get from cache first
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            select: { commentStats: true }
        });

        if (order?.commentStats) {
            try {
                const stats = JSON.parse(order.commentStats);
                const stepStats = stats[stepName] || { total: 0, unread: 0 };
                return NextResponse.json(stepStats);
            } catch (e) {
                console.error('Error parsing commentStats:', e);
            }
        }

        // Fallback to real-time calculation
        const comments = await prisma.comment.findMany({
            where: { orderId, stepName },
            select: { readBy: true }
        });

        const total = comments.length;
        const unread = comments.filter(c => {
            const readByList = c.readBy ? JSON.parse(c.readBy) : [];
            return !readByList.includes(session.userId);
        }).length;

        return NextResponse.json({ total, unread });

    } catch (error) {
        console.error('Get comment stats error:', error);
        return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
    }
}
