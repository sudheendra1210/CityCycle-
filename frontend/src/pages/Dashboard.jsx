import { useState, useEffect, useCallback, useRef } from 'react';
import {
    MdTimeline as Activity,
    MdNavigation as Navigation,
    MdAccessTime as Clock,
    MdFlashOn as Zap,
    MdChevronRight as ChevronRight,
} from 'react-icons/md';
import { useLocation } from '../contexts/LocationContext';
import { generateBins, simulateTick, generateTrendData } from '../services/binGenerator';
import { detectHotspots, generatePredictions, generateAlerts } from '../services/predictionEngine';
import { optimizeRoute } from '../services/routeOptimizer';
import BinMap from '../components/Map/BinMap';
import DashboardStats from '../components/Dashboard/DashboardStats';
import NearbyBins from '../components/Dashboard/NearbyBins';
import AlertsPanel from '../components/Dashboard/AlertsPanel';
import Charts from '../components/Dashboard/Charts';

const Dashboard = () => {
    const { coords, areaName, loading: locationLoading } = useLocation();

    const [bins, setBins] = useState([]);
    const [trendData, setTrendData] = useState([]);
    const [predictions, setPredictions] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [hotspots, setHotspots] = useState([]);
    const [route, setRoute] = useState(null);
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [showRoute, setShowRoute] = useState(false);
    const [initialized, setInitialized] = useState(false);
    const [viewMode, setViewMode] = useState('local');
    const tickRef = useRef(null);

    // Initialize bins once we have coordinates
    useEffect(() => {
        if (coords && !initialized) {
            const newBins = generateBins(coords.lat, coords.lng, 25);
            setBins(newBins);
            setTrendData(generateTrendData());
            setPredictions(generatePredictions(newBins));
            setAlerts(generateAlerts(newBins));
            setHotspots(detectHotspots(newBins));
            setInitialized(true);
        }
    }, [coords, initialized]);

    // Real-time simulation every 10 seconds
    useEffect(() => {
        if (!initialized) return;

        tickRef.current = setInterval(() => {
            setBins((prev) => {
                const updated = simulateTick(prev);
                // Derived state updates
                setPredictions(generatePredictions(updated));
                setAlerts(generateAlerts(updated));
                setHotspots(detectHotspots(updated));
                return updated;
            });
        }, 10000);

        return () => clearInterval(tickRef.current);
    }, [initialized]);

    // Handle route optimization
    const handleOptimizeRoute = useCallback(() => {
        if (!coords || bins.length === 0) return;
        setIsOptimizing(true);
        // Small artificial delay for UX
        setTimeout(() => {
            const result = optimizeRoute(bins, coords.lat, coords.lng);
            setRoute(result);
            setShowRoute(true);
            setIsOptimizing(false);
        }, 800);
    }, [bins, coords]);

    // Loading state
    if (locationLoading || !initialized) {
        return (
            <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                minHeight: '100vh', background: '#0f172a', gap: '1rem',
            }}>
                <div className="loading-spinner" />
                <p style={{ color: '#64748b', fontSize: '0.875rem', fontWeight: 500 }}>
                    Initializing smart-city monitoring...
                </p>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: '#0f172a', color: '#f1f5f9' }}>
            {/* Header */}
            <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                            <div style={{
                                padding: '0.5rem',
                                background: 'rgba(6, 182, 212, 0.15)',
                                borderRadius: '0.75rem',
                            }}>
                                <Activity style={{ width: '1.25rem', height: '1.25rem', color: '#06b6d4' }} />
                            </div>
                            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>
                                Smart Operations Center
                            </h1>
                        </div>
                        <p style={{ color: '#64748b', fontSize: '0.875rem', fontWeight: 500, margin: 0 }}>
                            Real-time intelligence for {areaName}
                        </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {/* View Toggle */}
                        <div style={{
                            display: 'flex',
                            background: 'rgba(255,255,255,0.03)',
                            padding: '0.25rem',
                            borderRadius: '0.5rem',
                            border: '1px solid rgba(255,255,255,0.06)',
                        }}>
                            <button
                                onClick={() => setViewMode('global')}
                                style={{
                                    padding: '0.375rem 0.75rem',
                                    fontSize: '0.6875rem',
                                    fontWeight: 700,
                                    borderRadius: '0.375rem',
                                    border: 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    background: viewMode === 'global' ? 'rgba(255,255,255,0.08)' : 'transparent',
                                    color: viewMode === 'global' ? '#f1f5f9' : '#64748b',
                                }}
                            >
                                Global
                            </button>
                            <button
                                onClick={() => setViewMode('local')}
                                style={{
                                    padding: '0.375rem 0.75rem',
                                    fontSize: '0.6875rem',
                                    fontWeight: 700,
                                    borderRadius: '0.375rem',
                                    border: 'none',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    background: viewMode === 'local' ? 'rgba(255,255,255,0.08)' : 'transparent',
                                    color: viewMode === 'local' ? '#f1f5f9' : '#64748b',
                                }}
                            >
                                Local
                            </button>
                        </div>

                        <button
                            onClick={handleOptimizeRoute}
                            disabled={isOptimizing}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.625rem 1.25rem',
                                borderRadius: '0.75rem',
                                fontWeight: 700,
                                fontSize: '0.8125rem',
                                border: 'none',
                                cursor: isOptimizing ? 'not-allowed' : 'pointer',
                                transition: 'all 0.3s ease',
                                background: isOptimizing
                                    ? 'rgba(255,255,255,0.05)'
                                    : 'linear-gradient(135deg, #06b6d4, #0891b2)',
                                color: isOptimizing ? '#64748b' : '#ffffff',
                                boxShadow: isOptimizing ? 'none' : '0 4px 20px rgba(6, 182, 212, 0.25)',
                            }}
                        >
                            {isOptimizing ? (
                                <Clock style={{ width: '1rem', height: '1rem', animation: 'spin 1s linear infinite' }} />
                            ) : (
                                <Zap style={{ width: '1rem', height: '1rem' }} />
                            )}
                            {isOptimizing ? 'Optimizing...' : 'Optimize Routes'}
                        </button>
                    </div>
                </div>
            </div>

            <main style={{ maxWidth: '1600px', margin: '0 auto', padding: '0 1.5rem 3rem 1.5rem' }}>
                {/* Stats Row */}
                <div style={{ marginBottom: '1.5rem' }}>
                    <DashboardStats bins={bins} />
                </div>

                {/* Main Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1.5rem' }}>
                    {/* Left Column */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {/* Map */}
                        <div style={{
                            background: 'rgba(15, 23, 42, 0.6)',
                            backdropFilter: 'blur(20px)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '1rem',
                            overflow: 'hidden',
                            height: '520px',
                            position: 'relative',
                        }}>
                            {/* Map Overlay Badges */}
                            <div style={{ position: 'absolute', top: '1rem', left: '1rem', zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <div style={{
                                    background: 'rgba(15, 23, 42, 0.8)',
                                    backdropFilter: 'blur(12px)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    borderRadius: '0.5rem',
                                    padding: '0.375rem 0.75rem',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#06b6d4', animation: 'userPulse 2s ease-in-out infinite' }} />
                                        <span style={{ fontSize: '0.625rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#e2e8f0' }}>
                                            Live: {areaName}
                                        </span>
                                    </div>
                                </div>
                                {showRoute && route && route.binCount > 0 && (
                                    <div style={{
                                        background: 'rgba(6, 182, 212, 0.1)',
                                        backdropFilter: 'blur(12px)',
                                        border: '1px solid rgba(6, 182, 212, 0.25)',
                                        borderRadius: '0.5rem',
                                        padding: '0.5rem 0.75rem',
                                        animation: 'fadeSlideIn 0.5s ease',
                                    }}>
                                        <p style={{ fontSize: '0.625rem', fontWeight: 800, color: '#06b6d4', textTransform: 'uppercase', margin: '0 0 2px 0' }}>Optimized Route</p>
                                        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f1f5f9', margin: 0 }}>
                                            {route.binCount} Bins • {route.totalDistance} km
                                        </p>
                                    </div>
                                )}
                            </div>

                            <BinMap
                                bins={bins}
                                route={showRoute ? route : null}
                                hotspots={hotspots}
                                userLat={coords?.lat}
                                userLng={coords?.lng}
                                center={coords ? [coords.lat, coords.lng] : [17.3850, 78.4867]}
                                zoom={14}
                            />
                        </div>

                        {/* Charts */}
                        <Charts trendData={trendData} areaName={viewMode === 'local' ? areaName : 'Global View'} />
                    </div>

                    {/* Right Sidebar */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {/* Nearby Bins */}
                        <NearbyBins bins={bins} userLat={coords?.lat} userLng={coords?.lng} />

                        {/* Alerts */}
                        <AlertsPanel alerts={alerts} />

                        {/* AI Predictions */}
                        <div style={{
                            background: 'rgba(15, 23, 42, 0.6)',
                            backdropFilter: 'blur(20px)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '1rem',
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                            maxHeight: '320px',
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
                                    <Zap style={{ width: '1rem', height: '1rem', color: '#06b6d4' }} />
                                    <h3 style={{ fontWeight: 700, fontSize: '0.875rem', color: '#f1f5f9', margin: 0 }}>AI Area Predictions</h3>
                                </div>
                                <Clock style={{ width: '1rem', height: '1rem', color: '#64748b' }} />
                            </div>

                            {/* Predictions List */}
                            <div style={{ overflowY: 'auto', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {predictions.length > 0 ? predictions.map((pred, i) => (
                                    <div
                                        key={pred.binId}
                                        className="stat-card-animate"
                                        style={{ padding: '0.125rem', animationDelay: `${i * 60}ms` }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                                            <span style={{ fontWeight: 700, color: '#e2e8f0' }}>{pred.binId}</span>
                                            <span style={{
                                                fontSize: '0.625rem',
                                                fontWeight: 700,
                                                color: pred.riskLevel === 'high' ? '#ef4444' : pred.riskLevel === 'medium' ? '#f59e0b' : '#64748b',
                                            }}>
                                                {pred.predictedFillLevel}% in 24h
                                            </span>
                                        </div>
                                        <div style={{
                                            height: '5px',
                                            background: 'rgba(255,255,255,0.04)',
                                            borderRadius: '3px',
                                            overflow: 'hidden',
                                            margin: '0.375rem 0',
                                        }}>
                                            <div style={{
                                                height: '100%',
                                                width: `${pred.predictedFillLevel}%`,
                                                borderRadius: '3px',
                                                transition: 'width 1s ease',
                                                background: pred.riskLevel === 'high'
                                                    ? 'linear-gradient(90deg, #ef4444, #f97316)'
                                                    : pred.riskLevel === 'medium'
                                                        ? 'linear-gradient(90deg, #f59e0b, #eab308)'
                                                        : 'linear-gradient(90deg, #06b6d4, #0ea5e9)',
                                            }} />
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.625rem' }}>
                                            <span style={{ fontWeight: 600, color: '#06b6d4' }}>
                                                Full in: <strong>~{pred.hoursUntilFull}h</strong>
                                            </span>
                                            <ChevronRight style={{ width: '0.75rem', height: '0.75rem', color: '#475569' }} />
                                        </div>
                                    </div>
                                )) : (
                                    <p style={{ fontSize: '0.75rem', color: '#64748b', textAlign: 'center', padding: '2rem 0', margin: 0 }}>
                                        Gathering prediction data...
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Dashboard;
