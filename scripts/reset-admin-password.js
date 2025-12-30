
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function reset() {
    const password = process.argv[2] || 'admin123';
    console.log(`Resetting admin password to: ${password}`);

    const hash = await bcrypt.hash(password, 10);

    try {
        // Try to update first
        const user = await prisma.user.findUnique({ where: { username: 'admin' } });

        if (user) {
            await prisma.user.update({
                where: { username: 'admin' },
                data: { passwordHash: hash }
            });
            console.log('✅ Password reset successful!');
        } else {
            // Create if not found
            console.log('User "admin" not found. Creating new admin user...');
            await prisma.user.create({
                data: {
                    username: 'admin',
                    passwordHash: hash,
                    employeeId: 'admin',
                    role: 'admin',
                    status: 'approved'
                }
            });
            console.log('✅ Admin user created!');
        }
    } catch (e) {
        console.error('❌ Error resetting password:', e);
    } finally {
        await prisma.$disconnect();
    }
}

reset();
