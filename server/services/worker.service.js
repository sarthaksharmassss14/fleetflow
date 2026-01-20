import RoutePlan from "../models/RoutePlan.model.js";
import RealTimeUpdate from "../models/RealTimeUpdate.model.js";
import geminiService from "./gemini.service.js";
import externalService from "./external.service.js";
import socketService from "./socket.service.js";

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
      const firstStop = route.route[0];
      if (!firstStop || !firstStop.address) return;

      console.log(`Worker: Analyzing route #${route._id.toString().slice(-6)}...`);

      // Use real coordinates from the first stop
      const lat = firstStop.coordinates?.lat;
      const lon = firstStop.coordinates?.lng;

      if (!lat || !lon) {
        console.warn(`Worker: Missing coordinates for route #${route._id.toString().slice(-6)}. Skipping.`);
        return;
      }

      // 1. Fetch real-world data
      const traffic = await externalService.getTrafficData(lat, lon);
      const weather = await externalService.getWeatherData(firstStop.address, lat, lon);

      // Smart Check: Is traffic actually bad enough to warrant AI cost?
      // Traffic API returns absolute speed. If current speed is < 50% of free flow, it's significant.
      const speedRatio = (traffic.freeFlowSpeed > 0) ? (traffic.currentSpeed / traffic.freeFlowSpeed) : 1.0;
      const isSignificantDelay = (speedRatio < 0.6) || (traffic.congestionLevel === 'high');
      
      // Weather alert check
      const isSevereWeather = /storm|rain|snow|thunder/i.test(weather.condition || '');

      // 2. AI Analysis (Contextual)
      const analysisResponse = await geminiService.analyzeRouteWithContext(
        route,
        traffic,
        weather
      );

      // 3. Smart Re-optimize Logic
      // Only proceed if AI implies need AND (Significant Delay exists OR Severe Weather OR AI Reasoning is critical)
      const aiSaysReoptimize = analysisResponse.analysis?.shouldReoptimize;
      const aiReasoning = analysisResponse.analysis?.reasoning || '';
      const isCriticalUpdate = aiReasoning.toLowerCase().includes('critical') || aiReasoning.toLowerCase().includes('major');

      if (aiSaysReoptimize) {
        if (!isSignificantDelay && !isSevereWeather && !isCriticalUpdate) {
           console.log(`❄️ Worker: Skipping re-optimization for #${route._id.toString().slice(-6)}. AI suggested it, but telemetry indicates minor impact (Speed Ratio: ${speedRatio.toFixed(2)}).`);
           return;
        }

        console.log(`✨ Worker: Re-optimizing route #${route._id.toString().slice(-6)} [Reason: ${isSignificantDelay ? 'Traffic' : (isSevereWeather ? 'Weather' : 'AI Critical')}]`);
        
        const reoptimized = await geminiService.generateOptimizedRoute({
          deliveries: route.deliveries,
          vehicleData: route.vehicleData || {},
          constraints: { traffic: true, weather: true }
        });

        route.route = reoptimized.route;
        route.estimatedTime = reoptimized.estimatedTime;
        route.costBreakdown = reoptimized.costBreakdown;
        route.reasoning = reoptimized.reasoning;
        route.status = 'active'; 
        await route.save();

        // Notify with specific logic
        socketService.notifyRouteChange(route, 'reoptimize', `Route optimized: ${isSignificantDelay ? 'Avoided heavy traffic' : 'Weather adaptation applied'}`);

        // 4. Save history
        const update = new RealTimeUpdate({
          routePlanId: route._id,
          trafficData: traffic,
          weatherData: weather,
          shouldReoptimize: true
        });
        await update.save();
        console.log(`✅ Worker: Route #${route._id.toString().slice(-6)} updated.`);
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
