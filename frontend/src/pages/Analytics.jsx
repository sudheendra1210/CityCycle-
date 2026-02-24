import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';
import api from '../services/api';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#06b6d4', '#6b7280'];
const CATEGORY_COLORS = {
    organic: '#10b981', plastic: '#3b82f6', paper: '#f59e0b',
    metal: '#8b5cf6', glass: '#06b6d4', other: '#6b7280',
};

const Analytics = () => {
    const [stats, setStats] = useState(null);
    const [trends, setTrends] = useState([]);
    const [recycling, setRecycling] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [statsRes, trendsRes, recyclingRes] = await Promise.all([
                api.get('/api/analytics/dashboard-stats'),
                api.get('/api/analytics/fill-trends', { params: { days: 14 } }),
                api.get('/api/classification/recycling-stats').catch(() => ({ data: null })),
            ]);
            setStats(statsRes.data);
            setTrends(trendsRes.data?.trends || []);
            setRecycling(recyclingRes.data);
        } catch (err) {
            console.error('Failed to load analytics:', err);
        } finally {
            setLoading(false);
        }
    };

    const cardStyle = {
        backgroundColor: 'rgba(31, 41, 55, 0.6)',
        backdropFilter: 'blur(12px)',
        borderRadius: '0.75rem',
        border: '1px solid rgba(75, 85, 99, 0.3)',
        padding: '1.5rem',
    };

    // Compose zone heatmap data
    const zoneHeatmap = recycling?.zones || [];

    // Overall composition data for pie chart
    const compositionData = recycling?.zones
        ? (() => {
            const totals = { organic: 0, plastic: 0, paper: 0, metal: 0, glass: 0, other: 0 };
            recycling.zones.forEach(z => {
                Object.keys(totals).forEach(k => { totals[k] += z.composition?.[k] || 0; });
            });
            return Object.entries(totals)
                .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value: Math.round(value), color: CATEGORY_COLORS[name] }))
                .filter(d => d.value > 0);
        })()
        : [];

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', backgroundColor: '#111827', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ color: '#9ca3af', fontSize: '1rem' }}>Loading analytics...</p>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#111827', padding: '1.5rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{ width: '42px', height: '42px', background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(168,85,247,0.1))', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
                    </svg>
                </div>
                <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white', margin: 0 }}>Analytics</h2>
                    <p style={{ fontSize: '0.8rem', color: '#9ca3af', margin: 0 }}>Waste composition, recycling rates & collection efficiency</p>
                </div>
            </div>

            {/* Top Stats */}
            {stats && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={cardStyle}>
                        <p style={{ color: '#9ca3af', fontSize: '0.75rem', margin: 0 }}>Total Bins</p>
                        <p style={{ color: 'white', fontSize: '1.5rem', fontWeight: 700, margin: '0.25rem 0' }}>{stats.total_bins}</p>
                    </div>
                    <div style={cardStyle}>
                        <p style={{ color: '#9ca3af', fontSize: '0.75rem', margin: 0 }}>Avg Fill Level</p>
                        <p style={{ color: '#3b82f6', fontSize: '1.5rem', fontWeight: 700, margin: '0.25rem 0' }}>{Math.round(stats.avg_fill_level || 0)}%</p>
                    </div>
                    <div style={cardStyle}>
                        <p style={{ color: '#9ca3af', fontSize: '0.75rem', margin: 0 }}>Critical Bins</p>
                        <p style={{ color: '#ef4444', fontSize: '1.5rem', fontWeight: 700, margin: '0.25rem 0' }}>{stats.critical_bins}</p>
                    </div>
                    {recycling && (
                        <div style={cardStyle}>
                            <p style={{ color: '#9ca3af', fontSize: '0.75rem', margin: 0 }}>Recycling Rate</p>
                            <p style={{ color: '#10b981', fontSize: '1.5rem', fontWeight: 700, margin: '0.25rem 0' }}>{recycling.overall_recycling_percent}%</p>
                        </div>
                    )}
                </div>
            )}

            {/* Charts Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                {/* Fill Level Trends */}
                <div style={cardStyle}>
                    <h3 style={{ color: 'white', margin: '0 0 1rem', fontSize: '1rem', fontWeight: 600 }}>Fill Level Trends (14 days)</h3>
                    {trends.length > 0 ? (
                        <ResponsiveContainer width="100%" height={280}>
                            <LineChart data={trends}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 10 }} />
                                <YAxis domain={[0, 100]} tick={{ fill: '#9ca3af', fontSize: 11 }} unit="%" />
                                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '0.5rem', color: '#d1d5db' }} />
                                <Line type="monotone" dataKey="avg_fill_level" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Avg Fill %" />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : <p style={{ color: '#6b7280', textAlign: 'center', padding: '2rem' }}>No trend data</p>}
                </div>

                {/* Waste Composition Pie */}
                <div style={cardStyle}>
                    <h3 style={{ color: 'white', margin: '0 0 1rem', fontSize: '1rem', fontWeight: 600 }}>Waste Composition</h3>
                    {compositionData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={280}>
                            <PieChart>
                                <Pie data={compositionData} cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={3} dataKey="value"
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                    {compositionData.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '0.5rem', color: '#d1d5db' }} formatter={v => `${v} kg`} />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : <p style={{ color: '#6b7280', textAlign: 'center', padding: '2rem' }}>No composition data</p>}
                </div>
            </div>

            {/* Zone Heatmap Table */}
            {zoneHeatmap.length > 0 && (
                <div style={cardStyle}>
                    <h3 style={{ color: 'white', margin: '0 0 1rem', fontSize: '1rem', fontWeight: 600 }}>Zone-wise Recycling Heatmap</h3>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ borderCollapse: 'separate', borderSpacing: '4px', width: '100%' }}>
                            <thead>
                                <tr>
                                    <th style={{ padding: '0.5rem 1rem', color: '#d1d5db', fontSize: '0.75rem', textAlign: 'left', fontWeight: 600 }}>Zone</th>
                                    <th style={{ padding: '0.5rem', color: '#d1d5db', fontSize: '0.75rem', textAlign: 'center', fontWeight: 600 }}>Total (kg)</th>
                                    <th style={{ padding: '0.5rem', color: '#d1d5db', fontSize: '0.75rem', textAlign: 'center', fontWeight: 600 }}>Recyclable (kg)</th>
                                    <th style={{ padding: '0.5rem', color: '#d1d5db', fontSize: '0.75rem', textAlign: 'center', fontWeight: 600 }}>Recycling %</th>
                                    <th style={{ padding: '0.5rem', color: '#d1d5db', fontSize: '0.75rem', textAlign: 'center', fontWeight: 600 }}>Collections</th>
                                </tr>
                            </thead>
                            <tbody>
                                {zoneHeatmap.map((z, i) => {
                                    const intensity = z.recycling_percent / 100;
                                    return (
                                        <tr key={i}>
                                            <td style={{ padding: '0.5rem 1rem', color: 'white', fontSize: '0.85rem', fontWeight: 500 }}>{z.zone}</td>
                                            <td style={{ padding: '0.5rem', textAlign: 'center', color: '#d1d5db', fontSize: '0.85rem' }}>{Math.round(z.total_collected_kg)}</td>
                                            <td style={{ padding: '0.5rem', textAlign: 'center', color: '#d1d5db', fontSize: '0.85rem' }}>{Math.round(z.recyclable_kg)}</td>
                                            <td style={{
                                                padding: '0.5rem', textAlign: 'center', fontWeight: 700, fontSize: '0.85rem', borderRadius: '6px',
                                                color: 'white',
                                                backgroundColor: `rgba(16,185,129,${0.15 + intensity * 0.55})`,
                                            }}>{z.recycling_percent}%</td>
                                            <td style={{ padding: '0.5rem', textAlign: 'center', color: '#9ca3af', fontSize: '0.85rem' }}>{z.collections_count}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Analytics;
