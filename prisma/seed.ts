import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    // Check if admin already exists
    const existingAdmin = await prisma.user.findUnique({
        where: { username: 'admin' }
    });

    if (existingAdmin) {
        console.log('Admin user already exists, skipping seed.');
        return;
    }

    // Create default admin with password from env or default
    const defaultPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    await prisma.user.create({
        data: {
            username: 'admin',
            passwordHash,
            role: 'admin',
            status: 'approved'
        }
    });

    console.log('✓ Default admin user created.');
    console.log('  Username: admin');
    console.log('  Password:', defaultPassword === 'admin123' ? 'admin123 (default)' : '(from ADMIN_PASSWORD env)');
    console.log('');
    console.log('⚠️  Please change the admin password after first login!');
}

main()
    .catch((e) => {
        console.error('Seed failed:', e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
