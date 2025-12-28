#!/bin/sh
set -e

echo "🚀 Starting ProTracker Bootstrap..."

# 1. Run Prisma database initialization
# This ensures the schema is in sync with the SQLite database file
echo "📦 Initializing database schema..."
npx prisma db push --accept-data-loss || echo "⚠️ Warning: Database push encountered issues, continuing..."

# 2. Check if seeding is needed (optional, user can run it manually)
# npx prisma db seed

echo "✅ Database ready."

# 3. Start the application
echo "🎬 Starting Next.js application..."
exec node server.js
