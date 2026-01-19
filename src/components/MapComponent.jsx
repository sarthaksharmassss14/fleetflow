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

const LiveVehicleMarker = ({ path, onUpdate, startTime, durationMinutes }) => {
  const [position, setPosition] = useState(path[0]);
  
  // Custom Truck Icon
  const truckIcon = useMemo(() => L.divIcon({
    className: 'vehicle-marker',
    html: '<div style="font-size: 24px;">🚛</div>',
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  }), []);

  useEffect(() => {
    if (!path || path.length < 2) return;
    
    // Timer to update position based on Real Time Sync
    const updatePosition = () => {
      const start = startTime ? new Date(startTime).getTime() : Date.now();
      const now = Date.now();
      const elapsedSec = (now - start) / 1000;
      const totalSec = (durationMinutes || 60) * 60;
      
      let progress = elapsedSec / totalSec;
      
      // If duration is 0 or invalid, default to 0
      if (!totalSec) progress = 0;
      
      if (progress >= 1) {
          progress = 1;
      }
      
      const idx = Math.floor(progress * (path.length - 1));
      
      if (path[idx]) {
        setPosition(path[idx]);
      }
      
      if (onUpdate) onUpdate(progress);
    };

    const interval = setInterval(updatePosition, 1000);
    updatePosition(); // Initial call

    return () => clearInterval(interval);
  }, [path, startTime, durationMinutes]);



  if (!position) return null;

  return <Marker position={position} icon={truckIcon} zIndexOffset={1000} />;
};

const MapComponent = ({ route, isDriver, hasDriver, onComplete }) => {
  const [markers, setMarkers] = useState([]);
  const [routePath, setRoutePath] = useState([]);
  const [resolving, setResolving] = useState(false);
  const [vehicleProgress, setVehicleProgress] = useState(0);

  // Live Vehicle Marker Logic
  // Only show if route has a driver assigned
  const showVehicle = hasDriver && routePath.length > 0;

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
      
      {/* Live Stats HUD */}
      {!resolving && routePath.length > 0 && !showVehicle && (
         <div id="live-stats-hud" className="live-stats-overlay">
           <div style={{fontSize: '0.9rem', fontWeight: 600}}>Initializing Tracker...</div>
         </div>
      )}

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

          <Overlay name="Live Traffic Flow">
            <TileLayer 
              url={`https://{s}.api.tomtom.com/traffic/map/4/tile/flow/relative0/{z}/{x}/{y}.png?key=${TOMTOM_KEY}`}
              subdomains={['a', 'b', 'c', 'd']}
              opacity={0.8}
            />
          </Overlay>

          <Overlay name="Weather Precipitation">
            <TileLayer 
              url={`https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${OWM_KEY}`}
              opacity={0.5}
            />
          </Overlay>
        </LayersControl>

        {markers.map((m, idx) => {
          const stopColor = getPriorityColor(m.stop.priority);
          return (
            <Marker 
              key={idx} 
              position={[m.lat, m.lng]} 
              icon={createServiceIcon(m.index, stopColor)}
              draggable={true}
              eventHandlers={{
                dragend: (e) => {
                  const newPos = e.target.getLatLng();
                  console.log(`Stop ${m.index} dragged to:`, newPos);
                  // In a full implementation, this would trigger an API call to update the stop address/coordinates
                  alert(`Stop ${m.index} moved to new location! (Update API would fire here)`);
                }
              }}
            >
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


        {/* Simulated Live Vehicle Marker */}
        {showVehicle && (
          <LiveVehicleMarker 
            path={routePath} 
            startTime={route.updatedAt}
            durationMinutes={route.estimatedTime}
            onUpdate={(progress) => {
               setVehicleProgress(progress);
               // Update parent state for HUD
               if (route && route.totalDistance) {
                  const distRem = route.totalDistance * (1 - progress);
                  const timeRem = (route.estimatedTime || 0) * (1 - progress);
                  const hrs = Math.floor(timeRem / 60);
                  const mins = Math.floor(timeRem % 60);
                  const timeStr = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
               }
            }} 
          />
        )}

        <MapResizer markers={markers} />

        {/* Live Stats HUD - React Component */}
        {showVehicle && vehicleProgress > 0 && (
            <div 
              className="live-stats-overlay"
              style={{ pointerEvents: 'auto' }}
              onMouseDown={(e) => { e.stopPropagation(); }}
              onClick={(e) => { e.stopPropagation(); }}
              onDoubleClick={(e) => { e.stopPropagation(); }}
            >
              {(() => {
                 const distRem = route.totalDistance * (1 - vehicleProgress);
                 const timeRem = (route.estimatedTime || 0) * (1 - vehicleProgress);
                 const hrs = Math.floor(timeRem / 60);
                 const mins = Math.ceil(timeRem % 60);
                 const timeStr = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
                 
                 if (vehicleProgress >= 0.99) {
                    return (
                        <>
                           <div style={{fontSize: '0.85rem', color: '#16a34a', marginBottom: '4px', fontWeight:700}}>✅ Arrived at Destination</div>
                           {isDriver && (
                               <button 
                                 onMouseDown={(e) => e.stopPropagation()}
                                 onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    if (onComplete) onComplete();
                                 }} 
                                 className="btn-complete-trip"
                               >
                                 End Trip
                               </button>
                           )}
                        </>
                    );
                 } else {
                    return (
                        <>
                            <div style={{fontSize: '0.85rem', color: 'var(--text-light)', marginBottom: '2px'}}>🚚 Live Tracking</div>
                            <div style={{fontWeight: 800, color: 'var(--text-dark)', fontSize: '1.2rem'}}>{distRem.toFixed(1)} km left</div>
                            <div style={{fontSize: '0.95rem', color: '#10b981', fontWeight: 700}}>⏱️ {timeStr} remaining</div>
                        </>
                    );
                 }
              })()}
            </div>
        )}

      </MapContainer>

      <style>{`
        .map-loader {
            position: absolute; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(255,255,255,0.7); z-index: 1000;
            display: flex; align-items: center; justify-content: center;
            font-weight: bold; color: #0066ff;
        }
        [data-theme='dark'] .map-loader {
            background: rgba(0,0,0,0.7);
        }
        .custom-map-marker { position: relative; }
        .marker-pin { width: 30px; height: 30px; border-radius: 50% 50% 50% 0; position: absolute; transform: rotate(-45deg); left: 50%; top: 50%; margin: -15px 0 0 -15px; }
        .marker-label { position: absolute; width: 100%; text-align: center; top: 50%; left: 50%; transform: translate(-50%, -100%); color: white; font-weight: 800; font-size: 12px; z-index: 10; }
        .live-stats-overlay {
            position: absolute;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: var(--bg-white);
            color: var(--text-dark);
            padding: 12px 24px;
            border-radius: 40px;
            box-shadow: var(--shadow-lg);
            border: 1px solid var(--border-color);
            z-index: 999;
            pointer-events: none;
            text-align: center;
            backdrop-filter: blur(8px);
            min-width: 220px;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        .btn-complete-trip {
            background: #16a34a; 
            color: white; 
            border: none; 
            padding: 8px 16px; 
            border-radius: 8px; 
            cursor: pointer; 
            marginTop: 6px; 
            fontWeight: 700;
            fontSize: 0.9rem;
            pointerEvents: auto;
            transition: all 0.2s;
        }
        .btn-complete-trip:hover {
            background: #15803d;
            transform: translateY(-1px);
        }
      `}</style>
    </div>
  );
};

export default MapComponent;
