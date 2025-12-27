import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Inspecting Users ---');
    const users = await prisma.user.findMany();
    users.forEach(u => {
        console.log(`User: '${u.username}' | Role: ${u.role} | Status: ${u.status} | ID: ${u.id}`);
    });

    console.log('\n--- Fixing "admin" ---');
    const adminUser = users.find(u => u.username === 'admin');

    if (adminUser) {
        if (adminUser.status !== 'approved' || adminUser.role !== 'admin') {
            console.log(`Updating 'admin' status to APPROVED and role to ADMIN...`);
            await prisma.user.update({
                where: { username: 'admin' },
                data: { status: 'approved', role: 'admin' }
            });
            console.log('Done.');
        } else {
            console.log(`'admin' is already APPROVED and ADMIN.`);
        }
    } else {
        console.error(`CRITICAL: User 'admin' does not exist! Creating it...`);
        const hash = await bcrypt.hash('123', 10);
        await prisma.user.create({
            data: {
                username: 'admin',
                passwordHash: hash,
                role: 'admin',
                status: 'approved'
            }
        });
        console.log(`Created 'admin' with password '123'`);
    }
}

main()
    .catch((e) => console.error(e))
    .finally(() => prisma.$disconnect());
