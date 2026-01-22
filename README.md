# 🚛 FleetFlow - AI-Powered Logistics Optimization Platform

FleetFlow is a modern logistics management platform designed to optimize delivery routes using advanced AI models (Llama 3 via Groq). It features real-time route planning, fleet management, and secure authentication.

![FleetFlow Dashboard](![Uploading Screenshot 2026-01-20 163643.png…]()
)

## 🚀 Features

### 🧠 **AI Route Optimization**
- **Smart Routing**: Generates the most efficient delivery routes using **Llama 3.3-70b**.
- **Constraints Handling**: Respects Time Windows (e.g., "9 AM - 12 PM") and Priorities (Urgent > Normal).
- **Physics-Based Feasibility**: Automatically flags impossible routes (e.g., traveling 200km in 1 hour).
- **Fallback Logic**: Robust internal algorithms ensure routing works even if AI services are down.

### 📍 **Real-Time Logistics**
- **Dynamic Cost Calculation**: Estimates fuel, wages, and tolls based on Indian road economics.
- **Geocoding**: integrated with TomTom & OpenWeather for precise address resolution and route stats.
- **Traffic Awareness**: Adjusts estimates based on real-time traffic conditions.

### 🔐 **Enterprise-Grade Security**
- **Google OAuth 2.0**: Seamless one-click login.
- **Passport.js Authentication**: Secure session handling.
- **Role-Based Access**: Granular permissions for Admins, Dispatchers, and Drivers.

### ☁️ **Cloud Native**
- **Deployment Ready**: Fully configured for **Render** (Docker + Static Site).
- **Database**: Scalable **MongoDB Atlas** integration.
- **Environment**: Zero-config deployment with automatic environment syncing.

---

## 🛠️ Tech Stack

- **Frontend**: React (Vite), CSS3 (Glassmorphism UI)
- **Backend**: Node.js, Express.js
- **Database**: MongoDB Atlas
- **AI Engine**: Groq SDK (Llama 3.3-70b-versatile)
- **Maps**: TomTom API
- **Auth**: Passport.js, JWT, Google OAuth

---

## 📦 Installation & Local Setup

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/yourusername/fleetflow.git
    cd fleetflow
    ```

2.  **Install Dependencies**
    ```bash
    # Install Root/Frontend dependencies
    npm install

    # Install Backend dependencies
    cd server
    npm install
    cd ..
    ```

3.  **Configure Environment**
    Create a `.env` file in the root directory (or use the example provided):
    ```env
    # Server
    PORT=5000
    MONGODB_URI=your_mongodb_connection_string
    JWT_SECRET=your_jwt_secret

    # AI
    GROQ_API_KEY=your_groq_api_key
    GROQ_MODEL=llama-3.3-70b-versatile

    # External Tools
    TOMTOM_API_KEY=your_tomtom_key
    WEATHER_API_KEY=your_weather_key
    
    # Auth
    GOOGLE_CLIENT_ID=your_google_client_id
    GOOGLE_CLIENT_SECRET=your_google_client_secret
    CLIENT_URL=http://localhost:5173
    GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
    ```

4.  **Run Locally**
    ```bash
    # Use concurrently to run client and server
    npm run dev
    ```
    Access the app at `http://localhost:5173`.

---

## 🌐 Deployment (Render)

This project is optimized for deployment on [Render](https://render.com).

1.  **Create a New Blueprint**
    - Connect your GitHub repo.
    - Render will auto-detect `render.yaml`.
    - It creates two services: `fleetflow-backend` (Docker) and `fleetflow-frontend` (Static).

2.  **Set Environment Variables (Dashboard)**
    After creation, manually set these in the Render Dashboard:

    **Backend Service:**
    - `MONGODB_URI`: Connection string from Atlas. (Must whitelist `0.0.0.0/0` in Atlas Network Access).
    - `CLIENT_URL`: `https://your-frontend-url.onrender.com`
    - `BACKEND_URL`: `https://your-backend-url.onrender.com`
    - `GOOGLE_CALLBACK_URL`: `https://your-backend-url.onrender.com/api/auth/google/callback`
    - Keys: `GROQ_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, etc.

    **Frontend Service:**
    - `VITE_API_URL`: `https://your-backend-url.onrender.com/api`
    - `VITE_TOMTOM_API_KEY`, `VITE_OPENWEATHER_API_KEY`

3.  **Update Google Cloud Config**
    - Add your **Frontend URL** to "Authorized JavaScript Origins".
    - Add your **Backend Callback URL** to "Authorized Redirect URIs".

---

## 📂 Project Structure

```
fleetflow/
├── server/                 # Backend (Node/Express)
│   ├── models/             # Mongoose Schemas (Route, User, etc.)
│   ├── routes/             # API Endpoints
│   ├── services/           # Business Logic (AI, Socket, Auth)
│   └── index.js            # Entry Point
├── src/                    # Frontend (React)
│   ├── components/         # Reusable UI Components
│   ├── context/            # Auth & State Management
│   ├── pages/              # App Pages (Dashboard, Tracking, etc.)
│   └── main.jsx            # React Entry
├── render.yaml             # Deployment Configuration
└── package.json            # Root Scripts
```

---

## 🤝 Contributing

1. Fork the repo.
2. Create a feature branch: `git checkout -b feature/AmazingFeature`.
3. Commit your changes: `git commit -m 'Add some AmazingFeature'`.
4. Push to the branch: `git push origin feature/AmazingFeature`.
5. Open a Pull Request.

---

**Built with ❤️ for Modern Logistics.**
