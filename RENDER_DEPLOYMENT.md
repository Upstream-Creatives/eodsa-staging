# 🎨 Render.com WebSocket Deployment (Free Alternative)

## Why Render?
- ✅ **Free tier available**
- ✅ **No credit card required for basic usage**
- ✅ **WebSocket support**
- ✅ **Auto-deploy from GitHub**

## Step 1: Create GitHub Repository

1. **Create new repository** on GitHub (e.g., `eodsa-websocket-server`)
2. **Upload these files**:
   - `server.js` (copy from `server-railway.js`)
   - `package.json` (copy from `package-websocket.json`)
   - `render.yaml` (already created)

## Step 2: Deploy to Render

1. **Go to** [render.com](https://render.com)
2. **Sign up/Login** with GitHub
3. **New Web Service**
4. **Connect** your GitHub repository
5. **Use existing configuration** (render.yaml will be auto-detected)

## Step 3: Environment Variables

Render will automatically use the variables from `render.yaml`:
- `ALLOWED_ORIGINS`: https://eodsa.vercel.app,https://www.avalondance.co.za
- `FRONTEND_URL`: https://eodsa.vercel.app

## Step 4: Get Your WebSocket URL

After deployment, you'll get a URL like:
```
https://eodsa-websocket-server.onrender.com
```

## Step 5: Update Your Main App

Add to Vercel environment variables:
```env
NEXT_PUBLIC_SOCKET_URL=https://eodsa-websocket-server.onrender.com
```

## Pros and Cons

### ✅ Pros
- **Free tier** (750 hours/month)
- **No credit card required**
- **Auto-deploy from GitHub**
- **WebSocket support**
- **SSL certificates included**

### ⚠️ Cons
- **Cold starts** (30-60 seconds of inactivity)
- **Sleep after 15 minutes** of inactivity (free tier)
- **Limited to 750 hours/month** (free tier)

## Alternative: Railway Hobby Plan

For production use, consider upgrading Railway:
- **$5/month** for Hobby plan
- **No cold starts**
- **Always-on service**
- **Better performance**

## Quick GitHub Upload Script

```bash
# In websocket-deploy directory
git remote add origin https://github.com/yourusername/eodsa-websocket-server.git
git branch -M main
git push -u origin main
```

