const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Inspecting Order Data for Date Fields...');

    // WO IDs mentioned by user
    const woIds = ['6000785969', '6000875175', '6000875176', '6000863811'];

    const orders = await prisma.order.findMany({
        where: { woId: { in: woIds } },
        select: { woId: true, data: true }
    });

    for (const order of orders) {
        console.log(`\nWO ID: ${order.woId}`);
        const data = JSON.parse(order.data);
        console.log('Date Fields found:');
        Object.keys(data).forEach(key => {
            if (key.includes('Date') || key.includes('Due') || key.includes('DUE') || key === 'ECD') {
                console.log(`- ${key}: ${data[key]}`);
            }
        });
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
