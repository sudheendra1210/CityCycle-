import { useState, useEffect, useCallback } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api.js';
import {
    MdTrendingUp as TrendingUp,
    MdErrorOutline as AlertCircle,
    MdDelete as Trash2,
    MdLocalShipping as Truck,
    MdNotifications as Bell,
    MdNavigation as Navigation,
    MdAccessTime as Clock,
    MdTimeline as Activity,
    MdFlashOn as Zap,
    MdChevronRight as ChevronRight,
    MdFilterList as Filter
} from 'react-icons/md';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { analyticsService } from '../services/analyticsService';
import { predictionsService } from '../services/predictionsService';
import { binsService } from '../services/binsService';
import BinMap from '../components/Map/BinMap';
import { useLocation } from '../contexts/LocationContext';

const Dashboard = () => {
    const { coords, areaName, loading: locationLoading } = useLocation();

    // Use Convex for real-time bin data
    const liveBins = useQuery(api.bins.getWithReadings) || [];

    const [stats, setStats] = useState({
        total_bins: 0,
        bins_needing_collection: 0,
        waste_collected_today_kg: 0,
        active_complaints: 0,
        average_fill_level: 0
    });
    const [nearbyBins, setNearbyBins] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [predictions, setPredictions] = useState([]);
    const [trends, setTrends] = useState([]);
    const [optimizedRoute, setOptimizedRoute] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [showRoute, setShowRoute] = useState(false);
    const [viewMode, setViewMode] = useState('local');

    // Filter liveBins based on area and viewMode
    const mapBins = liveBins.filter(bin => {
        if (viewMode === 'global' || areaName === 'Global View') return true;
        return bin.area_name === areaName;
    });

    const fetchDashboardData = useCallback(async () => {
        try {
            setLoading(true);
            const filterArea = viewMode === 'local' && areaName !== 'Global View' ? areaName : null;

            // mapBins is now handled by Convex useQuery
            const [statsData, trendsData, alertsData, predictionsData] = await Promise.all([
                analyticsService.getDashboardStats(filterArea),
                analyticsService.getFillLevelTrends(filterArea),
                analyticsService.getAlerts(filterArea),
                predictionsService.getBinPredictions(filterArea)
            ]);

            setStats(statsData);
            setTrends(trendsData);
            setAlerts(alertsData);
            setPredictions(predictionsData);

            if (coords) {
                const nearby = await binsService.getNearbyBins(coords.lat, coords.lng);
                setNearbyBins(nearby);
            }
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    }, [coords, areaName, viewMode]);

    useEffect(() => {
        if (!locationLoading) {
            fetchDashboardData();
        }
    }, [fetchDashboardData, locationLoading]);


    const handleOptimizeRoute = async () => {
        setIsOptimizing(true);
        try {
            const route = await predictionsService.optimizeRoute('V-001', 80);
            setOptimizedRoute(route);
            setShowRoute(true);
        } catch (error) {
            console.error('Optimization failed:', error);
        } finally {
            setIsOptimizing(false);
        }
    };

    if (loading && !stats.total_bins) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <div className="w-10 h-10 border-2 border-muted border-t-accent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground">
            {/* Header */}
            <div className="max-w-[1600px] mx-auto px-6 py-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <div className="p-2 bg-accent/20 rounded-lg">
                                <Activity className="w-5 h-5 text-accent" />
                            </div>
                            <h1 className="text-3xl font-bold tracking-tight">Smart Operations Center</h1>
                        </div>
                        <p className="text-muted-foreground text-sm font-medium">
                            Real-time intelligence for {areaName}
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={fetchDashboardData}
                            className="bg-card hover:bg-muted/50 border border-border p-2.5 rounded-lg transition-colors"
                        >
                            <Clock className="w-5 h-5 text-muted-foreground" />
                        </button>
                        <button
                            onClick={handleOptimizeRoute}
                            disabled={isOptimizing}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-bold text-sm transition-all shadow-lg shadow-accent/10 ${isOptimizing
                                ? 'bg-muted text-muted-foreground cursor-not-allowed'
                                : 'bg-accent text-white hover:bg-accent/90'
                                } `}
                        >
                            {isOptimizing ? <Clock className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                            {isOptimizing ? 'Optimizing...' : 'Optimize Routes'}
                        </button>
                    </div>
                </div>
            </div>

            <main className="max-w-[1600px] mx-auto px-6 pb-12">
                {/* Real-time Stats Row */}
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        {viewMode === 'local' ? (
                            <><Navigation className="w-4 h-4 text-accent" /> Personalized: {areaName}</>
                        ) : (
                            <><Activity className="w-4 h-4" /> Global Network Overview</>
                        )}
                    </h2>
                    <div className="flex bg-muted/20 p-1 rounded-lg border border-border">
                        <button
                            onClick={() => setViewMode('global')}
                            className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${viewMode === 'global' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'} `}
                        >
                            Global
                        </button>
                        <button
                            disabled={!coords}
                            onClick={() => setViewMode('local')}
                            className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${viewMode === 'local' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground disabled:opacity-50'} `}
                        >
                            Local
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <StatCard
                        title="Avg Fill Level"
                        value={`${stats.average_fill_level}% `}
                        icon={Activity}
                        color="accent"
                    />
                    <StatCard
                        title="Priority Bins"
                        value={stats.bins_needing_collection}
                        icon={AlertCircle}
                        color="destructive"
                    />
                    <StatCard
                        title="Active Bins"
                        value={stats.total_bins}
                        icon={Trash2}
                        color="primary"
                    />
                    <StatCard
                        title="Waste Impact"
                        value={stats.waste_collected_today_kg}
                        unit="kg today"
                        icon={Truck}
                        color="accent"
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Main Content Area - Left (8/12) */}
                    <div className="lg:col-span-8 flex flex-col gap-6">
                        {/* Map Component */}
                        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm flex-grow h-[550px] relative">
                            <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
                                <div className="bg-card/80 backdrop-blur-md border border-border rounded-lg p-2 shadow-xl">
                                    <div className="flex items-center gap-2 px-2 py-1">
                                        <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                                        <span className="text-[10px] font-bold uppercase tracking-widest">Live: {areaName}</span>
                                    </div>
                                </div>
                                {showRoute && optimizedRoute && (
                                    <div className="bg-accent/10 backdrop-blur-md border border-accent/30 rounded-lg p-3 shadow-xl animate-in fade-in slide-in-from-left-4 duration-500">
                                        <p className="text-[10px] font-bold text-accent uppercase mb-1">Optimized Sequence</p>
                                        <p className="text-xs font-bold text-foreground">{optimizedRoute.bins_to_collect.length} Bins • {optimizedRoute.total_distance_km}km</p>
                                    </div>
                                )}
                            </div>
                            <BinMap
                                bins={mapBins}
                                route={showRoute ? optimizedRoute : null}
                                zoom={viewMode === 'local' && coords ? 14 : 13}
                                center={viewMode === 'local' && coords ? [coords.lat, coords.lng] : undefined}
                            />
                        </div>

                        {/* Recent Trends Chart */}
                        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-accent" />
                                    {viewMode === 'local' ? `Trends for ${areaName}` : 'Global Load Trends'}
                                </h3>
                                <div className="flex gap-2">
                                    <span className="px-2 py-1 bg-muted/30 rounded text-xs font-medium text-muted-foreground">7 Days</span>
                                    <span className="px-2 py-1 bg-accent/10 rounded text-xs font-medium text-accent">Real-time</span>
                                </div>
                            </div>
                            <div className="h-[250px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={trends.length > 0 ? trends : DUMMY_TREND_DATA}>
                                        <defs>
                                            <linearGradient id="colorLevel" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.2} />
                                                <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                        <XAxis dataKey="date" stroke="#6b7280" fontSize={10} axisLine={false} tickLine={false} />
                                        <YAxis stroke="#6b7280" fontSize={10} axisLine={false} tickLine={false} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '12px', fontSize: '12px' }}
                                            itemStyle={{ color: '#06b6d4' }}
                                        />
                                        <Area type="monotone" dataKey="avg_fill_level" stroke="#06b6d4" strokeWidth={3} fillOpacity={1} fill="url(#colorLevel)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar Area - Right (4/12) */}
                    <div className="lg:col-span-4 flex flex-col gap-6">
                        {/* Nearby Bins Panel */}
                        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm flex flex-col">
                            <div className="p-4 border-b border-border bg-muted/5 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Navigation className="w-4 h-4 text-accent" />
                                    <h3 className="font-bold text-sm">Nearby Bins</h3>
                                </div>
                                <span className="bg-accent/10 text-accent text-[10px] font-black px-1.5 py-0.5 rounded uppercase">
                                    {coords ? `${nearbyBins.length} in area` : 'Required'}
                                </span>
                            </div>
                            <div className="overflow-y-auto p-4 flex flex-col gap-3 custom-scrollbar max-h-[300px]">
                                {coords ? (
                                    nearbyBins.length > 0 ? nearbyBins.map(bin => (
                                        <div key={bin.bin_id} className={`p - 3 border rounded - xl transition - all cursor - pointer group ${bin.fill_level > 80 ? 'bg-destructive/5 border-destructive/20' : 'bg-muted/20 border-border/50 hover:bg-muted/30'} `}>
                                            <div className="flex justify-between items-start mb-1">
                                                <span className={`text-[10px] font-black uppercase tracking-widest ${bin.fill_level > 80 ? 'text-destructive' : 'text-accent'} `}>
                                                    {bin.status}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground font-bold">{bin.distance_km} km</span>
                                            </div>
                                            <p className="text-xs font-bold mb-1 group-hover:text-accent transition-colors">{bin.bin_id}</p>
                                            <div className="flex items-center justify-between">
                                                <div className="flex-grow mr-4">
                                                    <div className="h-1 bg-muted/30 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full transition-all duration-1000 ${bin.fill_level > 80 ? 'bg-destructive' : 'bg-accent'} `}
                                                            style={{ width: `${bin.fill_level}% ` }}
                                                        />
                                                    </div>
                                                </div>
                                                <span className="text-[10px] font-bold text-muted-foreground whitespace-nowrap">{Math.round(bin.fill_level)}% Full</span>
                                            </div>
                                            {bin.fill_level > 80 && (
                                                <div className="mt-2 pt-2 border-t border-destructive/10">
                                                    <p className="text-[9px] text-destructive/70 font-bold uppercase flex items-center gap-1">
                                                        <Zap className="w-2.5 h-2.5" /> Suggestion: Move to {nearbyBins.find(b => b.fill_level < 40)?.bin_id || 'nearby unit'}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )) : (
                                        <p className="text-xs text-muted-foreground text-center py-8">No bins found in your area</p>
                                    )
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-8 text-center">
                                        <Navigation className="w-8 h-8 text-muted-foreground/30 mb-2" />
                                        <p className="text-xs text-muted-foreground">Location access required</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Alerts Panel */}
                        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm flex flex-col max-h-[300px]">
                            <div className="p-4 border-b border-border bg-muted/5 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Bell className="w-4 h-4 text-destructive" />
                                    <h3 className="font-bold text-sm">Critical Alerts</h3>
                                </div>
                                <span className="bg-destructive/10 text-destructive text-[10px] font-black px-1.5 py-0.5 rounded uppercase">
                                    {alerts.length} New
                                </span>
                            </div>
                            <div className="overflow-y-auto p-4 flex flex-col gap-3 custom-scrollbar">
                                {alerts.length > 0 ? alerts.map(alert => (
                                    <div key={alert.id} className="p-3 bg-muted/20 border border-border/50 rounded-xl hover:bg-muted/30 transition-colors cursor-pointer group">
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="text-[10px] font-black uppercase text-destructive tracking-widest">{alert.severity}</span>
                                            <span className="text-[10px] text-muted-foreground">{new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        <p className="text-xs font-bold mb-1 group-hover:text-accent transition-colors">{alert.bin_id}: {alert.message}</p>
                                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                            <Navigation className="w-3 h-3" />
                                            <span>Immediate Action</span>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="flex flex-col items-center justify-center py-8 text-center">
                                        <div className="p-3 bg-muted/20 rounded-full mb-3">
                                            <Zap className="w-6 h-6 text-muted-foreground/30" />
                                        </div>
                                        <p className="text-sm text-muted-foreground font-medium">Clear sky: no alerts</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ML Overflow Predictions */}
                        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm flex flex-col flex-grow">
                            <div className="p-4 border-b border-border bg-muted/5 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Zap className="w-4 h-4 text-accent" />
                                    <h3 className="font-bold text-sm">AI Area Predictions</h3>
                                </div>
                                <Clock className="w-4 h-4 text-muted-foreground" />
                            </div>
                            <div className="overflow-y-auto p-4 flex flex-col gap-4 custom-scrollbar max-h-[300px]">
                                {predictions.length > 0 ? predictions.map(pred => (
                                    <div key={pred.bin_id} className="flex flex-col gap-2 p-1">
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="font-bold">{pred.bin_id}</span>
                                            <span className="text-muted-foreground text-[10px]">{Math.round(pred.predicted_fill_level)}% In 24h</span>
                                        </div>
                                        <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-accent transition-all duration-1000"
                                                style={{ width: `${pred.predicted_fill_level}% ` }}
                                            />
                                        </div>
                                        <div className="flex justify-between items-center text-[10px]">
                                            <span className="font-medium text-accent tracking-tight">
                                                Full in: <span className="font-bold">~{Math.round(pred.hours_until_full)} Hours</span>
                                            </span>
                                            <ChevronRight className="w-3 h-3 text-muted-foreground" />
                                        </div>
                                    </div>
                                )) : (
                                    <p className="text-xs text-muted-foreground text-center py-8">Insufficient localized data</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

// Sub-components
const StatCard = ({ title, value, icon: Icon, unit, color }) => {
    const colorMap = {
        accent: 'bg-accent/10 text-accent',
        destructive: 'bg-destructive/10 text-destructive',
        primary: 'bg-primary/10 text-foreground',
    };

    return (
        <div className="bg-card border border-border rounded-2xl p-5 hover:border-accent/40 transition-all group group-hover:shadow-lg">
            <div className="flex justify-baseline items-start mb-4">
                <div className={`p-2 rounded-xl ${colorMap[color] || colorMap.primary} `}>
                    <Icon className="w-5 h-5" />
                </div>
                <div className="ml-auto h-6 w-12 bg-muted/20 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-3 h-3 text-accent" />
                </div>
            </div>
            <div className="flex items-baseline gap-1">
                <h2 className="text-3xl font-black tracking-tighter">{value}</h2>
                {unit && <span className="text-sm font-bold text-muted-foreground">{unit}</span>}
            </div>
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mt-1">{title}</p>
        </div>
    );
};

const DUMMY_TREND_DATA = [
    { date: 'Mon', avg_fill_level: 32 },
    { date: 'Tue', avg_fill_level: 45 },
    { date: 'Wed', avg_fill_level: 68 },
    { date: 'Thu', avg_fill_level: 52 },
    { date: 'Fri', avg_fill_level: 75 },
    { date: 'Sat', avg_fill_level: 88 },
    { date: 'Sun', avg_fill_level: 62 },
];

export default Dashboard;
