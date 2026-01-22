
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import apiService from '../services/api.service';

const Fleet = () => {
    const navigate = useNavigate();
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        name: '', reg: '', type: '', capacity: '', fuel: '', mileage: '', status: 'Active'
    });

    const [editingId, setEditingId] = useState(null);

    useEffect(() => {
        fetchVehicles();
    }, []);

    const fetchVehicles = async () => {
        try {
            const res = await apiService.request('/vehicles');
            if (res.success) {
                setVehicles(res.data);
            }
            setLoading(false);
        } catch (error) {
            console.error("Error fetching vehicles:", error);
            setLoading(false);
        }
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
            const res = await apiService.request('/vehicles', {
                method: 'POST',
                body: JSON.stringify(formData)
            });
            if (res.success) {
                setVehicles([res.data, ...vehicles]);
                closeModal();
            } else {
                alert(res.message);
            }
        } catch (error) {
            console.error("Error adding vehicle:", error);
            alert(error.message || "Failed to add vehicle");
        }
    };

    const handleUpdate = async () => {
        try {
            const res = await apiService.request(`/vehicles/${editingId}`, {
                method: 'PUT',
                body: JSON.stringify(formData)
            });
            if (res.success) {
                setVehicles(vehicles.map(v => v._id === editingId ? res.data : v));
                closeModal();
            } else {
                alert(res.message);
            }
        } catch (error) {
            console.error("Error updating vehicle:", error);
            alert(error.message || "Failed to update vehicle");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this vehicle?")) return;
        try {
            const res = await apiService.request(`/vehicles/${id}`, {
                method: 'DELETE'
            });
            if (res.success) {
                setVehicles(vehicles.filter(v => v._id !== id));
            } else {
                alert(res.message);
            }
        } catch (error) {
            console.error("Error deleting vehicle:", error);
            alert(error.message || "Failed to delete vehicle");
        }
    };

    const openAddModal = () => {
        setEditingId(null);
        setFormData({ name: '', reg: '', type: '', capacity: '', fuel: '', mileage: '', status: 'Active' });
        setShowModal(true);
    };

    const openEditModal = (vehicle) => {
        setEditingId(vehicle._id);
        setFormData({
            name: vehicle.name,
            reg: vehicle.reg,
            type: vehicle.type,
            capacity: vehicle.capacity,
            fuel: vehicle.fuel,
            mileage: vehicle.mileage,
            status: vehicle.status
        });
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingId(null);
        setFormData({ name: '', reg: '', type: '', capacity: '', fuel: '', mileage: '', status: 'Active' });
    };

    const styles = {
        container: { padding: '2rem', paddingTop: '6rem', maxWidth: '1200px', margin: '0 auto', fontFamily: "'Inter', sans-serif" },
        header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' },
        title: { fontSize: '2rem', fontWeight: '800', color: '#f8fafc' },
        addButton: { background: '#f97316', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' },
        grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' },
        card: { background: '#1e293b', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.4)', border: '1px solid #334155' },
        cardHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' },
        cardTitle: { fontWeight: '700', fontSize: '1.1rem', color: '#f8fafc' },
        statusBadge: (status) => ({
            fontSize: '0.9rem', fontWeight: '600',
            color: status === 'Active' ? '#6ee7b7' : '#fca5a5' // Light Green / Light Red text
        }),
        detailRow: { display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#94a3b8' },
        detailVal: { fontWeight: '500', color: '#cbd5e1' },
        modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
        modal: { background: '#1e293b', padding: '2rem', borderRadius: '12px', width: '400px', border: '1px solid #334155' },
        input: { width: '100%', padding: '10px', marginBottom: '1rem', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: 'white' },
        label: { display: 'block', marginBottom: '0.5rem', color: '#94a3b8', fontSize: '0.9rem' }
    };

    return (
        <div style={{ background: '#0f172a', minHeight: '100vh' }}>
            <Header showNav={true} />
            <div style={styles.container}>
                <div style={styles.header}>
                    <div>
                        <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', marginBottom: '0.5rem' }}>← Back</button>
                        <h1 style={styles.title}>My Fleet Registry 🚛</h1>
                        <p style={{ color: '#94a3b8' }}>Manage your vehicles, maintenance schedules, and capacity.</p>
                    </div>
                    <button style={styles.addButton} onClick={openAddModal}>+ Add Vehicle</button>
                </div>

                {loading ? <div style={{color: 'white'}}>Loading vehicles...</div> : (
                    <div style={styles.grid}>
                        {vehicles.map(v => (
                            <div key={v._id} style={styles.card}>
                                <div style={styles.cardHeader}>
                                    <div>
                                        <div style={styles.cardTitle}>{v.name}</div>
                                        <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>{v.reg}</div>
                                    </div>
                                    {/* Status removed as requested */}
                                </div>
                                <div style={{ borderTop: '1px solid #334155', paddingTop: '1rem' }}>
                                    <div style={styles.detailRow}><span>Type</span><span style={styles.detailVal}>{v.type}</span></div>
                                    <div style={styles.detailRow}><span>Capacity</span><span style={styles.detailVal}>{v.capacity}</span></div>
                                    <div style={styles.detailRow}><span>Fuel</span><span style={styles.detailVal}>{v.fuel}</span></div>
                                    <div style={styles.detailRow}><span>Mileage</span><span style={styles.detailVal}>{v.mileage}</span></div>
                                </div>
                                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #334155', display: 'flex', gap: '10px' }}>
                                    <button style={{ flex: 1, padding: '8px', border: '1px solid #475569', background: 'transparent', color: '#cbd5e1', borderRadius: '6px', cursor: 'pointer' }} onClick={() => openEditModal(v)}>Edit</button>
                                    <button style={{ flex: 1, padding: '8px', border: '1px solid #7f1d1d', background: 'rgba(127, 29, 29, 0.2)', borderRadius: '6px', cursor: 'pointer', color: '#fca5a5' }} onClick={() => handleDelete(v._id)}>Delete</button>
                                </div>
                            </div>
                        ))}
                        
                        {/* Add New Placeholder - Click triggers modal */}
                        <div style={{ ...styles.card, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed', cursor: 'pointer', background: '#1e293b', borderColor: '#475569' }} onClick={openAddModal}>
                            <div style={{ fontSize: '3rem', color: '#475569' }}>+</div>
                            <div style={{ color: '#94a3b8', fontWeight: '500' }}>Register New Vehicle</div>
                        </div>
                    </div>
                )}
            </div>
            
            {/* Add Vehicle Modal */}
            {showModal && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modal}>
                        <h2 style={{ color: 'white', marginBottom: '1.5rem' }}>{editingId ? 'Edit Vehicle' : 'Add New Vehicle'}</h2>
                        
                        <label style={styles.label}>Vehicle Name (e.g. Tata Ace)</label>
                        <input style={styles.input} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Enter name" />
                        
                        <label style={styles.label}>Registration Number</label>
                        <input style={styles.input} value={formData.reg} onChange={e => setFormData({...formData, reg: e.target.value})} placeholder="DL-1L-XXXX" />

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <label style={styles.label}>Type</label>
                                <input style={styles.input} value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} placeholder="Truck/Van" />
                            </div>
                            <div>
                                <label style={styles.label}>Capacity</label>
                                <input style={styles.input} value={formData.capacity} onChange={e => setFormData({...formData, capacity: e.target.value})} placeholder="750 kg" />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <label style={styles.label}>Fuel</label>
                                <input style={styles.input} value={formData.fuel} onChange={e => setFormData({...formData, fuel: e.target.value})} placeholder="Diesel" />
                            </div>
                            <div>
                                <label style={styles.label}>Mileage</label>
                                <input style={styles.input} value={formData.mileage} onChange={e => setFormData({...formData, mileage: e.target.value})} placeholder="18 km/l" />
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                            <button style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid #475569', color: '#cbd5e1', borderRadius: '6px', cursor: 'pointer' }} onClick={closeModal}>Cancel</button>
                            <button style={{ flex: 1, padding: '10px', background: '#f97316', border: 'none', color: 'white', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }} onClick={handleSave}>{editingId ? 'Update Vehicle' : 'Save Vehicle'}</button>
                        </div>
                    </div>
                </div>
            )}

            <Footer />
        </div>
    );
};

export default Fleet;
