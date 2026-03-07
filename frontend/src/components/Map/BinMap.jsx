import { MapContainer, TileLayer, Marker, Popup, ZoomControl, Polyline, Circle, Tooltip, useMap } from 'react-leaflet';
import { useEffect, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { haversineDistance } from '../../utils/distance';

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Helper component to change map view dynamically
const ChangeView = ({ center, zoom }) => {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.setView(center, zoom);
        }
    }, [center, zoom, map]);
    return null;
};

// User location marker (blue pulsing dot)
const getUserIcon = () =>
    L.divIcon({
        className: 'user-marker',
        html: `<div style="
            width: 18px; height: 18px; border-radius: 50%;
            background: #3b82f6;
            border: 3px solid #ffffff;
            box-shadow: 0 0 0 6px rgba(59,130,246,0.25), 0 0 20px rgba(59,130,246,0.4);
            animation: userPulse 2s ease-in-out infinite;
        "></div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
    });

// Bin marker icon based on status
const getBinIcon = (fillLevel) => {
    let color, shadowColor, animClass;
    if (fillLevel > 80) {
        color = '#ef4444';
        shadowColor = 'rgba(239, 68, 68, 0.5)';
        animClass = 'marker-critical';
    } else if (fillLevel >= 50) {
        color = '#f59e0b';
        shadowColor = 'rgba(245, 158, 11, 0.3)';
        animClass = '';
    } else {
        color = '#10b981';
        shadowColor = 'rgba(16, 185, 129, 0.3)';
        animClass = '';
    }

    return L.divIcon({
        className: `bin-marker ${animClass}`,
        html: `<div style="
            width: 14px; height: 14px; border-radius: 50%;
            background: ${color};
            border: 2px solid rgba(255,255,255,0.85);
            box-shadow: 0 0 12px ${shadowColor}, 0 2px 6px rgba(0,0,0,0.3);
            transition: transform 0.3s ease;
        "></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
    });
};

// Hotspot warning icon
const getHotspotIcon = () =>
    L.divIcon({
        className: 'hotspot-marker',
        html: `<div style="
            width: 28px; height: 28px; border-radius: 50%;
            background: rgba(239, 68, 68, 0.2);
            border: 2px dashed rgba(239, 68, 68, 0.6);
            display: flex; align-items: center; justify-content: center;
            font-size: 14px; animation: hotspotPulse 1.5s ease-in-out infinite;
        ">⚠️</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
    });

const BinMap = ({
    bins = [],
    route = null,
    hotspots = [],
    userLat,
    userLng,
    center = [17.3850, 78.4867],
    zoom = 14,
}) => {
    // Build a route lookup map: binId → { distanceFromUser, routeOrder }
    const routeLookup = useMemo(() => {
        const map = new Map();
        if (route?.route) {
            route.route.forEach((p) => {
                map.set(p.binId, {
                    distanceFromUser: p.distanceFromUser,
                    routeOrder: p.routeOrder,
                });
            });
        }
        return map;
    }, [route]);

    // Route polyline positions
    const routePositions = route?.route?.map((p) => [p.lat, p.lng]) || [];
    // Prepend user position to route if available
    if (routePositions.length > 0 && userLat && userLng) {
        routePositions.unshift([userLat, userLng]);
    }

    return (
        <div style={{
            backgroundColor: '#0f172a',
            borderRadius: '0.75rem',
            height: '100%',
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.06)',
            position: 'relative',
        }}>
            <MapContainer
                center={center}
                zoom={zoom}
                zoomControl={false}
                style={{ height: '100%', width: '100%' }}
            >
                <ChangeView center={center} zoom={zoom} />
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                />
                <ZoomControl position="bottomright" />

                {/* User Location Marker */}
                {userLat && userLng && (
                    <Marker position={[userLat, userLng]} icon={getUserIcon()}>
                        <Popup>
                            <div style={{ padding: '4px', textAlign: 'center' }}>
                                <p style={{ margin: 0, fontWeight: 700, fontSize: '0.875rem', color: '#3b82f6' }}>📍 Your Location</p>
                                <p style={{ margin: '4px 0 0 0', fontSize: '0.7rem', color: '#94a3b8' }}>
                                    {userLat.toFixed(4)}, {userLng.toFixed(4)}
                                </p>
                            </div>
                        </Popup>
                    </Marker>
                )}

                {/* Hotspot Warning Zones */}
                {hotspots.map((hs) => (
                    <Circle
                        key={hs.id}
                        center={[hs.center.lat, hs.center.lng]}
                        radius={hs.radius}
                        pathOptions={{
                            color: '#ef4444',
                            fillColor: '#ef4444',
                            fillOpacity: 0.08,
                            weight: 1.5,
                            dashArray: '6, 6',
                        }}
                    />
                ))}
                {hotspots.map((hs) => (
                    <Marker key={`hs-icon-${hs.id}`} position={[hs.center.lat, hs.center.lng]} icon={getHotspotIcon()}>
                        <Popup>
                            <div style={{ padding: '4px', minWidth: '150px' }}>
                                <p style={{ margin: '0 0 4px 0', fontWeight: 800, fontSize: '0.8rem', color: '#ef4444' }}>⚠️ HIGH WASTE ZONE</p>
                                <p style={{ margin: 0, fontSize: '0.7rem', color: '#94a3b8' }}>
                                    {hs.binIds.length} critical bins | Avg fill: {hs.avgFill}%
                                </p>
                            </div>
                        </Popup>
                    </Marker>
                ))}

                {/* Route Polyline */}
                {routePositions.length > 1 && (
                    <Polyline
                        positions={routePositions}
                        pathOptions={{
                            color: '#06b6d4',
                            weight: 3.5,
                            opacity: 0.85,
                            dashArray: '10, 8',
                            lineJoin: 'round',
                            lineCap: 'round',
                        }}
                    />
                )}

                {/* Bin Markers */}
                {bins.map((bin) => {
                    // Calculate distance from user to this bin
                    const distFromUser =
                        userLat && userLng
                            ? haversineDistance(userLat, userLng, bin.lat, bin.lng)
                            : null;
                    const distLabel = distFromUser !== null ? distFromUser.toFixed(2) : null;

                    // Check if this bin is part of the optimized route
                    const routeInfo = routeLookup.get(bin.id);

                    return (
                        <Marker
                            key={bin.id}
                            position={[bin.lat, bin.lng]}
                            icon={getBinIcon(bin.fillLevel)}
                        >
                            {/* Hover tooltip showing distance */}
                            {distLabel && (
                                <Tooltip
                                    direction="top"
                                    offset={[0, -10]}
                                    className="distance-tooltip"
                                    permanent={false}
                                >
                                    <span style={{ fontWeight: 700, fontSize: '0.7rem' }}>
                                        {bin.id} — {distLabel} km
                                        {routeInfo ? ` • Route #${routeInfo.routeOrder}` : ''}
                                    </span>
                                </Tooltip>
                            )}

                            {/* Click popup with full details + distance */}
                            <Popup className="dark-popup">
                                <div style={{ minWidth: '210px', padding: '4px' }}>
                                    {/* Header */}
                                    <div style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '6px'
                                    }}>
                                        <h4 style={{ margin: 0, fontWeight: 700, fontSize: '1rem', color: '#fff' }}>{bin.id}</h4>
                                        <span style={{
                                            fontSize: '0.6rem', padding: '2px 8px', borderRadius: '99px',
                                            backgroundColor: bin.fillLevel > 80 ? 'rgba(239,68,68,0.2)' : bin.fillLevel >= 50 ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)',
                                            color: bin.fillLevel > 80 ? '#ef4444' : bin.fillLevel >= 50 ? '#f59e0b' : '#10b981',
                                            textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em'
                                        }}>
                                            {bin.status}
                                        </span>
                                    </div>

                                    {/* Details */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>Fill Level</span>
                                            <span style={{ color: bin.fillLevel > 80 ? '#ef4444' : '#10b981', fontWeight: 800, fontSize: '0.85rem' }}>
                                                {bin.fillLevel}%
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>Waste Type</span>
                                            <span style={{ color: '#e2e8f0', fontWeight: 600, fontSize: '0.75rem' }}>{bin.wasteType}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>Battery</span>
                                            <span style={{
                                                color: bin.batteryLevel < 20 ? '#ef4444' : '#10b981',
                                                fontWeight: 700, fontSize: '0.75rem'
                                            }}>
                                                {bin.batteryLevel}% 🔋
                                            </span>
                                        </div>

                                        {/* ★ Distance from user */}
                                        {distLabel && (
                                            <div style={{
                                                display: 'flex', justifyContent: 'space-between',
                                                borderTop: '1px solid rgba(6,182,212,0.15)', paddingTop: '5px', marginTop: '2px'
                                            }}>
                                                <span style={{ color: '#06b6d4', fontSize: '0.75rem', fontWeight: 600 }}>Distance from you</span>
                                                <span style={{ color: '#06b6d4', fontWeight: 800, fontSize: '0.85rem' }}>
                                                    {distLabel} km
                                                </span>
                                            </div>
                                        )}

                                        {/* ★ Route order (only shown after Optimize Routes) */}
                                        {routeInfo && (
                                            <div style={{
                                                display: 'flex', justifyContent: 'space-between',
                                                background: 'rgba(6,182,212,0.08)',
                                                borderRadius: '6px', padding: '4px 8px',
                                            }}>
                                                <span style={{ color: '#06b6d4', fontSize: '0.75rem', fontWeight: 600 }}>Route Order</span>
                                                <span style={{ color: '#06b6d4', fontWeight: 900, fontSize: '0.85rem' }}>
                                                    #{routeInfo.routeOrder}
                                                </span>
                                            </div>
                                        )}

                                        <div style={{
                                            display: 'flex', justifyContent: 'space-between',
                                            borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '4px', marginTop: '2px'
                                        }}>
                                            <span style={{ color: '#6b7280', fontSize: '0.65rem' }}>Last Collected</span>
                                            <span style={{ color: '#6b7280', fontSize: '0.65rem' }}>
                                                {new Date(bin.lastCollected).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>
        </div>
    );
};

export default BinMap;
