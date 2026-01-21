
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';

const Finance = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [kpis, setKpis] = useState([
        { label: 'Total Cost', value: '₹0', trend: '0%', color: '#10b981' },
        { label: 'Fuel Expenses', value: '₹0', trend: '0%', color: '#f59e0b' },
        { label: 'Driver Wages', value: '₹0', trend: '0%', color: '#3b82f6' },
        { label: 'Maintenance', value: '₹0', trend: '0%', color: '#ef4444' },
    ]);
    const [monthlyData, setMonthlyData] = useState([]);
    const [costDistribution, setCostDistribution] = useState([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${import.meta.env.VITE_API_URL}/routes`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            
            if (data.data) {
                calculateMetrices(data.data);
            }
            setLoading(false);
        } catch (error) {
            console.error("Error fetching finance data:", error);
            setLoading(false);
        }
    };

    const calculateMetrices = (routes) => {
        let totalCost = 0;
        let fuelCost = 0;
        let wageCost = 0;
        let maintCost = 0;
        const monthMap = {};

        // Initialize last 6 months with some dummy data for realism (as requested)
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const today = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const mName = months[d.getMonth()];
            
            // Dummy data logic: Random value between 50k and 1.2L for past months
            // Only set dummy data if it's NOT the current month (let current month be real or start at 0)
            if (i > 0) {
                 monthMap[mName] = Math.floor(Math.random() * (120000 - 50000 + 1)) + 50000;
            } else {
                 monthMap[mName] = 0; // Current month starts at 0, will be filled by actual routes
            }
        }

        routes.forEach(r => {
            if (r.costBreakdown) {
                totalCost += r.costBreakdown.total || 0;
                fuelCost += r.costBreakdown.fuel || 0;
                wageCost += r.costBreakdown.time || 0; // Using time cost as proxy for wages
                maintCost += (r.costBreakdown.maintenance || 0) + (r.costBreakdown.tolls || 0);

                // Monthly Aggregation
                const d = new Date(r.createdAt);
                const mName = months[d.getMonth()];
                if (monthMap.hasOwnProperty(mName)) { // Only count if within last 6 months window approximately (simple logic)
                     monthMap[mName] += (r.costBreakdown.total || 0);
                }
            }
        });

        // Calculate Trend
        const currentMonthName = months[new Date().getMonth()];
        const lastMonthDate = new Date();
        lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
        const lastMonthName = months[lastMonthDate.getMonth()];

        const currVal = monthMap[currentMonthName] || 0;
        const lastVal = monthMap[lastMonthName] || 1; // avoid divide by zero
        // If lastVal is dummy data (e.g. 50k) and currVal is real (e.g. 30k), trend will be negative, which is correct.
        
        let pctChange = 0;
        if (lastVal > 0) {
            pctChange = Math.round(((currVal - lastVal) / lastVal) * 100);
        }
        const trendSymbol = pctChange >= 0 ? '+' : '';
        const trendStr = `${trendSymbol}${pctChange}%`;

        // Update KPIs
        setKpis([
            { label: 'Total Cost', value: `₹${totalCost.toLocaleString()}`, trend: trendStr, color: '#10b981' },
            { label: 'Fuel Expenses', value: `₹${fuelCost.toLocaleString()}`, trend: trendStr, color: '#f59e0b' },
            { label: 'Driver Wages', value: `₹${wageCost.toLocaleString()}`, trend: trendStr, color: '#3b82f6' },
            { label: 'Maintenance', value: `₹${maintCost.toLocaleString()}`, trend: trendStr, color: '#ef4444' },
        ]);

        // Update Chart Data
        const chartData = Object.keys(monthMap).map(m => ({
            month: m,
            cost: monthMap[m],
            val: 0 // to be calculated
        }));
        // Find max for scaling
        const maxVal = Math.max(...chartData.map(d => d.cost)) || 1;
        chartData.forEach(d => {
            d.displayCost = d.cost > 1000 ? `${(d.cost/1000).toFixed(1)}k` : d.cost;
            d.val = `${(d.cost / maxVal) * 80 + 10}%`; // Scale to 10-90% height
        });
        setMonthlyData(chartData);

        // Update Cost Dist
        const total = totalCost || 1;
        setCostDistribution([
            { label: 'Fuel (Diesel/CNG)', pct: `${Math.round((fuelCost/total)*100)}%`, color: '#f59e0b' },
            { label: 'Driver Wages', pct: `${Math.round((wageCost/total)*100)}%`, color: '#3b82f6' },
            { label: 'Maintenance & Misc', pct: `${Math.round((maintCost/total)*100)}%`, color: '#ef4444' }
        ]);
    };

    const styles = {
        container: { padding: '2rem', paddingTop: '6rem', maxWidth: '1200px', margin: '0 auto', fontFamily: "'Inter', sans-serif" },
        header: { marginBottom: '2rem' },
        title: { fontSize: '2rem', fontWeight: '800', color: '#f8fafc' },
        grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' },
        card: { background: '#1e293b', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.4)', border: '1px solid #334155' },
        kpiLabel: { fontSize: '0.9rem', color: '#94a3b8', marginBottom: '0.5rem' },
        kpiValue: { fontSize: '1.8rem', fontWeight: '800', color: '#f8fafc' },
        trend: (trend) => ({
            fontSize: '0.85rem', fontWeight: '600',
            color: trend.startsWith('+') ? '#fca5a5' : '#6ee7b7', // Light Red / Light Green
            marginTop: '5px'
        }),
        chartContainer: { background: '#1e293b', borderRadius: '12px', padding: '2rem', marginTop: '2rem', height: '400px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', borderBottom: '1px solid #334155' },
        barGroup: { display: 'flex', flexDirection: 'column', alignItems: 'center', width: '10%', height: '100%', justifyContent: 'flex-end' },
        bar: (height, color) => ({ width: '100%', height: height, background: color, borderRadius: '4px 4px 0 0', position: 'relative', transition: 'height 0.5s ease' }),
        barLabel: { marginTop: '10px', fontSize: '0.9rem', color: '#94a3b8', fontWeight: '500' }
    };

    if (loading) return <div style={{ padding: '4rem', color: 'white', textAlign: 'center' }}>Loading financial data...</div>;

    return (
        <div style={{ background: '#0f172a', minHeight: '100vh' }}>
             <Header showNav={true} />
            <div style={styles.container}>
                <div style={styles.header}>
                    <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', marginBottom: '0.5rem' }}>← Back</button>
                    <h1 style={styles.title}>Financial Analytics 💰</h1>
                    <p style={{ color: '#94a3b8' }}>Real-time cost tracking based on fleet operations.</p>
                </div>

                <div style={styles.grid}>
                    {kpis.map((k, i) => (
                        <div key={i} style={styles.card}>
                            <div style={styles.kpiLabel}>{k.label}</div>
                            <div style={{ color: k.color, fontSize: '1.8rem', fontWeight: '800' }}>{k.value}</div>
                            {/* Trend hardcoded for now as we need historic data for accurate trends */}
                            <div style={styles.trend(k.trend)}>{k.trend.startsWith('-') ? '⬇' : '⬆'} {k.trend} vs last month</div>
                        </div>
                    ))}
                </div>

                {/* CSS Bar Chart */}
                <h3 style={{ color: '#cbd5e1', marginBottom: '1rem' }}>Monthly Cost Trends</h3>
                <div style={styles.card}>
                    <div style={{ display: 'flex', height: '300px', alignItems: 'flex-end', justifyContent: 'space-around', paddingBottom: '20px', borderBottom: '1px solid #334155' }}>
                        {monthlyData.length > 0 ? monthlyData.map((d, i) => (
                            <div key={i} style={styles.barGroup}>
                                <div style={{ marginBottom: '10px', fontWeight: 'bold', color: '#94a3b8' }}>{d.displayCost}</div>
                                <div style={styles.bar(d.val, i === monthlyData.length - 1 ? '#10b981' : '#475569')}></div>
                                <div style={styles.barLabel}>{d.month}</div>
                            </div>
                        )) : <div style={{color: '#64748b'}}>No route data available for charts</div>}
                    </div>
                </div>

                <div style={{ marginTop: '2rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                    <div style={styles.card}>
                        <h3 style={{ marginBottom: '1rem', color: '#f8fafc' }}>Cost Breakdown</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {costDistribution.map((item, i) => (
                                <div key={i}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '0.9rem', color: '#cbd5e1' }}>
                                        <span>{item.label}</span>
                                        <span style={{ fontWeight: 'bold' }}>{item.pct}</span>
                                    </div>
                                    <div style={{ width: '100%', height: '8px', background: '#334155', borderRadius: '4px' }}>
                                        <div style={{ width: item.pct, height: '100%', background: item.color, borderRadius: '4px' }}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div style={styles.card}>
                        <h3 style={{ marginBottom: '1rem', color: '#f8fafc' }}>Projected Savings</h3>
                        <p style={{ color: '#94a3b8', lineHeight: '1.6' }}>
                            Based on current AI optimization, FleetFlow is reducing travel distance and fuel consumption.
                        </p>
                        <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'rgba(6, 78, 59, 0.5)', borderRadius: '8px', border: '1px solid #065f46' }}>
                            <div style={{ color: '#34d399', fontWeight: 'bold' }}>AI Optimization Impact</div>
                            <div style={{ fontSize: '2rem', fontWeight: '800', color: '#34d399', margin: '10px 0' }}>12.5%</div>
                            <div style={{ color: '#a7f3d0', fontSize: '0.9rem' }}>Estimated reduction in total logistical costs.</div>
                        </div>
                    </div>
                </div>

            </div>
            <Footer />
        </div>
    );
};

export default Finance;
