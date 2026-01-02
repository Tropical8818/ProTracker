const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Generating test comments for Morning Report Active Issues filter...');

    // Get Product
    const product = await prisma.product.findFirst();
    if (!product) throw new Error('No product found');
    console.log(`Product: ${product.name}`);

    // Find 2 Orders: One active, one "completed" (simulated via status data update)
    let orders = await prisma.order.findMany({
        where: { productId: product.id },
        take: 2,
        orderBy: { woId: 'desc' }
    });

    if (orders.length < 2) throw new Error('Need at least 2 orders');

    const activeOrder = orders[0];
    const completedOrder = orders[1];

    // Simulate Status: Active Order (ensure it looks active)
    await prisma.order.update({
        where: { id: activeOrder.id },
        data: { data: JSON.stringify({ ...JSON.parse(activeOrder.data), 'Receipt': 'WIP' }) }
    });

    // Simulate Status: Completed Order (mark last step done)
    await prisma.order.update({
        where: { id: completedOrder.id },
        data: { data: JSON.stringify({ ...JSON.parse(completedOrder.data), 'Receipt': '2024-01-01' }) }
    });

    // Get User
    const user = await prisma.user.findFirst();

    // Create Issue Comment on ACTIVE Order (Should BE included)
    await prisma.comment.create({
        data: {
            orderId: activeOrder.id,
            stepName: 'Assembly',
            content: 'CRITICAL: Motor burned out (Active Order Test)',
            category: 'EQUIPMENT_FAILURE',
            userId: user.id,
            mentionedUserIds: '',
            structuredData: '{}'
        }
    });

    // Create Issue Comment on COMPLETED Order (Should NOT be included in new section)
    await prisma.comment.create({
        data: {
            orderId: completedOrder.id,
            stepName: 'Packing',
            content: 'Box damaged (Completed Order Test)',
            category: 'QUALITY_ISSUE',
            userId: user.id,
            mentionedUserIds: '',
            structuredData: '{}'
        }
    });

    console.log(`✅ Created comment on Active Order ${activeOrder.woId} (Expect: INCLUDED)`);
    console.log(`✅ Created comment on Completed Order ${completedOrder.woId} (Expect: EXCLUDED)`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
