import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();
const CONFIG_PATH = path.join(process.cwd(), 'data/config.json');

async function main() {
    console.log('--- Seeding Products from Config ---');

    if (!fs.existsSync(CONFIG_PATH)) {
        console.error('Config file not found:', CONFIG_PATH);
        return;
    }

    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
    const config = JSON.parse(raw);
    const products = config.products || [];

    console.log(`Found ${products.length} products in config.json`);

    for (const p of products) {
        // Check if exists
        const existing = await prisma.product.findUnique({
            where: { id: p.id }
        });

        if (existing) {
            console.log(`Updating existing product: ${p.name}`);
            const { id, name, ...jsonConfig } = p;
            await prisma.product.update({
                where: { id: p.id },
                data: {
                    name: p.name,
                    config: JSON.stringify(jsonConfig),
                    isActive: config.activeProductId === p.id
                }
            });
        } else {
            console.log(`Creating new product: ${p.name}`);
            const { id, name, ...jsonConfig } = p;
            await prisma.product.create({
                data: {
                    id: p.id,
                    name: p.name,
                    slug: p.name.toLowerCase().replace(/\s+/g, '-'),
                    config: JSON.stringify(jsonConfig),
                    isActive: config.activeProductId === p.id
                }
            });
        }
    }

    console.log('Seeding complete.');

    const count = await prisma.product.count();
    console.log(`Total products in DB: ${count}`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
