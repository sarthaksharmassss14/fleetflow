import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/api.service';
import MapComponent from '../components/MapComponent';
import { exportToPDF, exportToCSV } from '../utils/exportUtils';
import './Dashboard.css';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState(null);
  
  const [formData, setFormData] = useState({
    deliveries: [{ address: '', priority: 'normal', timeWindow: '' }],
    vehicleData: { capacity: 1000, type: 'van' },
  });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [drivers, setDrivers] = useState([]);
  const [assigning, setAssigning] = useState(false);
  const [lastRouteCount, setLastRouteCount] = useState(0);

  useEffect(() => {
    fetchRoutes();
    if (user?.role === 'dispatcher') {
      fetchDrivers();
    }

    // Set up auto-refresh for drivers to get real-time assignments
    let interval;
    if (user?.role === 'driver') {
      interval = setInterval(fetchRoutes, 30000); // Poll every 30s
    }
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Notify driver if a new route is assigned
    if (user?.role === 'driver' && routes.length > lastRouteCount && lastRouteCount !== 0) {
      alert("🚀 New Route Assigned! Check your sidebar for details.");
    }
    setLastRouteCount(routes.length);
  }, [routes, user?.role]);

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

  const fetchRoutes = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await apiService.getRoutes();
      if (response && response.success) {
        const data = response.data || [];
        setRoutes(data);
        if (data.length > 0 && !selectedRoute) {
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
        await fetchRoutes();
      }
    } catch (err) {
      setError(err.message || 'Route optimization failed.');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteRoute = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this route?")) return;
    
    try {
      setError('');
      const resp = await apiService.deleteRoute(id);
      if (resp.success) {
        setRoutes(routes.filter(r => r._id !== id));
        if (selectedRoute?._id === id) setSelectedRoute(null);
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
        alert(resp.data.analysis?.shouldReoptimize 
          ? "⚠️ Road conditions changed! Route has been re-optimized for speed." 
          : "✅ Route is still the most efficient despite traffic.");
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
        alert(driverId ? "Route assigned to driver successfully!" : "Driver unassigned.");
      }
    } catch (err) {
      setError("Failed to assign driver.");
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="dashboard-container">
      {/* Premium Header */}
      <header className="dashboard-header">
        <div className="header-left">
          <Link to="/" className="header-logo">FleetFlow</Link>
          <Link to="/" className="nav-back">← Back to Home</Link>
        </div>
        <div className="header-right">
          <div className="user-info">
            <span className="role-badge">{user?.role}</span>
            <span style={{ fontWeight: 600 }}>{user?.name}</span>
          </div>
          <button onClick={logout} className="btn-action btn-export">Logout</button>
        </div>
      </header>

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
                    <input 
                      placeholder="Enter address..." 
                      value={d.address} 
                      onChange={(e) => {
                        if (isEditing) {
                          const next = [...editData.deliveries];
                          next[i].address = e.target.value;
                          setEditData({...editData, deliveries: next});
                        } else {
                          const next = [...formData.deliveries];
                          next[i].address = e.target.value;
                          setFormData({...formData, deliveries: next});
                        }
                      }} 
                      required 
                    />
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
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                      {(isEditing ? editData.deliveries.length : formData.deliveries.length) > 1 && (
                        <button type="button" className="btn-icon-del" onClick={() => {
                          const next = (isEditing ? editData.deliveries : formData.deliveries).filter((_, idx) => idx !== i);
                          isEditing ? setEditData({...editData, deliveries: next}) : setFormData({...formData, deliveries: next});
                        }}>✕</button>
                      )}
                    </div>
                  </div>
                ))}
                <button type="button" className="btn-add-stop" onClick={() => {
                  if (isEditing) setEditData({...editData, deliveries: [...editData.deliveries, {address: '', priority: 'normal'}]});
                  else setFormData({...formData, deliveries: [...formData.deliveries, {address: '', priority: 'normal'}]});
                }}>+ Add Stop</button>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="submit" className="btn-create-route" disabled={creating}>
                    {creating ? 'Processing...' : (isEditing ? 'Save Changes' : 'Generate Route')}
                  </button>
                  {isEditing && <button type="button" className="btn-action btn-export" onClick={() => setIsEditing(false)}>Cancel</button>}
                </div>
              </form>
            </div>
          )}

          <div className="routes-list-scroll">
            {loading ? <p style={{textAlign: 'center', padding: '2rem'}}>Loading routes...</p> : 
              routes.map(r => (
                <div 
                  key={r._id} 
                  className={`route-item ${selectedRoute?._id === r._id ? 'active' : ''}`}
                  onClick={() => { setSelectedRoute(r); setIsEditing(false); }}
                >
                   <div className="route-item-header">
                    <span className="route-id">#{r._id.slice(-6).toUpperCase()}</span>
                      {user?.role === 'dispatcher' && (
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button className="delete-mini-btn" title="Edit Stops" onClick={(e) => { e.stopPropagation(); startEdit(r); }}>✏️</button>
                          <button className="delete-mini-btn" title="Delete Route" onClick={(e) => handleDeleteRoute(r._id, e)}>🗑️</button>
                        </div>
                      )}
                      {user?.role === 'admin' && (
                        <button className="delete-mini-btn" title="Delete Route" onClick={(e) => handleDeleteRoute(r._id, e)}>🗑️</button>
                      )}
                    </div>
                    <div className="route-item-details">
                      <span>📍 {r.route?.length || 0} Stops</span>
                      <span>⏱️ {r.estimatedTime} min</span>
                      <span>🛣️ {r.totalDistance} km</span>
                    </div>
                </div>
              ))
            }
            {user?.role === 'dispatcher' && (
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <h3>Route #{selectedRoute._id.slice(-6).toUpperCase()}</h3>
                  </div>
                  <div className="route-stats-summary">
                    <span>Total Cost: <span className="stat-val">₹{selectedRoute.costBreakdown?.total ? selectedRoute.costBreakdown.total.toFixed(2) : '0.00'}</span></span>
                    <span>Distance: <span className="stat-val">{selectedRoute.totalDistance || 0} km</span></span>
                    <span>Time: <span className="stat-val">{Math.floor((selectedRoute.estimatedTime || 0) / 60)}h {(selectedRoute.estimatedTime || 0) % 60}m</span></span>
                    {selectedRoute.driverId && (
                      <span className="role-badge" style={{ background: '#e0f2fe', color: '#0369a1' }}>
                        👤 Driver: {(selectedRoute.driverId && typeof selectedRoute.driverId === 'object' && selectedRoute.driverId !== null) ? selectedRoute.driverId.name : (selectedRoute.driverId ? 'Assigned' : 'Unassigned')}
                      </span>
                    )}
                  </div>
                </div>
                <div className="action-bar">
                  {user?.role === 'dispatcher' && (
                    <select 
                      className="btn-action btn-export"
                      value={(selectedRoute.driverId && typeof selectedRoute.driverId === 'object' && selectedRoute.driverId !== null) ? (selectedRoute.driverId._id || selectedRoute.driverId.id) : (selectedRoute.driverId || '')}
                      onChange={(e) => handleAssignDriver(e.target.value)}
                      disabled={assigning}
                    >
                      <option value="">Unassigned</option>
                      {drivers.map(d => (
                        <option key={d._id} value={d._id ? d._id : d.id}>Assign: {d.name}</option>
                      ))}
                    </select>
                  )}
                  <button className="btn-action btn-simulate" onClick={handleSimulateUpdate} disabled={analyzing}>
                    {analyzing ? 'Analyzing...' : '⚠️ Simulate Traffic'}
                  </button>
                  <button className="btn-action btn-export" onClick={() => exportToCSV(selectedRoute)}>CSV</button>
                  <button className="btn-action btn-pdf" onClick={() => exportToPDF(selectedRoute)}>Export PDF</button>
                </div>
              </div>

              <div className="map-view-wrapper">
                <MapComponent route={selectedRoute} />
              </div>

              <div className="logistic-details-grid">
                <div className="logistic-card">
                  <h4>💡 Logistics Insight</h4>
                  <div className="logistic-stats">
                    <div className="ls-row"><span>Fuel Cost:</span> <strong style={{color: '#10b981'}}>₹{selectedRoute.costBreakdown?.fuel || 0}</strong></div>
                    <div className="ls-row"><span>Driver Wage:</span> <strong style={{color: '#10b981'}}>₹{selectedRoute.costBreakdown?.time || 750}</strong></div>
                    <div className="ls-row"><span>Maint. Cost:</span> <strong style={{color: '#10b981'}}>₹{selectedRoute.costBreakdown?.maintenance || 0}</strong></div>
                    <div className="ls-row"><span>Toll Charges:</span> <strong style={{color: '#10b981'}}>₹{selectedRoute.costBreakdown?.tolls || 0}</strong></div>
                    <div className="ls-row" style={{marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #eee'}}>
                      <span>Total Running Cost:</span> 
                      <strong style={{color: '#0066ff', fontSize: '1.2rem'}}>₹{selectedRoute.costBreakdown?.total || 0}</strong>
                    </div>
                  </div>
                </div>
              </div>

              <div className="stops-sequence-area">
                <h4>Stop Sequence</h4>
                <div className="stops-horizontal">
                  {selectedRoute.route && Array.isArray(selectedRoute.route) && selectedRoute.route.map((s, i) => (
                    <div key={i} className="stop-node">
                      <div className="stop-index">{i + 1}</div>
                      <div className="stop-details">
                        <p>{s?.address || 'No Address'}</p>
                        <span className="p-badge">Priority: {s?.priority || 'normal'}</span>
                      </div>
                    </div>
                  ))}
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
                      <span className="sc-icon">🚛</span>
                      <div className="sc-info">
                        <span className="sc-label">Orders Shipped</span>
                        <span className="sc-val">{routes.filter(r => r.status === 'active' || r.status === 'completed').length}</span>
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
                  <div className="insights-placeholder-graphic">
                    <p>Select a specific route from the sidebar to view detailed live tracking, traffic analysis, and AI optimization logs.</p>
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
      {error && <div className="error-toast">{error}</div>}
    </div>
  );
};

export default Dashboard;