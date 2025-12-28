#!/bin/sh
set -e

echo "🚀 ProTracker Docker Bootstrap"
echo "================================"

# Wait a moment for any file system operations to settle
sleep 1

# Ensure Prisma directory exists
if [ ! -d "/app/prisma" ]; then
    echo "❌ Error: Prisma directory not found"
    exit 1
fi

# Database schema is pre-synced during Docker build (prisma db push)
# The mounted volume will use existing database if present, or the pre-created one
echo "📦 Database schema ready (pre-synced during build)"

# Check if we need to seed the default admin
echo "🔍 Checking for default admin user..."
node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function checkAndSeed() {
    const prisma = new PrismaClient();
    try {
        const adminCount = await prisma.user.count({ where: { role: 'admin' } });
        if (adminCount === 0) {
            console.log('📝 Creating default admin user...');
            const password = process.env.ADMIN_PASSWORD || 'admin123';
            const hash = await bcrypt.hash(password, 10);
            await prisma.user.create({
                data: {
                    username: 'admin',
                    passwordHash: hash,
                    employeeId: 'admin',
                    role: 'admin',
                    status: 'approved'
                }
            });
            console.log('✅ Default admin created (username: admin, password: ' + password + ')');
            console.log('⚠️  Please change the password after first login!');
        } else {
            console.log('✅ Admin user(s) already exist');
        }
    } finally {
        await prisma.\$disconnect();
    }
}

checkAndSeed().catch(console.error);
"

echo "✅ Database ready!"
echo "🌐 Starting ProTracker..."
echo ""

# Start the Next.js server
exec node server.js
