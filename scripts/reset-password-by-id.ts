import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    // Find user by Employee ID
    const employeeId = 'SUPER001';
    const newPassword = 'superuser2025'; // Reset password

    const user = await prisma.user.findUnique({
        where: { employeeId }
    });

    if (!user) {
        console.log(`❌ User with Employee ID '${employeeId}' not found in database.`);
        console.log('\n📋 All users in database:');
        const allUsers = await prisma.user.findMany({
            select: { username: true, employeeId: true, role: true, status: true }
        });

        if (allUsers.length === 0) {
            console.log('  No users found!');
        } else {
            allUsers.forEach(u => {
                console.log(`  - Username: ${u.username}, ID: ${u.employeeId}, Role: ${u.role}, Status: ${u.status}`);
            });
        }
        return;
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
        where: { employeeId },
        data: { passwordHash }
    });

    console.log('✅ Password reset successfully!');
    console.log(`👤 Username: ${user.username}`);
    console.log(`🆔 Employee ID: ${employeeId}`);
    console.log(`🔑 New Password: ${newPassword}`);
    console.log(`👔 Role: ${user.role}`);
    console.log('\n✨ You can now log in with username and password shown above!');
}

main()
    .catch((e) => {
        console.error('❌ Failed to reset password:', e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
