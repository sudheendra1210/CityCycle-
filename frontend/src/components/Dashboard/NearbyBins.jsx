import { useMemo } from 'react';
import { haversineDistance } from '../../utils/distance';
import {
    MdNavigation as Navigation,
    MdFlashOn as Zap,
} from 'react-icons/md';

const NearbyBins = ({ bins, userLat, userLng }) => {
    const nearby = useMemo(() => {
        if (!userLat || !userLng || bins.length === 0) return [];
        return bins
            .map((bin) => ({
                ...bin,
                distance: haversineDistance(userLat, userLng, bin.lat, bin.lng),
            }))
            .sort((a, b) => a.distance - b.distance)
            .slice(0, 5);
    }, [bins, userLat, userLng]);

    const getStatusColor = (fill) => {
        if (fill > 80) return '#ef4444';
        if (fill >= 50) return '#f59e0b';
        return '#10b981';
    };

    return (
        <div style={{
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '1rem',
            overflow: 'hidden',
        }}>
            {/* Header */}
            <div style={{
                padding: '0.875rem 1rem',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Navigation style={{ width: '1rem', height: '1rem', color: '#06b6d4' }} />
                    <h3 style={{ fontWeight: 700, fontSize: '0.875rem', color: '#f1f5f9', margin: 0 }}>Nearby Bins</h3>
                </div>
                <span style={{
                    background: 'rgba(6, 182, 212, 0.1)',
                    color: '#06b6d4',
                    fontSize: '0.625rem',
                    fontWeight: 900,
                    padding: '0.15rem 0.5rem',
                    borderRadius: '0.25rem',
                    textTransform: 'uppercase',
                }}>
                    {nearby.length} found
                </span>
            </div>

            {/* List */}
            <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '280px', overflowY: 'auto' }}>
                {nearby.length > 0 ? nearby.map((bin, i) => (
                    <div
                        key={bin.id}
                        className="stat-card-animate"
                        style={{
                            padding: '0.75rem',
                            background: bin.fillLevel > 80 ? 'rgba(239, 68, 68, 0.06)' : 'rgba(255,255,255,0.02)',
                            border: `1px solid ${bin.fillLevel > 80 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255,255,255,0.05)'}`,
                            borderRadius: '0.75rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            animationDelay: `${i * 60}ms`,
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = bin.fillLevel > 80 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255,255,255,0.05)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = bin.fillLevel > 80 ? 'rgba(239, 68, 68, 0.06)' : 'rgba(255,255,255,0.02)';
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
                            <span style={{
                                fontSize: '0.625rem',
                                fontWeight: 900,
                                textTransform: 'uppercase',
                                letterSpacing: '0.1em',
                                color: getStatusColor(bin.fillLevel),
                            }}>
                                {bin.status}
                            </span>
                            <span style={{ fontSize: '0.625rem', fontWeight: 700, color: '#64748b' }}>
                                {bin.distance.toFixed(2)} km
                            </span>
                        </div>
                        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#e2e8f0', margin: '0 0 0.375rem 0' }}>{bin.id}</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                                <div
                                    style={{
                                        height: '100%',
                                        width: `${bin.fillLevel}%`,
                                        background: getStatusColor(bin.fillLevel),
                                        borderRadius: '2px',
                                        transition: 'width 1s ease',
                                    }}
                                />
                            </div>
                            <span style={{ fontSize: '0.625rem', fontWeight: 700, color: '#94a3b8', whiteSpace: 'nowrap' }}>
                                {bin.fillLevel}%
                            </span>
                        </div>
                        {bin.fillLevel > 80 && (
                            <div style={{ marginTop: '0.375rem', paddingTop: '0.375rem', borderTop: '1px solid rgba(239,68,68,0.1)' }}>
                                <p style={{ fontSize: '0.5625rem', color: 'rgba(239,68,68,0.7)', fontWeight: 700, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.25rem', margin: 0 }}>
                                    <Zap style={{ width: '0.625rem', height: '0.625rem' }} /> Immediate collection needed
                                </p>
                            </div>
                        )}
                    </div>
                )) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
                        <Navigation style={{ width: '2rem', height: '2rem', color: 'rgba(100,116,139,0.3)', marginBottom: '0.5rem' }} />
                        <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>Waiting for location...</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NearbyBins;
