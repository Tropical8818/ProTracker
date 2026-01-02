import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// POST /api/comments - Create a new comment
// Note: Ensure Prisma Client is generated: `npx prisma generate`
export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { orderId, stepName, category, structuredData, note, triggeredStatus, content, mentions } = body;

        // Use 'content' or 'note' as message text
        const messageText = content || note || '';

        if (!orderId || !stepName) {
            return NextResponse.json({ error: 'orderId and stepName are required' }, { status: 400 });
        }

        // Logic to resolve mentions to user IDs

        // VALIDATION: Check if stepName is valid for this product
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            select: { productId: true }
        });

        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        const product = await prisma.product.findUnique({
            where: { id: order.productId }
        });

        if (product) {
            const config = JSON.parse(product.config);
            // Steps usually come from config.steps or config.steps
            const validSteps: string[] = config.steps || [];

            if (validSteps.length > 0 && !validSteps.includes(stepName)) {
                return NextResponse.json({
                    error: `Invalid step name. '${stepName}' is not a valid step for this product.`
                }, { status: 400 });
            }
        }

        let targetUserIds: string[] = [];
        if (Array.isArray(mentions) && mentions.length > 0) {
            // Fetch all users to map roles/names
            const allUsers = await prisma.user.findMany({ select: { id: true, role: true, username: true } });

            mentions.forEach(mention => {
                if (mention === '@Supervisor') {
                    // Add all admins and supervisors
                    const supervisors = allUsers.filter(u => u.role === 'admin' || u.role === 'supervisor').map(u => u.id);
                    targetUserIds.push(...supervisors);
                } else if (mention === '@Everyone') {
                    // Add all users
                    targetUserIds.push(...allUsers.map(u => u.id));
                } else if (mention === '@Operator') {
                    // Add all operators
                    const operators = allUsers.filter(u => u.role === 'user').map(u => u.id);
                    targetUserIds.push(...operators);
                } else {
                    // Assume it's a specific User ID or Username
                    // Check if it looks like a UUID
                    const byId = allUsers.find(u => u.id === mention);
                    if (byId) {
                        targetUserIds.push(byId.id);
                    } else {
                        // Check by username
                        const byName = allUsers.find(u => u.username === mention.replace('@', '')); // Remove @ if present
                        if (byName) targetUserIds.push(byName.id);
                    }
                }
            });
        }

        // Deduplicate
        targetUserIds = Array.from(new Set(targetUserIds));

        // Create comment
        const comment = await prisma.comment.create({
            data: {
                orderId,
                stepName,
                content: messageText, // Required field
                category: category || 'GENERAL',
                structuredData: structuredData ? JSON.stringify(structuredData) : null,
                note: note || null,
                triggeredStatus: triggeredStatus || null,
                userId: session.userId,
                readBy: JSON.stringify([session.userId]), // Creator has read it
                mentionedUserIds: JSON.stringify(targetUserIds)
            },
            include: {
                user: {
                    select: { username: true, employeeId: true, role: true }
                }
            }
        });

        // Update commentStats cache on the order
        await updateOrderCommentStats(orderId);

        return NextResponse.json({
            success: true,
            comment: {
                ...comment,
                structuredData: comment.structuredData ? JSON.parse(comment.structuredData) : null,
                readBy: comment.readBy ? JSON.parse(comment.readBy) : []
            }
        });

    } catch (error) {
        console.error('Create comment error:', error);
        return NextResponse.json({
            error: 'Failed to create comment',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}

// GET /api/comments?orderId=xxx&stepName=xxx
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

        const comments = await prisma.comment.findMany({
            where: {
                orderId,
                stepName
            },
            include: {
                user: {
                    select: { username: true, employeeId: true, role: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Collect all mentioned user IDs
        const allMentionedIds = new Set<string>();
        comments.forEach(c => {
            const ids = c.mentionedUserIds ? JSON.parse(c.mentionedUserIds) : [];
            ids.forEach((id: string) => allMentionedIds.add(id));
        });

        // Fetch mentioned users' details
        const mentionedUsers = await prisma.user.findMany({
            where: { id: { in: Array.from(allMentionedIds) } },
            select: { id: true, username: true, role: true }
        });

        // Create user map for quick lookup
        const userMap = new Map(mentionedUsers.map(u => [u.id, u]));

        // Parse JSON fields and add mentionedUsers array
        const parsedComments = comments.map((c: typeof comments[number]) => {
            const mentionedIds = c.mentionedUserIds ? JSON.parse(c.mentionedUserIds) : [];
            return {
                ...c,
                structuredData: c.structuredData ? JSON.parse(c.structuredData) : null,
                readBy: c.readBy ? JSON.parse(c.readBy) : [],
                mentionedUserIds: mentionedIds,
                mentionedUsers: mentionedIds
                    .map((id: string) => userMap.get(id))
                    .filter((u: { id: string; username: string; role: string } | undefined) => u !== undefined)
            };
        });

        return NextResponse.json({ comments: parsedComments });

    } catch (error) {
        console.error('Get comments error:', error);
        return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
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

        // Group by stepName - only count total, unread is now per-user via /api/comments/unread-stats
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

