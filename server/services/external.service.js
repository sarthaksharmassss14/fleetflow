import axios from 'axios';

class ExternalService {
  async getWeatherData(city) {
    const key = process.env.OPENWEATHER_API_KEY;
    if (!key) {
      console.warn("Missing OPENWEATHER_API_KEY");
      return { condition: 'unknown', temperature: 20 };
    }
    try {
      const response = await axios.get(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${key}&units=metric`);
      return {
        condition: response.data.weather[0].main,
        temperature: response.data.main.temp,
        humidity: response.data.main.humidity,
        description: response.data.weather[0].description
      };
    } catch (error) {
      console.error("Weather API error:", error.message);
      return { condition: 'cloudy', temperature: 18 }; // Fallback
    }
  }

  async getTrafficData(lat, lon) {
    const key = process.env.TOMTOM_API_KEY;
    if (!key) {
      console.warn("Missing TOMTOM_API_KEY");
      return { congestionLevel: 'unknown', incidents: [] };
    }
    try {
      const response = await axios.get(`https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?key=${key}&point=${lat},${lon}`);
      
      const flowData = response.data.flowSegmentData;
      const speedRatio = flowData.currentSpeed / flowData.freeFlowSpeed;
      
      let congestion = 'low';
      if (speedRatio < 0.4) congestion = 'high';
      else if (speedRatio < 0.7) congestion = 'moderate';

      return {
        congestionLevel: congestion,
        currentSpeed: flowData.currentSpeed,
        freeFlowSpeed: flowData.freeFlowSpeed,
        confidence: flowData.confidence
      };
    } catch (error) {
      console.error("Traffic API error:", error.message);
      return { congestionLevel: 'moderate', incidents: [] }; // Fallback
    }
  }

  async geocode(address) {
    const key = process.env.TOMTOM_API_KEY;
    if (!key) {
      console.warn("[TomTom] Missing API Key for Geocoding");
      return null;
    }
    try {
      // Improve hit rate by appending India if not present
      const query = address.toLowerCase().includes('india') ? address : `${address}, India`;
      console.log(`[TomTom] Geocoding: ${query}`);
      
      const url = `https://api.tomtom.com/search/2/geocode/${encodeURIComponent(query)}.json?key=${key}&limit=1&countrySet=IN`;
      const resp = await axios.get(url, { timeout: 3000 });
      
      if (resp.data && resp.data.results && resp.data.results.length > 0) {
        const pos = resp.data.results[0].position;
        console.log(`[TomTom] Geocode Success: ${address} -> ${pos.lat},${pos.lon}`);
        return {
          lat: pos.lat,
          lng: pos.lon
        };
      }
      console.warn(`[TomTom] Geocode returned no results for: ${query}`);
      return null;
    } catch (err) {
      console.error(`[TomTom] Geocoding fail: ${address}`, err.message);
      return null;
    }
  }

  async getRouteStats(points) {
    const key = process.env.TOMTOM_API_KEY;
    if (!key || points.length < 2) {
      console.warn("Skipping TomTom Routing (Missing key or insufficient points)");
      return null;
    }
    
    try {
      const locations = points.map(p => `${p.lat},${p.lng}`).join(':');
      console.log(`[TomTom] Calculating Route: ${locations}`);
      
      // Try with truck parameters first for better precision
      const truckUrl = `https://api.tomtom.com/routing/1/calculateRoute/${locations}/json?key=${key}&traffic=true&vehicleType=truck&vehicleWeight=12000&routeType=fastest&report=tollSummary`;
      
      let resp;
      try {
        resp = await axios.get(truckUrl, { timeout: 5000 });
      } catch (err) {
        console.warn(`[TomTom] Truck routing failed, falling back to standard vehicle: ${err.message}`);
        // FALLBACK: Simple fastest route if truck routing fails
        const fallbackUrl = `https://api.tomtom.com/routing/1/calculateRoute/${locations}/json?key=${key}&traffic=true&routeType=fastest&report=tollSummary`;
        resp = await axios.get(fallbackUrl, { timeout: 5000 });
      }

      const route = resp.data.routes[0].summary;
      // Extract toll summary
      const tollSummary = resp.data.routes[0].sections?.filter(s => s.type === 'tollRoad') || [];
      
      console.log(`[TomTom] Success: ${route.lengthInMeters / 1000}km in ${route.travelTimeInSeconds / 60}min`);

      return {
        distanceKm: route.lengthInMeters / 1000,
        timeMinutes: route.travelTimeInSeconds / 60,
        hasTolls: tollSummary.length > 0
      };
    } catch (err) {
      console.error("[TomTom] Fatal Routing Error:", err.message);
      return null;
    }
  }
}

export default new ExternalService();
