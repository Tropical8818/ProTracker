import { prisma } from '../src/lib/prisma';

async function main() {
    console.log('Generating test comments for AI analytics verification...');

    // Get First Product
    const product = await prisma.product.findFirst();
    if (!product) throw new Error('No product found');

    const orders = await prisma.order.findMany({
        where: { productId: product.id },
        take: 3
    });

    if (orders.length === 0) throw new Error('No orders found');

    // Create comments with categories
    const comments = [
        {
            orderId: orders[0].id,
            stepName: 'Cut',
            content: 'Missing raw material sheets.',
            category: 'MATERIAL_SHORTAGE',
            userId: 'user-1' // Assuming user exists or auth bypass
        },
        {
            orderId: orders[0].id,
            stepName: 'Cut',
            content: 'Still waiting for material delivery.',
            category: 'MATERIAL_SHORTAGE',
            userId: 'user-1'
        },
        {
            orderId: orders[1].id,
            stepName: 'Assembly',
            content: 'Conveyor belt broke down.',
            category: 'EQUIPMENT_FAILURE',
            userId: 'user-1'
        },
        {
            orderId: orders[2].id,
            stepName: 'QC',
            content: 'Measurements out of tolerance.',
            category: 'QUALITY_ISSUE',
            userId: 'user-1'
        }
    ];

    // Need a valid user ID. Let's find one.
    const user = await prisma.user.findFirst();
    if (!user) throw new Error('No user found');

    for (const c of comments) {
        await prisma.comment.create({
            data: {
                ...c,
                userId: user.id,
                mentionedUserIds: '',
                structuredData: '{}'
            }
        });
    }

    console.log('✅ Created 4 test comments with categories.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
