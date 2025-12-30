
#!/bin/bash

# Configuration
VERSION=$(node -p "require('./package.json').version")
IMAGE_NAME="protracker"
DOCKER_USER="protracker-local" # Change to your docker hub user if needed

echo "🚀 Building ProTracker v$VERSION from Git..."

# 1. Pull latest code
echo "📥 Pulling latest code..."
git pull origin main

# 2. Build Docker Image
echo "🔨 Building Docker image..."
docker build -t $IMAGE_NAME:$VERSION -t $IMAGE_NAME:latest .

# 3. Create necessary folders
echo "📂 Creating data directories..."
mkdir -p ./data/uploads
mkdir -p ./data/db

# 4. Run Container
echo "🏃‍♂️ Starting container..."
# Check if container exists and remove it
if [ "$(docker ps -aq -f name=$IMAGE_NAME)" ]; then
    echo "Stopping existing container..."
    docker stop $IMAGE_NAME
    docker rm $IMAGE_NAME
fi

# Run new container
# Note: Using host networking or mapping specific ports. Here mapping 3000:3000
docker run -d \
  --name $IMAGE_NAME \
  --restart unless-stopped \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/public/uploads:/app/public/uploads \
  -e DATABASE_URL="file:/app/data/db/prod.db" \
  -e NEXTAUTH_SECRET="your-secret-key-change-this" \
  -e NEXTAUTH_URL="http://localhost:3000" \
  -e ADMIN_USERNAME="superadmin" \
  -e ADMIN_PASSWORD="superadmin123" \
  $IMAGE_NAME:latest

echo "✅ Deployment complete! App running at http://localhost:3000"
echo "📜 Logs: docker logs -f $IMAGE_NAME"
