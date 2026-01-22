
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import apiService from '../services/api.service';

const Warehouse = () => {
    const navigate = useNavigate();
    const [deliveries, setDeliveries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        customer: '', address: '', status: 'Pending', type: 'Standard', weight: ''
    });
    
    // Autocomplete State
    const [suggestions, setSuggestions] = useState([]);
    const searchTimeoutRef = useRef(null);

    useEffect(() => {
        fetchDeliveries();
    }, []);

    const fetchDeliveries = async () => {
        try {
            const res = await apiService.request('/deliveries');
            if (res.success) {
                setDeliveries(res.data);
            }
            setLoading(false);
        } catch (error) {
            console.error("Error fetching deliveries:", error);
            setLoading(false);
        }
    };

    const fetchAddressSuggestions = (query) => {
        console.log("🔍 Fetching suggestions for:", query);
        
        if (!query || query.length < 3) {
            setSuggestions([]);
            return;
        }

        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

        searchTimeoutRef.current = setTimeout(async () => {
            try {
                console.log("📡 Calling API for:", query);
                const resp = await apiService.searchLocation(query);
                console.log("✅ API Response:", resp);
                
                if (resp.success) {
                    console.log("📍 Suggestions data:", resp.data);
                    console.log("📊 Number of suggestions:", resp.data?.length);
                    console.log("🔎 First suggestion object:", resp.data[0]);
                    setSuggestions(resp.data);
                }
            } catch (err) {
                console.error("❌ Suggestion fetch error:", err);
            }
        }, 400);
    };

    const handleAddressChange = (e) => {
        const val = e.target.value;
        console.log("✏️ Address changed to:", val);
        setFormData({ ...formData, address: val });
        fetchAddressSuggestions(val);
    };

    const selectSuggestion = (address) => {
        console.log("✔️ Selected address:", address);
        setFormData({ ...formData, address });
        setSuggestions([]);
    };

    const handleSave = async () => {
        if (editingId) {
            await handleUpdate();
        } else {
            await handleAdd();
        }
    };

    const handleAdd = async () => {
        try {
            const payload = {
                customerName: formData.customer,
                address: formData.address,
                status: formData.status,
                packageDetails: {
                    weight: formData.weight,
                    type: formData.type
                }
            };

            console.log("📦 Form Data:", formData);
            console.log("🚀 Sending Payload:", payload);

            const res = await apiService.request('/deliveries', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            
            console.log("✅ Backend Response:", res);
            
            if (res.success) {
                setDeliveries([res.data, ...deliveries]);
                closeModal();
            } else {
                alert(res.message);
            }
        } catch (error) {
            console.error("Error adding delivery:", error);
            alert(error.message || "Failed to add delivery");
        }
    };

    const handleUpdate = async () => {
        try {
            const payload = {
                customerName: formData.customer,
                address: formData.address,
                status: formData.status,
                packageDetails: {
                    weight: formData.weight,
                    type: formData.type
                }
            };
            
            const res = await apiService.request(`/deliveries/${editingId}`, {
                method: 'PATCH',
                body: JSON.stringify(payload)
            });
            if (res.success) {
                setDeliveries(deliveries.map(d => d._id === editingId ? res.data : d));
                closeModal();
            } else {
                alert(res.message);
            }
        } catch (error) {
            console.error("Error updating delivery:", error);
            alert(error.message || "Failed to update delivery");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this delivery?")) return;
        try {
            const res = await apiService.request(`/deliveries/${id}`, {
                method: 'DELETE'
            });
            if (res.success) {
                setDeliveries(deliveries.filter(d => d._id !== id));
            } else {
                alert(res.message);
            }
        } catch (error) {
            console.error("Error deleting delivery:", error);
            alert(error.message || "Failed to delete delivery");
        }
    };

    const openAddModal = () => {
        setEditingId(null);
        setSuggestions([]);
        setFormData({ customer: '', address: '', status: 'Pending', type: 'Standard', weight: '' });
        setShowModal(true);
    };

    const openEditModal = (item) => {
        setEditingId(item._id);
        setSuggestions([]);
        setFormData({
            customer: item.customerName || '', 
            address: item.address || '',
            status: item.status || 'Pending',
            type: item.packageDetails?.type || 'Standard',
            weight: item.packageDetails?.weight || ''
        });
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingId(null);
        setSuggestions([]);
        setFormData({ customer: '', address: '', status: 'Pending', type: 'Standard', weight: '' });
    };

    const styles = {
        container: { padding: '2rem', paddingTop: '6rem', maxWidth: '1200px', margin: '0 auto', fontFamily: "'Inter', sans-serif", color: '#f8fafc' },
        header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' },
        title: { fontSize: '2rem', fontWeight: '800', color: '#f8fafc' },
        addButton: { background: '#3b82f6', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' },
        grid: { display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' },
        card: { background: '#1e293b', borderRadius: '12px', padding: '1.5rem', border: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
        cardInfo: { display: 'flex', gap: '1rem', flexDirection: 'column' },
        cardTitle: { fontWeight: '700', fontSize: '1.1rem', color: '#f8fafc' },
        cardSub: { fontSize: '0.9rem', color: '#94a3b8' },
        statusBadge: (status) => {
            let bg = '#334155';
            let col = '#e2e8f0';
            if (status === 'Pending') { bg = '#422006'; col = '#fdba74'; } // Orange-ish
            if (status === 'Assigned') { bg = '#172554'; col = '#60a5fa'; } // Blue-ish
            if (status === 'In-Transit') { bg = '#14532d'; col = '#4ade80'; } // Green-ish
            return {
                padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600',
                background: bg, color: col
            };
        },
        actionBtn: { padding: '8px 12px', borderRadius: '6px', border: '1px solid #475569', background: 'transparent', color: '#cbd5e1', cursor: 'pointer', marginLeft: '10px' },
        modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
        modal: { background: '#1e293b', padding: '2rem', borderRadius: '12px', width: '500px', border: '1px solid #334155', position: 'relative' },
        input: { width: '100%', padding: '10px', marginBottom: '1rem', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: 'white' },
        label: { display: 'block', marginBottom: '0.5rem', color: '#94a3b8', fontSize: '0.9rem' },
        suggestions: {
            position: 'absolute', 
            top: '100%', 
            left: 0, 
            right: 0,
            background: '#0f172a', 
            border: '1px solid #334155', 
            borderRadius: '8px',
            maxHeight: '150px', 
            overflowY: 'auto', 
            zIndex: 1001, 
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)',
            marginTop: '-0.5rem'
        },
        suggestionItem: {
             padding: '10px', 
             borderBottom: '1px solid #475569', 
             cursor: 'pointer', 
             color: '#ffffff',  // Bright white text
             fontSize: '0.9rem',
             backgroundColor: 'transparent'
        }
    };

    return (
        <div style={{ background: '#0f172a', minHeight: '100vh' }}>
            <Header showNav={true} />
            <div style={styles.container}>
                <div style={styles.header}>
                    <div>
                        <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', marginBottom: '0.5rem' }}>← Back</button>
                        <h1 style={styles.title}>Warehouse Manager 🏭</h1>
                        <p style={{ color: '#94a3b8' }}>Manage inventory and delivery assignments.</p>
                    </div>
                    <button style={styles.addButton} onClick={openAddModal}>+ New Delivery</button>
                </div>

                {loading ? <div style={{color: 'white'}}>Loading deliveries...</div> : (
                    <div style={styles.grid}>
                        {deliveries.length > 0 ? deliveries.map(d => (
                            <div key={d._id} style={styles.card}>
                                <div style={styles.cardInfo}>
                                    <div style={styles.cardTitle}>{d.customerName || 'Unknown Customer'}</div>
                                    <div style={styles.cardSub}>{d.address || 'No Address'}</div>
                                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                        Weight: {d.packageDetails?.weight || d.weight || 'N/A'} • Type: {d.packageDetails?.type || d.type || 'Standard'}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <span style={styles.statusBadge(d.status)}>{d.status}</span>
                                    <div>
                                        <button style={styles.actionBtn} onClick={() => openEditModal(d)}>Edit</button>
                                        <button style={{ ...styles.actionBtn, borderColor: '#7f1d1d', color: '#f87171' }} onClick={() => handleDelete(d._id)}>Delete</button>
                                    </div>
                                </div>
                            </div>
                        )) : <div style={{color: '#64748b', fontStyle: 'italic'}}>No deliveries found.</div>}
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modal}>
                        <h2 style={{ color: 'white', marginBottom: '1.5rem' }}>{editingId ? 'Edit Delivery' : 'New Delivery Order'}</h2>
                        
                        <label style={styles.label}>Customer Name</label>
                        <input style={styles.input} value={formData.customer} onChange={e => setFormData({...formData, customer: e.target.value})} placeholder="Receivers Name" />

                        <label style={styles.label}>Delivery Address</label>
                        <div style={{ position: 'relative' }}>
                            <input 
                                style={styles.input} 
                                value={formData.address} 
                                onChange={handleAddressChange} 
                                placeholder="Full Address" 
                            />
                            {suggestions.length > 0 && (
                                <div style={styles.suggestions}>
                                    <div style={{ padding: '10px', color: '#00ff00', fontWeight: 'bold' }}>
                                        {suggestions.length} suggestions found
                                    </div>
                                    {suggestions.map((s, idx) => (
                                        <div 
                                            key={idx} 
                                            style={styles.suggestionItem}
                                            onClick={() => selectSuggestion(s.display_name || s.label || s.address || JSON.stringify(s))}
                                            onMouseOver={(e) => e.target.style.background = '#334155'}
                                            onMouseOut={(e) => e.target.style.background = 'transparent'}
                                        >
                                            {s.display_name || s.label || s.address || `[${idx}] ${JSON.stringify(s).substring(0, 50)}...`}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <label style={styles.label}>Weight</label>
                                <input style={styles.input} value={formData.weight} onChange={e => setFormData({...formData, weight: e.target.value})} placeholder="e.g. 5kg" />
                            </div>
                            <div>
                                <label style={styles.label}>Type</label>
                                <select 
                                    style={styles.input} 
                                    value={formData.type} 
                                    onChange={e => setFormData({...formData, type: e.target.value})}
                                >
                                    <option value="Standard">Standard</option>
                                    <option value="Express">Express</option>
                                    <option value="Fragile">Fragile</option>
                                </select>
                            </div>
                        </div>

                        {editingId && (
                             <div>
                                <label style={styles.label}>Status</label>
                                <select 
                                    style={styles.input} 
                                    value={formData.status} 
                                    onChange={e => setFormData({...formData, status: e.target.value})}
                                >
                                    <option value="Pending">Pending</option>
                                    <option value="Assigned">Assigned</option>
                                    <option value="In-Transit">In-Transit</option>
                                    <option value="Delivered">Delivered</option>
                                </select>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                            <button style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid #475569', color: '#cbd5e1', borderRadius: '6px', cursor: 'pointer' }} onClick={closeModal}>Cancel</button>
                            <button style={{ flex: 1, padding: '10px', background: '#3b82f6', border: 'none', color: 'white', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }} onClick={handleSave}>Save Order</button>
                        </div>
                    </div>
                </div>
            )}

            <Footer />
        </div>
    );
};

export default Warehouse;
