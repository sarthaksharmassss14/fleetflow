import axios from 'axios';

class ExternalService {
  constructor() {
    this.weatherCache = new Map();
    this.CACHE_TTL = 10 * 60 * 1000; // 10 minutes
  }

  async getWeatherData(city, lat, lon) {
    const cacheKey = lat && lon ? `${lat},${lon}` : city?.toLowerCase().trim();
    const cached = this.weatherCache.get(cacheKey);

    if (cached && (Date.now() - cached.timestamp < this.CACHE_TTL)) {
      console.log(`[Weather] Using cached data for: ${cacheKey}`);
      return cached.data;
    }

    const key = process.env.WEATHER_API_KEY;
    if (!key) {
      console.warn("[Weather] Missing WEATHER_API_KEY in .env");
      return { 
        condition: 'Cloudy', 
        temperature: 18, 
        humidity: 65, 
        windSpeed: 5, 
        visibility: 10000, 
        pressure: 1012, 
        description: 'API key missing (Fallback)' 
      };
    }
    try {
      let query = city;
      
      // If no coordinates, try to get them via TomTom geocode first for better precision
      let activeLat = lat;
      let activeLon = lon;
      
      if (!activeLat || !activeLon) {
        const geo = await this.geocode(city);
        if (geo) {
          activeLat = geo.lat;
          activeLon = geo.lng;
        }
      }

      if (activeLat && activeLon) {
        query = `${activeLat},${activeLon}`;
      } else {
        // Fallback to string search if geocoding also fails
        query = city.toLowerCase().includes('india') ? city : `${city}, India`;
      }

      const url = `http://api.weatherapi.com/v1/current.json?key=${key}&q=${encodeURIComponent(query)}&aqi=no`;
      
      const response = await axios.get(url);
      const current = response.data.current;
      const location = response.data.location;
      
      const data = {
        condition: current.condition.text,
        temperature: current.temp_c,
        humidity: current.humidity,
        description: current.condition.text,
        windSpeed: current.wind_kph,
        visibility: current.vis_km * 1000, 
        pressure: current.pressure_mb,
        resolvedLocation: `${location.name}, ${location.region}, ${location.country}`
      };

      // Save to cache
      this.weatherCache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    } catch (error) {
      if (error.response?.status === 429) {
        console.warn(`[Weather] Rate limit hit for ${cacheKey}. Return last cached or fallback.`);
        if (cached) return cached.data;
      }
      console.error(`Weather API error [${city || (lat + ',' + lon)}]:`, error.message);
      return { 
        condition: 'Cloudy', 
        temperature: 18, 
        humidity: 65, 
        windSpeed: 5, 
        visibility: 10000, 
        pressure: 1012, 
        description: 'Conditions data unavailable (Fallback)' 
      };
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

  async getRouteStats(points, vehicleType = 'van') {
    const key = process.env.TOMTOM_API_KEY;
    if (!key || points.length < 2) {
      console.warn("Skipping TomTom Routing (Missing key or insufficient points)");
      return null;
    }
    
    try {
      const locations = points.map(p => `${p.lat},${p.lng}`).join(':');
      console.log(`[TomTom] Debug - Input Type: '${vehicleType}'`);
      console.log(`[TomTom] Calculating Route: ${locations} [Type: ${vehicleType}]`);
      
      // Map user vehicle type to TomTom type
      // 'van' -> 'car' (allows expressways, generally faster, Google Maps-like)
      // 'truck' -> 'truck' (avoids restricted roads, might be longer)
      const tomtomType = vehicleType === 'truck' ? 'truck' : 'car';
      
      let url = `https://api.tomtom.com/routing/1/calculateRoute/${locations}/json?key=${key}&traffic=true&travelMode=${tomtomType}&routeType=fastest&report=tollSummary`;
      
      if (tomtomType === 'truck') {
         url += '&vehicleWeight=12000'; // 12 Tonnes
      }

      let resp;
      try {
        resp = await axios.get(url, { timeout: 8000 });
      } catch (err) {
        console.warn(`[TomTom] Primary routing failed for ${vehicleType}, attempting fallback to standard car routing: ${err.message}`);
        // FALLBACK: Simple car routing if specific one fails
        const fallbackUrl = `https://api.tomtom.com/routing/1/calculateRoute/${locations}/json?key=${key}&traffic=true&vehicleType=car&routeType=fastest&report=tollSummary`;
        resp = await axios.get(fallbackUrl, { timeout: 8000 });
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
