
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting backfill...');

    const orders = await prisma.order.findMany();
    console.log(`Found ${orders.length} orders to check.`);

    let updatedCount = 0;

    for (const order of orders) {
        try {
            const data = JSON.parse(order.data);

            // Extract Status
            // Logic matches what's used in page.tsx (filtering logic) 
            // Simplified here: if "Status" key exists, use it. But usually it's derived or stored.
            // Actually, in page.tsx, status is often just a field called "Status" or derived from steps.
            // Let's assume for now we might not have a perfect "Status" field in JSON if it was calculated on fly.
            // But Priority IS in JSON usually.

            const priority = data.Priority || 'Normal';

            // For status, let's see if we have a direct field or if we should default to 'WIP' if not N/A
            // In many systems, "Status" is explicitly tracked. If not, this backfill is a best-effort start.
            const status = data.Status || 'N/A';

            if (order.priority !== priority || order.status !== status) {
                await prisma.order.update({
                    where: { id: order.id },
                    data: {
                        priority,
                        status
                    }
                });
                updatedCount++;
            }
        } catch (e) {
            console.error(`Failed to parse/update order ${order.id}`, e);
        }
    }

    console.log(`Backfill complete. Updated ${updatedCount} orders.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
