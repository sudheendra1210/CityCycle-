import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api.js';
import { MdLocationOn as MapPin, MdFilterList as Filter, MdAddCircle } from 'react-icons/md';
import BinMap from '../components/Map/BinMap';
import { binsService } from '../services/binsService';

const Bins = () => {
    // Use Convex for real-time bin data
    const binsQuery = useQuery(api.bins.getWithReadings);
    const isLoading = binsQuery === undefined;
    const bins = binsQuery ?? [];

    const [filteredBins, setFilteredBins] = useState([]);
    const [seeding, setSeeding] = useState(false);
    const [viewMode, setViewMode] = useState('map'); // 'map' or 'list'
    const [filters, setFilters] = useState({
        zone: 'all',
        type: 'all',
        fillLevel: 'all',
    });

    useEffect(() => {
        applyFilters();
    }, [bins, filters]);

    const fetchBins = () => {
        // No longer needed, as useQuery handles it
    };

    // Get user location, with fallback
    const getUserLocation = () => {
        return new Promise((resolve) => {
            if (!navigator.geolocation) {
                resolve({ lat: 17.385, lng: 78.4867 }); // Hyderabad fallback
                return;
            }
            navigator.geolocation.getCurrentPosition(
                (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                () => resolve({ lat: 17.385, lng: 78.4867 }), // Fallback on error
                { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
            );
        });
    };

    const seedTestBins = async () => {
        try {
            setSeeding(true);
            const loc = await getUserLocation();
            console.log('Seeding bins near:', loc);
            await binsService.seedNearby(loc.lat, loc.lng, 10, 2.0);
            await fetchBins();
        } catch (error) {
            console.error('Error seeding bins:', error);
        } finally {
            setSeeding(false);
        }
    };

    const applyFilters = () => {
        let filtered = [...bins];

        if (filters.zone !== 'all') {
            filtered = filtered.filter(bin => bin.zone === filters.zone);
        }

        if (filters.type !== 'all') {
            filtered = filtered.filter(bin => bin.bin_type === filters.type);
        }

        if (filters.fillLevel !== 'all') {
            if (filters.fillLevel === 'high') {
                filtered = filtered.filter(bin => (bin.current_fill_level || 0) >= 80);
            } else if (filters.fillLevel === 'medium') {
                filtered = filtered.filter(bin => (bin.current_fill_level || 0) >= 40 && (bin.current_fill_level || 0) < 80);
            } else if (filters.fillLevel === 'low') {
                filtered = filtered.filter(bin => (bin.current_fill_level || 0) < 40);
            }
        }

        setFilteredBins(filtered);
    };

    const getFillLevelColor = (level) => {
        if (level >= 80) return '#ef4444'; // Red
        if (level >= 60) return '#f59e0b'; // Amber
        if (level >= 40) return '#8b5cf6'; // Purple
        return '#10b981'; // Green
    };

    const selectStyle = {
        backgroundColor: '#374151',
        color: 'white',
        borderRadius: '0.5rem',
        padding: '0.5rem 0.75rem',
        border: '1px solid #4b5563',
        outline: 'none',
        cursor: 'pointer',
        fontSize: '0.875rem',
    };

    if (isLoading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
                <div style={{
                    width: '48px',
                    height: '48px',
                    border: '3px solid #374151',
                    borderTopColor: '#8b5cf6',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                }} />
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#111827', padding: '1.5rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'between', marginBottom: '1.5rem' }}>
                <div>
                    <h2 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: 'white', margin: 0 }}>Waste Bins</h2>
                    <p style={{ fontSize: '0.875rem', color: '#9ca3af', margin: '0.25rem 0 0 0' }}>Monitor and manage all waste collection bins</p>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto' }}>
                    <button
                        onClick={() => setViewMode('map')}
                        style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '0.5rem',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            transition: 'all 0.2s ease',
                            backgroundColor: viewMode === 'map' ? '#7c3aed' : '#1f2937',
                            color: 'white',
                        }}
                    >
                        Map View
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '0.5rem',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            transition: 'all 0.2s ease',
                            backgroundColor: viewMode === 'list' ? '#7c3aed' : '#1f2937',
                            color: 'white',
                        }}
                    >
                        List View
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div style={{ backgroundColor: '#1f2937', borderRadius: '0.5rem', padding: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Filter size={20} color="#9ca3af" />
                        <span style={{ fontSize: '0.875rem', color: '#9ca3af' }}>Filters:</span>
                    </div>

                    <select
                        value={filters.zone}
                        onChange={(e) => setFilters({ ...filters, zone: e.target.value })}
                        style={selectStyle}
                    >
                        <option value="all">All Zones</option>
                        <option value="North">North</option>
                        <option value="South">South</option>
                        <option value="East">East</option>
                        <option value="West">West</option>
                    </select>

                    <select
                        value={filters.type}
                        onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                        style={selectStyle}
                    >
                        <option value="all">All Types</option>
                        <option value="residential">Residential</option>
                        <option value="commercial">Commercial</option>
                        <option value="public_space">Public Space</option>
                    </select>

                    <select
                        value={filters.fillLevel}
                        onChange={(e) => setFilters({ ...filters, fillLevel: e.target.value })}
                        style={selectStyle}
                    >
                        <option value="all">All Fill Levels</option>
                        <option value="high">High (≥80%)</option>
                        <option value="medium">Medium (40-79%)</option>
                        <option value="low">Low (&lt;40%)</option>
                    </select>

                    <span style={{ fontSize: '0.875rem', color: '#6b7280', marginLeft: 'auto' }}>
                        Showing {filteredBins.length} of {bins.length} bins
                    </span>
                </div>
            </div>

            {/* Empty State - Generate Bins */}
            {bins.length === 0 ? (
                <div style={{
                    backgroundColor: '#1f2937',
                    borderRadius: '0.75rem',
                    padding: '3rem',
                    textAlign: 'center',
                    border: '1px solid rgba(75, 85, 99, 0.3)',
                }}>
                    <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🗑️</div>
                    <h3 style={{ color: 'white', fontSize: '1.5rem', margin: '0 0 0.5rem 0' }}>No Bins Found</h3>
                    <p style={{ color: '#9ca3af', margin: '0 0 1.5rem 0' }}>
                        Generate test bins within 2km of your current location
                    </p>
                    <button
                        onClick={seedTestBins}
                        disabled={seeding}
                        style={{
                            backgroundColor: '#7c3aed',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.75rem',
                            padding: '0.85rem 2rem',
                            fontSize: '1rem',
                            fontWeight: 600,
                            cursor: seeding ? 'not-allowed' : 'pointer',
                            opacity: seeding ? 0.7 : 1,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            transition: 'all 0.2s ease',
                        }}
                    >
                        {seeding ? (
                            <>⏳ Generating...</>
                        ) : (
                            <><MdAddCircle size={20} /> Generate 10 Test Bins Near Me</>
                        )}
                    </button>
                    <p style={{ color: '#6b7280', fontSize: '0.75rem', margin: '1rem 0 0 0' }}>
                        Your browser will ask for location permission
                    </p>
                </div>
            ) : null}

            {/* Content */}
            {bins.length > 0 && viewMode === 'map' ? (
                <div style={{
                    backgroundColor: '#1f2937',
                    borderRadius: '0.75rem',
                    height: '550px',
                    border: '1px solid rgba(75, 85, 99, 0.3)',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <BinMap bins={filteredBins.map(bin => ({
                        ...bin,
                        fill_level: bin.current_fill_level || 0
                    }))} />

                    {/* Minimal Legend */}
                    <div style={{
                        position: 'absolute',
                        bottom: '20px',
                        left: '20px',
                        backgroundColor: 'rgba(17, 24, 39, 0.8)',
                        backdropFilter: 'blur(8px)',
                        padding: '10px 14px',
                        borderRadius: '0.75rem',
                        border: '1px solid rgba(75, 85, 99, 0.3)',
                        zIndex: 1000,
                        display: 'flex',
                        gap: '15px',
                        alignItems: 'center'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444' }}></div>
                            <span style={{ fontSize: '0.7rem', color: '#9ca3af', fontWeight: 600 }}>Critical</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f59e0b' }}></div>
                            <span style={{ fontSize: '0.7rem', color: '#9ca3af', fontWeight: 600 }}>Warning</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#8b5cf6' }}></div>
                            <span style={{ fontSize: '0.7rem', color: '#9ca3af', fontWeight: 600 }}>Moderate</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }}></div>
                            <span style={{ fontSize: '0.7rem', color: '#9ca3af', fontWeight: 600 }}>Normal</span>
                        </div>
                    </div>
                </div>
            ) : bins.length > 0 && viewMode === 'list' ? (
                <div style={{ backgroundColor: '#1f2937', borderRadius: '0.5rem', padding: '1.5rem', overflow: 'hidden' }}>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid #374151' }}>
                                    <th style={{ textAlign: 'left', padding: '1rem', fontSize: '0.875rem', fontWeight: 600, color: '#9ca3af' }}>Bin ID</th>
                                    <th style={{ textAlign: 'left', padding: '1rem', fontSize: '0.875rem', fontWeight: 600, color: '#9ca3af' }}>Type</th>
                                    <th style={{ textAlign: 'left', padding: '1rem', fontSize: '0.875rem', fontWeight: 600, color: '#9ca3af' }}>Zone</th>
                                    <th style={{ textAlign: 'left', padding: '1rem', fontSize: '0.875rem', fontWeight: 600, color: '#9ca3af' }}>Capacity</th>
                                    <th style={{ textAlign: 'left', padding: '1rem', fontSize: '0.875rem', fontWeight: 600, color: '#9ca3af' }}>Fill Level</th>
                                    <th style={{ textAlign: 'left', padding: '1rem', fontSize: '0.875rem', fontWeight: 600, color: '#9ca3af' }}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredBins.map((bin) => (
                                    <tr key={bin.bin_id} style={{ borderBottom: '1px solid #1f2937', transition: 'background-color 0.2s ease' }}>
                                        <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#e5e7eb', fontWeight: 500 }}>{bin.bin_id}</td>
                                        <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#9ca3af', textTransform: 'capitalize' }}>{bin.bin_type.replace('_', ' ')}</td>
                                        <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#9ca3af' }}>{bin.zone}</td>
                                        <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#9ca3af' }}>{bin.capacity_liters}L</td>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <div style={{ width: '100px', height: '8px', backgroundColor: '#374151', borderRadius: '9999px', overflow: 'hidden' }}>
                                                    <div
                                                        style={{
                                                            height: '100%',
                                                            backgroundColor: getFillLevelColor(bin.current_fill_level || 0),
                                                            width: `${bin.current_fill_level || 0}%`
                                                        }}
                                                    ></div>
                                                </div>
                                                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: getFillLevelColor(bin.current_fill_level || 0) }}>
                                                    {bin.current_fill_level || 0}%
                                                </span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <span style={{
                                                fontSize: '0.75rem',
                                                fontWeight: 500,
                                                padding: '0.25rem 0.5rem',
                                                borderRadius: '0.25rem',
                                                backgroundColor: bin.status === 'active' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                                                color: bin.status === 'active' ? '#10b981' : '#f59e0b',
                                                textTransform: 'capitalize'
                                            }}>
                                                {bin.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : null}
        </div>
    );
};

export default Bins;
