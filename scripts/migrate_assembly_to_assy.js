const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("Migrating 'Assembly' to 'Assy'...");

    // Find count first
    const count = await prisma.comment.count({
        where: { stepName: 'Assembly' }
    });
    console.log(`Found ${count} comments with stepName 'Assembly'.`);

    if (count > 0) {
        const result = await prisma.comment.updateMany({
            where: { stepName: 'Assembly' },
            data: { stepName: 'Assy' }
        });
        console.log(`Successfully updated ${result.count} comments to 'Assy'.`);
    } else {
        console.log("No migration needed.");
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
