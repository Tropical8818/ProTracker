import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- DB Product Cleanup & Debug ---');
    console.log('Script started.');

    // 1. List all products
    const allProducts = await prisma.product.findMany();
    console.log(`Found ${allProducts.length} products in DB.`);
    allProducts.forEach(p => {
        console.log(`- [${p.id}] "${p.name}" (Active: ${p.isActive})`);
    });

    // 2. Define targets
    const targets = [
        'PUMP Assembly',
        'Protector Assembly',
        'Intake/CSC Assembly'
    ];

    console.log('\nScanning for targets to remove:', targets);

    for (const name of targets) {
        // Use insensitive search if possible, or fuzzy
        const matches = allProducts.filter(p => p.name.toLowerCase().includes(name.toLowerCase()));

        if (matches.length > 0) {
            for (const p of matches) {
                console.log(`Deleting: "${p.name}" (${p.id})`);
                await prisma.product.delete({ where: { id: p.id } });
            }
        } else {
            console.log(`Not found: "${name}"`);
        }
    }

    console.log('\nDone.');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
