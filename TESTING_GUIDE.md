# Testing Guide for Admin Panel Fixes

This guide will help you test all the fixes made to Warehouse, Fleet, Finance pages, OAuth, and Socket.io notifications.

## 📋 Prerequisites

1. **Deploy changes to EC2** (if not already done):
```bash
# On EC2
cd ~/fleetflow
git pull  # If you pushed changes to GitHub
# OR manually copy changed files

# Rebuild containers
docker compose -f docker-compose.prod.yml up -d --build
```

2. **Check containers are running**:
```bash
docker compose -f docker-compose.prod.yml ps
# Should show both backend and frontend as "Up"
```

3. **Verify environment variables** (in `.env` file):
```bash
CLIENT_URL=https://13-211-252-48.sslip.io
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=https://13-211-252-48.sslip.io/api/auth/google/callback
```

---

## 🧪 Testing Steps

### 1. **Open Browser Developer Tools**

Before starting, open your browser's Developer Tools:
- **Chrome/Edge**: Press `F12` or `Ctrl+Shift+I` (Windows) / `Cmd+Option+I` (Mac)
- **Firefox**: Press `F12` or `Ctrl+Shift+I` (Windows) / `Cmd+Option+I` (Mac)

Go to:
- **Console tab** - To see JavaScript errors/logs
- **Network tab** - To see API requests/responses

---

### 2. **Test Warehouse Page** 🏭

**Steps:**
1. Login to your admin account
2. Navigate to Dashboard
3. Click on **"Warehouse"** card (or go to `/warehouse`)

**What to check:**
- ✅ Page loads without errors
- ✅ Delivery list displays (even if empty)
- ✅ No console errors
- ✅ Network tab shows successful API call to `/api/deliveries`

**Test Actions:**
1. **Add Delivery:**
   - Click "+ New Delivery"
   - Fill in: Customer Name, Address, Weight, Type
   - Click "Save Order"
   - ✅ Should see new delivery in list
   - ✅ Check Network tab: POST `/api/deliveries` returns 200

2. **Edit Delivery:**
   - Click "Edit" on any delivery
   - Change status or details
   - Click "Save Order"
   - ✅ Changes should reflect immediately

3. **Delete Delivery:**
   - Click "Delete" on a delivery
   - Confirm deletion
   - ✅ Delivery should disappear from list

**Console Checks:**
```javascript
// Should see:
✅ "Fetching suggestions for: [address]" (when typing address)
✅ "API Response:" with location suggestions
✅ No "Failed to fetch" errors
✅ No CORS errors
```

**Network Tab Checks:**
- All requests should go to: `https://13-211-252-48.sslip.io/api/deliveries`
- Status codes: 200 (success), 201 (created)
- No 401 (unauthorized) or 500 (server error)

---

### 3. **Test Fleet Page** 🚛

**Steps:**
1. From Dashboard, click **"Fleet"** card (or go to `/fleet`)

**What to check:**
- ✅ Page loads without errors
- ✅ Vehicle list displays (even if empty)
- ✅ No console errors
- ✅ Network tab shows successful API call to `/api/vehicles`

**Test Actions:**
1. **Add Vehicle:**
   - Click "+ Add Vehicle"
   - Fill in: Name, Registration, Type, Capacity, Fuel, Mileage
   - Click "Save Vehicle"
   - ✅ Should see new vehicle in grid
   - ✅ Check Network tab: POST `/api/vehicles` returns 200

2. **Edit Vehicle:**
   - Click "Edit" on any vehicle
   - Change details
   - Click "Update Vehicle"
   - ✅ Changes should reflect immediately

3. **Delete Vehicle:**
   - Click "Delete" on a vehicle
   - Confirm deletion
   - ✅ Vehicle should disappear

**Console Checks:**
```javascript
// Should see:
✅ No "Error fetching vehicles" messages
✅ No CORS errors
✅ No "Failed to fetch" errors
```

**Network Tab Checks:**
- All requests to: `https://13-211-252-48.sslip.io/api/vehicles`
- Status: 200 (success), 201 (created)
- No 401 or 500 errors

---

### 4. **Test Finance Page** 💰

**Steps:**
1. From Dashboard, click **"Finance"** card (or go to `/finance`)

**What to check:**
- ✅ Page loads without errors
- ✅ KPI cards show values (even if ₹0)
- ✅ Monthly chart displays
- ✅ Cost breakdown shows percentages
- ✅ No console errors
- ✅ Network tab shows successful API call to `/api/routes`

**Test Actions:**
1. **Check Data Display:**
   - If you have routes, should see:
     - Total Cost, Fuel Expenses, Driver Wages, Maintenance
     - Monthly trend chart (bars)
     - Cost distribution pie chart

2. **Create a Route** (if none exist):
   - Go back to Dashboard
   - Create a route with deliveries
   - Return to Finance page
   - ✅ Should see updated costs

**Console Checks:**
```javascript
// Should see:
✅ No "Error fetching finance data" messages
✅ No CORS errors
```

**Network Tab Checks:**
- Request to: `https://13-211-252-48.sslip.io/api/routes`
- Status: 200 (success)
- Response contains route data with `costBreakdown`

---

### 5. **Test OAuth (Google Login)** 🔐

**Steps:**
1. Logout from current session
2. Go to Login page (`/login`)
3. Click **"Continue with Google"** button

**What to check:**
- ✅ Redirects to Google OAuth page
- ✅ After Google login, redirects back to your app
- ✅ Should land on `/auth-success` or `/dashboard`
- ✅ User is logged in

**Test Scenarios:**

**Scenario A: New User**
1. Use a Google account that hasn't logged in before
2. ✅ Should redirect to `/signup` with OAuth data
3. Select role (admin/dispatcher/driver)
4. ✅ Should complete registration and login

**Scenario B: Existing User**
1. Use a Google account that already exists
2. ✅ Should directly login and redirect to `/dashboard`
3. ✅ User data should be correct

**Console Checks:**
```javascript
// Should see:
✅ No "OAuth error" messages
✅ No CORS errors
✅ Successful redirect
```

**Network Tab Checks:**
- Request to: `https://13-211-252-48.sslip.io/api/auth/google`
- Should redirect to: `https://accounts.google.com/...`
- Callback: `https://13-211-252-48.sslip.io/api/auth/google/callback`
- Final redirect to: `/auth-success` or `/dashboard`

**Common Issues:**
- ❌ **"redirect_uri_mismatch"**: Check `GOOGLE_CALLBACK_URL` in `.env` matches Google Console settings
- ❌ **CORS error**: Check `CLIENT_URL` in backend `.env`
- ❌ **404 on callback**: Verify route exists in `server/routes/auth.routes.js`

---

### 6. **Test Socket.io Notifications** 🔔

**Steps:**
1. Login as **Admin** or **Dispatcher**
2. Open Dashboard
3. Look for **🔔 notification bell** in header (top right)

**What to check:**
- ✅ Notification bell appears
- ✅ No console errors about Socket connection
- ✅ Console shows: `"🔌 Connected to notification server"`

**Test Actions:**

**Test 1: Create Route (should trigger notification)**
1. As Dispatcher, create a new route
2. ✅ Should see notification appear in bell
3. ✅ Unread count badge should increment
4. Click bell to see notifications
5. ✅ Should see: "Route #XXXXXX: Route created" or similar

**Test 2: Update Route**
1. Select a route
2. Assign a driver or change status
3. ✅ Should see notification: "Route #XXXXXX: Route updated"

**Test 3: Real-time Updates**
1. Open Dashboard in **two browser windows** (or two devices)
2. Login as different users (e.g., Admin + Dispatcher)
3. In one window, create/update a route
4. ✅ Other window should receive notification automatically

**Console Checks:**
```javascript
// Should see:
✅ "🔌 Connected to notification server"
✅ "✅ Socket [id] authenticated for user [userId] (admin)"
✅ "RT Update Received:" when notification arrives
✅ "🔔 Route Notification:" messages
✅ No "Failed to connect" errors
✅ No CORS errors
```

**Network Tab Checks:**
- WebSocket connection to: `wss://13-211-252-48.sslip.io/socket.io/`
- Status: 101 (Switching Protocols) or "WebSocket" in type column
- Should see periodic ping/pong messages

**Manual Socket Test (Advanced):**
Open browser console and run:
```javascript
// Check if socket is connected
const socket = io('https://13-211-252-48.sslip.io', {
  transports: ['websocket', 'polling']
});

socket.on('connect', () => {
  console.log('✅ Socket connected:', socket.id);
});

socket.on('route_notification', (data) => {
  console.log('✅ Notification received:', data);
});
```

---

## 🐛 Troubleshooting

### Issue: Pages show "Loading..." forever

**Check:**
1. Open Network tab
2. Look for failed requests (red)
3. Check error message:
   - **401 Unauthorized**: Token expired, logout and login again
   - **500 Server Error**: Check backend logs: `docker logs fleetflow-backend`
   - **CORS Error**: Check `CLIENT_URL` in backend `.env`

**Fix:**
```bash
# On EC2, check backend logs
docker logs fleetflow-backend --tail=50

# Check if API is accessible
curl https://13-211-252-48.sslip.io/api/health
```

---

### Issue: OAuth redirects to wrong URL

**Check:**
1. Verify `GOOGLE_CALLBACK_URL` in `.env`:
   ```
   GOOGLE_CALLBACK_URL=https://13-211-252-48.sslip.io/api/auth/google/callback
   ```

2. Verify Google Console settings:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - APIs & Services → Credentials
   - Edit your OAuth 2.0 Client
   - Authorized redirect URIs should include:
     ```
     https://13-211-252-48.sslip.io/api/auth/google/callback
     ```

**Fix:**
```bash
# Update .env on EC2
nano ~/fleetflow/.env
# Add/update GOOGLE_CALLBACK_URL
# Restart containers
docker compose -f docker-compose.prod.yml restart backend
```

---

### Issue: Socket.io not connecting

**Check:**
1. Console should show connection attempt
2. Check Network tab for WebSocket connection
3. Verify CORS settings in `server/services/socket.service.js`

**Fix:**
```bash
# Check backend logs
docker logs fleetflow-backend | grep -i socket

# Verify socket service is initialized
# Should see: "🔌 Socket.io initialized"
```

**Manual Test:**
```javascript
// In browser console
const socket = io('https://13-211-252-48.sslip.io', {
  transports: ['websocket', 'polling']
});

socket.on('connect', () => console.log('Connected!'));
socket.on('connect_error', (err) => console.error('Error:', err));
```

---

### Issue: API calls failing with CORS

**Check:**
1. Network tab shows CORS error
2. Verify `CLIENT_URL` in backend `.env`:
   ```
   CLIENT_URL=https://13-211-252-48.sslip.io
   ```

**Fix:**
```bash
# Update .env
nano ~/fleetflow/.env
# Ensure CLIENT_URL is set correctly
# Restart backend
docker compose -f docker-compose.prod.yml restart backend
```

---

## ✅ Success Checklist

After testing, you should have:

- [x] Warehouse page loads and CRUD operations work
- [x] Fleet page loads and CRUD operations work
- [x] Finance page shows cost analysis
- [x] Google OAuth login works (new and existing users)
- [x] Socket.io connects and shows notifications
- [x] No console errors
- [x] All API calls return 200/201 status
- [x] Real-time notifications appear when routes change

---

## 📝 Quick Test Script

Run this in browser console after login to test all features:

```javascript
// Test API Service
async function testAll() {
  console.log('🧪 Testing API endpoints...');
  
  // Test 1: Deliveries
  try {
    const deliveries = await fetch('/api/deliveries', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    console.log('✅ Deliveries API:', deliveries.ok ? 'OK' : 'FAILED');
  } catch (e) { console.error('❌ Deliveries:', e); }
  
  // Test 2: Vehicles
  try {
    const vehicles = await fetch('/api/vehicles', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    console.log('✅ Vehicles API:', vehicles.ok ? 'OK' : 'FAILED');
  } catch (e) { console.error('❌ Vehicles:', e); }
  
  // Test 3: Routes
  try {
    const routes = await fetch('/api/routes', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    console.log('✅ Routes API:', routes.ok ? 'OK' : 'FAILED');
  } catch (e) { console.error('❌ Routes:', e); }
  
  // Test 4: Socket
  console.log('✅ Socket:', window.io ? 'Available' : 'Not Available');
}

testAll();
```

---

## 🆘 Still Having Issues?

1. **Check backend logs:**
   ```bash
   docker logs fleetflow-backend --tail=100
   ```

2. **Check frontend logs:**
   ```bash
   docker logs fleetflow-frontend --tail=100
   ```

3. **Verify environment variables:**
   ```bash
   docker exec fleetflow-backend env | grep -E "CLIENT_URL|GOOGLE"
   ```

4. **Test API directly:**
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
        https://13-211-252-48.sslip.io/api/deliveries
   ```

---

**Happy Testing! 🚀**

