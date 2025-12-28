# Production Deployment Guide (V6.1.0)

This guide covers two methods to deploy **ProTracker V6.1.0**:
1. **Standard Node.js Deployment** (Recommended for Mac Mini servers or simple VPS).
2. **Docker Deployment** (Recommended for Linux servers or trial runs).

---

## What's New in V6.1.0
- **Professional Kiosk Mode**: Specialized monitor view with auto-scroll.
- **Enhanced Security**: Role-based access control and password-protected Kiosk unlock.
- **30-Day Sessions**: Extended persistence for Kiosk terminals.
- **Display Density**: Compact/Comfortable view toggle.

---

## Prerequisites
- **Node.js**: Version 20.9.0 or later (for Standard Deployment).
- **Docker & Docker Compose**: For containerized deployment.
- **OpenAI API Key**: Required for AI features.

---

## Method 1: Standard Node.js Deployment (Mac/Linux/Windows)

This is the simplest method if you are running the app on a local server (like a Mac Mini in the office).

### 1. Build the Application
Run the following commands in the project root:

```bash
# Install dependencies (if not already done)
npm ci

# Generate Prisma Client
npx prisma generate

# Build the optimized production bundle
npm run build
```

### 2. Prepare the Database
Ensure your production database is ready. For SQLite (default), it creates a file at `prisma/dev.db`.

```bash
# Push the schema to the database (creates tables)
npx prisma db push

# (Optional) Seed initial data if fresh install
# npx prisma db seed
```

### 3. Start the Server
You can start the server directly:

```bash
npm start
```

The app will run on `http://localhost:3000`.

### 4. Keep it Running (Process Management)
To keep the app running in the background and crash-proof, use **PM2**:

```bash
# Install PM2 globally
npm install -g pm2

# Start the app with PM2
pm2 start npm --name "pro-tracker" -- start

# Save the process list to restart on reboot
pm2 save
```

---

## Method 2: Docker Deployment

Docker is ideal for isolating the application environment.

### 1. Build the Image

```bash
docker build -t protracker .
```

### 2. Run the Container
You need to persist the SQLite database file so data isn't lost when the container stops.

**Prepare a folder on your host machine** (e.g., `/opt/tracker-data`) to store the database.

```bash
# Run the container
docker run -d \
  -p 3000:3000 \
  --name tracker \
  -v $(pwd)/prisma:/app/prisma \
  -e DATABASE_URL="file:/app/prisma/dev.db" \
  -e OPENAI_API_KEY="your-api-key-here" \
  protracker
```

*Note: The `-v $(pwd)/prisma:/app/prisma` flag mounts your local `prisma` directory (containing `dev.db`) into the container.*

---

## Method 3: Docker Compose (Recommended for Trial & Production)

This is the fastest way to get V6.1.0 running.

### 1. Prepare Environment
Ensure your `.env` file has the necessary keys:
```env
OPENAI_API_KEY=sk-your-openai-key-here
# DATABASE_URL is handled automatically by compose
```

### 2. Launch Trial Run
Run this command to build and start everything. Our new bootstrap script will automatically handle database setup.

```bash
docker-compose up -d --build
```

### 3. Management
- **View Logs**: `docker-compose logs -f app` (Check here if you see errors)
- **Stop**: `docker-compose down`
- **Reset Database**: Delete `prisma/dev.db` and restart.

---

## Post-Deployment Checklist

1. **Environment Variables**:
   Create a `.env` file (or pass env vars in Docker) with:
   ```env
   DATABASE_URL="file:./dev.db"
   OPENAI_API_KEY="sk-..."
   # SESSION_SECRET="complex-string" # (If implemented for cookies)
   ```

2. **Access the App**:
   Open browser at `http://<server-ip>:3000`.

3. **Create Admin User**:
   If specific admin setup is required, ensure you have the initial credentials or register via the `/register` page (if public registration is enabled).

4. **Backups**:
   - **SQLite**: Regularly back up the `prisma/dev.db` file.
   - **Docker**: Back up the mounted volume folder.

---

## Troubleshooting

- **"Prisma Client not found"**: Run `npx prisma generate` and restart.
- **"Database file not found"**: Ensure the `DATABASE_URL` path is correct relative to where you run the command.
- **Build Errors**: Ensure `dev` dependencies aren't being used in production code, or check Node version.
