#!/bin/bash

# EODSA WebSocket - Fully Automated Railway Deployment
# This script will deploy and configure everything automatically

set -e  # Exit on any error

echo "🚄 EODSA WebSocket - Fully Automated Railway Deployment"
echo "=================================================="

# Configuration (CONFIGURED FOR YOUR EODSA SETUP)
MAIN_APP_URL="${MAIN_APP_URL:-https://eodsa.vercel.app}"
PROJECT_NAME="${PROJECT_NAME:-eodsa-websocket-server}"
ADDITIONAL_DOMAINS="${ADDITIONAL_DOMAINS:-https://www.avalondance.co.za}"

# Prompt for required information if not provided
if [ -z "$MAIN_APP_URL" ]; then
    echo "📝 Please provide your main app URL:"
    read -p "Main App URL (e.g., https://your-app.vercel.app): " MAIN_APP_URL
fi

if [ -z "$MAIN_APP_URL" ]; then
    echo "❌ Main App URL is required!"
    exit 1
fi

echo "🔧 Configuration:"
echo "  Main App URL: $MAIN_APP_URL"
echo "  Project Name: $PROJECT_NAME"
echo "  Additional Domains: ${ADDITIONAL_DOMAINS:-None}"
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "📦 Installing Railway CLI..."
    npm install -g @railway/cli
fi

# Check if user is logged in
echo "🔐 Checking Railway authentication..."
if ! railway whoami &> /dev/null; then
    echo "Please login to Railway:"
    railway login
fi

# Create deployment directory
echo "📁 Setting up deployment directory..."
rm -rf websocket-deployment
mkdir websocket-deployment
cd websocket-deployment

# Copy and prepare files
echo "📋 Preparing deployment files..."
cp ../server-railway.js ./server.js
cp ../package-websocket.json ./package.json
cp ../railway.json ./railway.json

# Create .env file with provided configuration
echo "⚙️ Creating environment configuration..."
cat > .env << EOF
ALLOWED_ORIGINS=${MAIN_APP_URL}${ADDITIONAL_DOMAINS:+,${ADDITIONAL_DOMAINS}}
FRONTEND_URL=${MAIN_APP_URL}
NODE_ENV=production
EOF

# Initialize git
git init
git add .
git commit -m "Initial WebSocket server deployment"

# Create Railway project
echo "🚀 Creating Railway project..."
railway project create --name "$PROJECT_NAME"

# Set environment variables
echo "🔧 Setting environment variables..."
railway variables set ALLOWED_ORIGINS="${MAIN_APP_URL}${ADDITIONAL_DOMAINS:+,${ADDITIONAL_DOMAINS}}"
railway variables set FRONTEND_URL="$MAIN_APP_URL"
railway variables set NODE_ENV="production"

# Deploy to Railway
echo "🚀 Deploying to Railway..."
railway up --detach

# Wait for deployment
echo "⏳ Waiting for deployment to complete..."
sleep 30

# Get the Railway URL
echo "🔍 Getting Railway deployment URL..."
RAILWAY_URL=$(railway status --json | jq -r '.deployments[0].url' 2>/dev/null || echo "")

if [ -z "$RAILWAY_URL" ]; then
    echo "⚠️  Could not automatically detect Railway URL"
    echo "📋 Please check Railway dashboard for your WebSocket URL"
    RAILWAY_URL="https://your-project.railway.app"
else
    echo "✅ WebSocket server deployed to: $RAILWAY_URL"
fi

# Create environment file for main app
echo "📄 Creating environment configuration for your main app..."
cat > ../websocket-env-config.txt << EOF
# Add this to your main application's environment variables:

NEXT_PUBLIC_SOCKET_URL=$RAILWAY_URL

# For Vercel:
# 1. Go to your Vercel project dashboard
# 2. Settings → Environment Variables
# 3. Add: NEXT_PUBLIC_SOCKET_URL = $RAILWAY_URL

# For local development (.env.local):
NEXT_PUBLIC_SOCKET_URL=$RAILWAY_URL
EOF

# Test the deployment
echo "🧪 Testing WebSocket deployment..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$RAILWAY_URL/health" || echo "000")

if [ "$HTTP_STATUS" = "200" ]; then
    echo "✅ Health check passed! WebSocket server is running correctly."
else
    echo "⚠️  Health check returned status: $HTTP_STATUS"
    echo "🔍 Check Railway logs: railway logs"
fi

cd ..

echo ""
echo "🎉 DEPLOYMENT COMPLETE!"
echo "========================"
echo ""
echo "✅ WebSocket Server: $RAILWAY_URL"
echo "✅ Health Check: $RAILWAY_URL/health"
echo "✅ Environment file created: websocket-env-config.txt"
echo ""
echo "📋 Next Steps:"
echo "1. Add this to your main app environment:"
echo "   NEXT_PUBLIC_SOCKET_URL=$RAILWAY_URL"
echo ""
echo "2. Deploy/restart your main application"
echo ""
echo "3. Test backstage functionality with real-time updates"
echo ""
echo "🔧 Management Commands:"
echo "   railway logs          # View server logs"
echo "   railway status        # Check deployment status"
echo "   railway open          # Open Railway dashboard"
echo ""
echo "🎭 Your backstage management system is now LIVE!"
