import axios from 'axios';
import NodeCache from 'node-cache';

class ExternalService {
  constructor() {
    // Standard TTL 10 minutes, check for expired keys every 2 minutes
    this.cache = new NodeCache({ stdTTL: 600, checkperiod: 120 });
  }

  async getWeatherData(city, lat, lon) {
    const cacheKey = `weather:${lat && lon ? `${lat},${lon}` : city?.toLowerCase().trim()}`;
    const cached = this.cache.get(cacheKey);

    if (cached) {
      console.log(`[Cache] Hit for ${cacheKey}`);
      return cached;
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
      this.cache.set(cacheKey, data);
      return data;
    } catch (error) {
      if (error.response?.status === 429) {
        console.warn(`[Weather] Rate limit hit for ${cacheKey}. Return last cached or fallback.`);
        if (cached) return cached;
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
    const cacheKey = `traffic:${lat},${lon}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      console.log(`[Cache] Hit for ${cacheKey}`);
      return cached;
    }

    const key = process.env.TOMTOM_API_KEY;
    if (!key) {
      console.warn("Missing TOMTOM_API_KEY");
      return { congestionLevel: 'unknown', incidents: [] };
    }
    try {
      // Traffic flows change faster, so maybe shorter TTL? stick to 10 mins for now to save credits
      const response = await axios.get(`https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?key=${key}&point=${lat},${lon}`);
      
      const flowData = response.data.flowSegmentData;
      const speedRatio = flowData.currentSpeed / flowData.freeFlowSpeed;
      
      let congestion = 'low';
      if (speedRatio < 0.4) congestion = 'high';
      else if (speedRatio < 0.7) congestion = 'moderate';

      const data = {
        congestionLevel: congestion,
        currentSpeed: flowData.currentSpeed,
        freeFlowSpeed: flowData.freeFlowSpeed,
        confidence: flowData.confidence
      };

      this.cache.set(cacheKey, data, 300); // 5 minutes TTL for traffic
      return data;
    } catch (error) {
      console.error("Traffic API error:", error.message);
      return { congestionLevel: 'moderate', incidents: [] }; // Fallback
    }
  }

  async geocode(address) {
    if (!address) return null;
    const cacheKey = `geo:${address.toLowerCase().trim()}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

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
        const result = {
          lat: pos.lat,
          lng: pos.lon
        };
        this.cache.set(cacheKey, result, 86400); // Cache geocodes for 24 hours
        return result;
      }
      return null;
    } catch (err) {
      console.error(`[TomTom] Geocoding fail: ${address}`, err.message);
      return null;
    }
  }

  async searchAddress(query) {
    // Don't cache search auto-complete aggresively, or maybe short TTL
    const key = process.env.TOMTOM_API_KEY;
    if (!key || !query || query.length < 3) return []; 

    try {
      console.log(`[TomTom] Searching for: ${query}`);
      const url = `https://api.tomtom.com/search/2/search/${encodeURIComponent(query)}.json?key=${key}&limit=5&countrySet=IN`;
      const resp = await axios.get(url, { timeout: 3000 });

      if (resp.data && resp.data.results) {
        console.log(`[TomTom] Found ${resp.data.results.length} results`);
        return resp.data.results.map(r => ({
          label: r.address.freeformAddress,
          value: r.address.freeformAddress,
          position: r.position
        }));
      }
      return [];
    } catch (err) {
      console.error(`[TomTom] Search failed for ${query}:`, err.message);
      return [];
    }
  }

  async reverseGeocode(lat, lon) {
    const cacheKey = `revgeo:${lat},${lon}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const key = process.env.TOMTOM_API_KEY;
    if (!key) return null;
    try {
      const url = `https://api.tomtom.com/search/2/reverseGeocode/${lat},${lon}.json?key=${key}`;
      const resp = await axios.get(url, { timeout: 4000 });
      if (resp.data && resp.data.addresses && resp.data.addresses.length > 0) {
        const result = resp.data.addresses[0].address.freeformAddress;
        this.cache.set(cacheKey, result, 86400); // 24 hours
        return result;
      }
      return null;
    } catch (err) {
      console.error("[TomTom] Reverse Geocode error:", err.message);
      return null;
    }
  }

  async getRouteStats(points, vehicleType = 'van') {
    // Cache route stats? Maybe. Complex key though.
    const key = process.env.TOMTOM_API_KEY;
    if (!key || points.length < 2) {
      return null;
    }
    
    try {
      // Filter out invalid coordinates to prevent 400 errors
      const validPoints = points.filter(p => p && typeof p.lat === 'number' && typeof p.lng === 'number');
      if (validPoints.length < 2) return null;
      
      const locations = validPoints.map(p => `${p.lat},${p.lng}`).join(':');
      
      // Determine TomTom specific vehicle parameter
      const tomtomType = vehicleType === 'truck' ? 'truck' : 'car';
      
      let url = `https://api.tomtom.com/routing/1/calculateRoute/${locations}/json?key=${key}&traffic=true&travelMode=${tomtomType}&routeType=fastest&report=tollSummary`;
      
      if (tomtomType === 'truck') {
         url += '&vehicleWeight=12000'; // 12 Tonnes
      }

      let resp;
      try {
        resp = await axios.get(url, { timeout: 8000 });
      } catch (err) {
        // Only attempt fallback if we weren't already trying 'car'
        if (tomtomType === 'truck') {
          console.warn(`[TomTom] Primary truck routing failed, attempting fallback to car.`);
          const fallbackUrl = `https://api.tomtom.com/routing/1/calculateRoute/${locations}/json?key=${key}&traffic=true&travelMode=car&routeType=fastest&report=tollSummary`;
          resp = await axios.get(fallbackUrl, { timeout: 8000 });
        } else {
          throw err; // Re-throw to be caught by the outer catch
        }
      }

      const route = resp.data.routes[0].summary;
      const tollSummary = resp.data.routes[0].sections?.filter(s => s.type === 'tollRoad') || [];
      
      return {
        distanceKm: route.lengthInMeters / 1000,
        timeMinutes: route.travelTimeInSeconds / 60,
        trafficDelayMins: (route.trafficDelayInSeconds || 0) / 60,
        hasTolls: tollSummary.length > 0
      };
    } catch (err) {
      console.error("[TomTom] Fatal Routing Error:", err.response?.data?.error?.description || err.message);
      return null;
    }
  }
}

export default new ExternalService();
