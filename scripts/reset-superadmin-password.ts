import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    // Reset SUPERADMIN account password
    const username = 'superadmin';
    const newPassword = 'superuser2025'; // Reset to the original default password

    const user = await prisma.user.findUnique({
        where: { username }
    });

    if (!user) {
        console.log(`❌ User 'superadmin' not found in database.`);
        console.log('\n📋 Available admin users:');
        const allAdmins = await prisma.user.findMany({
            where: { role: 'admin' },
            select: { username: true, employeeId: true, status: true }
        });

        if (allAdmins.length === 0) {
            console.log('  No admin users found!');
        } else {
            allAdmins.forEach(u => {
                console.log(`  - ${u.username} (${u.employeeId}) [${u.status}]`);
            });
        }
        return;
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
        where: { username },
        data: { passwordHash }
    });

    console.log('✅ SUPERADMIN password reset successfully!');
    console.log(`👤 Username: ${username}`);
    console.log(`🔑 New Password: ${newPassword}`);
    console.log(`🆔 Employee ID: ${user.employeeId}`);
    console.log(`👔 Role: ${user.role}`);
    console.log('\n⚠️  You can now log in with these credentials!');
}

main()
    .catch((e) => {
        console.error('❌ Failed to reset password:', e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
