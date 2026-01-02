// Script to recalculate comment stats for all orders
// Run with: npx ts-node scripts/fix-comment-stats.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function recalculateCommentStats() {
    try {
        console.log('Starting comment stats recalculation...\n');

        // Get all orders
        const orders = await prisma.order.findMany({
            select: { id: true, woId: true }
        });

        console.log(`Found ${orders.length} orders to process\n`);

        for (const order of orders) {
            // Get all comments for this order
            const comments = await prisma.comment.findMany({
                where: { orderId: order.id },
                select: { stepName: true }
            });

            // Group by stepName
            const statsByStep: Record<string, { total: number }> = {};

            comments.forEach(comment => {
                if (!statsByStep[comment.stepName]) {
                    statsByStep[comment.stepName] = { total: 0 };
                }
                statsByStep[comment.stepName].total++;
            });

            // Update order
            await prisma.order.update({
                where: { id: order.id },
                data: {
                    commentStats: JSON.stringify(statsByStep)
                }
            });

            console.log(`✓ Updated ${order.woId}: ${JSON.stringify(statsByStep)}`);
        }

        console.log('\n✅ Comment stats recalculation complete!');

    } catch (error) {
        console.error('Error recalculating stats:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Also provide a function to check specific order
async function checkOrder(woId: string) {
    try {
        const order = await prisma.order.findFirst({
            where: { woId },
            select: {
                id: true,
                woId: true,
                commentStats: true
            }
        });

        if (!order) {
            console.log(`Order ${woId} not found`);
            return;
        }

        console.log(`\nOrder: ${order.woId}`);
        console.log(`Current commentStats: ${order.commentStats}\n`);

        // Get actual comments
        const comments = await prisma.comment.findMany({
            where: { orderId: order.id },
            select: {
                stepName: true,
                content: true,
                createdAt: true
            },
            orderBy: { createdAt: 'desc' }
        });

        console.log(`Actual comments found: ${comments.length}\n`);

        // Group by step
        const byStep: Record<string, number> = {};
        comments.forEach(c => {
            byStep[c.stepName] = (byStep[c.stepName] || 0) + 1;
        });

        console.log('Comments by step:');
        Object.entries(byStep).forEach(([step, count]) => {
            console.log(`  ${step}: ${count}`);
        });

    } catch (error) {
        console.error('Error checking order:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Run based on command line args
const args = process.argv.slice(2);
if (args[0] === 'check' && args[1]) {
    checkOrder(args[1]);
} else {
    recalculateCommentStats();
}
