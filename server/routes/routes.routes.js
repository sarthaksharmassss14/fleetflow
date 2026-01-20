import express from "express";
import RoutePlan from "../models/RoutePlan.model.js";
import RealTimeUpdate from "../models/RealTimeUpdate.model.js";
import geminiService from "../services/gemini.service.js";
import externalService from "../services/external.service.js";
import socketService from "../services/socket.service.js";
import { authenticate, authorize } from "../middleware/auth.middleware.js";
import { aiRateLimiter, apiRateLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

// All routes require authentication
router.use(authenticate);
router.use(apiRateLimiter);

// Get weather data for an address
router.get("/weather", async (req, res) => {
  try {
    const { address, lat, lon } = req.query;
    if (!address && (!lat || !lon)) {
      return res.status(400).json({ success: false, message: "Address or coordinates are required" });
    }
    const weather = await externalService.getWeatherData(address, lat, lon);
    res.json({ success: true, data: weather });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Search address/location (Autocomplete)
router.get("/location-search", async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json({ success: true, data: [] });
    
    const results = await externalService.searchAddress(q);
    res.json({ success: true, data: results });
  } catch (error) {
    console.error("Location search error:", error);
    res.status(500).json({ success: false, data: [] });
  }
});
// AI Health Check
router.get("/ai-health", async (req, res) => {
  try {
    const health = await geminiService.checkHealth();
    res.json({ success: true, data: health });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});


// Generate optimized route
router.post("/optimize", aiRateLimiter, async (req, res) => {
  try {
    const { deliveries, vehicleData, constraints } = req.body;
    console.log("Optimize Request Body:", JSON.stringify(req.body, null, 2));

    if (!deliveries || !Array.isArray(deliveries) || deliveries.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Deliveries array is required",
      });
    }

    // Generate route using Gemini AI
    const optimizedRoute = await geminiService.generateOptimizedRoute({
      deliveries,
      vehicleData: vehicleData || {},
      constraints: constraints || {},
    });

    // Save route plan to database
    const routePlan = new RoutePlan({
      userId: req.user._id,
      deliveries,
      route: optimizedRoute.route,
      estimatedTime: optimizedRoute.estimatedTime,
      totalDistance: optimizedRoute.totalDistance,
      costBreakdown: optimizedRoute.costBreakdown,
      trafficAnalysis: optimizedRoute.trafficAnalysis,
      vehicleData: vehicleData || {},
      reasoning: optimizedRoute.reasoning,
      constraintsAlert: optimizedRoute.constraintsAlert || null,
      vehicleData: vehicleData || {},
      status: "draft",
    });

    await routePlan.save();
    socketService.notifyRouteChange(routePlan, 'create', 'New optimized route created');

    res.status(201).json({
      success: true,
      message: "Route optimized successfully",
      data: routePlan,
    });
  } catch (error) {
    console.error("Route optimization error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Route optimization failed",
    });
  }
});

// Get all routes
router.get("/", async (req, res) => {
  try {
    const { status, driverId } = req.query;
    let query = {};

    // Route filtering based on user role
    if (req.user.role === "admin" || req.user.role === "dispatcher") {
       // Admins and Dispatchers see all ACTIVE routes (filter out archived)
       query.isArchived = { $ne: true };
    } else if (req.user.role === "driver") {
       // Drivers see routes assigned to them that are not archived
       query.driverId = req.user._id;
       query.isArchived = { $ne: true };
    } else {
       query.userId = req.user._id;
       query.isArchived = { $ne: true };
    }

    if (status) query.status = status;
    if (driverId) query.driverId = driverId;

    const routes = await RoutePlan.find(query)
      .populate("userId", "name email")
      .populate("driverId", "name email")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: routes,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Get Fleet-wide Analysis
router.get("/analysis", async (req, res) => {
  try {
    const activeRoutes = await RoutePlan.find({ status: 'active', isArchived: false })
      .populate("driverId", "name");
    
    // Call Gemini for high-level fleet intelligence
    const fleetAnalysis = await geminiService.analyzeFleetStatus(activeRoutes);
    
    res.json({ 
      success: true, 
      data: fleetAnalysis
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get single route
router.get("/:id", async (req, res) => {
  try {
    const route = await RoutePlan.findById(req.params.id)
      .populate("userId", "name email")
      .populate("driverId", "name email");

    if (!route) {
      return res.status(404).json({
        success: false,
        message: "Route not found",
      });
    }

    // Check permissions
    const userRole = req.user.role ? req.user.role.toLowerCase() : "";
    const isAuthorized = userRole === "admin" || 
                         userRole === "dispatcher" || 
                         (route.userId && route.userId.toString() === req.user._id.toString()) ||
                         (route.driverId && route.driverId.toString() === req.user._id.toString());

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    res.json({
      success: true,
      data: route,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Update route (assign driver, change status)
router.patch("/:id", async (req, res) => {
  try {
    const { driverId, status } = req.body;
    const route = await RoutePlan.findById(req.params.id);

    if (!route) {
      return res.status(404).json({
        success: false,
        message: "Route not found",
      });
    }

    if (driverId !== undefined) route.driverId = driverId;
    if (status) route.status = status;

    await route.save();
    
    // Fetch populated route for UI consistency
    const updatedRoute = await RoutePlan.findById(route._id)
      .populate("userId", "name email")
      .populate("driverId", "name email");
    
    // Determine notification type and message
    let notifType = 'update';
    let notifMessage = 'Route updated';

    if (status === 'completed') {
      notifType = 'completion';
      notifMessage = 'Trip completed and delivered';
    } else if (driverId !== undefined) {
      notifType = 'assignment';
      notifMessage = driverId ? 'Driver assigned' : 'Driver unassigned';
    }
    
    // Notify relevant roles
    socketService.notifyRouteChange(updatedRoute, notifType, notifMessage);
    
    res.json({
      success: true,
      message: "Route assigned successfully",
      data: updatedRoute,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Full Edit route
router.put("/:id", aiRateLimiter, async (req, res) => {
  try {
    const { deliveries, vehicleData, status } = req.body;
    const route = await RoutePlan.findById(req.params.id);

    if (!route) {
      return res.status(404).json({ success: false, message: "Route not found" });
    }

    // Check permissions
    const userRole = req.user.role ? req.user.role.toLowerCase() : "";
    const isAuthorized = userRole === "admin" || 
                         userRole === "dispatcher" || 
                         (route.userId && route.userId.toString() === req.user._id.toString());

    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    if (deliveries) {
       console.log(`Editing route #${req.params.id}. Re-optimizing...`);
       const optimizedRoute = await geminiService.generateOptimizedRoute({
         deliveries,
         vehicleData: vehicleData || route.vehicleData || {},
         constraints: { traffic: true, weather: true },
       });

       route.deliveries = deliveries;
       route.route = optimizedRoute.route;
       route.estimatedTime = optimizedRoute.estimatedTime;
       route.totalDistance = optimizedRoute.totalDistance;
       route.costBreakdown = optimizedRoute.costBreakdown;
       route.trafficAnalysis = optimizedRoute.trafficAnalysis;
       route.reasoning = optimizedRoute.reasoning;
       route.constraintsAlert = optimizedRoute.constraintsAlert || null;
    }

    if (vehicleData) route.vehicleData = vehicleData;
    if (status) route.status = status;

    await route.save();
    const updatedRoute = await RoutePlan.findById(route._id)
      .populate("userId", "name email")
      .populate("driverId", "name email");

    socketService.notifyRouteChange(updatedRoute, 'update', 'Route details updated');
    res.json({ success: true, data: updatedRoute });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Re-optimize route with real-time data
router.post("/:id/reoptimize", aiRateLimiter, async (req, res) => {
  try {
    const route = await RoutePlan.findById(req.params.id);
    if (!route) return res.status(404).json({ success: false, message: "Route not found" });

    // Check permissions
    const userRole = req.user.role ? req.user.role.toLowerCase() : "";
    const isAuthorized = userRole === "admin" || 
                         userRole === "dispatcher" || 
                         (route.userId && route.userId.toString() === req.user._id.toString()) ||
                         (route.driverId && route.driverId.toString() === req.user._id.toString());

    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const { trafficData, weatherData } = req.body;
    
    // Fallback to real API if simulation data not provided
    const firstStop = route.route[0];
    const lat = firstStop?.coordinates?.lat;
    const lon = firstStop?.coordinates?.lng;
    
    const traffic = trafficData || (lat && lon ? await externalService.getTrafficData(lat, lon) : null);
    const weather = weatherData || await externalService.getWeatherData(firstStop?.address || route.deliveries[0]?.address, lat, lon);

    const analysisResponse = await geminiService.analyzeRouteWithContext(route, traffic, weather);

    if (analysisResponse.analysis?.shouldReoptimize) {
      console.log("Re-optimization triggered by AI...");
      const reoptimized = await geminiService.generateOptimizedRoute({
        deliveries: route.deliveries,
        vehicleData: route.vehicleData || {},
        constraints: {
          traffic: true,
          weather: true,
        },
      });

      route.route = reoptimized.route;
      route.estimatedTime = reoptimized.estimatedTime;
      route.totalDistance = reoptimized.totalDistance;
      route.costBreakdown = reoptimized.costBreakdown;
      route.reasoning = reoptimized.reasoning;
      await route.save();
    }

    // Always notify about simulation result in the notification bell
    socketService.notifyRouteChange(
      route, 
      analysisResponse.analysis?.shouldReoptimize ? 'reoptimize' : 'update',
      analysisResponse.analysis?.shouldReoptimize 
        ? 'Route re-optimized for speed/traffic' 
        : 'Route checked: Still the most efficient path'
    );

    const update = new RealTimeUpdate({
      routePlanId: route._id,
      trafficData: traffic || {},
      weatherData: weather || {},
      shouldReoptimize: analysisResponse.analysis?.shouldReoptimize || false,
    });
    await update.save();

    res.json({
      success: true,
      data: { route, analysis: analysisResponse.analysis },
    });
  } catch (error) {
    console.error("Re-optimization error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});



// Delete route
router.delete("/:id", async (req, res) => {
  try {
    const route = await RoutePlan.findById(req.params.id);

    if (!route) {
      console.log(`[DELETE] Route ${req.params.id} not found`);
      return res.status(404).json({
        success: false,
        message: "Route not found",
      });
    }

    // Check permissions: Admin and Dispatcher can delete any route
    const userRole = req.user.role ? req.user.role.toLowerCase() : "";
    const isAuthorized = userRole === "admin" || 
                         userRole === "dispatcher" || 
                         (route.userId && route.userId.toString() === req.user._id.toString());

    if (!isAuthorized) {
      console.log(`[DELETE] Unauthorized attempt by ${req.user._id} with role ${req.user.role}`);
      return res.status(403).json({
        success: false,
        message: `Access denied: Role '${req.user.role}' does not have deletion permissions for this route.`,
      });
    }

    console.log(`[DELETE] Authorized: User ${req.user._id} (${req.user.role}) archiving route ${req.params.id}`);
    
    // Soft Delete (Archive) so Driver retains history
    route.isArchived = true;
    await route.save();
    
    // Legacy: await RoutePlan.findByIdAndDelete(req.params.id);
    console.log(`[DELETE] Archived route ${req.params.id}`);

    res.json({
      success: true,
      message: "Route deleted (archived) successfully",
    });
  } catch (error) {
    console.error("[DELETE] Error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

export default router;
