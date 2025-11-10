# 🚄 Railway WebSocket Quick Start

## 1-Minute Railway Deployment

### Quick Deploy

```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login
railway login

# 3. Deploy (automated)
chmod +x deploy-websocket.sh
./deploy-websocket.sh
```

### Manual Setup

```bash
# Create deployment folder
mkdir websocket-server && cd websocket-server

# Copy files
cp ../server-railway.js ./server.js
cp ../package-websocket.json ./package.json
cp ../railway.json ./railway.json

# Deploy
railway project create
railway up
```

### Configure Environment

1. **Go to Railway Dashboard**: https://railway.app/dashboard
2. **Select your WebSocket project**
3. **Go to Variables tab**
4. **Add environment variables**:
   ```
   ALLOWED_ORIGINS=https://your-main-app.vercel.app
   FRONTEND_URL=https://your-main-app.vercel.app
   ```

### Update Main App

**In your main app's environment variables:**
```env
NEXT_PUBLIC_SOCKET_URL=https://your-websocket-project.railway.app
```

### Test Connection

1. **Health Check**: `https://your-project.railway.app/health`
2. **Browser Console**: Look for `🔌 Connected to socket server`
3. **Backstage Dashboard**: Test drag & drop functionality

## Troubleshooting

- **CORS Issues**: Check `ALLOWED_ORIGINS` includes your app URL
- **Connection Timeout**: Railway cold start takes 30-60 seconds
- **WebSocket Upgrade**: Ensure both `websocket` and `polling` transports

## Quick Commands

```bash
railway logs          # View logs
railway status        # Check deployment
railway open          # Open project in browser
railway vars set KEY=VALUE  # Set environment variable
```

---

**🎯 Your WebSocket server will be live at**: `https://your-project.railway.app`

**✅ Ready for production backstage management!**

