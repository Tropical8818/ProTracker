
#!/bin/bash
set -e # Exit immediately if a command exits with a non-zero status.

echo "🚀 Starting Deployment Process..."

# 1. Pull latest code
echo "📥 Pulling latest code from git..."
git fetch origin main
git reset --hard origin/main
# Using reset --hard to force overwrite local deviations if any, ensuring it matches remote exactly.
# If you prefer to keep local changes, change to 'git pull origin main'

# 2. Rebuild and Restart containers
echo "🔄 Rebuilding and restarting containers..."
# This uses the configuration from docker-compose.yml (Port 3001, TZ=Asia/Shanghai, etc.)
docker-compose down
docker-compose up -d --build

# 3. Cleanup unused images (optional)
echo "🧹 Cleaning up unused Docker images..."
docker image prune -f

echo "✅ Deployment complete!"
echo "   - App running at: http://localhost:3001"
echo "   - Container Name: protracker"
echo "   - Timezone: Asia/Shanghai"
echo ""
echo "📜 View logs with: docker-compose logs -f"
