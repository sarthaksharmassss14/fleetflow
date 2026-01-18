# MongoDB Setup Steps (Already Installed)

Since MongoDB is installed but `mongosh` isn't in PATH, follow these steps:

## Step 1: Start MongoDB Service

MongoDB might not be running. Start it:

### Option A: Using Services (Easiest)

1. Press `Win + R`
2. Type `services.msc` and press Enter
3. Find **"MongoDB"** service in the list
4. If status is "Stopped", right-click → **"Start"**
5. If you don't see "MongoDB" service, go to **Step 2**

### Option B: Using Command Prompt (as Administrator)

```bash
net start MongoDB
```

---

## Step 2: Find MongoDB Installation Path

MongoDB is usually installed at:

```
C:\Program Files\MongoDB\Server\7.0\bin\
```

Or:

```
C:\Program Files\MongoDB\Server\6.0\bin\
```

### Check if it exists:

Open File Explorer and navigate to:

- `C:\Program Files\MongoDB\`

Look for a folder like:

- `Server\7.0\bin\` or
- `Server\6.0\bin\` or
- `Server\5.0\bin\`

---

## Step 3: Test MongoDB Connection

### Option A: Use Full Path

```bash
"C:\Program Files\MongoDB\Server\7.0\bin\mongosh.exe"
```

Replace `7.0` with your MongoDB version if different.

### Option B: Use Old `mongo` Command (if older version)

```bash
"C:\Program Files\MongoDB\Server\7.0\bin\mongo.exe"
```

---

## Step 4: Update .env File

Your `.env` file should have:

```env
MONGODB_URI=mongodb://localhost:27017/fleetflow
```

This will work regardless of whether `mongosh` is in PATH.

---

## Step 5: Test Backend Connection

Once MongoDB service is running, start your backend:

```bash
npm run dev:server
```

You should see: `✅ Connected to MongoDB`

---

## Quick Fix: Add MongoDB to PATH (Optional)

If you want `mongosh` to work from anywhere:

1. Copy MongoDB bin path (e.g., `C:\Program Files\MongoDB\Server\7.0\bin`)
2. Press `Win + R` → type `sysdm.cpl` → Enter
3. Go to **"Advanced"** tab → Click **"Environment Variables"**
4. Under **"System variables"**, select **"Path"** → Click **"Edit"**
5. Click **"New"** → Paste the MongoDB bin path
6. Click **OK** on all windows
7. **Close and reopen** your terminal

Then `mongosh` will work from any directory.

---

## Don't Worry About `mongosh` Command!

**Important**: You don't need `mongosh` command to use MongoDB with your backend!

Your backend uses the connection string `mongodb://localhost:27017/fleetflow` which works as long as:

1. ✅ MongoDB service is running
2. ✅ `.env` file has correct `MONGODB_URI`

That's it! The backend will connect automatically.
