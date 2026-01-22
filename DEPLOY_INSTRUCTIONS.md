# 🚀 Deployment Guide for Render

## 1. Prerequisites
Ensure you have the following environment variables ready for the Render Dashboard:
- `MONGO_URI`: Your MongoDB Atlas connection string (ensure `0.0.0.0/0` is whitelisted in Atlas Network Access).
- `GOOGLE_CLIENT_ID`: From Google Cloud Console.
- `GOOGLE_CLIENT_SECRET`: From Google Cloud Console.
- `GROQ_API_KEY`: For AI features.
- `TOMTOM_API_KEY` & `WEATHER_API_KEY`: For maps and weather.

## 2. Push to GitHub
Commit and push these changes to your GitHub repository:
```bash
git add .
git commit -m "Configure for Render deployment with fixes"
git push origin main
```

## 3. Create Blueprint on Render
1. Go to [Render Dashboard](https://dashboard.render.com).
2. Click **New +** -> **Blueprint**.
3. Connect your GitHub repository.
4. Render will read `render.yaml` and propose 2 services:
   - `fleetflow-backend` (Docker)
   - `fleetflow-frontend` (Static Site)
5. Click **Apply**.

## 4. Post-Deployment Configuration (CRITICAL)
Once the services are created, you MUST manually set the "Sensitive" environment variables in the Render Dashboard.

### 4.1. Get Your URLs
After the services are created (even if they fail initially), note down their URLs from the Dashboard:
- **Backend URL**: `https://fleetflow-backend.onrender.com` (example)
- **Frontend URL**: `https://fleetflow-frontend.onrender.com` (example)

### 4.2. Configure Backend Service
1. Open `fleetflow-backend` -> **Environment**.
2. Add/Update these values:
   - `MONGO_URI`: Your MongoDB connection string.
   - `CLIENT_URL`: **Paste your Frontend URL here** (remove trailing slash).
   - `BACKEND_URL`: **Paste your Backend URL here** (remove trailing slash).
   - `GOOGLE_CALLBACK_URL`: `https://<YOUR_BACKEND_URL>/api/auth/google/callback`
   - `GOOGLE_CLIENT_ID`: ...
   - `GOOGLE_CLIENT_SECRET`: ...
   - `GROQ_API_KEY`: ...
   - `JWT_SECRET`: (Click 'Generate' or type a random string)

### 4.3. Configure Frontend Service
1. Open `fleetflow-frontend` -> **Environment**.
2. Add/Update:
   - `VITE_API_URL`: **Paste your Backend URL here** (must start with `https://` and have NO trailing slash, e.g., `https://fleetflow-backend.onrender.com/api`).
     *Note: If you copied the backend root URL, make sure to append `/api` if your code expects it, OR just the root if your `config/api.js` handles it. Based on your code, just the root `https://...` is fine if the code appends `/api`, BUT safer to put `https://.../api` if you are unsure. Let's stick to: `https://<YOUR_BACKEND_URL>/api`*
   - `VITE_TOMTOM_API_KEY`: ...
   - `VITE_OPENWEATHER_API_KEY`: ...

3. **Trigger a Redeploy** of the Frontend so it picks up the new `VITE_API_URL`.

## 5. OAuth Configuration (Google Cloud Console)
Update your Google Cloud Console Credentials to allow the Render URL:
1. Go to APIs & Services -> Credentials.
2. Edit your OAuth 2.0 Client.
3. **Authorized JavaScript Origins**:
   - Add your Frontend URL (e.g., `https://fleetflow-frontend.onrender.com`)
4. **Authorized Redirect URIs**:
   - Add your Backend Callback URL:
     `https://fleetflow-backend.onrender.com/api/auth/google/callback`
   - (Replace `fleetflow-backend` with the actual random name Render might assign if it wasn't exact)

## 6. Troubleshooting
- **Notifications not working?**
  - Check browser console. If you see CORS errors, ensure `CLIENT_URL` in the backend matches the frontend URL exactly.
  - The deployment config now automatically sets `CLIENT_URL` so it should work.

- **Login not working?**
  - Ensure `MONGO_URI` is correct and the database user has permission.
