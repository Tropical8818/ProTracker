import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { orderId, stepName } = await req.json();

        if (!orderId || !stepName) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Find all comments for this step
        const comments = await prisma.comment.findMany({
            where: {
                orderId,
                stepName
            }
        });

        const userId = session.userId;
        let updatedCount = 0;

        // Update readBy for each comment if not already read
        // Note: Prisma doesn't support JSON array operations well in updateMany for SQLite/Postgres across the board easily
        // We'll iterate and update. Efficiency acceptable for comment volume.
        for (const comment of comments) {
            const readBy = comment.readBy ? JSON.parse(comment.readBy) : [];
            if (!readBy.includes(userId)) {
                readBy.push(userId);
                await prisma.comment.update({
                    where: { id: comment.id },
                    data: { readBy: JSON.stringify(readBy) }
                });
                updatedCount++;
            }
        }

        // Also update order stats
        // We need to import the updater from comments route or duplicate logic?
        // Let's just create a helper logic or call the same update logic if possible.
        // For now, we won't strictly update the cached 'commentStats' on the order immediately 
        // because that counts UNREAD based on *who* is looking? 
        // Actually `commentStats` on Order model is tricky if it stores unread counts for *everyone*.
        // The `commentStats` on Order likely stores { stepName: { total: X, unread: Y } }. 
        // Wait, "unread" is subjective to the user. 
        // If `commentStats` is global, then "unread" usually means "unread by anyone" or "unread by assignee"?
        // Let's check how `commentStats` is used.
        // If it's red dot for *me*, it should be personalized? 
        // The `PlannerTable` uses `(order as any).commentStats`.
        // If `commentStats` is a static JSON on the Order, it can't support per-user read status.
        // The current implementation of `commentStats` (from previous context) likely counts Total. 
        // If it counts Unread, it must be flawed if it's shared.
        // HOWEVER, my task is about the MessageNotification (Header), which fetches `/api/messages/my`. 
        // So updating the `Comment` model is sufficient for `/api/messages/my` to reflect the change.

        return NextResponse.json({ success: true, updatedCount });

    } catch (error) {
        console.error('Mark comments read error:', error);
        return NextResponse.json({ error: 'Failed to mark comments read' }, { status: 500 });
    }
}
