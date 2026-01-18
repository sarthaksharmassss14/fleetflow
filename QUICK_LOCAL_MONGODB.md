# Quick Local MongoDB Setup (Windows)

Since Atlas free tier isn't available, here's the fastest way to set up local MongoDB on Windows:

## Quick Setup Steps

### 1. Download MongoDB Community Server

- Go to: **https://www.mongodb.com/try/download/community**
- Select:
  - **Version**: 7.0 (or latest)
  - **Platform**: Windows
  - **Package**: MSI
- Click **"Download"**

### 2. Install MongoDB

1. Run the downloaded `.msi` installer
2. Choose **"Complete"** installation
3. ✅ Check **"Install MongoDB as a Service"**
4. Select **"Run service as Network Service user"**
5. Click **"Install"**

MongoDB will automatically start as a Windows service.

### 3. Verify Installation

Open PowerShell or Command Prompt:

```bash
mongosh
```

If you see the MongoDB shell prompt (`>`), you're good!

### 4. Update Your .env File

```env
MONGODB_URI=mongodb://localhost:27017/fleetflow
```

That's it! Your backend will connect automatically when you start the server.

---

## Troubleshooting

### MongoDB service not running?

1. Press `Win + R`
2. Type `services.msc` and press Enter
3. Find **"MongoDB"** service
4. Right-click → **"Start"**

### Can't find `mongosh` command?

MongoDB is installed but not in PATH. Start MongoDB manually:

```bash
# MongoDB default installation path
cd "C:\Program Files\MongoDB\Server\7.0\bin"
mongod.exe
```

Keep this window open while using MongoDB.

---

## Start Your Backend

Once MongoDB is running:

```bash
npm install
npm run dev:server
```

You should see: `✅ Connected to MongoDB`

---

**Note**: Local MongoDB uses no cloud resources and works offline. Perfect for development!
