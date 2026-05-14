# Deploying the WhatsApp Bot

## The session problem

Baileys stores your WhatsApp login in the `session/` folder. If the platform
wipes the disk on restart, you'll need to re-pair your phone every time.

**Solution:** use a persistent volume / disk mount at the `session/` path.

---

## Railway (recommended)

1. Push this folder to a GitHub repo (or use Railway's CLI)
2. Create a new project on [railway.app](https://railway.app) → Deploy from GitHub
3. Railway auto-detects the Dockerfile and builds it
4. **Add a persistent volume:**
   - Service → Settings → Volumes → Add Volume
   - Mount path: `/app/session`
   - This keeps your session across restarts
5. **Set environment variables** in Railway → Variables:
   - No extra vars needed — config is in `config.js`
6. Railway gives you a public URL like `https://your-app.up.railway.app`
7. Your webhook endpoint will be: `https://your-app.up.railway.app/webhook`

**Expose port 4000:** Railway auto-detects the exposed port from the Dockerfile.

---

## Koyeb (always-free, but no persistent storage)

1. Push to GitHub
2. Create a new app on [koyeb.com](https://koyeb.com) → Deploy from GitHub
3. Set build to Docker
4. Set port to `4000`
5. **Session warning:** Koyeb's free tier has ephemeral storage. Your session
   will be lost on restart. You'll need to re-pair your phone after each restart.
   This is workable if your bot rarely restarts.
6. Your webhook URL: `https://your-app.koyeb.app/webhook`

---

## Render

1. Push to GitHub
2. Create a new **Web Service** on [render.com](https://render.com)
3. Connect your repo — Render auto-detects the Dockerfile
4. Set port to `4000`
5. **Add a Disk** (optional, ~$0.25/month) mounted at `/app/session`
   for persistent sessions. Without it, sessions reset on restart (~15min idle).
6. Your webhook URL: `https://your-app.onrender.com/webhook`

---

## After deploying (any platform)

1. Check the logs — you'll see the pairing code or QR code output
2. Pair your phone via WhatsApp → Linked Devices
3. Once connected, the bot logs `✅ Connected as ...`
4. Go to your dashboard → Webhooks → update the URL to your new public URL
5. Hit **Test** to confirm everything is working
