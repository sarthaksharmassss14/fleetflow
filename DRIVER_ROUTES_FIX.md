# Driver Routes Visibility - How It Works

## The Issue

Drivers can't see routes created by dispatchers because **routes need to be assigned to drivers first**.

## How Route Filtering Works

### Backend Logic:

1. **Admin**: Sees ALL routes (no filter)
2. **Dispatcher**: Sees only routes where `userId` = their user ID (routes they created)
3. **Driver**: Sees only routes where `driverId` = their user ID (routes assigned to them)

### The Problem:

When a dispatcher creates a route, `driverId` is **null/undefined** by default. So drivers can't see them until a dispatcher/admin assigns the route to a driver.

## Solution: Assign Drivers to Routes

### Method 1: Via API (Currently Available)

Use the PATCH endpoint to assign a driver:

```http
PATCH /api/routes/:routeId
Authorization: Bearer DISPATCHER_TOKEN
Content-Type: application/json

{
  "driverId": "DRIVER_USER_ID_HERE"
}
```

### Method 2: UI Feature (To Be Added)

Dispatchers/Admins need a UI to:

1. View all routes
2. Select a driver from a dropdown
3. Assign the route to that driver

---

## Testing Driver Visibility

### Step 1: Get Driver User ID

1. Login as admin or use the API
2. Get driver's user ID from `/api/users` endpoint

### Step 2: Create Route as Dispatcher

1. Login as dispatcher
2. Create a route via dashboard

### Step 3: Assign Route to Driver

1. Get the route ID from the created route
2. Use PATCH API or UI to set `driverId` to the driver's user ID

### Step 4: Login as Driver

1. Login as the assigned driver
2. You should now see the route in the dashboard

---

## Quick Test via API

### 1. Get Driver User ID:

```http
GET /api/users
Authorization: Bearer ADMIN_TOKEN
```

Find the driver user's `_id`.

### 2. Assign Route to Driver:

```http
PATCH /api/routes/ROUTE_ID_HERE
Authorization: Bearer DISPATCHER_OR_ADMIN_TOKEN
Content-Type: application/json

{
  "driverId": "DRIVER_USER_ID_HERE"
}
```

### 3. Login as Driver:

The route should now appear in the driver's dashboard.

---

## Backend Verification

The backend filtering logic is correct:

```javascript
if (req.user.role === "driver") {
  query.driverId = req.user._id; // Only routes assigned to this driver
}
```

If a driver sees no routes, it means:

- No routes have `driverId` set to their user ID
- Routes need to be assigned first

---

## Future Improvement: Assignment UI

Add to dashboard for dispatchers/admins:

- "Assign Driver" button on each route card
- Dropdown to select driver from list of users with role="driver"
- Automatically update route with selected driver ID

This would make the assignment process user-friendly instead of requiring API calls.


