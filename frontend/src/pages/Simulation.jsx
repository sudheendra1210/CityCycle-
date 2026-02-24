import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import { simulationService } from '../services/simulationService';

const Simulation = () => {
    const [simResult, setSimResult] = useState(null);
    const [compareResult, setCompareResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('simulate');
    const [error, setError] = useState(null);

    // Params state
    const [params, setParams] = useState({
        days: 7,
        bin_type: 'residential',
        capacity_liters: 240,
        fill_rate_multiplier: 1.0,
        fixed_threshold: 80,
        dynamic_base: 70,
        dynamic_weekend_offset: -10,
        dynamic_peak_offset: -15,
    });

    const updateParam = (key, value) => setParams(p => ({ ...p, [key]: value }));

    const runSimulation = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await simulationService.runSimulation({
                days: params.days,
                bin_type: params.bin_type,
                capacity_liters: params.capacity_liters,
                fill_rate_multiplier: params.fill_rate_multiplier,
                fixed_threshold: params.fixed_threshold,
            });
            setSimResult(res.data);
        } catch (err) {
            setError(err.response?.data?.detail || 'Simulation failed');
        } finally {
            setLoading(false);
        }
    };

    const runComparison = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await simulationService.compareThresholds(params);
            setCompareResult(res.data);
        } catch (err) {
            setError(err.response?.data?.detail || 'Comparison failed');
        } finally {
            setLoading(false);
        }
    };

    // Downsample timeline for chart performance (every 2 hours)
    const downsample = (timeline) => {
        if (!timeline) return [];
        return timeline.filter((_, i) => i % 2 === 0);
    };

    const cardStyle = {
        backgroundColor: 'rgba(31, 41, 55, 0.6)',
        backdropFilter: 'blur(12px)',
        borderRadius: '0.75rem',
        border: '1px solid rgba(75, 85, 99, 0.3)',
        padding: '1.5rem',
    };

    const inputStyle = {
        padding: '0.4rem 0.75rem', borderRadius: '0.5rem', backgroundColor: '#374151',
        color: 'white', border: '1px solid #4b5563', fontSize: '0.8rem', width: '100%',
    };

    const labelStyle = { color: '#9ca3af', fontSize: '0.75rem', marginBottom: '0.25rem', display: 'block' };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#111827', padding: '1.5rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{ width: '42px', height: '42px', background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(168,85,247,0.1))', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2" />
                        <path d="M8.5 2h7" /><path d="M7 16h10" />
                    </svg>
                </div>
                <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white', margin: 0 }}>Smart Bins Simulation</h2>
                    <p style={{ fontSize: '0.8rem', color: '#9ca3af', margin: 0 }}>Model fill-level dynamics & compare collection strategies</p>
                </div>
            </div>

            {/* Tab Buttons */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                {[
                    { key: 'simulate', label: 'Run Simulation' },
                    { key: 'compare', label: 'Compare Thresholds' },
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        style={{
                            padding: '0.5rem 1.25rem', borderRadius: '0.5rem', border: 'none', cursor: 'pointer',
                            backgroundColor: activeTab === tab.key ? 'rgba(139,92,246,0.25)' : '#1f2937',
                            color: activeTab === tab.key ? '#a78bfa' : '#9ca3af',
                            fontWeight: 500, fontSize: '0.85rem',
                            borderBottom: activeTab === tab.key ? '2px solid #8b5cf6' : '2px solid transparent',
                        }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Parameter Controls */}
            <div style={{ ...cardStyle, marginBottom: '1.5rem' }}>
                <h3 style={{ color: 'white', margin: '0 0 1rem', fontSize: '1rem', fontWeight: 600 }}>Simulation Parameters</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem' }}>
                    <div>
                        <label style={labelStyle}>Days</label>
                        <input type="number" min={1} max={30} value={params.days} onChange={e => updateParam('days', +e.target.value)} style={inputStyle} />
                    </div>
                    <div>
                        <label style={labelStyle}>Bin Type</label>
                        <select value={params.bin_type} onChange={e => updateParam('bin_type', e.target.value)} style={inputStyle}>
                            <option value="residential">Residential</option>
                            <option value="commercial">Commercial</option>
                            <option value="public_space">Public Space</option>
                        </select>
                    </div>
                    <div>
                        <label style={labelStyle}>Capacity (L)</label>
                        <select value={params.capacity_liters} onChange={e => updateParam('capacity_liters', +e.target.value)} style={inputStyle}>
                            {[120, 240, 360, 660, 1100].map(v => <option key={v} value={v}>{v}L</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={labelStyle}>Fill Rate ×</label>
                        <input type="number" min={0.1} max={5} step={0.1} value={params.fill_rate_multiplier} onChange={e => updateParam('fill_rate_multiplier', +e.target.value)} style={inputStyle} />
                    </div>
                    <div>
                        <label style={labelStyle}>Fixed Threshold %</label>
                        <input type="number" min={50} max={100} value={params.fixed_threshold} onChange={e => updateParam('fixed_threshold', +e.target.value)} style={inputStyle} />
                    </div>
                    {activeTab === 'compare' && (
                        <>
                            <div>
                                <label style={labelStyle}>Dynamic Base %</label>
                                <input type="number" min={40} max={95} value={params.dynamic_base} onChange={e => updateParam('dynamic_base', +e.target.value)} style={inputStyle} />
                            </div>
                            <div>
                                <label style={labelStyle}>Weekend Offset</label>
                                <input type="number" min={-30} max={0} value={params.dynamic_weekend_offset} onChange={e => updateParam('dynamic_weekend_offset', +e.target.value)} style={inputStyle} />
                            </div>
                            <div>
                                <label style={labelStyle}>Peak Offset</label>
                                <input type="number" min={-30} max={0} value={params.dynamic_peak_offset} onChange={e => updateParam('dynamic_peak_offset', +e.target.value)} style={inputStyle} />
                            </div>
                        </>
                    )}
                </div>
                <button
                    onClick={activeTab === 'simulate' ? runSimulation : runComparison}
                    disabled={loading}
                    style={{
                        marginTop: '1rem', padding: '0.5rem 2rem', borderRadius: '0.5rem', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                        background: loading ? '#374151' : 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                        color: 'white', fontWeight: 600, fontSize: '0.85rem',
                    }}
                >
                    {loading ? 'Running...' : activeTab === 'simulate' ? '▶ Run Simulation' : '▶ Compare Thresholds'}
                </button>
            </div>

            {error && (
                <div style={{ ...cardStyle, marginBottom: '1.5rem', borderColor: 'rgba(239,68,68,0.4)', color: '#fca5a5', fontSize: '0.85rem' }}>
                    ⚠️ {error}
                </div>
            )}

            {/* Simulation Results */}
            {activeTab === 'simulate' && simResult && (
                <>
                    {/* Summary Stats */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div style={cardStyle}>
                            <p style={{ color: '#9ca3af', fontSize: '0.7rem', margin: 0, textTransform: 'uppercase' }}>Collections Triggered</p>
                            <p style={{ color: '#10b981', fontSize: '1.5rem', fontWeight: 700, margin: '0.25rem 0' }}>{simResult.summary.collections_triggered}</p>
                        </div>
                        <div style={cardStyle}>
                            <p style={{ color: '#9ca3af', fontSize: '0.7rem', margin: 0, textTransform: 'uppercase' }}>Overflows</p>
                            <p style={{ color: simResult.summary.overflows > 0 ? '#ef4444' : '#10b981', fontSize: '1.5rem', fontWeight: 700, margin: '0.25rem 0' }}>{simResult.summary.overflows}</p>
                        </div>
                        <div style={cardStyle}>
                            <p style={{ color: '#9ca3af', fontSize: '0.7rem', margin: 0, textTransform: 'uppercase' }}>Avg Fill Level</p>
                            <p style={{ color: '#3b82f6', fontSize: '1.5rem', fontWeight: 700, margin: '0.25rem 0' }}>{simResult.summary.avg_fill_level}%</p>
                        </div>
                        <div style={cardStyle}>
                            <p style={{ color: '#9ca3af', fontSize: '0.7rem', margin: 0, textTransform: 'uppercase' }}>Avg / Day</p>
                            <p style={{ color: '#f59e0b', fontSize: '1.5rem', fontWeight: 700, margin: '0.25rem 0' }}>{simResult.summary.avg_collections_per_day}</p>
                        </div>
                    </div>

                    {/* Simulation Chart */}
                    <div style={cardStyle}>
                        <h3 style={{ color: 'white', margin: '0 0 1rem', fontSize: '1rem', fontWeight: 600 }}>Fill Level Over Time</h3>
                        <ResponsiveContainer width="100%" height={350}>
                            <LineChart data={downsample(simResult.timeline)}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                <XAxis
                                    dataKey="hour" tick={{ fill: '#9ca3af', fontSize: 10 }}
                                    tickFormatter={h => `${simResult.timeline[h]?.day_label || ''} ${h % 24}h`}
                                    interval={11}
                                />
                                <YAxis domain={[0, 105]} tick={{ fill: '#9ca3af', fontSize: 11 }} unit="%" />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '0.5rem', color: '#d1d5db' }}
                                    formatter={(val) => `${val}%`}
                                    labelFormatter={h => `Hour ${h}`}
                                />
                                <ReferenceLine y={params.fixed_threshold} stroke="#ef4444" strokeDasharray="5 5" label={{ value: `Threshold ${params.fixed_threshold}%`, fill: '#ef4444', fontSize: 11 }} />
                                <Line type="monotone" dataKey="fill_level" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Fill Level" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </>
            )}

            {/* Comparison Results */}
            {activeTab === 'compare' && compareResult && (
                <>
                    {/* Comparison Summary */}
                    <div style={{ ...cardStyle, marginBottom: '1.5rem', borderColor: 'rgba(16,185,129,0.3)' }}>
                        <p style={{ color: '#10b981', fontSize: '0.9rem', fontWeight: 600, margin: 0 }}>💡 {compareResult.recommendation}</p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                        {['fixed', 'dynamic'].map(strategy => {
                            const data = compareResult[strategy];
                            const isFixed = strategy === 'fixed';
                            return (
                                <div key={strategy} style={cardStyle}>
                                    <h4 style={{ color: isFixed ? '#f59e0b' : '#10b981', margin: '0 0 1rem', fontSize: '0.9rem', fontWeight: 600, textTransform: 'capitalize' }}>
                                        {strategy} Threshold
                                    </h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                        <div>
                                            <p style={{ color: '#6b7280', fontSize: '0.7rem', margin: 0 }}>Collections</p>
                                            <p style={{ color: 'white', fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>{data.collections_triggered}</p>
                                        </div>
                                        <div>
                                            <p style={{ color: '#6b7280', fontSize: '0.7rem', margin: 0 }}>Overflows</p>
                                            <p style={{ color: data.overflows > 0 ? '#ef4444' : '#10b981', fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>{data.overflows}</p>
                                        </div>
                                        <div>
                                            <p style={{ color: '#6b7280', fontSize: '0.7rem', margin: 0 }}>Efficiency</p>
                                            <p style={{ color: '#3b82f6', fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>{data.efficiency_percent}%</p>
                                        </div>
                                        <div>
                                            <p style={{ color: '#6b7280', fontSize: '0.7rem', margin: 0 }}>Avg/Day</p>
                                            <p style={{ color: '#8b5cf6', fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>{data.avg_collections_per_day}</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Side-by-Side Charts */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        {['fixed', 'dynamic'].map(strategy => {
                            const data = compareResult[strategy];
                            const isFixed = strategy === 'fixed';
                            return (
                                <div key={strategy} style={cardStyle}>
                                    <h4 style={{ color: isFixed ? '#f59e0b' : '#10b981', margin: '0 0 0.75rem', fontSize: '0.85rem', fontWeight: 600, textTransform: 'capitalize' }}>
                                        {strategy} – Fill Level Timeline
                                    </h4>
                                    <ResponsiveContainer width="100%" height={250}>
                                        <LineChart data={downsample(data.timeline)}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                            <XAxis dataKey="hour" tick={{ fill: '#9ca3af', fontSize: 9 }} interval={11} />
                                            <YAxis domain={[0, 105]} tick={{ fill: '#9ca3af', fontSize: 10 }} unit="%" />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '0.5rem', color: '#d1d5db', fontSize: '0.8rem' }}
                                            />
                                            <ReferenceLine y={params.fixed_threshold} stroke="#ef4444" strokeDasharray="5 5" />
                                            <Line type="monotone" dataKey="fill_level" stroke={isFixed ? '#f59e0b' : '#10b981'} strokeWidth={2} dot={false} name="Fill Level" />
                                            {!isFixed && <Line type="monotone" dataKey="threshold" stroke="#06b6d4" strokeWidth={1} dot={false} strokeDasharray="3 3" name="Dynamic Threshold" />}
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
};

export default Simulation;
