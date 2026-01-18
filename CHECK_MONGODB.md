# Check If MongoDB Is Running - Simple Steps

## Step 1: Check MongoDB Service Status

### Method 1: Using Services Window (Easiest)

1. Press **`Win + R`**
2. Type: **`services.msc`**
3. Press **Enter**
4. Look for any service with **"Mongo"** in the name (like "MongoDB" or "MongoDB Server")
5. Check the **"Status"** column:
   - ✅ **Running** = MongoDB is active (you're good!)
   - ❌ **Stopped** = Need to start it (right-click → Start)

### Method 2: Using Command Prompt

Open PowerShell or Command Prompt and run:

```bash
sc query | findstr /i mongo
```

This shows all MongoDB services and their status.

---

## Step 2: Start MongoDB (If Stopped)

If MongoDB service is **Stopped**:

1. In Services window, find the MongoDB service
2. **Right-click** on it
3. Click **"Start"**
4. Wait a few seconds
5. Status should change to **"Running"**

---

## Step 3: Test Backend Connection

Once MongoDB is **Running**:

1. Make sure your `.env` file has:
   ```env
   MONGODB_URI=mongodb://localhost:27017/fleetflow
   ```

2. Start your backend:
   ```bash
   npm run dev:server
   ```

3. Look for this message:
   ```
   ✅ Connected to MongoDB
   ```

If you see that, MongoDB is working perfectly!

---

## Still Not Working?

### Find MongoDB Installation Paths

Check these common locations:

1. `C:\Program Files\MongoDB\`
2. `C:\Program Files (x86)\MongoDB\`
3. `C:\mongodb\`

If you find multiple MongoDB folders, that's okay - only the **service** matters!

### Which One Is Running?

The MongoDB **service** uses one installation. Check Services window:
- Right-click the MongoDB service → **Properties**
- Look at **"Path to executable"** - this shows which installation is being used

---

## Quick Test: Can Your Backend Connect?

**Don't worry about finding the exact MongoDB installation.**

Just:
1. ✅ Start MongoDB service (from Services window)
2. ✅ Update `.env` with `MONGODB_URI=mongodb://localhost:27017/fleetflow`
3. ✅ Run `npm run dev:server`

If backend connects, you're done! 🎉
