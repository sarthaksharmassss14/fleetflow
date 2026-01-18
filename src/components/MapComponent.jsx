import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, LayersControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const { BaseLayer, Overlay } = LayersControl;

// Custom Marker Hack for sequence numbers
const createServiceIcon = (number, color = '#0066ff') => {
  return L.divIcon({
    className: 'custom-map-marker',
    html: `<div class="marker-pin" style="background: ${color}"></div><span class="marker-label">${number}</span>`,
    iconSize: [30, 42],
    iconAnchor: [15, 42],
    popupAnchor: [0, -40]
  });
};

const MapResizer = ({ markers }) => {
  const map = useMap();
  useEffect(() => {
    if (markers && markers.length > 0) {
      const markerPoints = markers.map(m => [m.lat, m.lng]);
      const bounds = L.latLngBounds(markerPoints);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [markers, map]);
  
  // Handle container resizing
  useEffect(() => {
    setTimeout(() => {
      map.invalidateSize();
    }, 400);
  }, [map]);

  return null;
};

const MapComponent = ({ route, showTraffic = true, showWeather = true }) => {
  const [markers, setMarkers] = useState([]);
  const [routePath, setRoutePath] = useState([]);
  const [resolving, setResolving] = useState(false);

  const TOMTOM_KEY = import.meta.env.VITE_TOMTOM_API_KEY || '';
  const OWM_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY || '';

  useEffect(() => {
    if (!route || !route.route) return;

    const resolveCoordinates = async () => {
      setResolving(true);
      const resolvedMarkers = [];
      const pathLocations = [];

      // 1. Resolve all stop coordinates
      for (let i = 0; i < route.route.length; i++) {
        const stop = route.route[i];
        
        if (stop.coordinates && stop.coordinates.lat) {
          resolvedMarkers.push({ lat: stop.coordinates.lat, lng: stop.coordinates.lng, stop, index: i + 1 });
          pathLocations.push(`${stop.coordinates.lat},${stop.coordinates.lng}`);
          continue;
        }

        try {
          // Use TomTom for client geocoding too (with India restriction)
          const resp = await fetch(`https://api.tomtom.com/search/2/geocode/${encodeURIComponent(stop.address)}.json?key=${TOMTOM_KEY}&limit=1&countrySet=IN`);
          const data = await resp.json();
          if (data && data.results && data.results.length > 0) {
            const pos = data.results[0].position;
            resolvedMarkers.push({ lat: pos.lat, lng: pos.lon, stop, index: i + 1 });
            pathLocations.push(`${pos.lat},${pos.lon}`);
          }
        } catch (err) {
          console.error("Client TomTom geocoding failed for", stop.address);
        }
      }

      setMarkers(resolvedMarkers);

      // 2. Fetch True Highway Geometry from TomTom
      if (pathLocations.length >= 2 && TOMTOM_KEY) {
        try {
          const locationsString = pathLocations.join(':');
          // Important: Use calculateRoute with accurate parameters
          const routeResp = await fetch(`https://api.tomtom.com/routing/1/calculateRoute/${locationsString}/json?key=${TOMTOM_KEY}&routeType=fastest&traffic=true`);
          const routeData = await routeResp.json();
          
          if (routeData.routes && routeData.routes[0]) {
            const allPoints = [];
            routeData.routes[0].legs.forEach(leg => {
              leg.points.forEach(p => {
                allPoints.push([p.latitude, p.longitude]);
              });
            });
            setRoutePath(allPoints);
          } else {
            setRoutePath(resolvedMarkers.map(m => [m.lat, m.lng]));
          }
        } catch (err) {
          console.error("Highway routing failed:", err);
          setRoutePath(resolvedMarkers.map(m => [m.lat, m.lng]));
        }
      } else {
        setRoutePath(resolvedMarkers.map(m => [m.lat, m.lng]));
      }

      setResolving(false);
    };

    resolveCoordinates();
  }, [route]);

  // Determine Priority Color
  // Helper for per-stop coloring
  const getPriorityColor = (priority) => {
    const p = (priority || 'normal').toLowerCase();
    if (p === 'urgent') return '#ef4444'; // Red
    if (p === 'high' || p === 'medium' || p === 'high') return '#0066ff'; // Blue
    return '#10b981'; // Green
  };

  return (
    <div style={{ height: '100%', width: '100%', position: 'relative' }}>
      {resolving && <div className="map-loader">Syncing Route Data...</div>}
      
      <MapContainer 
        center={[20.5937, 78.9629]} 
        zoom={5} 
        style={{ height: '100%', width: '100%' }}
        whenReady={(mapInstance) => {
          setTimeout(() => mapInstance.target.invalidateSize(), 500);
        }}
      >
        <LayersControl position="topright">
          <BaseLayer checked name="Modern (Voyager)">
            <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
          </BaseLayer>
          <BaseLayer name="Satellite">
            <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
          </BaseLayer>

          <Overlay checked={showTraffic} name="Live Traffic Flow">
            <TileLayer 
              url={`https://{s}.api.tomtom.com/traffic/map/4/tile/flow/relative0/{z}/{x}/{y}.png?key=${TOMTOM_KEY}`}
              subdomains={['a', 'b', 'c', 'd']}
              opacity={0.8}
            />
          </Overlay>

          <Overlay checked={showWeather} name="Weather Precipitation">
            <TileLayer 
              url={`https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${OWM_KEY}`}
              opacity={0.5}
            />
          </Overlay>
        </LayersControl>

        {markers.map((m, idx) => {
          const stopColor = getPriorityColor(m.stop.priority);
          return (
            <Marker key={idx} position={[m.lat, m.lng]} icon={createServiceIcon(m.index, stopColor)}>
              <Popup>
                <strong>Stop {m.index}</strong><br/>
                {m.stop.address}<br/>
                <span style={{color: stopColor, fontWeight: 'bold'}}>Priority: {m.stop.priority || 'normal'}</span>
              </Popup>
            </Marker>
          );
        })}

        {routePath.length > 1 && (
          <Polyline positions={routePath} color="#0066ff" weight={6} opacity={0.6} />
        )}

        <MapResizer markers={markers} />
      </MapContainer>

      <style>{`
        .map-loader {
            position: absolute; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(255,255,255,0.7); z-index: 1000;
            display: flex; align-items: center; justify-content: center;
            font-weight: bold; color: #0066ff;
        }
        .custom-map-marker { position: relative; }
        .marker-pin { width: 30px; height: 30px; border-radius: 50% 50% 50% 0; position: absolute; transform: rotate(-45deg); left: 50%; top: 50%; margin: -15px 0 0 -15px; }
        .marker-label { position: absolute; width: 100%; text-align: center; top: 50%; left: 50%; transform: translate(-50%, -100%); color: white; font-weight: 800; font-size: 12px; z-index: 10; }
      `}</style>
    </div>
  );
};

export default MapComponent;
