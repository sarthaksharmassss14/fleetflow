import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/api.service';
import socketService from '../services/socket.service';
import MapComponent from '../components/MapComponent';
import { exportToPDF, exportToCSV, exportToiCal } from '../utils/exportUtils';
import ProfileModal from '../components/ProfileModal';
import NotificationCenter from '../components/NotificationCenter';
import './Dashboard.css';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState(null);
  // Refs for polling to avoid stale closures
  const routesRef = React.useRef(routes);
  const selectedRouteRef = React.useRef(selectedRoute);

  React.useEffect(() => {
    routesRef.current = routes;
  }, [routes]);

  React.useEffect(() => {
    selectedRouteRef.current = selectedRoute;
  }, [selectedRoute]);
  
  const [formData, setFormData] = useState({
    deliveries: [{ address: '', priority: 'normal', timeWindow: '9:00 AM' }],
    vehicleData: { capacity: 1000, type: 'van' },
  });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [drivers, setDrivers] = useState([]);
  const [assigning, setAssigning] = useState(false);
  const [lastRouteCount, setLastRouteCount] = useState(0);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [weather, setWeather] = useState(null);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [weatherTarget, setWeatherTarget] = useState('destination'); // 'source', 'destination', or 'truck'
  const [truckCoords, setTruckCoords] = useState(null);
  useEffect(() => {
    if (truckCoords && weatherTarget === 'destination') {
        setWeatherTarget('truck'); // Auto-follow truck logic
    }
  }, [truckCoords]);
  const lastWeatherFetch = React.useRef(0);
  const [showRateModal, setShowRateModal] = useState(false);
  const [simRates, setSimRates] = useState({ wage: 15, fuel: 96 }); // Default rates
  
  // Autocomplete Suggestions State
  const [suggestions, setSuggestions] = useState({}); // { 0: [{label, value}], 1: [...] }
  const searchTimeoutRef = React.useRef(null);

  const fetchAddressSuggestions = async (query, index) => {
    if (!query || query.length < 3) {
      setSuggestions(prev => ({ ...prev, [index]: [] }));
      return;
    }
    
    // Clear previous timeout
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    // Debounce
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const resp = await apiService.searchLocation(query);
        if (resp.success) {
           setSuggestions(prev => ({ ...prev, [index]: resp.data }));
        }
      } catch (err) {
        console.error("Suggestion fetch error", err);
      }
    }, 400); 
  };
    
  const selectSuggestion = (val, index, isEdit) => {
      const stops = isEdit ? [...editData.deliveries] : [...formData.deliveries];
      stops[index].address = val;
      if (isEdit) setEditData({...editData, deliveries: stops});
      else setFormData({...formData, deliveries: stops});
      // Clear suggestions for this index
      setSuggestions(prev => ({ ...prev, [index]: [] }));
  };
  const [fleetAnalysis, setFleetAnalysis] = useState(null);
  const [fetchingAnalysis, setFetchingAnalysis] = useState(false);
  
  // Custom Modal States
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [routeToDelete, setRouteToDelete] = useState(null);



  // Theme Effect
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Initial Fetch Effect
  useEffect(() => {
    fetchRoutes();
    if (user?.role === 'dispatcher') {
      fetchDrivers();
    }
    if (user?.role === 'admin' || user?.role === 'dispatcher') {
      fetchFleetAnalysis();
    }
  }, [user?.role]);

  // Polling Effect (Real-time updates)
  useEffect(() => {
    let interval;
    if (user) {
      interval = setInterval(() => {
        pollRoutes();
        if (user?.role === 'admin' || user?.role === 'dispatcher') {
          fetchFleetAnalysis();
        }
      }, 30000); // 30 seconds for dynamic intelligence
    }
    return () => clearInterval(interval);
  }, [user, selectedRoute, routes]); // Re-run effect to keep pollRoutes specific context fresh


  // Separate effect for Dispatcher Traffic Polling
  useEffect(() => {
    // Auto-Poll for Traffic/Weather every 5 minutes for Dispatcher
    let trafficInterval;
    if (user?.role === 'dispatcher') {
      trafficInterval = setInterval(() => {
        if (selectedRoute && selectedRoute.status === 'active') {
           console.log("Auto-Checking Real-Time Traffic...");
           handleSimulateUpdate(); 
        }
      }, 5 * 60 * 1000); // 5 Minutes
    }
    return () => clearInterval(trafficInterval);
  }, [user?.role, selectedRoute]); // Depends on selectedRoute state


  useEffect(() => {
    // New route logic handled by real-time notifications
    setLastRouteCount(routes.length);
  }, [routes]);

  // Fetch Weather Effect
  const lastTruckWeatherFetch = React.useRef(0);
  const lastTarget = React.useRef(weatherTarget);

  useEffect(() => {
    const fetchSelectedWeather = async () => {
      if (!selectedRoute) {
        setWeather(null);
        return;
      }

      const isTargetPulse = lastTarget.current === weatherTarget;
      lastTarget.current = weatherTarget;

      // Only show loading UI on manual tab switch, not on background coord updates
      if (!isTargetPulse) {
         setLoadingWeather(true);
      }

      // Throttle background updates for the moving truck to every 15 minutes
      if (weatherTarget === 'truck' && isTargetPulse) {
        const now = Date.now();
        if (now - lastTruckWeatherFetch.current < 900000) return; // 15 minute throttle
      }

      let lat, lon, address = '';

      if (weatherTarget === 'truck') {
        if (!truckCoords) return;
        lat = truckCoords[0];
        lon = truckCoords[1];
        address = '';
      } else {
        const stops = (selectedRoute.route && selectedRoute.route.length > 0) 
                      ? selectedRoute.route 
                      : (selectedRoute.deliveries || []);

        if (stops.length === 0) return;

        const addrIndex = weatherTarget === 'source' ? 0 : (stops.length - 1);
        const stop = stops[addrIndex];
        lat = stop?.coordinates?.lat;
        lon = stop?.coordinates?.lng;
        address = stop?.address || '';
      }
      
      try {
        const resp = await apiService.getWeather(address, lat, lon);
        if (resp.success) {
          setWeather(resp.data);
          if (weatherTarget === 'truck') {
            lastTruckWeatherFetch.current = Date.now();
          }
        }
      } catch (err) {
        console.error("Weather fetch failed:", err);
      } finally {
        setLoadingWeather(false);
      }
    };

    fetchSelectedWeather();
  }, [selectedRoute, weatherTarget, truckCoords]);


  const fetchFleetAnalysis = async () => {
    if (fetchingAnalysis) return;
    setFetchingAnalysis(true);
    try {
      const resp = await apiService.getFleetAnalysis();
      if (resp.success) {
        setFleetAnalysis(resp.data);
      }
    } catch (err) {
      console.error("Fleet analysis failed:", err);
    } finally {
      setFetchingAnalysis(false);
    }
  };

  const fetchDrivers = async () => {
    try {
      const resp = await apiService.getUsers();
      if (resp.success) {
        setDrivers(resp.data.filter(u => u.role === 'driver'));
      }
    } catch (err) {
      console.error("Failed to fetch drivers:", err);
    }
  };

  // Silent update for polling
  const pollRoutes = async () => {
    try {
      const response = await apiService.getRoutes();
      if (response && response.success) {
        const data = response.data || [];
        
        // Sync List only if lengths differ or deep structure changed
        const currentRoutes = routesRef.current;
        if (data.length !== currentRoutes.length || JSON.stringify(data) !== JSON.stringify(currentRoutes)) {
            console.log("Polling: syncing routes list");
            setRoutes(data);
        }

        // Sync Selected Route details (status changes, driver assignments, or re-optimizations)
        const currentSelected = selectedRouteRef.current;
        if (currentSelected) {
            const fresh = data.find(r => r._id === currentSelected._id);
            if (fresh) {
                const statusChanged = fresh.status !== currentSelected.status;
                const driverChanged = (fresh.driverId?._id || fresh.driverId) !== (currentSelected.driverId?._id || currentSelected.driverId);
                
                // CRITICAL: Detect if AI re-ordered the stops or updated the path
                const routeChanged = fresh.route?.length !== currentSelected.route?.length || 
                                     JSON.stringify(fresh.route) !== JSON.stringify(currentSelected.route);

                if (statusChanged || driverChanged || routeChanged) {
                    console.log(`Polling: updating selected route details [Status: ${statusChanged}, Driver: ${driverChanged}, Route: ${routeChanged}]`);
                    setSelectedRoute(fresh);
                }
            } else {
                setSelectedRoute(null);
            }
        }
      }
    } catch (error) {
      console.error('Silent poll failed:', error);
    }
  };

  // --- REAL-TIME SOCKET INTEGRATION ---
  useEffect(() => {
    if (!user) return;

    // Listen for re-optimization or status updates from other users/system
    const unsubscribe = socketService.on('notification', (notif) => {
      console.log("RT Update Received:", notif);
      
      if (notif.type === 'reoptimize' || notif.type === 'update' || notif.type === 'create') {
        // Trigger a poll to get fresh data immediately
        pollRoutes();
        
        // If the update is specifically for our selected route, we might want to show a toast
        if (selectedRouteRef.current?._id === notif.routeId) {
           console.log("Our current route was updated in real-time!");
        }
      }
    });

    return () => unsubscribe();
  }, [user]); 


  const fetchRoutes = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await apiService.getRoutes();
      if (response && response.success) {
        const data = response.data || [];
        setRoutes(data);
        if (data.length > 0 && !selectedRoute && user?.role !== 'admin') {
          setSelectedRoute(data[0]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch routes:', error);
      setError('Failed to load routes. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoute = async (e) => {
    e.preventDefault();
    setError('');
    setCreating(true);

    const validDeliveries = formData.deliveries.filter(d => d.address.trim() !== '');
    if (validDeliveries.length === 0) {
      setError('Provide at least one delivery address.');
      setCreating(false);
      return;
    }

    try {
      const response = await apiService.optimizeRoute({
        deliveries: validDeliveries,
        vehicleData: formData.vehicleData,
        constraints: { traffic: true, weather: true },
      });

      if (response.success) {
        setShowCreateForm(false);
        setFormData({
          deliveries: [{ address: '', priority: 'normal', timeWindow: '' }],
          vehicleData: { capacity: 1000, type: 'van' },
        });
        
        // Direct State Update (Fixes White Screen / Flicker)
        // Instead of re-fetching and triggering 'Loading' state, we just add the new route.
        const newRoute = response.data; // Assuming backend returns the created route object
        if (newRoute) {
            setRoutes(prev => [newRoute, ...prev]);
            setSelectedRoute(newRoute);
        } else {
            // Fallback if backend structure differs, though it shouldn't
            await fetchRoutes(); 
        }
      }
    } catch (err) {
      setError(err.message || 'Route optimization failed.');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteRoute = async (id, e) => {
    e.stopPropagation();
    setRouteToDelete(id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!routeToDelete) return;
    
    try {
      setError('');
      setShowDeleteConfirm(false);
      const resp = await apiService.deleteRoute(routeToDelete);
      if (resp.success) {
        setRoutes(routes.filter(r => r._id !== routeToDelete));
        if (selectedRoute?._id === routeToDelete) setSelectedRoute(null);
        setRouteToDelete(null);
      }
    } catch (err) {
      setError(err.message || "Failed to delete route.");
    }
  };

  const startEdit = (routeToEdit = null) => {
    const target = routeToEdit || selectedRoute;
    if (!target) return;
    
    setEditData({
      deliveries: [...target.deliveries],
      vehicleData: { ...target.vehicleData }
    });
    setSelectedRoute(target);
    setIsEditing(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const response = await apiService.editRoute(selectedRoute._id, editData);
      if (response.success) {
        setIsEditing(false);
        const updated = response.data;
        setRoutes(routes.map(r => r._id === updated._id ? updated : r));
        setSelectedRoute(updated);
      }
    } catch (err) {
      setError("Failed to update route.");
    } finally {
      setCreating(false);
    }
  };

  const handleSimulateUpdate = async () => {
    if (!selectedRoute) return;
    setAnalyzing(true);
    try {
      const resp = await apiService.reoptimizeRoute(selectedRoute._id, {}, {}); // Backend now fetches real data
      if (resp.success) {
        const updated = resp.data.route;
        setRoutes(routes.map(r => r._id === updated._id ? updated : r));
        setSelectedRoute(updated);
        console.log(resp.data.analysis?.shouldReoptimize 
          ? "Route re-optimized" 
          : "Route is efficient");
      }
    } catch (err) {
      setError("AI Analysis failed to connect.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAssignDriver = async (driverId) => {
    if (!selectedRoute) return;
    setAssigning(true);
    try {
      const resp = await apiService.updateRoute(selectedRoute._id, { 
        driverId,
        status: driverId ? 'active' : 'draft' 
      });
      if (resp.success) {
        const updated = resp.data;
        setRoutes(routes.map(r => r._id === updated._id ? updated : r));
        setSelectedRoute(updated);
      }
    } catch (err) {
      setError("Failed to assign driver.");
    } finally {
      setAssigning(false);
    }
  };

  const handleRouteCompletion = async () => {
    if (!selectedRoute) return;
    try {
      const resp = await apiService.completeRoute(selectedRoute._id);
      if (resp.success) {
        const updated = resp.data;
        setRoutes(routes.map(r => r._id === updated._id ? updated : r));
        setSelectedRoute(updated);
        // No alert needed, UI will switch to summary view
      }
    } catch (err) {
      console.error("Complete route error:", err);
      alert("Error processing completion. Check connection.");
    }
  };
  
 /* End Dashboard Main Logic */

  return (
    <div className="dashboard-container">
      {/* Premium Header */}
      <header className="dashboard-header">
        <div className="header-left">
          <Link to="/" className="header-logo">FleetFlow</Link>
          <Link to="/" className="nav-home-icon" title="Back to Home">🏠</Link>
        </div>
        <div className="header-right">
          <button 
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} 
            className="header-btn theme-toggle"
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          <div className="user-info">
            <span className="role-badge">{user?.role}</span>
            <span className="user-name">{user?.name}</span>
          </div>
          <NotificationCenter />
          <button onClick={() => setShowProfile(true)} className="header-btn settings-btn">⚙️ Settings</button>
          <button onClick={logout} className="header-btn logout-btn">Logout</button>
        </div>
      </header>

      {/* Rate Simulation Modal */}
      {showRateModal && (
        <div className="rate-modal-overlay" style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000
        }}>
           <div className="rate-modal-card" style={{
               background: 'var(--bg-white)', padding: '2rem', borderRadius: '16px',
               width: '450px', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border-color)'
           }}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem'}}>
                <h3 style={{margin:0}}>📊 Rate Simulator</h3>
                <button onClick={() => setShowRateModal(false)} style={{background:'none', border:'none', fontSize:'1.5rem', cursor:'pointer', color:'#94a3b8'}}>×</button>
              </div>
              
              <p style={{fontSize:'0.9rem', color:'#64748b', marginBottom:'1.5rem'}}>Adjust the sliders below to see how fuel and wage changes affect this route's profitability.</p>

              <div className="sim-slider-group" style={{marginBottom:'20px'}}>
                 <div style={{display:'flex', justifyContent:'space-between', marginBottom:'8px'}}>
                    <span style={{fontWeight:600}}>Diesel Price (₹/L)</span>
                    <span style={{color:'#0066ff', fontWeight:800}}>₹{simRates.fuel}</span>
                 </div>
                 <input 
                    type="range" min="80" max="120" value={simRates.fuel} 
                    onChange={(e) => setSimRates({...simRates, fuel: parseInt(e.target.value)})}
                    style={{width:'100%', cursor:'pointer'}}
                 />
              </div>

              <div className="sim-slider-group" style={{marginBottom:'30px'}}>
                 <div style={{display:'flex', justifyContent:'space-between', marginBottom:'8px'}}>
                    <span style={{fontWeight:600}}>Driver Wage (₹/KM)</span>
                    <span style={{color:'#0066ff', fontWeight:800}}>₹{simRates.wage}</span>
                 </div>
                 <input 
                    type="range" min="5" max="30" value={simRates.wage} 
                    onChange={(e) => setSimRates({...simRates, wage: parseInt(e.target.value)})}
                    style={{width:'100%', cursor:'pointer'}}
                 />
              </div>

              <div style={{background: 'var(--bg-light)', padding: '1.5rem', borderRadius: '12px', textAlign: 'center'}}>
                 <div style={{fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700}}>Simulated Total Cost</div>
                 <div style={{fontSize: '2rem', fontWeight: 800, color: 'var(--text-dark)'}}>
                    {(() => {
                        const dist = selectedRoute?.totalDistance || 0;
                        const fuelQty = selectedRoute?.fuelRequiredLitres || (dist / (selectedRoute?.vehicleData?.fuelEfficiency || 25));
                        const maint = selectedRoute?.costBreakdown?.maintenance || 0;
                        const tolls = selectedRoute?.costBreakdown?.tolls || 0;
                        const total = (fuelQty * simRates.fuel) + (dist * simRates.wage) + maint + tolls;
                        return `₹${total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                    })()}
                 </div>
              </div>

              <button 
                onClick={() => setShowRateModal(false)}
                style={{width:'100%', marginTop:'20px', padding:'12px', background:'#0066ff', color:'white', border:'none', borderRadius:'10px', fontWeight:700, cursor:'pointer'}}
              >
                Apply Scenario
              </button>
           </div>
        </div>
      )}

      {/* Settings Modal */}
      {showProfile && user && (
        <ProfileModal 
          user={user} 
          onClose={() => setShowProfile(false)} 
          onUpdate={(updatedUser) => {
             // We can optionally update local user context here if needed, 
             // but usually a refresh or context update handles it.
             console.log("User updated", updatedUser);
          }} 
        />
      )}

      <main className="dashboard-content-split">
        {/* Sidebar: Route Management */}
        <aside className="dashboard-sidebar">
          <div className="sidebar-header">
            <h2>Routes</h2>
            {user?.role === 'dispatcher' && (
              <button className="btn-action btn-pdf" onClick={() => { setShowCreateForm(!showCreateForm); setIsEditing(false); }}>
                {showCreateForm ? 'Cancel' : '+ New Route'}
              </button>
            )}
          </div>

          {(showCreateForm || isEditing) && (
            <div className="sidebar-form-container">
              <h3>{isEditing ? 'Edit Route' : 'New Route'}</h3>
              <form onSubmit={isEditing ? handleEditSubmit : handleCreateRoute}>
                {(isEditing ? editData.deliveries : formData.deliveries).map((d, i) => (
                  <div key={i} className="compact-row">
                    <div style={{ position: 'relative' }}>
                      <input 
                        placeholder="Enter address..." 
                        value={d.address} 
                        onChange={(e) => {
                          const val = e.target.value;
                          fetchAddressSuggestions(val, i);
                          if (isEditing) {
                            const next = [...editData.deliveries];
                            next[i].address = val;
                            setEditData({...editData, deliveries: next});
                          } else {
                            const next = [...formData.deliveries];
                            next[i].address = val;
                            setFormData({...formData, deliveries: next});
                          }
                        }} 
                        required 
                        style={{ width: '100%' }}
                      />
                      {suggestions[i] && suggestions[i].length > 0 && (
                        <ul className="autocomplete-dropdown">
                          {suggestions[i].map((s, idx) => (
                            <li 
                              key={idx} 
                              onMouseDown={(e) => {
                                e.preventDefault(); // Prevent input blur
                                selectSuggestion(s.label, i, isEditing);
                              }}
                            >
                              📍 {s.label}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                      <div className="compact-controls">
                        <select 
                          value={d.priority} 
                          onChange={(e) => {
                            const next = isEditing ? [...editData.deliveries] : [...formData.deliveries];
                            next[i].priority = e.target.value;
                            isEditing ? setEditData({...editData, deliveries: next}) : setFormData({...formData, deliveries: next});
                          }}
                        >
                          <option value="normal">Normal</option>
                          <option value="medium">Medium</option>
                          <option value="urgent">Urgent</option>
                        </select>
                        {(isEditing ? editData.deliveries.length : formData.deliveries.length) > 1 && (
                          <button type="button" className="btn-icon-del" style={{ marginLeft: '10px' }} onClick={() => {
                            const next = (isEditing ? editData.deliveries : formData.deliveries).filter((_, idx) => idx !== i);
                            isEditing ? setEditData({...editData, deliveries: next}) : setFormData({...formData, deliveries: next});
                          }}>✕</button>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                         {/* Hour Select */}
                         <select
                           className="dark-input"
                           style={{ width: '60px', padding: '8px' }}
                           value={(() => {
                             if (!d.timeWindow || d.timeWindow === 'Anytime') return '9';
                             const match = d.timeWindow.match(/(\d+):/);
                             return match ? match[1] : '9';
                           })()}
                           onChange={(e) => {
                             const stops = isEditing ? [...editData.deliveries] : [...formData.deliveries];
                             const old = stops[i].timeWindow === 'Anytime' ? '9:00 AM' : stops[i].timeWindow;
                             const parts = old.split(/[:\s]+/); // [9, 00, AM]
                             stops[i].timeWindow = `${e.target.value}:${parts[1] || '00'} ${parts[2] || 'AM'}`;
                             isEditing ? setEditData({...editData, deliveries: stops}) : setFormData({...formData, deliveries: stops});
                           }}
                         >
                           {Array.from({length: 12}, (_, k) => k + 1).map(h => (
                             <option key={h} value={h}>{h}</option>
                           ))}
                         </select>
                         <span style={{fontWeight: 'bold'}}>:</span>
                         {/* Minute Select */}
                         <select
                           className="dark-input"
                           style={{ width: '60px', padding: '8px' }}
                           value={(() => {
                             if (!d.timeWindow || d.timeWindow === 'Anytime') return '00';
                             const match = d.timeWindow.match(/:(\d+)/);
                             return match ? match[1] : '00';
                           })()}
                           onChange={(e) => {
                             const stops = isEditing ? [...editData.deliveries] : [...formData.deliveries];
                             const old = stops[i].timeWindow === 'Anytime' ? '9:00 AM' : stops[i].timeWindow;
                             const parts = old.split(/[:\s]+/);
                             stops[i].timeWindow = `${parts[0] || '9'}:${e.target.value} ${parts[2] || 'AM'}`;
                             isEditing ? setEditData({...editData, deliveries: stops}) : setFormData({...formData, deliveries: stops});
                           }}
                         >
                           {['00', '15', '30', '45'].map(m => (
                             <option key={m} value={m}>{m}</option>
                           ))}
                         </select>
                         {/* AM/PM Select */}
                         <select
                           className="dark-input"
                           style={{ width: '60px', padding: '8px' }}
                           value={(() => {
                             if (!d.timeWindow || d.timeWindow === 'Anytime') return 'AM';
                             return d.timeWindow.includes('PM') ? 'PM' : 'AM';
                           })()}
                           onChange={(e) => {
                             const stops = isEditing ? [...editData.deliveries] : [...formData.deliveries];
                             const old = stops[i].timeWindow === 'Anytime' ? '9:00 AM' : stops[i].timeWindow;
                             const parts = old.split(/[:\s]+/);
                             stops[i].timeWindow = `${parts[0] || '9'}:${parts[1] || '00'} ${e.target.value}`;
                             isEditing ? setEditData({...editData, deliveries: stops}) : setFormData({...formData, deliveries: stops});
                           }}
                         >
                           <option value="AM">AM</option>
                           <option value="PM">PM</option>
                          </select>
                      </div>
                    </div>
                ))}
                <button type="button" className="btn-add-stop" onClick={() => {
                  if (isEditing) setEditData({...editData, deliveries: [...editData.deliveries, {address: '', priority: 'normal', timeWindow: '9:00 AM'}]});
                  else setFormData({...formData, deliveries: [...formData.deliveries, {address: '', priority: 'normal', timeWindow: '9:00 AM'}]});
                }}>+ Add Stop</button>
                <div className="vehicle-selection" style={{ 
                  marginBottom: '1.25rem', 
                  padding: '1rem', 
                  background: 'var(--bg-light)', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: '12px' 
                }}>
                  <label style={{ display: 'block', marginBottom: '0.75rem', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Vehicle Type
                  </label>
                  <select
                    style={{ 
                      width: '100%', 
                      padding: '10px', 
                      borderRadius: '8px', 
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-white)',
                      color: 'var(--text-main)',
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                    value={isEditing ? (editData.vehicleData?.type || 'van') : (formData.vehicleData?.type || 'van')}
                    onChange={(e) => {
                      const type = e.target.value;
                      if (isEditing) {
                        setEditData({ ...editData, vehicleData: { ...editData.vehicleData, type } });
                      } else {
                        setFormData({ ...formData, vehicleData: { ...formData.vehicleData, type } });
                      }
                    }}
                  >
                    <option value="van">Van / LCV (Expressways & Fast)</option>
                    <option value="truck">Heavy Truck (Restricted Roads)</option>
                  </select>

                  <label style={{ display: 'block', marginTop: '1rem', marginBottom: '0.75rem', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Vehicle Capacity (kg)
                  </label>
                  <input
                    type="number"
                    style={{ 
                      width: '100%', 
                      padding: '10px', 
                      borderRadius: '8px', 
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-white)',
                      color: 'var(--text-main)',
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      outline: 'none'
                    }}
                    value={isEditing ? (editData.vehicleData?.capacity || 1000) : (formData.vehicleData?.capacity || 1000)}
                    onChange={(e) => {
                      const capacity = parseInt(e.target.value);
                      if (isEditing) {
                        setEditData({ ...editData, vehicleData: { ...editData.vehicleData, capacity } });
                      } else {
                        setFormData({ ...formData, vehicleData: { ...formData.vehicleData, capacity } });
                      }
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '15px' }}>
                  <button type="submit" className="btn-create-route" disabled={creating}>
                    {creating ? 'Processing...' : (isEditing ? 'Save Changes' : 'Generate Route')}
                  </button>
                  {isEditing && <button type="button" className="btn-action btn-export" onClick={() => setIsEditing(false)}>Cancel</button>}
                </div>
              </form>
            </div>
          )}

          <div className="routes-list-scroll">
            {loading ? <p style={{textAlign: 'center', padding: '2rem', color:'#94a3b8', fontStyle:'italic'}}>Synchronizing...</p> : 
              routes.map(r => (
                <div 
                  key={r._id} 
                  className={`route-item ${selectedRoute?._id === r._id ? 'active' : ''}`}
                  onClick={() => { setSelectedRoute(r); setIsEditing(false); }}
                >
                   <div className="route-item-header" style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px'}}>
                    <span className="route-id">#{r._id.slice(-6).toUpperCase()}</span>
                      {user?.role === 'dispatcher' && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button 
                             title="Edit Stops" 
                             onClick={(e) => { e.stopPropagation(); startEdit(r); }}
                             style={{background:'none', border:'none', cursor:'pointer', fontSize:'1.2rem', padding:'4px', opacity:0.6, transition:'opacity 0.2s'}}
                             onMouseOver={(e) => e.target.style.opacity = 1}
                             onMouseOut={(e) => e.target.style.opacity = 0.6}
                          >
                            ✏️
                          </button>
                          <button 
                             title="Delete Route" 
                             onClick={(e) => handleDeleteRoute(r._id, e)}
                             style={{background:'none', border:'none', cursor:'pointer', fontSize:'1.2rem', padding:'4px', opacity:0.6, transition:'opacity 0.2s grayscale'}}
                             onMouseOver={(e) => e.target.style.opacity = 1}
                             onMouseOut={(e) => e.target.style.opacity = 0.6}
                          >
                             🗑️
                          </button>
                        </div>
                      )}

                    </div>
                    <div className="route-item-details" style={{display:'flex', justifyContent:'space-between', fontSize:'0.9rem', fontWeight:500}}>
                      <div style={{display:'flex', alignItems:'center', gap:'6px'}}>📍 {r.route?.length || 0} Stops</div>
                      <div style={{display:'flex', alignItems:'center', gap:'6px'}}>⏱️ {Math.floor((r.estimatedTime || 0) / 60)}h {(r.estimatedTime || 0) % 60}m</div>
                      <div style={{display:'flex', alignItems:'center', gap:'6px'}}>🛣️ {r.totalDistance} km</div>
                    </div>
                </div>
              ))
            }
            {!loading && routes.length === 0 && (
              <div className="empty-sidebar-state">
                <p>No routes found.</p>
                <p className="hint">Click "+ New Route" to get started.</p>
              </div>
            )}
            {user?.role === 'driver' && routes.length === 0 && (
              <div className="empty-sidebar-state">
                <p>No routes found.</p>
                <p className="hint">Waiting for assignments from dispatcher.</p>
              </div>
            )}
             {user?.role === 'admin' && routes.length === 0 && (
              <div className="empty-sidebar-state">
                <p>No system routes yet.</p>
              </div>
            )}
          </div>
        </aside>

        {/* Main Content: Map & Details */}
        <section className="dashboard-main">
          {selectedRoute ? (
            <div className="route-detail-view">
              <div className="detail-header">
                <div className="route-title-group">
                  {user?.role === 'admin' && (
                    <button 
                      className="nav-back-btn" 
                      onClick={(e) => {
                        console.log("Back to Dashboard Clicked");
                        e.stopPropagation();
                        setSelectedRoute(null);
                      }}
                      style={{
                        marginRight: '15px',
                        marginBottom: '10px',
                        padding: '6px 12px',
                        border: '1px solid #bae6fd',
                        background: '#e0f2fe',
                        color: '#0284c7',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '0.9rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                      }}
                    >
                      ← Back to Dashboard
                    </button>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <h3 style={{ margin: 0 }}>Route #{selectedRoute._id.slice(-6).toUpperCase()}</h3>
                      <div className="status-badge" style={{ 
                        padding: '4px 10px', 
                        borderRadius: '20px', 
                        fontSize: '0.75rem', 
                        backgroundColor: selectedRoute.status === 'active' ? '#dcfce7' : '#f1f5f9',
                        color: selectedRoute.status === 'active' ? '#166534' : '#64748b',
                        fontWeight: 700
                      }}>
                        {selectedRoute.status?.toUpperCase()}
                      </div>
                    </div>
                    {selectedRoute.constraintsAlert && selectedRoute.constraintsAlert !== 'null' && (
                      <div style={{ 
                        background: 'linear-gradient(90deg, #fff7ed 0%, #ffedd5 100%)', 
                        color: '#c2410c', 
                        padding: '10px 16px', 
                        borderRadius: '10px', 
                        fontSize: '0.85rem', 
                        fontWeight: 700, 
                        border: '1px solid #fed7aa',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        boxShadow: '0 2px 8px rgba(251, 146, 60, 0.1)',
                        animation: 'shake 0.5s cubic-bezier(.36,.07,.19,.97) both'
                      }}>
                        <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                        <div>
                          <div style={{ textTransform: 'uppercase', fontSize: '0.7rem', opacity: 0.8 }}>Logistics Violation Detected</div>
                          <div style={{ fontWeight: 600 }}>{selectedRoute.constraintsAlert}</div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="route-stats-summary">
                     <span>Total Cost: <span className="stat-val">₹{
                         (() => {
                           const d = selectedRoute.totalDistance || 0;
                           const wageRate = simRates.wage;
                           const fuelPrice = simRates.fuel;
                           const fuelQty = selectedRoute?.fuelRequiredLitres || (d / (selectedRoute?.vehicleData?.fuelEfficiency || 25));
                           const fuel = fuelQty * fuelPrice;
                           const wage = Math.max(300, Math.round(d * wageRate));
                           const maint = selectedRoute.costBreakdown?.maintenance || 0;
                           const tolls = selectedRoute.costBreakdown?.tolls || 0;
                           return Math.round(fuel + maint + tolls + wage).toLocaleString('en-IN');
                         })()
                     }</span></span>
                    <span>Distance: <span className="stat-val">{selectedRoute.totalDistance || 0} km</span></span>
                    <span>Time: <span className="stat-val">{Math.floor((selectedRoute.estimatedTime || 0) / 60)}h {(selectedRoute.estimatedTime || 0) % 60}m</span></span>
                    <span>Cap: <span className="stat-val">{selectedRoute.vehicleData?.capacity || 1000}kg</span></span>
                    {(selectedRoute.driverId || user?.role === 'admin') && (
                      <span className="role-badge" style={{ background: '#e0f2fe', color: '#0369a1' }}>
                        👤 Driver: {(() => {
                          if (selectedRoute.driverId && typeof selectedRoute.driverId === 'object' && selectedRoute.driverId.name) {
                            return selectedRoute.driverId.name;
                          }
                          const driverId = selectedRoute.driverId?._id || selectedRoute.driverId;
                          if (driverId) {
                            const driver = drivers.find(d => (d._id || d.id) === driverId);
                            return driver ? driver.name : (typeof selectedRoute.driverId === 'string' ? 'Assigned' : 'Assigned');
                          }
                          return 'Unassigned';
                        })()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="action-bar">
                  {user?.role === 'dispatcher' && selectedRoute.status !== 'completed' && !selectedRoute.driverId && (
                    <select 
                      className="btn-action btn-export btn-driver-select"
                      value={(selectedRoute.driverId && typeof selectedRoute.driverId === 'object' && selectedRoute.driverId !== null) ? (selectedRoute.driverId._id || selectedRoute.driverId.id) : (selectedRoute.driverId || '')}
                      onChange={(e) => handleAssignDriver(e.target.value)}
                      disabled={assigning}
                    >
                      <option value="">Unassigned</option>
                      {drivers.map(d => (
                        <option key={d._id} value={d._id ? d._id : d.id}>{d.name}</option>
                      ))}
                    </select>
                  )}
                  {selectedRoute.status !== 'completed' && (
                    <button className="btn-action btn-simulate" onClick={handleSimulateUpdate} disabled={analyzing}>
                      {analyzing ? 'Analyzing...' : '⚠️ Simulate Traffic'}
                    </button>
                  )}
                  {user?.role !== 'driver' && (
                    <>
                      <button className="btn-action btn-export" onClick={() => exportToCSV(selectedRoute)}>CSV</button>
                      <button className="btn-action btn-export" onClick={() => exportToiCal(selectedRoute)}>iCal</button>
                      <button className="btn-action btn-pdf" onClick={() => exportToPDF(selectedRoute)}>PDF</button>
                    </>
                  )}
                </div>
              </div>

              {selectedRoute.status === 'completed' ? (
                  <div className="completed-summary-card" style={{padding: '40px', textAlign: 'center', background: '#f0fdf4', borderRadius: '12px', border: '2px solid #22c55e', margin: '20px 0'}}>
                     {user?.role === 'driver' ? (
                         <>
                             <div style={{fontSize: '4rem', marginBottom: '10px'}}>🎉</div>
                             <h2 style={{color: '#15803d', fontSize: '2rem', marginBottom: '10px'}}>Trip Completed!</h2>
                             <p style={{color: '#166534', fontSize: '1.1rem', marginBottom: '30px'}}>Thank you for your service.</p>
                             
                             <div style={{display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap'}}>
                                 <div style={{background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', minWidth: '150px'}}>
                                     <div style={{textTransform: 'uppercase', fontSize: '0.8rem', fontWeight: 700, color: '#64748b', marginBottom: '5px'}}>Total Distance</div>
                                     <div style={{fontSize: '1.8rem', fontWeight: 800, color: '#0f172a'}}>{selectedRoute.totalDistance} km</div>
                                 </div>
                                 <div style={{background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', minWidth: '150px'}}>
                                     <div style={{textTransform: 'uppercase', fontSize: '0.8rem', fontWeight: 700, color: '#64748b', marginBottom: '5px'}}>Estimated Pay</div>
                                     <div style={{fontSize: '1.8rem', fontWeight: 800, color: '#10b981'}}>
                                         ₹{(() => {
                                            const d = selectedRoute.totalDistance || 0;
                                            const rate = 15;
                                            return Math.max(300, Math.round(d * rate));
                                         })()}
                                     </div>
                                 </div>
                             </div>

                             <button 
                               onClick={() => setSelectedRoute(null)} 
                               style={{marginTop: '40px', padding: '12px 30px', background: '#16a34a', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '1rem', boxShadow: '0 4px 6px rgba(22, 163, 74, 0.3)'}}
                             >
                               Back to Assignments
                             </button>
                         </>
                     ) : (
                         <>
                             <div style={{fontSize: '3rem', marginBottom: '10px'}}>✅</div>
                             <h2 style={{color: '#0f172a', marginBottom: '10px'}}>Route Fulfilled</h2>
                             <p style={{color: '#64748b'}}>This route was successfully completed by {selectedRoute.driverId?.name || 'the driver'}.</p>
                         </>
                     )}
                  </div>
              ) : (
                <div className="map-view-wrapper">
                  <MapComponent 
                    route={selectedRoute} 
                    isDriver={user?.role === 'driver'}
                    hasDriver={!!selectedRoute.driverId}
                    onComplete={handleRouteCompletion}
                    onTruckMove={(coords) => setTruckCoords(coords)}
                  />
                </div>
              )}

              <div className="logistic-details-grid">
                {user?.role !== 'driver' && (
                  <div className="logistic-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                      <h4 style={{ margin: 0 }}>💡 Logistics Insight</h4>
                    </div>
                    
                    <div className="logistic-stats">
                      {(() => {
                          const d = selectedRoute?.totalDistance || 0;
                          const wageRate = simRates.wage;
                          const dynamicWage = Math.max(0, Math.round(d * wageRate));
                          
                          const fuelPrice = simRates.fuel;
                          // Use fuelRequiredLitres if available, else estimate based on distance/efficiency
                          const fuelQty = selectedRoute?.fuelRequiredLitres || (d / (selectedRoute?.vehicleData?.fuelEfficiency || 25));
                          const customFuel = fuelQty * fuelPrice;
                          
                          const maint = selectedRoute?.costBreakdown?.maintenance || 0;
                          const tolls = selectedRoute?.costBreakdown?.tolls || 0;
                          const total = customFuel + maint + tolls + dynamicWage;
                          
                          return (
                            <div className="insight-container">
                              <div className="insight-main-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px' }}>
                                <div className="insight-total-group">
                                    <div style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Total Running Cost</div>
                                    <div className="insight-total-value" style={{ fontSize: '2.2rem', fontWeight: 800 }}>
                                      ₹{total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                    </div>
                                </div>
                                <div 
                                  className="insight-badge" 
                                  onClick={() => setShowRateModal(true)}
                                  title="Click to simulate different rates"
                                >
                                    ⚙️ Optimized Rate
                                </div>
                              </div>

                              <div className="insight-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', padding: '15px', background: 'var(--bg-light)', borderRadius: '12px' }}>
                                <div className="i-stat">
                                    <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Fuel (₹{fuelPrice}/L)</div>
                                    <div style={{ fontWeight: 700, fontSize: '1rem' }}>₹{customFuel.toFixed(0)}</div>
                                </div>
                                <div className="i-stat">
                                    <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Wage (₹{wageRate}/km)</div>
                                    <div style={{ fontWeight: 700, fontSize: '1rem' }}>₹{dynamicWage}</div>
                                </div>
                                <div className="i-stat">
                                    <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Maintenance</div>
                                    <div style={{ fontWeight: 700, fontSize: '1rem' }}>₹{maint.toFixed(0)}</div>
                                </div>
                                <div className="i-stat">
                                    <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Tolls</div>
                                    <div style={{ fontWeight: 700, fontSize: '1rem' }}>₹{tolls.toFixed(0)}</div>
                                </div>
                              </div>
                            </div>
                          );
                      })()}
                    </div>
                  </div>
                )}

                {/* Weather Insight Card */}
                <div className="logistic-card" style={{ marginTop: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h4 style={{ margin: 0 }}>☁️ Weather Insight ({weatherTarget === 'truck' ? 'Live Truck' : weatherTarget.charAt(0).toUpperCase() + weatherTarget.slice(1)})</h4>
                    <div className="segmented-toggle">
                        <button 
                            onClick={() => setWeatherTarget('source')}
                            className={`toggle-btn ${weatherTarget === 'source' ? 'active' : ''}`}
                        >Source</button>
                        <button 
                            onClick={() => setWeatherTarget('destination')}
                            className={`toggle-btn ${weatherTarget === 'destination' ? 'active' : ''}`}
                        >Destination</button>
                        {selectedRoute.driverId && (
                           <button 
                               onClick={() => setWeatherTarget('truck')}
                               className={`toggle-btn ${weatherTarget === 'truck' ? 'active' : ''}`}
                           >🚚 Truck</button>
                        )}
                    </div>
                  </div>
                  <div style={{ position: 'relative' }}>
                    {loadingWeather && (
                      <div style={{
                        position: 'absolute', top: '-25px', right: 0,
                        fontSize: '0.75rem', color: '#0066ff', fontWeight: 600,
                        fontStyle: 'italic', animation: 'pulse 1.5s infinite'
                      }}>
                        Checking conditions...
                      </div>
                    )}
                    
                    {weather ? (
                      <div className="weather-container" style={{ opacity: loadingWeather ? 0.6 : 1, transition: 'opacity 0.3s ease' }}>
                        <div className="weather-main-row" style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '15px' }}>
                          <div className="weather-icon" style={{ fontSize: '3rem' }}>
                            {weather.condition.toLowerCase().includes('cloud') ? '☁️' : 
                             weather.condition.toLowerCase().includes('rain') ? '🌧️' : 
                             weather.condition.toLowerCase().includes('clear') ? '☀️' : 
                             weather.condition.toLowerCase().includes('snow') ? '❄️' : 
                             weather.condition.toLowerCase().includes('mist') || weather.condition.toLowerCase().includes('fog') ? '🌫️' : '⛅'}
                          </div>
                          <div className="weather-temp-group">
                            <div style={{ fontSize: '2rem', fontWeight: 800 }}>{Math.round(weather.temperature)}°C</div>
                            <div style={{ color: '#64748b', textTransform: 'capitalize', fontWeight: 600 }}>{weather.description}</div>
                            {weather.resolvedLocation && (
                               <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px' }}>📍 {weather.resolvedLocation}</div>
                            )}
                          </div>
                          
                          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                             {weather.visibility < 1000 && (
                                <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '6px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700, marginBottom: '5px' }}>
                                  ⚠️ DENSE FOG: Low Visibility
                                </div>
                             )}
                             {weather.windSpeed > 10 && (
                                <div style={{ background: '#fff7ed', color: '#c2410c', padding: '6px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700 }}>
                                  🌬️ Strong Winds
                                </div>
                             )}
                          </div>
                        </div>

                        <div className="weather-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', padding: '15px', background: 'var(--bg-light)', borderRadius: '12px' }}>
                           <div className="w-stat">
                              <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Wind</div>
                              <div style={{ fontWeight: 700 }}>{weather.windSpeed} km/h</div>
                           </div>
                           <div className="w-stat">
                              <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Humidity</div>
                              <div style={{ fontWeight: 700 }}>{weather.humidity}%</div>
                           </div>
                           <div className="w-stat">
                              <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Pressure</div>
                              <div style={{ fontWeight: 700 }}>{weather.pressure} hPa</div>
                           </div>
                           <div className="w-stat">
                              <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Visibility</div>
                              <div style={{ fontWeight: 700 }}>{(weather.visibility / 1000).toFixed(1)} km</div>
                           </div>
                           <div className="w-stat">
                              <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Condition</div>
                              <div style={{ fontWeight: 700 }}>{weather.condition}</div>
                           </div>
                           <div className="w-stat">
                              <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Alerts</div>
                              <div style={{ fontWeight: 700, color: (weather.temperature < 5 || weather.windSpeed > 15) ? '#ef4444' : '#10b981' }}>
                                 {(weather.temperature < 5) ? 'Frost Risk' : (weather.windSpeed > 15) ? 'Wind Gusts' : 'Clear'}
                              </div>
                           </div>
                        </div>
                    </div>
                    ) : (
                      <p style={{ color: '#64748b' }}>Select a route to view local weather conditions.</p>
                    )}
                  </div>
                </div>

              </div>

            {/* Real-Time Intelligence Feed - Hide if trip is completed */}
              {selectedRoute.status !== 'completed' && (
                <div className="intel-card">
                  <div className="intel-header">
                      <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#64748b', fontWeight: 700 }}>REAL-TIME INTELLIGENCE</h4>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                          <span className="live-dot"></span>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ef4444' }}>LIVE FEED</span>
                      </div>
                  </div>
                  <div className="intel-list">
                      {selectedRoute.analysis?.adjustments ? (
                        selectedRoute.analysis.adjustments.map((adj, idx) => (
                          <div className="intel-item" key={idx}>
                              <div className="intel-time">Just now</div>
                              <div className="intel-content">
                                  <span className="intel-tag tag-optimize">AI ADVISORY</span>
                                  {adj}
                              </div>
                          </div>
                        ))
                      ) : (
                        (() => {
                            const traffic = selectedRoute.trafficAnalysis || {};
                            const delay = traffic.delayMins || 0;
                            const speed = traffic.avgSpeedKmh || 0;
                            const hasTraffic = !!selectedRoute.trafficAnalysis;
                            
                            return (
                              <>
                                <div className="intel-item">
                                    <div className="intel-time">Live</div>
                                    <div className="intel-content">
                                        <span className={`intel-tag ${delay > 15 ? 'tag-traffic' : 'tag-optimize'}`}>
                                            {delay > 5 ? 'Congestion' : 'Traffic Flow'}
                                        </span>
                                        {hasTraffic 
                                          ? (
                                            <div>
                                              <div style={{fontWeight:500}}>{`Avg Speed: ${speed} km/h. Impact: ${delay > 0 ? `+${delay} min delay.` : 'No Delay.'}`}</div>
                                              <div style={{fontSize:'1rem', marginTop:'4px', color:'#fbfcfeff'}}>
                                                {delay > 2 ? "Heavy congestion impacting arrival times." : "Traffic flow is smooth with optimal velocity."}
                                              </div>
                                            </div>
                                          )
                                          : 'Accessing satellite traffic telemetry...'
                                        }
                                    </div>
                                </div>
                                {delay > 10 && (
                                   <div className="intel-item">
                                      <div className="intel-time" style={{color:'#dc2626'}}>Alert</div>
                                      <div className="intel-content">
                                          <span className="intel-tag tag-traffic" style={{background:'#dc2626', color:'white'}}>DELAYS</span>
                                          Significant route delays detected. Schedule adjustment recommended.
                                      </div>
                                   </div>
                                )}
                                <div className="intel-item">
                                    <div className="intel-time">Now</div>
                                    <div className="intel-content">
                                        <span className="intel-tag tag-weather">Weather</span>
                                        {weather 
                                          ? (
                                            <div>
                                              <div style={{fontWeight:500}}>{`At ${weatherTarget === 'truck' ? 'Live Truck' : weatherTarget.charAt(0).toUpperCase() + weatherTarget.slice(1)}: ${weather.condition}, ${Math.round(weather.temperature)}°C`}</div>
                                              <div style={{fontSize:'1rem', marginTop:'4px', color:'#fbfcfeff'}}>
                                                 {weather.condition.toLowerCase().match(/(rain|mist|fog|snow|storm)/) 
                                                   ? "Visibility/traction reduced. Caution advised." 
                                                   : "Weather is clear and optimal for transit."}
                                              </div>
                                            </div>
                                          )
                                          : 'Monitoring meteorological conditions...'}
                                    </div>
                                </div>
                              </>
                            );
                          })()
                      )}
                  </div>
                </div>
              )}

              <div className="stops-sequence-area">
                <h4>Stop Sequence</h4>
                <div className="stops-horizontal">
                  {selectedRoute.route && Array.isArray(selectedRoute.route) && selectedRoute.route.map((s, i) => (
                    <div 
                      key={i} 
                      className="stop-node"
                      style={{ cursor: 'default', opacity: 1 }}
                    >
                      <div className="stop-index">{i + 1}</div>
                      <div className="stop-details">
                        <p>{s?.address || 'No Address'}</p>
                        <span className="p-badge">Priority: {s?.priority || 'normal'}</span>
                        <span className="p-badge" style={{marginLeft: '10px'}}>Window: {s?.timeWindow || 'Anytime'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Logistics Strategy - Themed and Integrated */}
              <div className="logistic-card" style={{ marginTop: '2rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.4rem' }}>🧠</span> AI Logistics Strategy
                  </h4>
                </div>
                <div style={{ 
                  padding: '1.25rem', 
                  background: 'var(--bg-light)', 
                  borderRadius: '12px', 
                  fontSize: '0.95rem', 
                  lineHeight: '1.7', 
                  color: 'var(--text-main)', 
                  border: '1px solid var(--border-color)', 
                  fontStyle: selectedRoute.reasoning ? 'normal' : 'italic'
                }}>
                  {selectedRoute.reasoning || "Reasoning data being synthesized by fleet intelligence..."}
                </div>
                <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'right', fontWeight: 500 }}>
                  Insights powered by FleetFlow Intelligence Engine
                </div>
              </div>
            </div>

          ) : (
            <div className="no-route-placeholder">
              {user?.role === 'admin' ? (
                <div className="admin-insights-grid">
                  <header className="insights-header">
                    <h2>Fleet Operations Overview</h2>
                    <p>Real-time system health and logistics metrics.</p>
                  </header>
                  <div className="stats-cards-row">
                    <div className="stat-card">
                      <span className="sc-icon">📦</span>
                      <div className="sc-info">
                        <span className="sc-label">Total Routes</span>
                        <span className="sc-val">{routes.length}</span>
                      </div>
                    </div>
                    <div className="stat-card">
                      <span className="sc-icon">✅</span>
                      <div className="sc-info">
                        <span className="sc-label">Completed Shipments</span>
                        <span className="sc-val">{routes.filter(r => r.status === 'completed').length}</span>
                      </div>
                    </div>
                    <div className="stat-card">
                      <span className="sc-icon">🚛</span>
                      <div className="sc-info">
                        <span className="sc-label">Active Shipments</span>
                        <span className="sc-val">{routes.filter(r => r.status === 'active').length}</span>
                      </div>
                    </div>
                    <div className="stat-card urgent">
                      <span className="sc-icon">⚠️</span>
                      <div className="sc-info">
                        <span className="sc-label">Potential Delays</span>
                        <span className="sc-val">{routes.filter(r => r.estimatedTime > 120 && r.status === 'active').length}</span>
                      </div>
                    </div>
                      <div className="stat-card">
                      <span className="sc-icon">👤</span>
                      <div className="sc-info">
                        <span className="sc-label">Active Drivers</span>
                        <span className="sc-val">{new Set(routes.filter(r => r.driverId).map(r => r.driverId._id || r.driverId)).size}</span>
                      </div>
                    </div>
                    
                  </div>
                  <div className="intel-card" style={{ width: '100%', maxWidth: '800px', textAlign: 'left', margin: '30px auto' }}>
                    <div className="intel-header">
                       <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#64748b', fontWeight: 700 }}>FLEET-WIDE INTELLIGENCE</h4>
                       <div style={{ display: 'flex', alignItems: 'center' }}>
                           <span className="live-dot"></span>
                           <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ef4444' }}>MONITORING ACTIVE</span>
                       </div>
                    </div>
                    <div className="intel-list">
                      {fetchingAnalysis && !fleetAnalysis ? (
                         <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>Generating AI Insights...</div>
                      ) : fleetAnalysis && fleetAnalysis.insights ? (
                        fleetAnalysis.insights.map((insight, idx) => (
                           <div className="intel-item" key={idx}>
                               <div className="intel-time">{insight.time}</div>
                               <div className="intel-content">
                                   <span className={`intel-tag tag-${insight.type || 'optimize'}`}>{(insight.type || 'SYSTEM').toUpperCase()}</span>
                                   {insight.text}
                               </div>
                           </div>
                        ))
                      ) : (
                        <>
                           <div className="intel-item">
                               <div className="intel-time">Just now</div>
                               <div className="intel-content">
                                   <span className="intel-tag tag-optimize">SYSTEM</span>
                                   Fleet data synchronized. AI monitoring active across <strong>{routes.filter(r => r.status === 'active').length}</strong> active vehicles.
                               </div>
                           </div>
                           <div className="intel-item">
                               <div className="intel-time">1m ago</div>
                               <div className="intel-content">
                                   <span className="intel-tag tag-weather">GLOBAL</span>
                                   Real-time weather data verified. No major disruptions detected in current route corridors.
                               </div>
                           </div>
                        </>
                      )}
                    </div>
                  </div>


                </div>
              ) : (
                <>
                  <div style={{ fontSize: '3rem' }}>{user?.role === 'driver' ? '🚛' : '📦'}</div>
                  <h3>Welcome to FleetFlow Dashboard</h3>
                  <p>{user?.role === 'driver' 
                    ? "Your assigned routes will appear here. Currently, there are no active assignments for you." 
                    : "Select a route from the sidebar to view full live tracking and optimization details."}
                  </p>
                  {!loading && routes.length === 0 && user?.role === 'dispatcher' && (
                    <button className="btn-create-route" style={{ width: 'auto', padding: '0.75rem 2rem' }} onClick={() => setShowCreateForm(true)}>
                      Create Your First Route
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </section>
      </main>
      {/* Custom Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay">
          <div className="modal-card delete-confirm-modal">
            <div className="modal-icon-header">
              <span className="warning-icon">⚠️</span>
            </div>
            <h3>Delete Route</h3>
            <p>Are you sure you want to remove this route? This action will archive the route and cannot be undone.</p>
            <div className="modal-actions">
              <button 
                className="btn-modal btn-cancel" 
                onClick={() => { setShowDeleteConfirm(false); setRouteToDelete(null); }}
              >
                Cancel
              </button>
              <button 
                className="btn-modal btn-delete-confirm" 
                onClick={confirmDelete}
              >
                Delete Route
              </button>
            </div>
          </div>
        </div>
      )}

      {error && <div className="error-toast">{error}</div>}
    </div>
  );
};

export default Dashboard;