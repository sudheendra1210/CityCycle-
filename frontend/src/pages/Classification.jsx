import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { classificationService } from '../services/classificationService';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#6b7280'];
const CATEGORY_COLORS = {
    organic: '#10b981',
    plastic: '#3b82f6',
    paper: '#f59e0b',
    metal: '#8b5cf6',
    glass: '#06b6d4',
    other: '#6b7280',
};

const Classification = () => {
    const [training, setTraining] = useState(false);
    const [trainResult, setTrainResult] = useState(null);
    const [confusionMatrix, setConfusionMatrix] = useState(null);
    const [recyclingStats, setRecyclingStats] = useState(null);
    const [selectedModel, setSelectedModel] = useState('random_forest');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadRecyclingStats();
    }, []);

    const loadRecyclingStats = async () => {
        try {
            setLoading(true);
            const res = await classificationService.getRecyclingStats();
            setRecyclingStats(res.data);
        } catch (err) {
            console.error('Failed to load recycling stats:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleTrain = async () => {
        try {
            setTraining(true);
            setError(null);
            const res = await classificationService.train();
            setTrainResult(res.data);
            // Load confusion matrix after training
            const cmRes = await classificationService.getConfusionMatrix(selectedModel);
            setConfusionMatrix(cmRes.data);
        } catch (err) {
            setError(err.response?.data?.detail || 'Training failed');
        } finally {
            setTraining(false);
        }
    };

    const loadConfusionMatrix = async (model) => {
        try {
            const res = await classificationService.getConfusionMatrix(model);
            setConfusionMatrix(res.data);
        } catch (err) {
            console.error('Failed to load confusion matrix:', err);
        }
    };

    // Prepare composition pie data
    const compositionData = recyclingStats?.zones
        ? (() => {
            const totals = { organic: 0, plastic: 0, paper: 0, metal: 0, glass: 0, other: 0 };
            recyclingStats.zones.forEach(z => {
                Object.keys(totals).forEach(k => { totals[k] += z.composition[k] || 0; });
            });
            return Object.entries(totals).map(([name, value]) => ({
                name: name.charAt(0).toUpperCase() + name.slice(1),
                value: Math.round(value),
                color: CATEGORY_COLORS[name],
            }));
        })()
        : [];

    // Zone recycling bar data
    const zoneBarData = recyclingStats?.zones?.map(z => ({
        zone: z.zone,
        recycling: z.recycling_percent,
        total: Math.round(z.total_collected_kg),
    })) || [];

    const cardStyle = {
        backgroundColor: 'rgba(31, 41, 55, 0.6)',
        backdropFilter: 'blur(12px)',
        borderRadius: '0.75rem',
        border: '1px solid rgba(75, 85, 99, 0.3)',
        padding: '1.5rem',
    };

    const headerIcon = (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 7V4h16v3" /><path d="M9 20h6" /><path d="M12 4v16" />
            <circle cx="7" cy="12" r="2" /><circle cx="17" cy="12" r="2" />
        </svg>
    );

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#111827', padding: '1.5rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{ width: '42px', height: '42px', background: 'linear-gradient(135deg, rgba(20,184,166,0.2), rgba(6,182,212,0.1))', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {headerIcon}
                </div>
                <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white', margin: 0 }}>Waste Classification</h2>
                    <p style={{ fontSize: '0.8rem', color: '#9ca3af', margin: 0 }}>ML-powered waste categorization & recycling analytics</p>
                </div>
            </div>

            {/* Train Section */}
            <div style={{ ...cardStyle, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h3 style={{ color: 'white', margin: 0, fontSize: '1rem', fontWeight: 600 }}>Model Training</h3>
                    <p style={{ color: '#9ca3af', margin: '0.25rem 0 0', fontSize: '0.8rem' }}>
                        Train Random Forest & Decision Tree on collection data
                    </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <select
                        value={selectedModel}
                        onChange={(e) => {
                            setSelectedModel(e.target.value);
                            if (trainResult) loadConfusionMatrix(e.target.value);
                        }}
                        style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', backgroundColor: '#374151', color: 'white', border: '1px solid #4b5563', fontSize: '0.8rem' }}
                    >
                        <option value="random_forest">Random Forest</option>
                        <option value="decision_tree">Decision Tree</option>
                    </select>
                    <button
                        onClick={handleTrain}
                        disabled={training}
                        style={{
                            padding: '0.5rem 1.5rem', borderRadius: '0.5rem', border: 'none', cursor: training ? 'not-allowed' : 'pointer',
                            background: training ? '#374151' : 'linear-gradient(135deg, #10b981, #059669)',
                            color: 'white', fontWeight: 600, fontSize: '0.85rem',
                        }}
                    >
                        {training ? 'Training...' : 'Train Model'}
                    </button>
                </div>
            </div>

            {error && (
                <div style={{ ...cardStyle, marginBottom: '1.5rem', borderColor: 'rgba(239,68,68,0.4)', color: '#fca5a5', fontSize: '0.85rem' }}>
                    ⚠️ {error}
                </div>
            )}

            {/* Training Results */}
            {trainResult && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                    {Object.entries(trainResult.models || {}).map(([name, metrics]) => (
                        <div key={name} style={cardStyle}>
                            <p style={{ color: '#9ca3af', fontSize: '0.75rem', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{name.replace('_', ' ')}</p>
                            <p style={{ color: '#10b981', fontSize: '1.75rem', fontWeight: 700, margin: '0.25rem 0' }}>{metrics.accuracy}%</p>
                            <p style={{ color: '#6b7280', fontSize: '0.75rem', margin: 0 }}>Accuracy</p>
                        </div>
                    ))}
                    <div style={cardStyle}>
                        <p style={{ color: '#9ca3af', fontSize: '0.75rem', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Training Data</p>
                        <p style={{ color: '#3b82f6', fontSize: '1.75rem', fontWeight: 700, margin: '0.25rem 0' }}>{trainResult.samples_total}</p>
                        <p style={{ color: '#6b7280', fontSize: '0.75rem', margin: 0 }}>Total samples</p>
                    </div>
                </div>
            )}

            {/* Confusion Matrix */}
            {confusionMatrix && (
                <div style={{ ...cardStyle, marginBottom: '1.5rem' }}>
                    <h3 style={{ color: 'white', margin: '0 0 1rem', fontSize: '1rem', fontWeight: 600 }}>
                        Confusion Matrix – {selectedModel.replace('_', ' ')}
                    </h3>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ borderCollapse: 'collapse', width: '100%', maxWidth: '600px', margin: '0 auto' }}>
                            <thead>
                                <tr>
                                    <th style={{ padding: '0.5rem', color: '#9ca3af', fontSize: '0.7rem', textAlign: 'center' }}>Actual ↓ / Predicted →</th>
                                    {confusionMatrix.labels.map(l => (
                                        <th key={l} style={{ padding: '0.5rem', color: '#d1d5db', fontSize: '0.7rem', textTransform: 'capitalize', textAlign: 'center' }}>{l}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {confusionMatrix.matrix.map((row, i) => (
                                    <tr key={i}>
                                        <td style={{ padding: '0.5rem', color: '#d1d5db', fontSize: '0.75rem', fontWeight: 600, textTransform: 'capitalize' }}>{confusionMatrix.labels[i]}</td>
                                        {row.map((val, j) => {
                                            const maxVal = Math.max(...confusionMatrix.matrix.flat());
                                            const intensity = maxVal > 0 ? val / maxVal : 0;
                                            const isDiag = i === j;
                                            return (
                                                <td key={j} style={{
                                                    padding: '0.5rem', textAlign: 'center', fontSize: '0.85rem', fontWeight: 600,
                                                    color: intensity > 0.5 ? 'white' : '#d1d5db',
                                                    backgroundColor: isDiag
                                                        ? `rgba(16, 185, 129, ${0.15 + intensity * 0.6})`
                                                        : `rgba(239, 68, 68, ${intensity * 0.4})`,
                                                    borderRadius: '4px',
                                                }}>
                                                    {val}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Charts Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                {/* Waste Composition Pie */}
                <div style={cardStyle}>
                    <h3 style={{ color: 'white', margin: '0 0 1rem', fontSize: '1rem', fontWeight: 600 }}>Overall Waste Composition</h3>
                    {compositionData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={280}>
                            <PieChart>
                                <Pie
                                    data={compositionData}
                                    cx="50%" cy="50%"
                                    innerRadius={60} outerRadius={100}
                                    paddingAngle={3}
                                    dataKey="value"
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                >
                                    {compositionData.map((entry, idx) => (
                                        <Cell key={idx} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '0.5rem', color: '#d1d5db' }}
                                    formatter={(val) => `${val} kg`}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <p style={{ color: '#6b7280', textAlign: 'center', padding: '2rem' }}>No data available</p>
                    )}
                </div>

                {/* Recycling by Zone */}
                <div style={cardStyle}>
                    <h3 style={{ color: 'white', margin: '0 0 1rem', fontSize: '1rem', fontWeight: 600 }}>Recycling % by Zone</h3>
                    {zoneBarData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={zoneBarData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis type="number" domain={[0, 100]} tick={{ fill: '#9ca3af', fontSize: 11 }} unit="%" />
                                <YAxis type="category" dataKey="zone" tick={{ fill: '#d1d5db', fontSize: 12 }} width={70} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '0.5rem', color: '#d1d5db' }}
                                    formatter={(val, name) => name === 'recycling' ? `${val}%` : `${val} kg`}
                                />
                                <Bar dataKey="recycling" fill="#10b981" radius={[0, 4, 4, 0]} name="Recycling %" />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <p style={{ color: '#6b7280', textAlign: 'center', padding: '2rem' }}>No data available</p>
                    )}
                </div>
            </div>

            {/* Overall Stats */}
            {recyclingStats && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    <div style={cardStyle}>
                        <p style={{ color: '#9ca3af', fontSize: '0.75rem', margin: 0 }}>Total Waste Collected</p>
                        <p style={{ color: 'white', fontSize: '1.5rem', fontWeight: 700, margin: '0.25rem 0' }}>{Math.round(recyclingStats.total_waste_collected_kg)} kg</p>
                    </div>
                    <div style={cardStyle}>
                        <p style={{ color: '#9ca3af', fontSize: '0.75rem', margin: 0 }}>Recyclable Waste</p>
                        <p style={{ color: '#10b981', fontSize: '1.5rem', fontWeight: 700, margin: '0.25rem 0' }}>{Math.round(recyclingStats.total_recyclable_kg)} kg</p>
                    </div>
                    <div style={cardStyle}>
                        <p style={{ color: '#9ca3af', fontSize: '0.75rem', margin: 0 }}>Overall Recycling Rate</p>
                        <p style={{ color: '#3b82f6', fontSize: '1.5rem', fontWeight: 700, margin: '0.25rem 0' }}>{recyclingStats.overall_recycling_percent}%</p>
                    </div>
                    <div style={cardStyle}>
                        <p style={{ color: '#9ca3af', fontSize: '0.75rem', margin: 0 }}>Zones Analyzed</p>
                        <p style={{ color: '#f59e0b', fontSize: '1.5rem', fontWeight: 700, margin: '0.25rem 0' }}>{recyclingStats.zones?.length || 0}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Classification;
