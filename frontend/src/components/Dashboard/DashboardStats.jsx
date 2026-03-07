import {
    MdTrendingUp as TrendingUp,
    MdErrorOutline as AlertCircle,
    MdDelete as Trash2,
    MdLocalShipping as Truck,
} from 'react-icons/md';

const StatCard = ({ title, value, icon: Icon, unit, color, delay = 0 }) => {
    const colorMap = {
        accent: {
            bg: 'rgba(6, 182, 212, 0.08)',
            border: 'rgba(6, 182, 212, 0.25)',
            text: '#06b6d4',
            glow: '0 0 30px rgba(6, 182, 212, 0.1)',
        },
        destructive: {
            bg: 'rgba(239, 68, 68, 0.08)',
            border: 'rgba(239, 68, 68, 0.25)',
            text: '#ef4444',
            glow: '0 0 30px rgba(239, 68, 68, 0.1)',
        },
        primary: {
            bg: 'rgba(139, 92, 246, 0.08)',
            border: 'rgba(139, 92, 246, 0.25)',
            text: '#8b5cf6',
            glow: '0 0 30px rgba(139, 92, 246, 0.1)',
        },
    };

    const c = colorMap[color] || colorMap.primary;

    return (
        <div
            className="stat-card-animate"
            style={{
                background: 'rgba(15, 23, 42, 0.6)',
                backdropFilter: 'blur(20px)',
                border: `1px solid ${c.border}`,
                borderRadius: '1rem',
                padding: '1.25rem',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                animationDelay: `${delay}ms`,
                position: 'relative',
                overflow: 'hidden',
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = c.glow;
                e.currentTarget.style.borderColor = c.text;
                e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.borderColor = c.border;
                e.currentTarget.style.transform = 'translateY(0)';
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div
                    style={{
                        padding: '0.5rem',
                        borderRadius: '0.75rem',
                        background: c.bg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <Icon style={{ width: '1.25rem', height: '1.25rem', color: c.text }} />
                </div>
                <div
                    style={{
                        height: '1.5rem',
                        width: '3rem',
                        background: 'rgba(255,255,255,0.03)',
                        borderRadius: '0.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <TrendingUp style={{ width: '0.75rem', height: '0.75rem', color: c.text }} />
                </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
                <h2 style={{ fontSize: '1.875rem', fontWeight: 900, letterSpacing: '-0.05em', color: '#f1f5f9', margin: 0 }}>
                    {value}
                </h2>
                {unit && <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>{unit}</span>}
            </div>
            <p
                style={{
                    fontSize: '0.625rem',
                    fontWeight: 900,
                    textTransform: 'uppercase',
                    color: '#64748b',
                    letterSpacing: '0.1em',
                    marginTop: '0.25rem',
                    marginBottom: 0,
                }}
            >
                {title}
            </p>
        </div>
    );
};

const DashboardStats = ({ bins }) => {
    const totalBins = bins.length;
    const avgFill = totalBins > 0 ? Math.round(bins.reduce((s, b) => s + b.fillLevel, 0) / totalBins) : 0;
    const priorityBins = bins.filter((b) => b.fillLevel > 80).length;
    const wasteToday = Math.round(bins.reduce((s, b) => s + b.fillLevel * 0.8, 0));

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
            <StatCard title="Avg Fill Level" value={`${avgFill}%`} icon={TrendingUp} color="accent" delay={0} />
            <StatCard title="Priority Bins" value={priorityBins} icon={AlertCircle} color="destructive" delay={80} />
            <StatCard title="Active Bins" value={totalBins} icon={Trash2} color="primary" delay={160} />
            <StatCard title="Total Waste Today" value={wasteToday} unit="kg" icon={Truck} color="accent" delay={240} />
        </div>
    );
};

export default DashboardStats;
