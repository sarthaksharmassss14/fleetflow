import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, LayersControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import apiService from '../services/api.service.js';

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

const MapResizer = ({ markers, path }) => {
  const map = useMap();
  
  useEffect(() => {
    if ((markers && markers.length > 0) || (path && path.length > 0)) {
      const bounds = L.latLngBounds([]);
      
      if (path && path.length > 0) {
        path.forEach(p => bounds.extend(p));
      } else if (markers && markers.length > 0) {
        markers.forEach(m => bounds.extend([m.lat, m.lng]));
      }

      if (bounds.isValid()) {
        // Use a small delay to ensure container is fully sized
        setTimeout(() => {
          map.invalidateSize();
          map.fitBounds(bounds, { 
            padding: [50, 50], 
            maxZoom: 14,
            animate: true,
            duration: 1.5
          });
        }, 300);
      }
    }
  }, [markers, path, map]);
  
  // Handle container resizing on mount
  useEffect(() => {
    setTimeout(() => {
      map.invalidateSize();
    }, 500);
  }, [map]);

  return null;
};

const LiveVehicleMarker = ({ path, onUpdate, startTime, durationMinutes }) => {
  const [position, setPosition] = useState(path[0]);
  
  // Calculate heading between two points
  const getHeading = (p1, p2) => {
    if (!p1 || !p2) return 0;
    const lat1 = p1[0] * Math.PI / 180;
    const lon1 = p1[1] * Math.PI / 180;
    const lat2 = p2[0] * Math.PI / 180;
    const lon2 = p2[1] * Math.PI / 180;
    const y = Math.sin(lon2 - lon1) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);
    const brng = Math.atan2(y, x) * 180 / Math.PI;
    return (brng + 360) % 360;
  };

  const [rotation, setRotation] = useState(0);

  // Custom Pro-Truck Icon (SVG)
  const truckIcon = useMemo(() => L.divIcon({
    className: 'vehicle-marker-pro',
    html: `
      <div class="truck-container" style="transform: rotate(${rotation}deg); transition: transform 0.3s ease-out;">
        <svg width="42" height="42" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <!-- Truck Base -->
          <rect x="35" y="20" width="30" height="60" rx="4" fill="#1e293b"/>
          <!-- Cabin -->
          <rect x="35" y="65" width="30" height="15" rx="2" fill="#3b82f6"/>
          <!-- Windshield -->
          <rect x="38" y="72" width="24" height="4" rx="1" fill="#93c5fd"/>
          <!-- Wheels -->
          <circle cx="33" cy="35" r="5" fill="#000"/>
          <circle cx="67" cy="35" r="5" fill="#000"/>
          <circle cx="33" cy="70" r="5" fill="#000"/>
          <circle cx="67" cy="70" r="5" fill="#000"/>
        </svg>
      </div>
    `,
    iconSize: [42, 42],
    iconAnchor: [21, 21]
  }), [rotation]);

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
      const nextIdx = Math.min(idx + 1, path.length - 1);
      
      if (path[idx]) {
        setPosition(path[idx]);
        const heading = getHeading(path[idx], path[nextIdx]);
        // Only update rotation if there's actual movement to avoid jumpy behavior
        if (Math.abs(path[idx][0] - path[nextIdx][0]) > 0.0001 || Math.abs(path[idx][1] - path[nextIdx][1]) > 0.0001) {
            setRotation(heading);
        }
        if (onUpdate) onUpdate(progress, path[idx]);
      }
    };

    const interval = setInterval(updatePosition, 1000);
    updatePosition(); // Initial call

    return () => clearInterval(interval);
  }, [path, startTime, durationMinutes]);



  if (!position) return null;

  return <Marker position={position} icon={truckIcon} zIndexOffset={1000} />;
};

const MapComponent = ({ route, isDriver, hasDriver, onComplete, onTruckMove }) => {
  const [markers, setMarkers] = useState([]);
  const [routePath, setRoutePath] = useState([]);
  const [resolving, setResolving] = useState(false);
  const [vehicleProgress, setVehicleProgress] = useState(0);
  const [arriving, setArriving] = useState(false);

  // Sync state with server-side route data
  const [activeLeg, setActiveLeg] = useState(route?.activeLeg || 0);
  const [isStationary, setIsStationary] = useState(route?.isStationary !== false); 
  const [legStartTime, setLegStartTime] = useState(route?.lastDepartedAt ? new Date(route.lastDepartedAt).getTime() : null);

  useEffect(() => {
    setActiveLeg(route?.activeLeg || 0);
    setIsStationary(route?.isStationary !== false);
    setLegStartTime(route?.lastDepartedAt ? new Date(route.lastDepartedAt).getTime() : null);
  }, [route?.activeLeg, route?.isStationary, route?.lastDepartedAt]);

  const handleDepart = async () => {
    if (!isDriver) return;
    const startTime = Date.now();
    
    // Save to server so Dispatcher sees it too
    try {
      await apiService.updateRoute(route._id, {
        lastDepartedAt: new Date(startTime),
        isStationary: false,
        activeLeg: activeLeg
      });
      // Local update for immediate feedback
      setLegStartTime(startTime);
      setIsStationary(false);
    } catch (err) {
      console.error("Failed to depart:", err);
    }
  };

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
      // Sort to ensure dispatcher and driver see identical sequence regardless of DB retrieval order
      const stops = [...route.route].sort((a, b) => (a.order || 0) - (b.order || 0));

      for (let i = 0; i < stops.length; i++) {
        const stop = stops[i];
        
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

          {OWM_KEY && (
            <Overlay name="Weather Precipitation">
              <TileLayer 
                url={`https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${OWM_KEY}`}
                opacity={0.5}
              />
            </Overlay>
          )}
        </LayersControl>

        {markers.map((m, idx) => {
          const stopColor = getPriorityColor(m.stop.priority);
          return (
            <Marker 
              key={idx} 
              position={[m.lat, m.lng]} 
              icon={createServiceIcon(m.index, stopColor)}
              draggable={false}
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
        {showVehicle && !isStationary && (
          <LiveVehicleMarker 
            path={(() => {
                const totalSegments = markers.length - 1;
                if (totalSegments <= 0) return routePath;
                const startIdx = Math.floor((activeLeg / totalSegments) * (routePath.length - 1));
                const endIdx = Math.floor(((activeLeg + 1) / totalSegments) * (routePath.length - 1));
                return routePath.slice(startIdx, endIdx + 1);
            })()} 
            startTime={legStartTime}
            durationMinutes={Math.max(5, (route.estimatedTime || 60) / (markers.length - 1 || 1))} // Back to realistic slow speed
            onUpdate={(progress, coords) => {
               setVehicleProgress(progress);
               if (onTruckMove && coords) onTruckMove(coords);
               
               if (progress >= 1 && isDriver && !arriving) {
                   // Driver's client tells the server we arrived
                   setArriving(true);
                   apiService.updateRoute(route._id, {
                       isStationary: true,
                       activeLeg: activeLeg + 1,
                       lastDepartedAt: null
                   }).then(() => {
                       setIsStationary(true);
                       setActiveLeg(prev => prev + 1);
                       setVehicleProgress(0);
                       setArriving(false);
                   }).catch(err => {
                       console.error("Arrival report failed:", err);
                       setArriving(false);
                   });
               }
            }} 
          />
        )}

        {/* Show stationary truck at current marker if not moving */}
        {showVehicle && isStationary && markers[activeLeg] && (
           <Marker 
             position={[markers[activeLeg].lat, markers[activeLeg].lng]} 
             icon={L.divIcon({
                className: 'vehicle-marker-pro',
                html: `<div class="truck-container" style="transform: rotate(0deg)"><svg width="42" height="42" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="35" y="20" width="30" height="60" rx="4" fill="#1e293b"/><rect x="35" y="65" width="30" height="15" rx="2" fill="#3b82f6"/><rect x="38" y="72" width="24" height="4" rx="1" fill="#93c5fd"/><circle cx="33" cy="35" r="5" fill="#000"/><circle cx="67" cy="35" r="5" fill="#000"/><circle cx="33" cy="70" r="5" fill="#000"/><circle cx="67" cy="70" r="5" fill="#000"/></svg></div>`,
                iconSize: [42, 42],
                iconAnchor: [21, 21]
             })}
           />
        )}

        <MapResizer markers={markers} path={routePath} />

        {/* Live Stats HUD - React Component */}
        {showVehicle && (
            <div 
              className="live-stats-overlay"
              style={{ pointerEvents: 'auto' }}
            >
              {(() => {
                 if (activeLeg >= markers.length - 1 && isStationary) {
                    return (
                        <>
                           <div style={{fontSize: '0.9rem', color: '#16a34a', marginBottom: '8px', fontWeight:800}}>🏁 All Deliveries Completed</div>
                           {isDriver && (
                               <button 
                                 onClick={(e) => { e.stopPropagation(); if (onComplete) onComplete(); }} 
                                 className="btn-complete-trip"
                               >
                                 Finish & Archive Trip
                               </button>
                           )}
                        </>
                    );
                 } 
                 
                 if (isStationary) {
                    const nextStop = markers[activeLeg + 1];
                    return (
                        <>
                            <div style={{fontSize: '0.85rem', color: '#64748b', marginBottom: '8px'}}>📍 Current Stop: <b>{markers[activeLeg].stop.address.slice(0, 20)}...</b></div>
                            {isDriver ? (
                                <button 
                                  className="btn-complete-trip" 
                                  style={{ background: '#3b82f6' }}
                                  onClick={handleDepart}
                                >
                                   {activeLeg === 0 ? "Start Trip Now →" : `Depart for Stop ${activeLeg + 2} →`}
                                </button>
                            ) : (
                                <div style={{ fontSize: '0.85rem', color: '#3b82f6', fontWeight: 600 }}>
                                    {route?.status === 'active' ? "Driver preparing at current stop..." : "Waiting for Driver to start trip..."}
                                </div>
                            )}
                        </>
                    );
                 }

                 return (
                    <>
                        <div style={{fontSize: '0.85rem', color: '#10b981', marginBottom: '2px', fontWeight: 700}}>🚛 En Route to Stop {activeLeg + 2}</div>
                        {(() => {
                            // Leg-specific distance and time calculation
                            let currentLegDist = 0;
                            let currentLegTime = 0;

                            if (route.routeLegs && route.routeLegs[activeLeg]) {
                                currentLegDist = route.routeLegs[activeLeg].distanceKm;
                                currentLegTime = route.routeLegs[activeLeg].timeMins;
                            } else {
                                // Fallback: Proportional split of total trip
                                const totalSegments = markers.length - 1 || 1;
                                currentLegDist = route.totalDistance / totalSegments;
                                currentLegTime = (route.estimatedTime || 0) / totalSegments;
                            }

                            const distRem = Math.max(0, currentLegDist * (1 - vehicleProgress));
                            const timeRem = Math.max(0, currentLegTime * (1 - vehicleProgress));
                            
                            const hrs = Math.floor(timeRem / 60);
                            const mins = Math.ceil(timeRem % 60);
                            const timeStr = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
                            
                            return (
                                <>
                                    <div style={{fontWeight: 800, fontSize: '1.4rem', color: 'var(--text-main)', margin: '2px 0'}}>
                                        {distRem.toFixed(1)} km to next stop
                                    </div>
                                    <div style={{fontSize: '0.95rem', color: '#10b981', fontWeight: 600}}>
                                        ⏱️ {timeStr} left for this stop
                                    </div>
                                </>
                            );
                        })()}
                    </>
                 );
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
        .vehicle-marker-pro { background: none; border: none; }
        .truck-container {
            width: 42px;
            height: 42px;
            display: flex;
            align-items: center;
            justify-content: center;
            filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));
        }
      `}</style>
    </div>
  );
};

export default MapComponent;
