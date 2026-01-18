# FleetFlow Backend API

Backend server for FleetFlow - AI Logistics Route Optimizer using Express.js, MongoDB, and Google Gemini API.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Create a `.env` file in the root directory:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/fleetflow
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
GEMINI_API_KEY=your-gemini-api-key-here
```

### 3. Get Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Add it to your `.env` file as `GEMINI_API_KEY`

### 4. Start MongoDB

Make sure MongoDB is running on your system:

```bash
# macOS (with Homebrew)
brew services start mongodb-community

# Linux
sudo systemctl start mongod

# Windows
# Start MongoDB service from Services panel
```

Or use MongoDB Atlas (cloud):
- Sign up at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- Create a free cluster
- Get connection string and update `MONGODB_URI`

### 5. Start the Server

```bash
# Development (with auto-reload)
npm run dev:server

# Production
npm run server
```

The API will be available at `http://localhost:5000`

## 📁 Project Structure

```
server/
├── index.js                    # Main server entry point
├── routes/
│   ├── auth.routes.js         # Authentication routes (register, login)
│   ├── routes.routes.js       # Route optimization endpoints
│   └── user.routes.js         # User management endpoints
├── models/
│   ├── User.model.js          # User schema
│   ├── RoutePlan.model.js     # Route plan schema
│   └── RealTimeUpdate.model.js # Real-time update schema
├── services/
│   └── gemini.service.js      # Gemini API integration
└── middleware/
    └── auth.middleware.js     # JWT authentication middleware
```

## 🔌 API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (requires auth)

### Route Optimization

- `POST /api/routes/optimize` - Generate optimized route using Gemini AI
- `GET /api/routes` - Get all routes
- `GET /api/routes/:id` - Get single route
- `PATCH /api/routes/:id` - Update route (assign driver, change status)
- `POST /api/routes/:id/reoptimize` - Re-optimize route with real-time data
- `DELETE /api/routes/:id` - Delete route

### User Management

- `GET /api/users` - Get all users (admin only)
- `GET /api/users/:id` - Get user by ID
- `PATCH /api/users/:id` - Update user

## 📝 API Usage Examples

### Register User

```bash
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "dispatcher",
  "companyId": "company-123"
}
```

### Login

```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

### Optimize Route (with Gemini AI)

```bash
POST /api/routes/optimize
Authorization: Bearer <token>
Content-Type: application/json

{
  "deliveries": [
    {
      "address": "123 Main St, New York, NY",
      "priority": "high",
      "timeWindow": "9:00 AM - 12:00 PM",
      "packageDetails": {
        "weight": 10,
        "volume": 2
      }
    },
    {
      "address": "456 Oak Ave, Brooklyn, NY",
      "priority": "normal",
      "timeWindow": "2:00 PM - 5:00 PM"
    }
  ],
  "vehicleData": {
    "capacity": 1000,
    "fuelEfficiency": 25,
    "type": "van"
  },
  "constraints": {
    "traffic": true,
    "weather": true,
    "priorities": "equal"
  }
}
```

### Re-optimize Route with Real-Time Data

```bash
POST /api/routes/:routeId/reoptimize
Authorization: Bearer <token>
Content-Type: application/json

{
  "trafficData": {
    "conditions": "moderate",
    "delays": 15,
    "incidents": ["accident on highway"]
  },
  "weatherData": {
    "condition": "rainy",
    "temperature": 12,
    "visibility": 8,
    "warnings": []
  }
}
```

## 🔐 Authentication

All route endpoints (except `/api/auth/*`) require authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## 🎯 User Roles

- **admin**: Full access to all routes and user management
- **dispatcher**: Can create/edit routes, assign drivers, view analytics
- **driver**: Can view assigned routes, receive updates, mark deliveries

## 🤖 Gemini AI Integration

The `gemini.service.js` handles all AI route optimization:

- **generateOptimizedRoute()**: Uses Gemini Pro to generate optimal routes
- **analyzeRouteWithContext()**: Analyzes routes with real-time traffic/weather data
- **Fallback**: If Gemini fails, returns sequential route

The service formats delivery data into prompts for Gemini and parses JSON responses into structured route plans.

## 🗄️ Database Models

### User
- name, email, passwordHash, role, companyId, isActive

### RoutePlan
- userId, driverId, deliveries[], route[], estimatedTime, totalDistance, costBreakdown, status

### RealTimeUpdate
- routePlanId, trafficData, weatherData, timestamp, shouldReoptimize

## 🛠️ Development

- Use `npm run dev:server` for development with auto-reload
- Server runs on port 5000 by default
- MongoDB connection is handled automatically on startup

## 📦 Dependencies

- **express**: Web framework
- **mongoose**: MongoDB ODM
- **jsonwebtoken**: JWT authentication
- **bcryptjs**: Password hashing
- **@google/generative-ai**: Gemini API client
- **cors**: Cross-origin resource sharing
- **dotenv**: Environment variable management
