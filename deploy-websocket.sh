#!/bin/bash

# EODSA WebSocket Server - Railway Deployment Script
# Run this script to deploy the WebSocket server to Railway

echo "🚄 Deploying EODSA WebSocket Server to Railway..."

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Installing..."
    npm install -g @railway/cli
fi

# Create a separate directory for WebSocket deployment
echo "📁 Creating WebSocket deployment directory..."
mkdir -p websocket-server
cd websocket-server

# Copy necessary files
echo "📋 Copying WebSocket server files..."
cp ../server-railway.js ./server.js
cp ../package-websocket.json ./package.json
cp ../railway.json ./railway.json

# Create .env.example for reference
cat > .env.example << 'EOL'
# Railway automatically provides PORT
# PORT=3001

# CORS Configuration
ALLOWED_ORIGINS=https://your-main-app.vercel.app,https://your-custom-domain.com

# Optional: Custom frontend URL
FRONTEND_URL=https://your-main-app.vercel.app

# Railway will automatically set these:
# RAILWAY_PUBLIC_DOMAIN=your-app.railway.app
# NODE_ENV=production
EOL

# Initialize git if not already done
if [ ! -d ".git" ]; then
    echo "🔧 Initializing git repository..."
    git init
    git add .
    git commit -m "Initial WebSocket server setup for Railway"
fi

# Login to Railway (if not already logged in)
echo "🔐 Checking Railway authentication..."
railway login

# Create new Railway project
echo "🚀 Creating Railway project..."
railway project create

# Set environment variables
echo "⚙️ Setting up environment variables..."
echo "Please set the following environment variables in Railway dashboard:"
echo "1. ALLOWED_ORIGINS - Your main app URLs (comma-separated)"
echo "2. FRONTEND_URL - Your main application URL"
echo ""
echo "Example:"
echo "ALLOWED_ORIGINS=https://your-app.vercel.app,https://your-domain.com"
echo "FRONTEND_URL=https://your-app.vercel.app"

# Deploy to Railway
echo "🚀 Deploying to Railway..."
railway up

echo ""
echo "✅ WebSocket server deployment initiated!"
echo ""
echo "📋 Next Steps:"
echo "1. Go to Railway dashboard: https://railway.app/dashboard"
echo "2. Find your websocket project"
echo "3. Go to Variables tab and set:"
echo "   - ALLOWED_ORIGINS=https://your-main-app.vercel.app"
echo "   - FRONTEND_URL=https://your-main-app.vercel.app"
echo "4. Copy the Railway public URL"
echo "5. Update your main app's NEXT_PUBLIC_SOCKET_URL environment variable"
echo ""
echo "🔗 Your WebSocket server will be available at:"
echo "https://your-project-name.railway.app"

cd ..
echo "🎉 Deployment script completed!"

