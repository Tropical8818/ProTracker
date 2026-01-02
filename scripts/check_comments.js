const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Inspecting Recent Comments for specific strings...');

    const comments = await prisma.comment.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
            content: true,
            category: true,
            order: { select: { woId: true } }
        }
    });

    console.log('Recent Comments:');
    comments.forEach(c => {
        console.log(`[${c.category}] WO-${c.order.woId}: "${c.content}"`);
    });
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
