import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only supervisor and admin can delete comments
    if (session.role !== 'supervisor' && session.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden - Only supervisors and admins can delete comments' }, { status: 403 });
    }

    try {
        const params = await context.params;
        const commentId = params.id;

        // Check if comment exists
        const comment = await prisma.comment.findUnique({
            where: { id: commentId }
        });

        if (!comment) {
            return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
        }

        // Delete the comment
        await prisma.comment.delete({
            where: { id: commentId }
        });

        // Update the order's comment stats
        await updateOrderCommentStats(comment.orderId);

        // Note: Related messages will be handled by database cascade if configured
        // If not, we can delete them manually here if the Message model exists

        return NextResponse.json({
            success: true,
            message: 'Comment deleted successfully'
        });

    } catch (error) {
        console.error('Delete comment error:', error);
        return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 });
    }
}

// Helper function to update order comment stats cache
async function updateOrderCommentStats(orderId: string) {
    try {
        const comments = await prisma.comment.findMany({
            where: { orderId },
            select: {
                stepName: true
            }
        });

        // Group by stepName - only count total
        const statsByStep: Record<string, { total: number }> = {};

        comments.forEach((comment: typeof comments[number]) => {
            if (!statsByStep[comment.stepName]) {
                statsByStep[comment.stepName] = { total: 0 };
            }
            statsByStep[comment.stepName].total++;
        });

        // Update order
        await prisma.order.update({
            where: { id: orderId },
            data: {
                commentStats: JSON.stringify(statsByStep)
            }
        });

    } catch (error) {
        console.error('Update comment stats error:', error);
    }
}
