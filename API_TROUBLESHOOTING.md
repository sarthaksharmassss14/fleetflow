# API Troubleshooting - Register/Login Issues

## Common Issues & Fixes

### 1. Check Server Console for Errors

When you try to register/login, **check the terminal where your backend is running**. Look for error messages!

---

### 2. Required Fields Missing

Make sure your JSON request has **all required fields**:

**Register:**
```json
{
  "name": "John Doe",           // ✅ Required
  "email": "john@example.com",  // ✅ Required
  "password": "password123",    // ✅ Required
  "role": "dispatcher"          // Optional (defaults to "dispatcher")
}
```

**Login:**
```json
{
  "email": "john@example.com",  // ✅ Required
  "password": "password123"     // ✅ Required
}
```

---

### 3. Check Content-Type Header

Make sure you're sending `Content-Type: application/json` header!

**In VS Code REST Client** (already included in `.http` file):
```http
Content-Type: application/json
```

**In Postman:**
- Headers tab → Add: `Content-Type: application/json`
- Body tab → Select "raw" → Select "JSON"

**In Browser (fetch/curl):**
- Use proper JSON format

---

### 4. Email Already Exists

If you tried to register before, the email might already exist in database.

**Solutions:**
- Use a different email
- Or delete the user from MongoDB:
  1. Open MongoDB shell or Compass
  2. Go to `fleetflow` database → `users` collection
  3. Delete the document with that email

---

### 5. Validation Errors

**Check server console** for specific validation errors like:
- "name is required"
- "email is required"
- "password is required"
- "email must be valid format"

---

### 6. MongoDB Connection Issue

If MongoDB isn't connected, you'll get errors.

**Check:**
- MongoDB service is running (Services → MongoDB)
- `.env` file has correct `MONGODB_URI`
- Server console shows: `✅ Connected to MongoDB`

---

## Quick Test with VS Code REST Client

1. Make sure REST Client extension is installed
2. Open `test-api.http`
3. **Test Health Check first:**
   ```http
   GET http://localhost:5000/api/health
   ```
   Should return: `{"status":"ok","message":"FleetFlow API is running"}`

4. **Test Register:**
   ```http
   POST http://localhost:5000/api/auth/register
   Content-Type: application/json
   
   {
     "name": "Test User",
     "email": "test@example.com",
     "password": "test123",
     "role": "dispatcher"
   }
   ```

5. **Check Response:**
   - ✅ Success: `{"success":true,"message":"User registered successfully",...}`
   - ❌ Error: Check the error message in response

---

## Debug Steps

1. **Start backend** (if not running):
   ```bash
   npm run dev:server
   ```

2. **Check backend is running:**
   - Browser: `http://localhost:5000/api/health`
   - Should return JSON

3. **Check `.env` file exists** with:
   ```
   MONGODB_URI=mongodb://localhost:27017/fleetflow
   JWT_SECRET=your-secret-key
   ```

4. **Check MongoDB is running:**
   - Services → MongoDB should be "Running"

5. **Try register again** and **check server console** for error messages

---

## Still Not Working?

**Check the server console output** - it will show the exact error!

Common errors:
- `ValidationError` → Missing required field
- `MongoServerError` → Database issue
- `CastError` → Wrong data type
- `SyntaxError` → JSON format issue

**Share the error message** from server console for specific help!
