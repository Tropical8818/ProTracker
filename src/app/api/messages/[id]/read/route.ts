import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

/**
 * POST /api/messages/[id]/read
 * Mark a message as read by the current user
 */
export async function POST(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const commentId = params.id;

        const comment = await prisma.comment.findUnique({
            where: { id: commentId },
            select: { readBy: true, orderId: true }
        });

        if (!comment) {
            return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
        }

        const readByList = comment.readBy ? JSON.parse(comment.readBy) : [];

        // Add user to readBy list if not already there
        if (!readByList.includes(session.userId)) {
            readByList.push(session.userId);

            await prisma.comment.update({
                where: { id: commentId },
                data: { readBy: JSON.stringify(readByList) }
            });

            // Update order comment stats cache
            await updateOrderCommentStats(comment.orderId);
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Mark as read error:', error);
        return NextResponse.json({ error: 'Failed to mark as read' }, { status: 500 });
    }
}

// Helper to update order stats
async function updateOrderCommentStats(orderId: string) {
    try {
        const comments = await prisma.comment.findMany({
            where: { orderId },
            select: { stepName: true, readBy: true }
        });

        const statsByStep: Record<string, { total: number; unread: number }> = {};

        comments.forEach(comment => {
            if (!statsByStep[comment.stepName]) {
                statsByStep[comment.stepName] = { total: 0, unread: 0 };
            }
            statsByStep[comment.stepName].total++;

            statsByStep[comment.stepName].total++;
        });

        await prisma.order.update({
            where: { id: orderId },
            data: { commentStats: JSON.stringify(statsByStep) }
        });
    } catch (error) {
        console.error('Update comment stats error:', error);
    }
}
