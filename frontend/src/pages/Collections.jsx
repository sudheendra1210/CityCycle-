import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../services/api';

const CATEGORY_COLORS = {
    organic: '#10b981', plastic: '#3b82f6', paper: '#f59e0b',
    metal: '#8b5cf6', glass: '#06b6d4', other: '#6b7280',
};

const Collections = () => {
    const [collections, setCollections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedRow, setExpandedRow] = useState(null);
    const [filter, setFilter] = useState('all');

    useEffect(() => { loadCollections(); }, []);

    const loadCollections = async () => {
        try {
            setLoading(true);
            const res = await api.get('/api/collections/');
            setCollections(res.data || []);
        } catch (err) {
            console.error('Failed to load collections:', err);
        } finally {
            setLoading(false);
        }
    };

    // Aggregate composition
    const aggregated = collections.reduce((acc, c) => {
        acc.organic += (c.organic_percent || 0) * (c.waste_collected_kg || 0) / 100;
        acc.plastic += (c.plastic_percent || 0) * (c.waste_collected_kg || 0) / 100;
        acc.paper += (c.paper_percent || 0) * (c.waste_collected_kg || 0) / 100;
        acc.metal += (c.metal_percent || 0) * (c.waste_collected_kg || 0) / 100;
        acc.glass += (c.glass_percent || 0) * (c.waste_collected_kg || 0) / 100;
        acc.other += (c.other_percent || 0) * (c.waste_collected_kg || 0) / 100;
        return acc;
    }, { organic: 0, plastic: 0, paper: 0, metal: 0, glass: 0, other: 0 });

    const barData = Object.entries(aggregated).map(([k, v]) => ({
        category: k.charAt(0).toUpperCase() + k.slice(1),
        weight: Math.round(v),
        fill: CATEGORY_COLORS[k],
    }));

    const filteredCollections = filter === 'all' ? collections : collections.filter(c => {
        if (filter === 'heavy') return (c.waste_collected_kg || 0) > 100;
        if (filter === 'light') return (c.waste_collected_kg || 0) <= 100;
        return true;
    });

    const cardStyle = {
        backgroundColor: 'rgba(31, 41, 55, 0.6)',
        backdropFilter: 'blur(12px)',
        borderRadius: '0.75rem',
        border: '1px solid rgba(75, 85, 99, 0.3)',
        padding: '1.5rem',
    };

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', backgroundColor: '#111827', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ color: '#9ca3af' }}>Loading collections...</p>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#111827', padding: '1.5rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{ width: '42px', height: '42px', background: 'linear-gradient(135deg, rgba(14,165,233,0.2), rgba(6,182,212,0.1))', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                        <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                    </svg>
                </div>
                <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white', margin: 0 }}>Collections</h2>
                    <p style={{ fontSize: '0.8rem', color: '#9ca3af', margin: 0 }}>Collection history & waste composition data</p>
                </div>
            </div>

            {/* Summary Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={cardStyle}>
                    <p style={{ color: '#9ca3af', fontSize: '0.75rem', margin: 0 }}>Total Collections</p>
                    <p style={{ color: 'white', fontSize: '1.5rem', fontWeight: 700, margin: '0.25rem 0' }}>{collections.length}</p>
                </div>
                <div style={cardStyle}>
                    <p style={{ color: '#9ca3af', fontSize: '0.75rem', margin: 0 }}>Total Waste Collected</p>
                    <p style={{ color: '#10b981', fontSize: '1.5rem', fontWeight: 700, margin: '0.25rem 0' }}>{Math.round(collections.reduce((s, c) => s + (c.waste_collected_kg || 0), 0))} kg</p>
                </div>
                <div style={cardStyle}>
                    <p style={{ color: '#9ca3af', fontSize: '0.75rem', margin: 0 }}>Avg per Collection</p>
                    <p style={{ color: '#3b82f6', fontSize: '1.5rem', fontWeight: 700, margin: '0.25rem 0' }}>
                        {collections.length > 0 ? Math.round(collections.reduce((s, c) => s + (c.waste_collected_kg || 0), 0) / collections.length) : 0} kg
                    </p>
                </div>
            </div>

            {/* Composition Bar Chart */}
            <div style={{ ...cardStyle, marginBottom: '1.5rem' }}>
                <h3 style={{ color: 'white', margin: '0 0 1rem', fontSize: '1rem', fontWeight: 600 }}>Aggregated Waste Composition</h3>
                {barData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={barData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="category" tick={{ fill: '#d1d5db', fontSize: 12 }} />
                            <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} unit=" kg" />
                            <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '0.5rem', color: '#d1d5db' }} formatter={v => `${v} kg`} />
                            <Bar dataKey="weight" radius={[4, 4, 0, 0]} name="Weight">
                                {barData.map((entry, i) => (
                                    <rect key={i} fill={entry.fill} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                ) : <p style={{ color: '#6b7280', textAlign: 'center' }}>No composition data</p>}
            </div>

            {/* Filter */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                {['all', 'heavy', 'light'].map(f => (
                    <button key={f} onClick={() => setFilter(f)}
                        style={{
                            padding: '0.4rem 1rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer',
                            backgroundColor: filter === f ? 'rgba(14,165,233,0.25)' : '#1f2937',
                            color: filter === f ? '#38bdf8' : '#9ca3af',
                            fontWeight: 500, fontSize: '0.8rem', textTransform: 'capitalize',
                        }}
                    >{f === 'heavy' ? '>100 kg' : f === 'light' ? '≤100 kg' : 'All'}</button>
                ))}
            </div>

            {/* Collections Table */}
            <div style={{ ...cardStyle, padding: '0', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid #374151' }}>
                                {['Collection ID', 'Bin', 'Vehicle', 'Date', 'Weight (kg)', 'Duration (min)', 'Crew'].map(h => (
                                    <th key={h} style={{ padding: '0.75rem 1rem', color: '#9ca3af', fontSize: '0.75rem', textAlign: 'left', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCollections.slice(0, 50).map((c, i) => (
                                <>
                                    <tr key={c.collection_id || i}
                                        onClick={() => setExpandedRow(expandedRow === i ? null : i)}
                                        style={{ borderBottom: '1px solid rgba(55,65,81,0.5)', cursor: 'pointer', transition: 'background 0.15s', backgroundColor: expandedRow === i ? 'rgba(139,92,246,0.08)' : 'transparent' }}
                                        onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(139,92,246,0.06)'}
                                        onMouseOut={e => e.currentTarget.style.backgroundColor = expandedRow === i ? 'rgba(139,92,246,0.08)' : 'transparent'}
                                    >
                                        <td style={{ padding: '0.75rem 1rem', color: '#d1d5db', fontSize: '0.85rem', fontFamily: 'monospace' }}>{c.collection_id}</td>
                                        <td style={{ padding: '0.75rem 1rem', color: '#d1d5db', fontSize: '0.85rem' }}>{c.bin_id}</td>
                                        <td style={{ padding: '0.75rem 1rem', color: '#d1d5db', fontSize: '0.85rem' }}>{c.vehicle_id}</td>
                                        <td style={{ padding: '0.75rem 1rem', color: '#9ca3af', fontSize: '0.8rem' }}>
                                            {c.collection_timestamp ? new Date(c.collection_timestamp).toLocaleDateString() : '—'}
                                        </td>
                                        <td style={{ padding: '0.75rem 1rem', color: 'white', fontWeight: 600, fontSize: '0.85rem' }}>{c.waste_collected_kg}</td>
                                        <td style={{ padding: '0.75rem 1rem', color: '#9ca3af', fontSize: '0.85rem' }}>{c.duration_minutes}</td>
                                        <td style={{ padding: '0.75rem 1rem', color: '#9ca3af', fontSize: '0.85rem' }}>{c.crew_size}</td>
                                    </tr>
                                    {expandedRow === i && (
                                        <tr key={`exp-${i}`}>
                                            <td colSpan={7} style={{ padding: '0.75rem 1rem', backgroundColor: 'rgba(31,41,55,0.5)' }}>
                                                <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                                                    {['organic', 'plastic', 'paper', 'metal', 'glass', 'other'].map(cat => (
                                                        <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                            <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: CATEGORY_COLORS[cat] }} />
                                                            <span style={{ color: '#d1d5db', fontSize: '0.8rem', textTransform: 'capitalize' }}>{cat}:</span>
                                                            <span style={{ color: 'white', fontWeight: 600, fontSize: '0.8rem' }}>{c[`${cat}_percent`] || 0}%</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filteredCollections.length === 0 && (
                    <p style={{ color: '#6b7280', textAlign: 'center', padding: '2rem' }}>No collections found</p>
                )}
            </div>
        </div>
    );
};

export default Collections;
