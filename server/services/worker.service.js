import RoutePlan from "../models/RoutePlan.model.js";
import RealTimeUpdate from "../models/RealTimeUpdate.model.js";
import geminiService from "./gemini.service.js";
import externalService from "./external.service.js";

class WorkerService {
  constructor() {
    this.intervalId = null;
    this.CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
  }

  start() {
    console.log("🚀 Background Reroute Worker started (5m interval)");
    this.intervalId = setInterval(() => this.runWork(), this.CHECK_INTERVAL);
  }

  async runWork() {
    console.log("⏱️ Worker: Checking active routes for traffic/weather updates...");
    try {
      // Find routes that are 'active' or 'in-progress'. 
      // For this demo, let's also check 'draft' if they were created recently.
      const activeRoutes = await RoutePlan.find({ 
        status: { $in: ['active', 'in-progress', 'draft'] },
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
      });

      if (activeRoutes.length === 0) {
        console.log("Worker: No active routes to process.");
        return;
      }

      for (const route of activeRoutes) {
        await this.processRoute(route);
      }
    } catch (error) {
      console.error("Worker error:", error.message);
    }
  }

  async processRoute(route) {
    try {
      const firstStop = route.route[0]?.address;
      if (!firstStop) return;

      console.log(`Worker: Analyzing route #${route._id.slice(-6)}...`);

      // 1. Fetch real-world data
      const traffic = await externalService.getTrafficData(40.7128, -74.0060); // Demo coords for NYC area
      const weather = await externalService.getWeatherData(firstStop);

      // 2. AI Analysis
      const analysisResponse = await geminiService.analyzeRouteWithContext(
        route,
        traffic,
        weather
      );

      // 3. Re-optimize if needed
      if (analysisResponse.analysis?.shouldReoptimize) {
        console.log(`✨ Worker: Re-optimizing route #${route._id.slice(-6)} due to world changes!`);
        
        const reoptimized = await geminiService.generateOptimizedRoute({
          deliveries: route.deliveries,
          vehicleData: route.vehicleData || {},
          constraints: { traffic: true, weather: true }
        });

        route.route = reoptimized.route;
        route.estimatedTime = reoptimized.estimatedTime;
        route.costBreakdown = reoptimized.costBreakdown;
        route.reasoning = reoptimized.reasoning;
        route.status = 'active'; // Mark as active if it was draft
        await route.save();

        // 4. Save history
        const update = new RealTimeUpdate({
          routePlanId: route._id,
          trafficData: traffic,
          weatherData: weather,
          shouldReoptimize: true
        });
        await update.save();
        console.log(`✅ Worker: Route #${route._id.slice(-6)} updated.`);
      }
    } catch (err) {
      console.error(`Worker failed to process route ${route._id}:`, err.message);
    }
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      console.log("🛑 Background Worker stopped.");
    }
  }
}

export default new WorkerService();
