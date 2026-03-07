import { useMemo } from 'react';
import {
    AreaChart, Area, LineChart, Line,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { MdTrendingUp as TrendingUp } from 'react-icons/md';

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{
            background: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '0.75rem',
            padding: '0.75rem 1rem',
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
        }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', margin: '0 0 0.375rem 0' }}>{label}</p>
            {payload.map((entry, i) => (
                <p key={i} style={{ fontSize: '0.75rem', fontWeight: 600, color: entry.color, margin: '0.125rem 0' }}>
                    {entry.name}: <strong>{entry.value}</strong>
                </p>
            ))}
        </div>
    );
};

const Charts = ({ trendData, areaName }) => {
    return (
        <div style={{
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '1rem',
            padding: '1.5rem',
        }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f1f5f9', margin: 0 }}>
                    <TrendingUp style={{ width: '1rem', height: '1rem', color: '#06b6d4' }} />
                    Trends for {areaName || 'Global View'}
                </h3>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <span style={{ padding: '0.25rem 0.5rem', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '0.375rem', fontSize: '0.75rem', fontWeight: 500, color: '#64748b' }}>
                        7 Days
                    </span>
                    <span style={{ padding: '0.25rem 0.5rem', background: 'rgba(6, 182, 212, 0.1)', borderRadius: '0.375rem', fontSize: '0.75rem', fontWeight: 500, color: '#06b6d4' }}>
                        Real-time
                    </span>
                </div>
            </div>

            {/* Chart */}
            <div style={{ height: '250px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData}>
                        <defs>
                            <linearGradient id="gradientWaste" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="gradientFill" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="gradientCritical" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" />
                        <XAxis dataKey="day" stroke="#475569" fontSize={11} axisLine={false} tickLine={false} />
                        <YAxis stroke="#475569" fontSize={11} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend
                            iconType="circle"
                            iconSize={8}
                            wrapperStyle={{ fontSize: '0.7rem', color: '#94a3b8', paddingTop: '0.5rem' }}
                        />
                        <Area
                            type="monotone"
                            dataKey="wasteCollected"
                            name="Waste Collected (kg)"
                            stroke="#06b6d4"
                            strokeWidth={2.5}
                            fillOpacity={1}
                            fill="url(#gradientWaste)"
                        />
                        <Area
                            type="monotone"
                            dataKey="avgFillLevel"
                            name="Avg Fill Level (%)"
                            stroke="#8b5cf6"
                            strokeWidth={2.5}
                            fillOpacity={1}
                            fill="url(#gradientFill)"
                        />
                        <Area
                            type="monotone"
                            dataKey="criticalBins"
                            name="Critical Bins"
                            stroke="#ef4444"
                            strokeWidth={2.5}
                            fillOpacity={1}
                            fill="url(#gradientCritical)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default Charts;
