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

# Ensure migrations are applied to the mounted database
echo "🗄️  Running database migrations..."
npx prisma migrate deploy

# Check if we need to seed the default admin
echo "🔍 Checking for default admin user..."
node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function checkAndSeed() {
    const prisma = new PrismaClient();
    try {
        // SIMPLIFICATION: SuperAdmin identity is FIXED to ensure permissions work.
        // User can only configure the password.
        const adminPassword = process.env.ADMIN_PASSWORD || 'superadmin123';
        
        const username = 'superadmin';
        const employeeId = 'SUPER001';

        const existingUser = await prisma.user.findUnique({ where: { username } });
        
        if (!existingUser) {
            console.log(`📝 Initializing System SuperAdmin...`);
            console.log(`   Username: ${username}`);
            console.log(`   Employee ID: ${employeeId} (REQUIRED FOR LOGIN)`);
            
            const hash = await bcrypt.hash(adminPassword, 10);
            await prisma.user.create({
                data: {
                    username,
                    passwordHash: hash,
                    employeeId,
                    role: 'admin',
                    status: 'approved'
                }
            });
            console.log(`✅ SuperAdmin created! Login ID: ${employeeId}`);
        } else {
            console.log(`✅ Admin user "${adminUsername}" already exists.`);
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

# Start the file watcher in the background
echo "👀 Starting file watcher..."
npm run watcher &

# Start the Next.js server
exec node server.js
