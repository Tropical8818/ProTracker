import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

/**
 * GET /api/messages/my
 * Get messages relevant to the current user (inbox)
 */
export async function GET(req: NextRequest) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const userId = session.userId;

        // Find comments relevant to this user:
        // 1. Replies to their comments
        // 2. Mentions of them
        // 3. Recent comments on orders they've worked on (optional, limited to 24h)
        const comments = await prisma.comment.findMany({
            where: {
                OR: [
                    // Replies to my comments
                    {
                        replyTo: {
                            userId: userId
                        }
                    },
                    // Comments mentioning me
                    {
                        mentionedUserIds: {
                            contains: userId
                        }
                    }
                ]
            },
            include: {
                user: { select: { username: true, role: true } },
                order: { select: { woId: true, productId: true, product: { select: { name: true } } } }
            },
            orderBy: { createdAt: 'asc' },
            take: 50
        });

        // Filter for unread messages only
        const unreadMessages = comments.map(msg => {
            const readBy = msg.readBy ? JSON.parse(msg.readBy) : [];
            const isUnread = !readBy.includes(userId);

            return {
                ...msg,
                readBy,
                mentionedUserIds: msg.mentionedUserIds ? JSON.parse(msg.mentionedUserIds) : [],
                structuredData: msg.structuredData ? JSON.parse(msg.structuredData) : null,
                isUnread
            };
        }).filter(m => m.isUnread);

        const unreadCount = unreadMessages.length;

        return NextResponse.json({
            total: unreadMessages.length,
            unreadCount,
            messages: unreadMessages
        });

    } catch (error) {
        console.error('Get my messages error:', error);
        return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }
}
