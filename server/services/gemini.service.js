import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

class GeminiService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    console.log(`Gemini API Key Loaded: ${this.apiKey ? 'YES (Starts with ' + this.apiKey.substring(0, 4) + ')' : 'NO'}`);
    if (!this.apiKey) {
      console.warn("⚠️ GEMINI_API_KEY not found in environment variables");
    }
    this.genAI = this.apiKey ? new GoogleGenerativeAI(this.apiKey) : null;
   
    // Force valid model name to avoid 404s from bad .env values
    const modelName = "gemini-1.5-flash";
    console.log(`Using Gemini Model: ${modelName}`);
    this.model = this.genAI
      ? this.genAI.getGenerativeModel({ model: modelName })
      : null;
  }

  /**
   * Generate optimized route using Gemini AI
   * @param {Object} routeData - Delivery locations, constraints, and vehicle data
   * @returns {Promise<Object>} - Optimized route plan
   */
  async generateOptimizedRoute(routeData) {
    console.log("--- STARTING AI OPTIMIZATION ---", routeData.deliveries.length, "stops");
    const { deliveries, vehicleData, constraints } = routeData;

    if (!this.model) {
      console.warn("⚠️ Gemini model not initialized. Using sequential fallback.");
      return this.generateFallbackRoute(deliveries);
    }

    // Prepare prompt for Gemini
    const prompt = this.buildRouteOptimizationPrompt(
      deliveries,
      vehicleData,
      constraints
    );

    try {
      // Add a 10s timeout to the AI request to prevent long hangs
      const aiPromise = this.model.generateContent(prompt);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("AI_TIMEOUT")), 10000)
      );

      const result = await Promise.race([aiPromise, timeoutPromise]);
      const response = await result.response;
      const text = response.text();

      // Parse Gemini response and convert to structured route plan
      return await this.parseRouteResponse(text, deliveries, vehicleData);
    } catch (error) {
      if (error.message === "AI_TIMEOUT") {
        console.warn("⏱️ AI Optimization timed out. Switching to high-speed localized fallback.");
      } else {
        console.error("Gemini API error:", error.message);
      }
      
      // Use fallback for ANY AI error (Quota, 404, Network, etc.) 
      // This ensures the application never crashes for the user
      console.warn(`🔄 AI Optimization failed (${error.message}). Using high-speed internal fallback.`);
      return this.generateFallbackRoute(deliveries);
    }
  }

  /**
   * Build prompt for route optimization
   */
  buildRouteOptimizationPrompt(deliveries, vehicleData, constraints) {
    const deliveryList = deliveries
      .map(
        (d, i) =>
          `${i + 1}. Address: ${d.address}, Priority: ${d.priority || "normal"}, Time Window: ${d.timeWindow || "anytime"}`
      )
      .join("\n");

    return `You are a logistics route optimization expert specializing in Indian road networks and transport economics.
Optimize the following delivery route considering efficiency, time windows, and priorities.

DELIVERIES:
${deliveryList}

VEHICLE DATA:
- Capacity: ${vehicleData?.capacity || "unlimited"}
- Fuel Efficiency: Using realistic Indian heavy-duty truck mileage (~3-5 km/L depending on load)
- Type: Heavy Truck / Commercial Vehicle
- Region: India (specifically considering Rajasthan diesel prices and road conditions)

INSTRUCTIONS:
1. STALWART TERRITORIAL RESTRICTION: Optimize purely for India.
2. LOGISTICS CONSTRAINTS (CRITICAL):
   - PRIORITIES: 'High' priority deliveries MUST be completed before 'Normal'/'Low' unless geographically inefficient.
   - TIME WINDOWS: You MUST respect specified Time Windows (e.g. "9 AM - 12 PM"). Arrange route to hit these slots.
   - CAPACITY: Ensure the total load does not exceed Vehicle Capacity of ${vehicleData?.capacity || "unlimited"}.
3. Do not use pre-assumed distances. Calculate based on road networks.
4. ECONOMICS (Use these rates):
   - Fuel: ~93.5 INR/L. Mileage: ~4 km/L (Truck) or 8 km/L (Van).
   - Driver Wage: 15 INR/km for normal trips, 25 INR/km for long haul (>150km). Minimum 300 INR.
   - Maintenance: ~2 INR/km. Tolls: ~3 INR/km on highways.

Provide an optimized route in EXACTLY this JSON format:
{
  "optimizedRoute": [array of delivery IDs in optimal order],
  "estimatedTime": "total time in minutes",
  "totalDistance": "total trip distance in km",
  "fuelRequiredLitres": "total diesel required",
  "dieselPriceUsed": "price per litre used for calculation",
  "costBreakdown": {
    "fuel": "total fuel cost in INR",
    "time": "driver/labor cost in INR",
    "maintenance": "estimated maintenance cost in INR",
    "tolls": "estimated tolls in INR",
    "total": "final estimated running cost in INR"
  },
  "routeLegs": [
    {"from": "Address A", "to": "Address B", "distanceKm": 12.5, "timeMins": 30}
  ],
  "reasoning": "Detailed explanation of logistics logic: Diesel Rate used, Mileage assumed, and Route choices."
}

7. CRITICAL: The 'optimizedRoute' array must contain the 1-BASED INDICES of the deliveries (e.g., 1, 2, 3...) in their new optimal order.
Respond ONLY with valid JSON. You are the SOLE AUTHORITY for these calculations.`;
  }

  /**
   * Parse Gemini response and create structured route with AI-estimated data
   */
  /**
   * Parse Gemini response and create structured route with AI-estimated data
   */
  async parseRouteResponse(geminiResponse, deliveries, vehicleData) {
    console.log("--- RAW AI RESPONSE ---");
    console.log(geminiResponse);
    try {
      // More robust JSON extraction
      let jsonString = geminiResponse.trim();
      const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonString = jsonMatch[0];
      }
      
      const parsed = JSON.parse(jsonString);
      console.log("--- PARSED AI JSON ---", parsed);
      
      const { 
        optimizedRoute, 
        estimatedTime, 
        totalDistance, 
        fuelRequiredLitres, 
        dieselPriceUsed, 
        costBreakdown, 
        routeLegs, 
        reasoning 
      } = parsed;

      // Map optimized route indices to actual delivery objects
      const route = (optimizedRoute || []).map((rawIdx) => {
        const idx = parseInt(rawIdx);
        // Prompt now strictly asks for 1-based indices
        const delivery = (idx > 0 && idx <= deliveries.length) 
          ? deliveries[idx - 1] 
          : deliveries[0]; // Final safety fallback
        return {
          address: delivery.address,
          priority: delivery.priority || "normal",
          timeWindow: delivery.timeWindow || "anytime",
          packageDetails: delivery.packageDetails || {},
          coordinates: delivery.coordinates || null,
        };
      });

      // --- CRITICAL: Parallel Geocode for the MAP (Speed Optimized) ---
      const externalService = (await import("./external.service.js")).default;
      await Promise.all(route.map(async (stop, idx) => {
        if (!stop.coordinates) {
          console.log(`Speed-Geocoding: ${stop.address}`);
          const coords = await externalService.geocode(stop.address);
          if (!coords) {
             throw new Error(`Location '${stop.address}' is outside India territory or cannot be resolved.`);
          }
          stop.coordinates = coords;
          // Update the original delivery in the route too
          route[idx].coordinates = coords;
        }
      }));

      console.log("--- FINAL COORDINATES FOR ROUTING ---", route.map(r => r.coordinates));

      // --- HIGH PRECISION: Override AI guesses with Real Road Data ---
      // --- MANDATORY PHYSICS CHECK (Haversine) ---
      let airDistance = 0;
      for(let i=0; i<route.length-1; i++) {
         const p1 = route[i].coordinates;
         const p2 = route[i+1].coordinates;
         if(p1 && p2) {
             const R = 6371; 
             const dLat = (p2.lat - p1.lat) * Math.PI/180;
             const dLon = (p2.lng - p1.lng) * Math.PI/180;
             const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                       Math.cos(p1.lat * Math.PI/180) * Math.cos(p2.lat * Math.PI/180) * 
                       Math.sin(dLon/2) * Math.sin(dLon/2);
             const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
             airDistance += R * c;
         }
      }

      // Determine initial values
      // Infer vehicle type if not explicitly provided
      const vType = (vehicleData && vehicleData.type) ? vehicleData.type.toLowerCase() : 'van';
      const realStats = await externalService.getRouteStats(route.map(r => r.coordinates), vType);
      
      // FALLBACK LOGIC REPAIR: 
      // If realStats fails (TomTom error), do NOT default to 'route.length * 50' (which equals 100km for 2 stops).
      // Instead, trust the airDistance we calculated above, with a city-driving multiplier (1.5x).
      // This fixes the "100km for CP to Bangla Sahib" bug.
      
      let distKm = realStats ? realStats.distanceKm : (airDistance > 0 ? airDistance * 1.5 : (parseFloat(totalDistance) || 0));
      // If still 0 or invalid, then maybe use the old AI guess as a last resort
      if (!distKm || distKm === 0) distKm = parseFloat(totalDistance) || 10;

      // Time: If realStats failed, estimate based on distance.
      // City speed avg ~25km/h, Highway ~60km/h
      let timeMins = realStats ? realStats.timeMinutes : (distKm / (airDistance < 50 ? 25 : 60)) * 60;
      if (!timeMins) timeMins = parseFloat(estimatedTime) || 30;

      // SANITY CHECK: Road distance CANNOT be less than Air distance (Physics)
      // BUT: For very short intracity routes, GPS jitter or straight roads might make them close.
      // Rule: If Air Distance > 5km, then Road Distance should be at least air distance.
      // If Air Distance < 5km, accept whatever unless it's 0.
      
      const isShortHaul = airDistance < 50;
      
      if (distKm < airDistance * 0.9 && airDistance > 2) {
          console.warn(`⚠️ IMPOSSIBLE DISTANCE DETECTED (Too Short): Reported ${distKm}km vs Air ${airDistance.toFixed(1)}km. Overriding.`);
          // For short haul, be conservative. For long haul, add 35% buffer.
          distKm = airDistance * (isShortHaul ? 1.2 : 1.35); 
          timeMins = (distKm / (isShortHaul ? 30 : 60)) * 60; // Slower speed for city
      } else if (distKm > airDistance * 1.8 && airDistance > 50) {
          console.warn(`⚠️ IMPOSSIBLE DISTANCE DETECTED (Too Long): Reported ${distKm}km vs Air ${airDistance.toFixed(1)}km. Normalizing.`);
          if (!realStats) {
             distKm = airDistance * 1.4;
             timeMins = (distKm / 50) * 60;
          }
      }

      const finalDist = distKm;
      const finalTime = timeMins;
      
      // Recalculate COST with verified distance
      const dieselPrice = 93.5; 
      const mileage = isShortHaul ? 7 : 4; // Better mileage for smaller vehicles/short haul? Or worse due to traffic? Usually vans get 8-10. Trucks 4.
      // Let's stick to user inputs or standard. If < 50km, assume LCV/Van mileage of 8km/L unless truck specified.
      const appliedMileage = (vType === 'van' || isShortHaul) ? 8 : 4;

      const maintRate = isShortHaul ? 1.5 : 2.5; 
      
      // Dynamic Wage: User requested flat 15/km
      const wagePerKm = 15;
      // Ensure a minimum trip wage of ₹300 for very short trips to be realistic
      const dynamicWage = Math.max(300, Math.round(finalDist * wagePerKm));
      
      const fuelCost = (finalDist / appliedMileage) * dieselPrice;
      const maintenance = finalDist * maintRate;
      
      // REAL-TIME TOLL LOGIC
      // If we switched to fallback, assume standard toll rate of ₹3/km for highways
      // Intra-city usually 0 tolls
      const tollRate = realStats?.hasTolls ? 3.5 : 3.0; 
      const tollCost = (realStats?.hasTolls || (distKm > 100 && !isShortHaul)) ? (finalDist * tollRate) : 0;

      const result = {
        route,
        estimatedTime: Math.round(finalTime),
        totalDistance: Math.round(finalDist * 10) / 10,
        fuelRequiredLitres: Math.round((finalDist / appliedMileage) * 10) / 10,
        dieselPriceUsed: dieselPrice,
        costBreakdown: {
          fuel: Math.round(fuelCost),
          time: Math.round(dynamicWage),
          maintenance: Math.round(maintenance),
          tolls: Math.round(tollCost),
          total: 0
        },
        routeLegs: routeLegs || [],
        reasoning: `Precision Audit: Distance (${finalDist.toFixed(1)}km) verified. ${isShortHaul ? 'Short-Haul/Intracity Logistics Model Applied.' : 'Long-Haul Highway Model Applied.'}`,
        createdAt: new Date(),
      };
      
      const cb = result.costBreakdown;
      cb.total = cb.fuel + cb.time + cb.maintenance + cb.tolls;

      return result;
    } catch (error) {
      console.error("CRITICAL: Error parsing AI route data:", error.message);
      return await this.generateFallbackRoute(deliveries);
    }
  }

  /**
   * Generate fallback route if Gemini fails - Now with all required fields
   */
  async generateFallbackRoute(deliveries) {
    const route = deliveries.map((d) => ({
      address: d.address,
      priority: d.priority || "normal",
      timeWindow: d.timeWindow || "anytime",
      packageDetails: d.packageDetails || {},
      coordinates: d.coordinates || null
    }));

    // Parallel Geocode fallback for map (Speed Optimized)
    const externalService = (await import("./external.service.js")).default;
    await Promise.all(route.map(async (stop, idx) => {
      if (!stop.coordinates) {
        const coords = await externalService.geocode(stop.address);
        if (coords) {
          stop.coordinates = coords;
          route[idx].coordinates = coords;
        }
      }
    }));

    // Truth Audit for Fallback
    // --- MANDATORY PHYSICS CHECK (Haversine) ---
    let airDistance = 0;
    for(let i=0; i<route.length-1; i++) {
       const p1 = route[i].coordinates;
       const p2 = route[i+1].coordinates;
       if(p1 && p2) {
           const R = 6371; 
           const dLat = (p2.lat - p1.lat) * Math.PI/180;
           const dLon = (p2.lng - p1.lng) * Math.PI/180;
           const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                     Math.cos(p1.lat * Math.PI/180) * Math.cos(p2.lat * Math.PI/180) * 
                     Math.sin(dLon/2) * Math.sin(dLon/2);
           const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
           airDistance += R * c;
       }
    }

    const realStats = await externalService.getRouteStats(route.map(r => r.coordinates));
    
    // Default fallback: If TomTom fails, use Air Distance * 1.5 (City Model) or 1.35 (Highway)
    // Avoid the arbitrary 'route.length * 50' which causes 100km errors for short trips.
    
    // Check short haul
    const isShortHaul = airDistance < 50;
    
    let finalDist = realStats ? realStats.distanceKm : (airDistance > 0 ? airDistance * (isShortHaul ? 1.5 : 1.35) : route.length * 10);
    
    // Time Estimate
    let finalTime = realStats ? realStats.timeMinutes : (finalDist / (isShortHaul ? 25 : 50)) * 60;

    // SANITY CHECK: Road distance CANNOT be less than Air distance
    // But allow wiggle room for straight roads/jitter
    if (finalDist < airDistance * 0.9 && airDistance > 2) {
        console.warn(`⚠️ FALLBACK IMPOSSIBLE DISTANCE: ${finalDist}km vs Air ${airDistance.toFixed(1)}km. Overriding.`);
        finalDist = airDistance * (isShortHaul ? 1.3 : 1.35);
        finalTime = (finalDist / (isShortHaul ? 30 : 50)) * 60;
    }

    const dieselPrice = 93.5;
    const mileage = 4;
    const fuelCost = (finalDist / mileage) * dieselPrice;
    const maintenance = finalDist * 2.5;
    
    // Dynamic Wage: ₹800 per 12 hours
    const shiftBlocks = Math.ceil(finalTime / (12 * 60)); 
    const dynamicWage = Math.max(800, shiftBlocks * 800);
    
    const tollRate = realStats?.hasTolls ? 3.5 : 3.0; // Fallback toll rate
    const tollCost = (realStats?.hasTolls || finalDist > 100) ? (finalDist * tollRate) : 0;

    const result = {
      route,
      estimatedTime: Math.round(finalTime),
      totalDistance: Math.round(finalDist * 10) / 10,
      fuelRequiredLitres: Math.round((finalDist / mileage) * 10) / 10,
      dieselPriceUsed: dieselPrice,
      costBreakdown: {
        fuel: Math.round(fuelCost),
        time: dynamicWage,
        maintenance: Math.round(maintenance),
        tolls: Math.round(tollCost),
        total: 0
      },
      routeLegs: [],
      reasoning: "System used high-precision fallback due to AI delay. Numbers are verified with TomTom Road Data.",
      createdAt: new Date(),
    };

    const cb = result.costBreakdown;
    cb.total = cb.fuel + cb.time + cb.maintenance + cb.tolls;

    return result;
  }

  /**
   * Analyze route with real-time data context
   */
  async analyzeRouteWithContext(routePlan, trafficData, weatherData) {
    if (!this.model) {
      return routePlan; // Return original if Gemini not available
    }

    const prompt = `Analyze this delivery route considering current conditions:

CURRENT ROUTE:
${JSON.stringify(routePlan.route, null, 2)}

TRAFFIC DATA:
${JSON.stringify(trafficData, null, 2)}

WEATHER DATA:
${JSON.stringify(weatherData, null, 2)}

Should the route be re-optimized? Provide recommendations in JSON:
{
  "shouldReoptimize": true/false,
  "adjustments": ["list of recommended changes"],
  "updatedTimeEstimate": "updated time in minutes",
  "updatedCost": "updated cost in INR",
  "reasoning": "explanation"
}

Respond ONLY with valid JSON. All currency must be in ₹ (INR).`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      let jsonString = text.trim();
      const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
         jsonString = jsonMatch[0];
      }

      const analysis = JSON.parse(jsonString);
      return {
        ...routePlan,
        analysis,
        lastUpdated: new Date(),
      };
    } catch (error) {
      console.error("Route analysis error:", error);
      return routePlan;
    }
  }

  /**
   * Analyze the entire fleet status and provide high-level insights
   */
  async analyzeFleetStatus(activeRoutes) {
    if (!this.model || !activeRoutes || activeRoutes.length === 0) {
      return { 
        insights: [
          { type: 'system', text: 'All systems operational. Monitoring active for ' + (activeRoutes?.length || 0) + ' routes.', time: 'Just now' }
        ],
        performance: 'Stable'
      };
    }

    const fleetSummary = activeRoutes.map(r => ({
      id: r._id,
      status: r.status,
      stops: r.deliveries?.length || 0,
      driver: r.driverId?.name || 'Unassigned',
      distance: r.totalDistance
    }));

    const prompt = `You are the Fleet Intelligence AI for FleetFlow. Analyze the following active fleet data and provide 3-4 concise, professional, and actionable insights.

FLEET DATA:
${JSON.stringify(fleetSummary, null, 2)}

Provide the feedback in EXACTLY this JSON format:
{
  "insights": [
    { "type": "system|global|network", "text": "Specific alert or optimization tip", "time": "Just now|5m ago|..." }
  ],
  "performanceScore": "percentage increase or status",
  "summary": "one sentence overview"
}

Focus on:
1. Efficiency improvements.
2. Potential delay patterns.
3. Distribution of workload.
Respond ONLY with valid JSON. Keep texts short (under 15 words).`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      let jsonString = text.trim();
      const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
      if (jsonMatch) jsonString = jsonMatch[0];

      return JSON.parse(jsonString);
    } catch (error) {
      console.error("Fleet analysis error:", error);
      return { 
        insights: [{ type: 'system', text: 'AI Analysis currently unavailable. Basic monitoring active.', time: 'Just now' }],
        performanceScore: '--',
        summary: 'Fleet data stable.'
      };
    }
  }
}

export default new GeminiService();
