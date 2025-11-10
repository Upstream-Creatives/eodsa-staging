# 🚄 Railway WebSocket Server Deployment Guide

## Overview

This guide walks you through deploying the EODSA WebSocket server to Railway for production use.

## Prerequisites

1. **Railway Account**: Sign up at [railway.app](https://railway.app)
2. **Railway CLI**: Install the Railway CLI
3. **Git**: Ensure git is installed and configured

## Step 1: Install Railway CLI

```bash
# Install Railway CLI globally
npm install -g @railway/cli

# Login to your Railway account
railway login
```

## Step 2: Prepare WebSocket Server

The files are already prepared for you:
- `server-railway.js` - Production-optimized WebSocket server
- `package-websocket.json` - Package configuration for Railway
- `railway.json` - Railway deployment configuration

## Step 3: Deploy to Railway

### Option A: Automated Deployment (Recommended)

```bash
# Make the deployment script executable
chmod +x deploy-websocket.sh

# Run the automated deployment
./deploy-websocket.sh
```

### Option B: Manual Deployment

```bash
# Create deployment directory
mkdir websocket-server
cd websocket-server

# Copy files
cp ../server-railway.js ./server.js
cp ../package-websocket.json ./package.json
cp ../railway.json ./railway.json

# Initialize git
git init
git add .
git commit -m "Initial WebSocket server setup"

# Create Railway project
railway project create

# Deploy
railway up
```

## Step 4: Configure Environment Variables

After deployment, set these environment variables in Railway dashboard:

### Required Variables

1. **ALLOWED_ORIGINS** (Required)
   ```
   https://your-main-app.vercel.app,https://your-custom-domain.com
   ```

2. **FRONTEND_URL** (Optional but recommended)
   ```
   https://your-main-app.vercel.app
   ```

### How to Set Variables

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Select your WebSocket project
3. Go to **Variables** tab
4. Add the environment variables above

## Step 5: Get Your WebSocket URL

After deployment, Railway will provide a public URL like:
```
https://your-project-name.railway.app
```

## Step 6: Update Your Main Application

Update your main app's environment variables:

### For Vercel Deployment

1. Go to your Vercel project dashboard
2. Go to **Settings** → **Environment Variables**
3. Add or update:
   ```
   NEXT_PUBLIC_SOCKET_URL=https://your-websocket-project.railway.app
   ```

### For Local Development

Update your `.env.local` file:
```env
NEXT_PUBLIC_SOCKET_URL=https://your-websocket-project.railway.app
```

## Step 7: Test the Connection

1. Deploy/restart your main application
2. Open the backstage dashboard
3. Check browser console for connection logs:
   ```
   🔌 Connecting to WebSocket server: https://your-websocket-project.railway.app
   🔌 Connected to socket server
   ```

## Health Check

Your WebSocket server includes a health check endpoint:
```
GET https://your-websocket-project.railway.app/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "connectedClients": 5
}
```

## Troubleshooting

### Connection Issues

1. **CORS Errors**
   - Ensure `ALLOWED_ORIGINS` includes your main app's URL
   - Check both `https://` and `http://` versions

2. **Connection Timeout**
   - Railway cold starts can take 30-60 seconds
   - The client will automatically retry connection

3. **WebSocket Upgrade Failed**
   - Railway supports WebSocket upgrades by default
   - Ensure your app uses both `websocket` and `polling` transports

### Debugging

1. **Check Railway Logs**
   ```bash
   railway logs
   ```

2. **Browser Console**
   - Look for connection errors
   - Check WebSocket upgrade messages

3. **Network Tab**
   - Verify WebSocket connection in browser dev tools
   - Check for 101 Switching Protocols response

## Railway Configuration Details

### Railway.json Explained

```json
{
  "build": {
    "builder": "NIXPACKS"              // Railway's automatic builder
  },
  "deploy": {
    "startCommand": "node server-railway.js",  // Start command
    "healthcheckPath": "/health",               // Health check endpoint
    "healthcheckTimeout": 300,                  // Health check timeout (5 min)
    "restartPolicyType": "ON_FAILURE",         // Restart on failure
    "restartPolicyMaxRetries": 10               // Max restart attempts
  }
}
```

### Server Optimizations

- **Health Check**: `/health` endpoint for Railway monitoring
- **CORS Configuration**: Environment-based CORS origins
- **Connection Handling**: Optimized ping/pong intervals
- **Error Handling**: Comprehensive error logging and recovery
- **Graceful Shutdown**: Proper SIGTERM handling

## Production Considerations

### Performance

- Railway provides automatic scaling
- WebSocket connections are sticky to instances
- Health checks ensure service availability

### Security

- CORS properly configured for your domains
- No sensitive data logged
- Proper error handling without exposing internals

### Monitoring

- Built-in health check endpoint
- Connection count tracking
- Comprehensive logging for debugging

## Cost Considerations

- Railway charges based on usage
- WebSocket servers use minimal CPU when idle
- Consider upgrading Railway plan for production traffic

## Support

If you encounter issues:

1. Check Railway documentation: [docs.railway.app](https://docs.railway.app)
2. Review Railway logs for specific errors
3. Test WebSocket connection with online tools
4. Ensure environment variables are correctly set

---

## Quick Reference

### Important URLs
- **Railway Dashboard**: https://railway.app/dashboard
- **Health Check**: `https://your-project.railway.app/health`
- **Environment Variables**: Railway Dashboard → Project → Variables

### Key Commands
```bash
railway login                    # Login to Railway
railway project create          # Create new project
railway up                      # Deploy to Railway
railway logs                    # View application logs
railway status                  # Check deployment status
```

### Environment Variables Template
```env
ALLOWED_ORIGINS=https://your-app.vercel.app,https://your-domain.com
FRONTEND_URL=https://your-app.vercel.app
```

