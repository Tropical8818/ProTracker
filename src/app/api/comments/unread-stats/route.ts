import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

/**
 * GET /api/comments/unread-stats?orderId=xxx
 * Get personalized unread comment statistics for the current user
 * Only counts comments where the user is @mentioned and hasn't read yet
 */
export async function GET(req: NextRequest) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(req.url);
        const orderId = searchParams.get('orderId');

        if (!orderId) {
            return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
        }

        const userId = session.userId;

        // Find all comments in this order where:
        // 1. User is mentioned in mentionedUserIds
        // 2. User has NOT read it (not in readBy list)
        const comments = await prisma.comment.findMany({
            where: {
                orderId,
                mentionedUserIds: {
                    contains: userId
                }
            },
            select: {
                stepName: true,
                readBy: true
            }
        });

        // Group by stepName and count unread
        const statsByStep: Record<string, { unread: number }> = {};

        comments.forEach((comment) => {
            const readByList = comment.readBy ? JSON.parse(comment.readBy) : [];
            const isUnread = !readByList.includes(userId);

            if (isUnread) {
                if (!statsByStep[comment.stepName]) {
                    statsByStep[comment.stepName] = { unread: 0 };
                }
                statsByStep[comment.stepName].unread++;
            }
        });

        return NextResponse.json({ stats: statsByStep });

    } catch (error) {
        console.error('Get unread stats error:', error);
        return NextResponse.json({ error: 'Failed to fetch unread stats' }, { status: 500 });
    }
}
