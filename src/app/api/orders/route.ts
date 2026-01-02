import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const productId = request.nextUrl.searchParams.get('productId');
        if (!productId) {
            return NextResponse.json({ error: 'Product ID required' }, { status: 400 });
        }

        const product = await prisma.product.findUnique({
            where: { id: productId }
        });

        if (!product) {
            return NextResponse.json({ error: 'Product not found' }, { status: 404 });
        }

        const productConfig = JSON.parse(product.config);
        const { steps, detailColumns } = productConfig;

        const orders = await prisma.order.findMany({
            where: { productId }
        });

        const userId = session.userId;

        // Fetch all comments for these orders where user is mentioned and hasn't read
        const orderIds = orders.map(o => o.id);
        const unreadComments = await prisma.comment.findMany({
            where: {
                orderId: { in: orderIds },
                mentionedUserIds: {
                    contains: userId
                }
            },
            select: {
                orderId: true,
                stepName: true,
                readBy: true
            }
        });

        // Build unread stats map: orderId -> { stepName: { unread: number } }
        const unreadStatsMap: Record<string, Record<string, { unread: number }>> = {};

        unreadComments.forEach(comment => {
            const readByList = comment.readBy ? JSON.parse(comment.readBy) : [];
            const isUnread = !readByList.includes(userId);

            if (isUnread) {
                if (!unreadStatsMap[comment.orderId]) {
                    unreadStatsMap[comment.orderId] = {};
                }
                if (!unreadStatsMap[comment.orderId][comment.stepName]) {
                    unreadStatsMap[comment.orderId][comment.stepName] = { unread: 0 };
                }
                unreadStatsMap[comment.orderId][comment.stepName].unread++;
            }
        });

        // Fetch comment previews for tooltip (latest 3 comments per step)
        const allComments = await prisma.comment.findMany({
            where: { orderId: { in: orderIds } },
            include: {
                user: {
                    select: { username: true }
                }
            },
            orderBy: { createdAt: 'asc' }
        });

        // Build comment previews map: orderId -> { stepName: [...all comments] }
        const commentPreviewsMap: Record<string, Record<string, any[]>> = {};
        allComments.forEach(comment => {
            if (!commentPreviewsMap[comment.orderId]) {
                commentPreviewsMap[comment.orderId] = {};
            }
            if (!commentPreviewsMap[comment.orderId][comment.stepName]) {
                commentPreviewsMap[comment.orderId][comment.stepName] = [];
            }

            // Add all comments (Oldest -> Newest due to query order)
            commentPreviewsMap[comment.orderId][comment.stepName].push({
                username: comment.user.username,
                content: comment.content.substring(0, 100), // Increased truncate limit slightly for better context
                createdAt: comment.createdAt
            });
        });

        // Calculate real-time stats from allComments to ensure consistency with previews
        const realTimeStatsMap: Record<string, Record<string, { total: number }>> = {};

        allComments.forEach(comment => {
            if (!realTimeStatsMap[comment.orderId]) {
                realTimeStatsMap[comment.orderId] = {};
            }
            if (!realTimeStatsMap[comment.orderId][comment.stepName]) {
                realTimeStatsMap[comment.orderId][comment.stepName] = { total: 0 };
            }
            realTimeStatsMap[comment.orderId][comment.stepName].total++;
        });

        const formattedOrders = orders.map(order => {
            const data = JSON.parse(order.data);
            // Use real-time calculated stats instead of DB cache
            // const stats = order.commentStats ? JSON.parse(order.commentStats) : {}; 
            const stats = realTimeStatsMap[order.id] || {};

            const userUnreadStats = unreadStatsMap[order.id] || {};
            const commentPreviews = commentPreviewsMap[order.id] || {};

            return {
                id: order.id,
                woId: order.woId,
                commentStats: stats, // Total comment counts (Dynamic & Accurate)
                userUnreadStats: userUnreadStats, // Per-user unread counts
                commentPreviews: commentPreviews, // Recent comments preview for tooltip
                ...data
            };
        });

        return NextResponse.json({
            orders: formattedOrders,
            steps: steps,
            detailColumns: detailColumns
        });
    } catch (error) {
        console.error('Orders fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
    }
}
