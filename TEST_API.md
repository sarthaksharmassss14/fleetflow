# How to Test API Endpoints - Quick Guide

## Method 1: Browser (Easiest for GET requests)

### Test Health Check:

1. Open your browser
2. Go to: `http://localhost:5000/api/health`
3. You should see JSON response

---

## Method 2: VS Code REST Client Extension (Best for Development)

### Setup:

1. Install extension: **REST Client** (by Huachao Mao)
2. Create file: `test-api.http` in root folder
3. Copy content below
4. Click "Send Request" above each request

### `test-api.http` file content:

```http
### Health Check
GET http://localhost:5000/api/health

###

### Register User
POST http://localhost:5000/api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "dispatcher"
}

###

### Login
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}

###

### Get Current User (Replace YOUR_TOKEN with actual token from login)
GET http://localhost:5000/api/auth/me
Authorization: Bearer YOUR_TOKEN

###

### Generate Route (Replace YOUR_TOKEN)
POST http://localhost:5000/api/routes/optimize
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "deliveries": [
    {
      "address": "123 Main St, New York, NY",
      "priority": "high",
      "timeWindow": "9:00 AM - 12:00 PM"
    },
    {
      "address": "456 Oak Ave, Brooklyn, NY",
      "priority": "normal",
      "timeWindow": "2:00 PM - 5:00 PM"
    }
  ],
  "vehicleData": {
    "capacity": 1000,
    "type": "van"
  }
}

###

### Get All Routes (Replace YOUR_TOKEN)
GET http://localhost:5000/api/routes
Authorization: Bearer YOUR_TOKEN
```

**After installing REST Client extension, just click "Send Request" above each request!**

---

## Method 3: Postman (GUI Tool)

### Setup:

1. Download: https://www.postman.com/downloads/
2. Install and open Postman
3. Create new request:
   - Method: `GET` or `POST`
   - URL: `http://localhost:5000/api/health`
   - Headers: `Content-Type: application/json` (for POST)
   - Body (for POST): Select "raw" → "JSON" → paste JSON
4. Click "Send"

### For Auth endpoints:

1. **Register/Login** → Copy the `token` from response
2. **Other requests** → Add header:
   - Key: `Authorization`
   - Value: `Bearer YOUR_TOKEN_HERE`

---

## Method 4: curl (Command Line)

### Windows PowerShell:

```powershell
# Health Check
curl http://localhost:5000/api/health

# Register
curl -Method POST http://localhost:5000/api/auth/register -ContentType "application/json" -Body '{"name":"Test","email":"test@example.com","password":"pass123","role":"dispatcher"}'

# Login (save token from response)
curl -Method POST http://localhost:5000/api/auth/login -ContentType "application/json" -Body '{"email":"test@example.com","password":"pass123"}'

# Use token (replace YOUR_TOKEN)
curl -Headers @{"Authorization"="Bearer YOUR_TOKEN"} http://localhost:5000/api/routes
```

### Linux/Mac Terminal:

```bash
# Health Check
curl http://localhost:5000/api/health

# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com","password":"pass123","role":"dispatcher"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"pass123"}'

# Use token (replace YOUR_TOKEN)
curl http://localhost:5000/api/routes \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Method 5: Online Tools

- **HTTPie Online**: https://httpie.io/app
- **ReqBin**: https://reqbin.com/
- **Insomnia**: https://insomnia.rest/download (desktop app)

---

## Quick Test Sequence:

1. **Test server is running:**

   ```
   Browser: http://localhost:5000/api/health
   ```

2. **Register a user:**

   ```json
   POST /api/auth/register
   {
     "name": "Test User",
     "email": "test@example.com",
     "password": "test123",
     "role": "dispatcher"
   }
   ```

3. **Login to get token:**

   ```json
   POST /api/auth/login
   {
     "email": "test@example.com",
     "password": "test123"
   }
   ```

   **Copy the `token` from response!**

4. **Use token for other endpoints:**
   ```
   Authorization: Bearer YOUR_TOKEN_HERE
   ```

---

## Recommended: VS Code REST Client

**Easiest for development** - Just install extension and use the `.http` file above!
