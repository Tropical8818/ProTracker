const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Generating test comments for AI analytics verification (Standalone)...');

    // Get First Product
    const product = await prisma.product.findFirst();
    if (!product) throw new Error('No product found');
    console.log(`Found Product: ${product.name} (${product.id})`);

    const orders = await prisma.order.findMany({
        where: { productId: product.id },
        take: 3
    });

    if (orders.length === 0) throw new Error('No orders found');
    console.log(`Found ${orders.length} orders for test comments.`);

    // Need a valid user ID. Let's find one.
    const user = await prisma.user.findFirst();
    if (!user) throw new Error('No user found');
    console.log(`Using User: ${user.username} (${user.id})`);

    // Create comments with categories
    const comments = [
        {
            orderId: orders[0].id,
            stepName: 'Cut',
            content: 'Missing raw material sheets in standalone test.',
            category: 'MATERIAL_SHORTAGE',
            userId: user.id
        },
        {
            orderId: orders[0].id,
            stepName: 'Cut',
            content: 'Still waiting for material delivery (Standalone).',
            category: 'MATERIAL_SHORTAGE',
            userId: user.id
        },
        {
            orderId: orders[1] ? orders[1].id : orders[0].id,
            stepName: 'Assembly',
            content: 'Conveyor belt broke down (Standalone).',
            category: 'EQUIPMENT_FAILURE',
            userId: user.id
        },
        {
            orderId: orders[2] ? orders[2].id : orders[0].id,
            stepName: 'QC',
            content: 'Measurements out of tolerance (Standalone test).',
            category: 'QUALITY_ISSUE',
            userId: user.id
        }
    ];

    for (const c of comments) {
        await prisma.comment.create({
            data: {
                orderId: c.orderId,
                stepName: c.stepName,
                content: c.content,
                category: c.category,
                userId: c.userId,
                mentionedUserIds: '',
                structuredData: '{}'
            }
        });
        console.log(`Created comment: [${c.category}] on ${c.stepName}`);
    }

    console.log('✅ Created 4 test comments successfully.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
