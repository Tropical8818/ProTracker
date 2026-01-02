
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const woId = '6000785969';
    console.log(`Checking data for WO: ${woId}`);

    // 1. Fetch Order Data
    const order = await prisma.order.findFirst({
        where: { woId },
        include: { product: true }
    });

    if (order) {
        console.log('\n--- Order Data (JSON) ---');
        const data = JSON.parse(order.data);
        console.log('Assy Step Value:', data['Assy']);
        console.log('Full Data:', JSON.stringify(data, null, 2));
    } else {
        console.log('Order not found.');
    }

    // 2. Fetch Operation Logs
    console.log('\n--- Operation Logs ---');
    const logs = await prisma.operationLog.findMany({
        where: { order: { woId } },
        include: { user: true },
        orderBy: { timestamp: 'desc' }
    });

    if (logs.length > 0) {
        logs.forEach(log => {
            console.log(`[${log.timestamp.toISOString()}] User: ${log.user?.employeeId} | Action: ${log.action} | Step: ${JSON.parse(log.details || '{}').step || 'N/A'}`);
        });
    } else {
        console.log('No logs found for this order.');
    }

    // 3. Search for logs by Employee 2222 specifically (in case order link is missing)
    console.log('\n--- Logs for User 2222 (Last 5) ---');
    const userLogs = await prisma.operationLog.findMany({
        where: { user: { employeeId: '2222' } },
        orderBy: { timestamp: 'desc' },
        take: 5
    });
    userLogs.forEach(log => {
        console.log(`[${log.timestamp.toISOString()}] WO: ${log.details ? JSON.parse(log.details).woId : 'N/A'} | Action: ${log.action}`);
    });

}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
