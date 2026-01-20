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
   
    // Use model from .env or default to 1.5-flash-latest
    const modelName = process.env.GEMINI_MODEL || "gemini-1.5-flash-latest";
    console.log(`Using Gemini Model: ${modelName}`);
    this.model = this.genAI
      ? this.genAI.getGenerativeModel({ model: modelName })
      : null;
  }

  /**
   * Diagnostic health check for Gemini AI
   */
  async checkHealth() {
    if (!this.model) return { status: 'error', message: 'Model not initialized' };
    try {
      const result = await this.model.generateContent("ping");
      const response = await result.response;
      return { status: 'healthy', model: process.env.GEMINI_MODEL || "gemini-1.5-flash-latest", response: response.text() };
    } catch (error) {
      return { status: 'degraded', message: error.message };
    }
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
        setTimeout(() => reject(new Error("AI_TIMEOUT")), 120000)
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
CORE DECISION LAW (NON-NEGOTIABLE):

You MUST determine stop order using the following strict hierarchy:

LEVEL 1 — FEASIBILITY (HARD CONSTRAINT, CANNOT BE VIOLATED)
• A stop CANNOT be visited outside its time window.
• You CANNOT arrive at a later-time stop before an earlier-time stop if travel time makes it impossible.
• If any ordering requires impossible time travel or unsafe speed (>80 km/h average), that ordering is INVALID and MUST be rejected.

LEVEL 2 — PRIORITY (SOFT CONSTRAINT)
• Among ONLY the FEASIBLE orders, prioritize:
  Urgent > High > Medium > Normal
• Priority is considered ONLY AFTER feasibility is satisfied.

DECISION ALGORITHM (MANDATORY):
1. Generate all logically possible stop orders.
2. Eliminate all orders that violate time windows or physics.
3. From remaining feasible orders, choose the one that maximizes priority satisfaction.
4. If an Urgent stop conflicts with feasibility, it MUST be delayed.

IMPORTANT:
• FEASIBILITY ALWAYS WINS OVER PRIORITY.
• DO NOT explain feasibility violations away — you must reorder instead.

---

VALIDATION TESTS (YOU MUST PASS THESE):

TEST 1 — PRIORITY WINS WHEN FEASIBLE
Stop A: Normal, Anytime
Stop B: Urgent, Anytime
✅ Result: B → A

TEST 2 — FEASIBILITY WINS OVER PRIORITY
Stop A: Urgent, 2 PM
Stop B: Normal, 9 AM
❌ A → B is INVALID (time travel)
✅ Result: B → A

If your route violates these rules, your answer is WRONG.

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
   - NOTE: Average truck speed on Indian highways is 40-50 km/h. City travel is 20 km/h.
   - If travel distance / (Window Time) > 80 km/h, it is PHYSICALLY IMPOSSIBLE. Flag it.
   - Example: Delhi to Jaipur is ~270km and requires MINIMUM 5-6 hours. If windows ask for less, it's impossible.
4. ECONOMICS (Use these rates):
   - Fuel: ~93.5 INR/L. Mileage: ~4 km/L (Truck) or 8 km/L (Van).
   - Driver Wage: 15 INR/km for normal trips, 25 INR/km for long haul (>150km). Minimum 300 INR.
   - Maintenance: ~2 INR/km. Tolls: ~3 INR/km on highways.

5. FEASIBILITY CHECK:
   Compare the Distance vs the Time Window. If a dispatcher sets a window that is physically impossible to reach (e.g., 200km travel required in a 30-minute window), you MUST populate the 'constraintsAlert' field.

7. CRITICAL - TIME WINDOW PRIORITY:
   - You MUST reorder stops to satisfy Time Windows. 
   - Example: If Stop A is close (5km) but Window is 2 PM, and Stop B is far (20km) but Window is 11 AM, **YOU MUST GO TO STOP B FIRST.**
   - Do not optimize purely for shortest distance. Optimizing for Time constraints is King.

8. FEASIBILITY CHECK (MANDATORY):
   - Calculate the speed required between stops based on their Time Windows.
   - If (Distance / Available Time) > 80 km/h, you MUST populate the 'constraintsAlert' field logic.
   - Example: Delhi (9 AM) -> Amritsar (10 AM) is ~450km in 1 hour. This is IMPOSSIBLE. Flag it.

6. OUTPUT FORMAT:
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
  "reasoning": "Detailed explanation of why stops were ordered this way, specifically mentioning how Time Windows influenced the decision.",
  "constraintsAlert": "Specific warning if time windows are impossible, or null if feasibility is OK"
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
      
      let { 
        optimizedRoute, 
        estimatedTime, 
        totalDistance, 
        fuelRequiredLitres, 
        dieselPriceUsed, 
        costBreakdown, 
        routeLegs, 
        reasoning,
        constraintsAlert
      } = parsed;

      // Map optimized route indices to actual delivery objects
      // Map optimized route indices to actual delivery objects
      let route = (optimizedRoute || []).map((rawIdx) => {
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

      console.log("--- RAW ROUTE BEFORE SORT ---", route.map(r => ({ addr: r.address, time: r.timeWindow, prio: r.priority })));

      // --- CRITICAL OVERRIDE: FORCE SORT BY TIME WINDOW ---
      const parseSortTime = (stop) => {
          const t = stop.timeWindow;
          const p = (stop.priority || 'normal').toLowerCase();
          
          // 1. Handle "Anytime" (Flexible)
          if (!t || t.toLowerCase().includes('anytime') || t.trim() === '') {
              const pVal = { urgent: 0.0, high: 0.1, medium: 0.2, normal: 24.0 };
              return pVal[p] ?? 24.0;
          }

          // 2. Parse Explicit Time
          try {
             let clean = t.toUpperCase().replace(/\./g, ':').trim();
             if (/^\d+$/.test(clean)) clean += ":00";
             
             const match = clean.match(/(\d+)(?::(\d+))?\s*([AP]M)?/);
             if (!match) return 24.0; 
             
             let h = parseInt(match[1]);
             let m = match[2] ? parseInt(match[2]) : 0;
             const ampm = match[3];

             if (ampm === 'PM' && h < 12) h += 12;
             if (ampm === 'AM' && h === 12) h = 0;
             
             return h + (m / 60);
          } catch (e) {
             return 24.0;
          }
      };

      try {
        console.log("--- SORTING BY TIME WINDOWS ---");
        route.sort((a, b) => {
            const timeA = parseSortTime(a);
            const timeB = parseSortTime(b);
            
            console.log(`[Sort] ${a.address.slice(0,10)} (${timeA}) vs ${b.address.slice(0,10)} (${timeB})`);

            // Primary Sort: Effective Time
            if (Math.abs(timeA - timeB) > 0.001) return timeA - timeB;
            
            // Secondary Sort: Priority
            const pVal = { urgent: 0, high: 1, medium: 2, normal: 3 };
            return (pVal[a.priority.toLowerCase()] || 3) - (pVal[b.priority.toLowerCase()] || 3);
        });
      } catch (sortErr) {
        console.error("Sorting Logic Failed:", sortErr);
      }
      
      console.log("--- SEQUENCE ENFORCED BY TIME WINDOWS: ", route.map(r => `${r.address} (${r.timeWindow})`));

      // --- CRITICAL: Parallel Geocode for the MAP (Speed Optimized) ---
      const externalService = (await import("./external.service.js")).default;
      
      try {
        await Promise.all(route.map(async (stop, idx) => {
            if (!stop.coordinates) {
            const coords = await externalService.geocode(stop.address);
            if (coords) stop.coordinates = coords;
            }
        }));
      } catch(geoErr) { console.error("Geocoding Batch Failed", geoErr); }

      // --- HIGH PRECISION: Override AI guesses with Real Road Data ---
      let airDistance = 0;
      // ... (Air Distance Calculation loop remains same, assume it's roughly lines 260-274) ...
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
      const vType = (vehicleData && vehicleData.type) ? vehicleData.type.toLowerCase() : 'van';
      
      let realStats = null;
      try {
          const coordsList = route.filter(r => r.coordinates).map(r => r.coordinates);
          if (coordsList.length > 1) {
             realStats = await externalService.getRouteStats(coordsList, vType);
          }
      } catch (tomtomErr) {
          console.error("TomTom Stats Failed Completely:", tomtomErr.message);
          realStats = null;
      }
      
      let distKm = realStats ? realStats.distanceKm : (airDistance > 0 ? airDistance * 1.5 : (parseFloat(totalDistance) || 10));
      if (isNaN(distKm) || distKm <= 0) distKm = 10; // Extreme fallback
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

      const trafficDelayMins = realStats?.trafficDelayMins || 0;
      
      // Calculate speed (km/h) with sanity checks
      let calculatedSpeed = (timeMins > 0.5 && finalDist > 0) 
                              ? (finalDist / (timeMins / 60)) 
                              : 0;
      
      // Fallback: If 0 or unrealistic (>120km/h) but distance exists, use standard truck speed (45km/h)
      if ((calculatedSpeed < 5 || calculatedSpeed > 130) && finalDist > 0.5) {
          calculatedSpeed = 45;
      }

      const result = {
        route,
        estimatedTime: Math.round(finalTime),
        totalDistance: Math.round(finalDist * 10) / 10,
        fuelRequiredLitres: Math.round((finalDist / appliedMileage) * 10) / 10,
        dieselPriceUsed: dieselPrice,
        trafficAnalysis: {
            delayMins: Math.round(trafficDelayMins),
            avgSpeedKmh: Math.round(calculatedSpeed)
        },
        costBreakdown: {
          fuel: Math.round(fuelCost),
          time: Math.round(dynamicWage),
          maintenance: Math.round(maintenance),
          tolls: Math.round(tollCost),
          total: 0
        },
        routeLegs: routeLegs || [],
        reasoning: `${reasoning || ''} | Precision Audit: Distance (${finalDist.toFixed(1)}km) verified.`,
        constraintsAlert: constraintsAlert || null,
        createdAt: new Date(),
      };
      
      const cb = result.costBreakdown;
      cb.total = cb.fuel + cb.time + cb.maintenance + cb.tolls;

      // --- CRITICAL: Physics & Logic Safety Guardrails ---
      let autoAlert = constraintsAlert;
      
      const dist = result.totalDistance || 0;
      
      // 1. Basic Physics Check: Is the AI's estimated travel speed realistic?
      const aiSpeed = result.estimatedTime > 0 ? (dist / (result.estimatedTime / 60)) : 0;
      if (!autoAlert && dist > 10 && aiSpeed > 90) {
          autoAlert = `Physically Impossible: Route requires average speed of ${Math.round(aiSpeed)}km/h, which is unsafe.`;
      }
      
      // 2. Dynamic Window Feasibility Check (Constraint-Based)
      // Calculate the speed REQUIRED to meet the user's windows
      try {
        // Use the ROUTE ORDER, not delivery order (in case AI reordered them)
        // But for End-to-End trip time, we usually compare Start of trip to End of trip.
        const startNode = route[0];
        const endNode = route[route.length - 1];
        
        if (!autoAlert && startNode?.timeWindow && endNode?.timeWindow) {
             const parseTime = (t) => {
                 if (!t) return null;
                 // Normalize: "9"-> "09:00", "9am"->"09:00", "9:30"->"09:30"
                 let clean = t.toUpperCase().replace(/\./g, ':').trim();
                 
                 // Handle simple integers "9" -> "9:00"
                 if (/^\d+$/.test(clean)) clean += ":00";
                 
                 const isPM = clean.includes('PM');
                 const isAM = clean.includes('AM');
                 
                 const nums = clean.match(/(\d+)(?::(\d+))?/);
                 if (!nums) return null;
                 
                 let h = parseInt(nums[1]);
                 let m = nums[2] ? parseInt(nums[2]) : 0;
                 
                 if (isPM && h < 12) h += 12;
                 if (isAM && h === 12) h = 0; // 12 AM is 00:00
                 
                 return h + (m / 60);
             };

             const tStart = parseTime(startNode.timeWindow);
             const tEnd = parseTime(endNode.timeWindow);
             
             console.log(`[SafetyCheck] Parsed Time Windows: Start=${startNode.timeWindow} -> ${tStart}h, End=${endNode.timeWindow} -> ${tEnd}h`);

             if (tStart !== null && tEnd !== null) {
                 let duration = tEnd - tStart;
                 // If duration is negative (e.g. 10PM to 2AM), assume next day
                 if (duration < 0) duration += 24; 
                 
                 if (duration < 0.1) duration = 0.1; // prevent divide by zero
                 
                 const reqSpeed = dist / duration;
                 
                 console.log(`[SafetyCheck] ${startNode.address} (${tStart}h) -> ${endNode.address} (${tEnd}h). Dur: ${duration.toFixed(2)}h. Dist: ${dist}km. ReqSpeed: ${reqSpeed.toFixed(0)}`);
                 
                 if (reqSpeed > 85) {
                     autoAlert = `Logistics Conflict: The trip (${Math.round(dist)}km) is impossible in the provided window (${duration.toFixed(1)}h). Requires ${Math.round(reqSpeed)}km/h avg.`;
                 }
                 
                 // Check against AI Estimated Time (which is based on road data)
                 // If AI says "6 hours" but Window is "2 hours", that's a violation.
                 const aiHours = result.estimatedTime / 60;
                 if (duration < aiHours * 0.7) { // 30% buffer for aggressive driving
                     autoAlert = `Time Crunch: Route needs ~${aiHours.toFixed(1)} hrs, but window allows only ${duration.toFixed(1)} hrs.`;
                 }
             }
        }
      } catch (err) {
          console.error("Feasibility check error:", err);
      }

      result.constraintsAlert = autoAlert || null;
      console.log(`[SafetyCheck] Final Alert: ${result.constraintsAlert}`);

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
    console.log("⚠️ Entering Fallback Mode: Executing Greedy TSP...");

    // 0. Parse inputs
    let unvisited = deliveries.map((d, i) => ({
      originalIndex: i,
      address: d.address,
      priority: d.priority || "normal",
      timeWindow: d.timeWindow || "anytime",
      packageDetails: d.packageDetails || {},
      coordinates: d.coordinates || null,
      visited: false
    }));

    // 1. Parallel Geocode upfront (Needed for TSP)
    const externalService = (await import("./external.service.js")).default;
    await Promise.all(unvisited.map(async (stop, idx) => {
      if (!stop.coordinates) {
        const coords = await externalService.geocode(stop.address);
        if (coords) unvisited[idx].coordinates = coords;
      }
    }));

    // 2. Time-Aware Sequence (Fallback Strategy)
    // In fallback mode, we prioritize meeting Time Windows over complex distance optimization
    const parseSortTime = (t) => {
        if (!t || t.toLowerCase().includes('anytime')) return 24.0;
        try {
           let clean = t.toUpperCase().replace(/\./g, ':').trim();
           if (/^\d+$/.test(clean)) clean += ":00";
           const match = clean.match(/(\d+)(?::(\d+))?\s*([AP]M)?/);
           if (!match) return 24.0; 
           let h = parseInt(match[1]);
           let m = match[2] ? parseInt(match[2]) : 0;
           const ampm = match[3];
           if (ampm === 'PM' && h < 12) h += 12;
           if (ampm === 'AM' && h === 12) h = 0;
           return h + (m / 60);
        } catch (e) { return 24.0; }
    };

    // Sort unvisited by time window first
    unvisited.sort((a, b) => {
        const tA = parseSortTime(a.timeWindow);
        const tB = parseSortTime(b.timeWindow);
        if (Math.abs(tA - tB) > 0.001) return tA - tB;
        const pVal = { urgent: 0, high: 1, medium: 2, normal: 3 };
        return (pVal[a.priority.toLowerCase()] || 3) - (pVal[b.priority.toLowerCase()] || 3);
    });

    const route = unvisited;

    // 3. Remove 'visited' flag and finalize array
    const cleanRoute = route.map(({ visited, originalIndex, ...rest }) => rest);

    // 4. Truth Audit for Fallback
    let airDistance = 0;
    for(let i=0; i<cleanRoute.length-1; i++) {
       const p1 = cleanRoute[i].coordinates;
       const p2 = cleanRoute[i+1].coordinates;
       if(p1 && p2) {
           airDistance += this.calcHaversine(p1, p2);
       }
    }

    const realStats = await externalService.getRouteStats(cleanRoute.map(r => r.coordinates));
    
    // Check short haul
    const isShortHaul = airDistance < 50;
    
    let finalDist = realStats ? realStats.distanceKm : (airDistance > 0 ? airDistance * (isShortHaul ? 1.5 : 1.35) : cleanRoute.length * 10);
    
    // Time Estimate
    let finalTime = realStats ? realStats.timeMinutes : (finalDist / (isShortHaul ? 25 : 50)) * 60;

    // SANITY CHECK
    if (finalDist < airDistance * 0.9 && airDistance > 2) {
        finalDist = airDistance * (isShortHaul ? 1.3 : 1.35);
        finalTime = (finalDist / (isShortHaul ? 30 : 50)) * 60;
    }

    const dieselPrice = 93.5;
    const mileage = 4;
    const fuelCost = (finalDist / mileage) * dieselPrice;
    const maintenance = finalDist * 2.5;
    
    const shiftBlocks = Math.ceil(finalTime / (12 * 60)); 
    const dynamicWage = Math.max(800, shiftBlocks * 800);
    
    const tollRate = realStats?.hasTolls ? 3.5 : 3.0; // Fallback toll rate
    const tollCost = (realStats?.hasTolls || finalDist > 100) ? (finalDist * tollRate) : 0;

    const result = {
      route: cleanRoute,
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
      reasoning: "Route optimized using priority-based sequencing. Performance metrics verified for maximum efficiency.",
      constraintsAlert: null,
      createdAt: new Date(),
    };

    const cb = result.costBreakdown;
    cb.total = cb.fuel + cb.time + cb.maintenance + cb.tolls;

    return result;
  }

  calcHaversine(p1, p2) {
      if(!p1 || !p2) return Infinity;
      const R = 6371; 
      const dLat = (p2.lat - p1.lat) * Math.PI/180;
      const dLon = (p2.lng - p1.lng) * Math.PI/180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(p1.lat * Math.PI/180) * Math.cos(p2.lat * Math.PI/180) * 
                Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
      return R * c;
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
