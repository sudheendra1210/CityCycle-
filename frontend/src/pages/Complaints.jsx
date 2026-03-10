import { useState, useMemo, useRef } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api.js';
import {
    MdLocationOn as MapPin,
    MdSend as Send,
    MdMap as MapIcon,
    MdClose as Close,
    MdError as ErrorIcon,
} from 'react-icons/md';
import { complaintsService } from '../services/complaintsService';
import { useLocation } from '../contexts/LocationContext';
import BinMap from '../components/Map/BinMap';

const Complaints = () => {
    const { coords, areaName, loading: locationLoading, permissionStatus } = useLocation();

    // Use Convex for real-time complaints data
    const allComplaints = useQuery(api.complaints.get, {
        status: undefined
    }) || [];

    // Use Convex for real-time bins data (for dropdown + validation)
    const allBins = useQuery(api.bins.getWithReadings) || [];

    // Sort bins by bin_id for consistent dropdown order
    const sortedBins = useMemo(() => {
        return [...allBins].sort((a, b) => a.bin_id.localeCompare(b.bin_id, undefined, { numeric: true }));
    }, [allBins]);

    const createComplaint = useMutation(api.complaints.create);

    // Filter complaints based on areaName
    const complaints = allComplaints.filter(c => {
        if (areaName === 'Global View') return true;
        return c.area_name === areaName;
    });

    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [formData, setFormData] = useState({
        complaint_type: 'overflowing_bin',
        description: '',
        urgency: 'medium',
        bin_id: '',
    });

    // Map highlighting state
    const [highlightedComplaint, setHighlightedComplaint] = useState(null);
    const mapRef = useRef(null);

    // Compute bin ID validity (selected from dropdown, so always valid if non-empty)
    const binIdValid = useMemo(() => {
        if (!formData.bin_id) return null;
        return allBins.some(b => b.bin_id === formData.bin_id);
    }, [formData.bin_id, allBins]);

    // Find the highlighted bin object for the map
    const highlightedBin = useMemo(() => {
        if (!highlightedComplaint?.bin_id) return null;
        return allBins.find(b => b.bin_id === highlightedComplaint.bin_id) || null;
    }, [highlightedComplaint, allBins]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitError('');

        if (!coords) {
            alert("Location access is required to submit a complaint. Please enable location permissions.");
            return;
        }

        // Validate bin_id if provided
        if (formData.bin_id && !binIdValid) {
            setSubmitError(`Bin ID "${formData.bin_id}" does not exist. Please select a valid bin.`);
            return;
        }

        try {
            setSubmitting(true);
            const submissionData = {
                complaint_id: `CMP-${Math.floor(Math.random() * 10000)}`,
                complaint_type: formData.complaint_type,
                latitude: coords.lat,
                longitude: coords.lng,
                area_name: areaName,
                description: formData.description,
                urgency: formData.urgency,
                ...(formData.bin_id ? { bin_id: formData.bin_id } : {}),
            };

            await createComplaint(submissionData);
            setShowForm(false);
            setFormData({
                complaint_type: 'overflowing_bin',
                description: '',
                urgency: 'medium',
                bin_id: '',
            });

        } catch (error) {
            console.error('Error creating complaint:', error);
            setSubmitError(error.message || 'Failed to submit complaint.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleViewOnMap = (complaint) => {
        if (highlightedComplaint?.complaint_id === complaint.complaint_id) {
            setHighlightedComplaint(null); // Toggle off
        } else {
            setHighlightedComplaint(complaint);
            // Scroll to the map
            setTimeout(() => {
                mapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            open: '#ef4444',
            in_progress: '#f59e0b',
            resolved: '#10b981',
            closed: '#3b82f6',
        };
        return colors[status] || '#3b82f6';
    };

    const getUrgencyColor = (urgency) => {
        const colors = {
            high: '#ef4444',
            medium: '#f59e0b',
            low: '#3b82f6',
        };
        return colors[urgency] || '#3b82f6';
    };

    const badgeStyle = (color) => ({
        fontSize: '0.75rem',
        fontWeight: 500,
        padding: '0.25rem 0.5rem',
        borderRadius: '0.25rem',
        backgroundColor: `${color}33`,
        color: color,
        textTransform: 'capitalize',
        display: 'inline-block',
    });

    const inputStyle = {
        width: '100%',
        backgroundColor: '#374151',
        color: 'white',
        borderRadius: '0.5rem',
        padding: '0.625rem 0.75rem',
        border: '1px solid #4b5563',
        outline: 'none',
        fontSize: '0.875rem',
        boxSizing: 'border-box',
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#111827', padding: '1.5rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'between', marginBottom: '1.5rem' }}>
                <div>
                    <h2 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: 'white', margin: 0 }}>Citizen Complaints</h2>
                    <p style={{ fontSize: '0.875rem', color: '#9ca3af', margin: '0.25rem 0 0 0' }}>Submit and track waste management complaints</p>
                </div>

                <button
                    onClick={() => setShowForm(!showForm)}
                    style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '0.5rem',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        transition: 'all 0.2s ease',
                        backgroundColor: showForm ? '#4b5563' : '#7c3aed',
                        color: 'white',
                        marginLeft: 'auto',
                    }}
                >
                    {showForm ? 'Cancel' : 'New Complaint'}
                </button>
            </div>

            {/* Complaint Form */}
            {showForm && (
                <div style={{ backgroundColor: '#1f2937', borderRadius: '0.5rem', padding: '1.5rem', marginBottom: '1.5rem', border: '1px solid #374151' }}>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: 'white', marginBottom: '1rem', marginTop: 0 }}>Submit New Complaint</h3>

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#9ca3af', marginBottom: '0.5rem' }}>
                                    Complaint Type
                                </label>
                                <select
                                    value={formData.complaint_type}
                                    onChange={(e) => setFormData({ ...formData, complaint_type: e.target.value })}
                                    style={inputStyle}
                                    required
                                >
                                    <option value="overflowing_bin">Overflowing Bin</option>
                                    <option value="missed_pickup">Missed Pickup</option>
                                    <option value="illegal_dumping">Illegal Dumping</option>
                                    <option value="broken_bin">Broken Bin</option>
                                    <option value="foul_odor">Foul Odor</option>
                                    <option value="littering">Littering</option>
                                    <option value="request_new_bin">Request New Bin</option>
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#9ca3af', marginBottom: '0.5rem' }}>
                                    Urgency
                                </label>
                                <select
                                    value={formData.urgency}
                                    onChange={(e) => setFormData({ ...formData, urgency: e.target.value })}
                                    style={inputStyle}
                                    required
                                >
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                </select>
                            </div>
                        </div>

                        {/* Bin ID Dropdown */}
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#9ca3af', marginBottom: '0.5rem' }}>
                                Bin ID <span style={{ color: '#6b7280', fontWeight: 400 }}>(select the bin to link this complaint to)</span>
                            </label>
                            <select
                                value={formData.bin_id}
                                onChange={(e) => setFormData({ ...formData, bin_id: e.target.value })}
                                style={{
                                    ...inputStyle,
                                    cursor: 'pointer',
                                    borderColor: formData.bin_id ? '#10b981' : '#4b5563',
                                }}
                            >
                                <option value="">— Select a Bin —</option>
                                {sortedBins.map((bin) => {
                                    const fill = bin.current_fill_level ?? 0;
                                    const isCritical = fill > 80;
                                    const label = isCritical
                                        ? `${bin.bin_id} (${fill}% - Critical)`
                                        : `${bin.bin_id} (${fill}%)`;
                                    return (
                                        <option key={bin.bin_id} value={bin.bin_id}>
                                            {label}
                                        </option>
                                    );
                                })}
                            </select>
                            {sortedBins.length === 0 && (
                                <p style={{ fontSize: '0.75rem', color: '#f59e0b', margin: '0.35rem 0 0 0' }}>
                                    No bins available. Generate bins from the Bins page first.
                                </p>
                            )}
                        </div>

                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.75rem',
                            backgroundColor: '#374151',
                            borderRadius: '0.5rem',
                            border: '1px solid #4b5563',
                            fontSize: '0.875rem',
                            color: coords ? '#10b981' : '#f59e0b'
                        }}>
                            <MapPin size={18} />
                            <span>
                                {coords
                                    ? `Location detected: ${areaName}`
                                    : "Pinpointing your location..."}
                            </span>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#9ca3af', marginBottom: '0.5rem' }}>
                                Description
                            </label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' }}
                                rows="4"
                                placeholder="Provide details about the complaint..."
                            ></textarea>
                        </div>

                        {/* Submit error */}
                        {
                            submitError && (
                                <div style={{
                                    padding: '0.75rem',
                                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    borderRadius: '0.5rem',
                                    color: '#ef4444',
                                    fontSize: '0.875rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                }}>
                                    <ErrorIcon size={18} />
                                    {submitError}
                                </div>
                            )
                        }

                        <button type="submit" disabled={submitting} style={{
                            width: '100%',
                            backgroundColor: submitting ? '#6d28d9' : '#7c3aed',
                            color: 'white',
                            fontWeight: 600,
                            padding: '0.75rem 1rem',
                            borderRadius: '0.5rem',
                            border: 'none',
                            cursor: submitting ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            transition: 'background-color 0.2s ease',
                            opacity: submitting ? 0.7 : 1,
                        }}>
                            <Send size={20} />
                            {submitting ? 'Submitting…' : 'Submit Complaint'}
                        </button>
                    </form >
                </div >
            )}

            {/* Bin Map (shown when a complaint is selected for highlighting) */}
            {
                highlightedBin && (
                    <div ref={mapRef} style={{
                        marginBottom: '1.5rem',
                        borderRadius: '0.75rem',
                        overflow: 'hidden',
                        border: '1px solid rgba(139, 92, 246, 0.3)',
                        position: 'relative',
                    }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.75rem 1rem',
                            backgroundColor: 'rgba(139, 92, 246, 0.1)',
                            borderBottom: '1px solid rgba(139, 92, 246, 0.2)',
                        }}>
                            <span style={{ color: '#a78bfa', fontSize: '0.875rem', fontWeight: 600 }}>
                                📍 Showing Bin {highlightedComplaint?.bin_id} for complaint {highlightedComplaint?.complaint_id}
                            </span>
                            <button
                                onClick={() => setHighlightedComplaint(null)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#9ca3af',
                                    cursor: 'pointer',
                                    padding: '0.25rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                }}
                            >
                                <Close size={20} />
                            </button>
                        </div>
                        <div style={{ height: '400px' }}>
                            <BinMap
                                bins={allBins.map(bin => ({
                                    id: bin.bin_id,
                                    lat: bin.latitude,
                                    lng: bin.longitude,
                                    fillLevel: bin.current_fill_level || 0,
                                    wasteType: bin.bin_type,
                                    batteryLevel: 100,
                                    status: bin.status,
                                    lastCollected: bin.installation_date || Date.now(),
                                }))}
                                center={[highlightedBin.latitude, highlightedBin.longitude]}
                                zoom={17}
                                highlightBinId={highlightedComplaint?.bin_id}
                            />
                        </div>
                    </div>
                )
            }

            {/* Complaints List */}
            <div style={{ backgroundColor: '#1f2937', borderRadius: '0.5rem', padding: '1.5rem', border: '1px solid #374151' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: 'white', marginBottom: '1rem', marginTop: 0 }}>Recent Complaints</h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {complaints.length > 0 ? complaints.map((complaint) => (
                        <div
                            key={complaint.complaint_id}
                            style={{
                                padding: '1rem',
                                backgroundColor: highlightedComplaint?.complaint_id === complaint.complaint_id
                                    ? 'rgba(139, 92, 246, 0.12)'
                                    : 'rgba(55, 65, 81, 0.4)',
                                borderRadius: '0.5rem',
                                border: highlightedComplaint?.complaint_id === complaint.complaint_id
                                    ? '1px solid rgba(139, 92, 246, 0.3)'
                                    : '1px solid rgba(75, 85, 99, 0.3)',
                                transition: 'all 0.2s ease',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                                <div style={{ flex: 1 }}>
                                    {/* Title row with status badges */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                                        <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#8b5cf6', margin: 0 }}>
                                            {complaint.area_name || "Local Area"}
                                        </h4>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <span style={badgeStyle(getStatusColor(complaint.status))}>
                                                {complaint.status.replace(/_/g, ' ')}
                                            </span>
                                            <span style={badgeStyle(getUrgencyColor(complaint.urgency))}>
                                                {complaint.urgency.replace(/_/g, ' ')}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Issue type */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                        <h5 style={{ fontSize: '0.875rem', fontWeight: 500, color: '#e5e7eb', margin: 0, textTransform: 'capitalize' }}>
                                            {complaint.complaint_type.replace(/_/g, ' ')}
                                        </h5>
                                    </div>

                                    {/* Description */}
                                    {complaint.description && (
                                        <p style={{ fontSize: '0.875rem', color: '#9ca3af', margin: '0 0 0.75rem 0' }}>{complaint.description}</p>
                                    )}

                                    {/* Metadata row */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', fontSize: '0.75rem', color: '#6b7280' }}>
                                        <span style={{ color: '#8b5cf6', fontWeight: 500 }}>ID: {complaint.complaint_id}</span>
                                        {complaint.bin_id && (
                                            <span style={{
                                                fontWeight: 600,
                                                color: '#06b6d4',
                                                backgroundColor: 'rgba(6, 182, 212, 0.1)',
                                                padding: '0.15rem 0.4rem',
                                                borderRadius: '0.25rem',
                                            }}>
                                                🗑 Bin: {complaint.bin_id}
                                            </span>
                                        )}
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                            <MapPin size={14} />
                                            {complaint.latitude.toFixed(4)}, {complaint.longitude.toFixed(4)}
                                        </span>
                                        <span>
                                            {new Date(complaint.timestamp).toLocaleDateString()} at {new Date(complaint.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>

                                {/* View on Map button */}
                                {complaint.bin_id && (
                                    <button
                                        onClick={() => handleViewOnMap(complaint)}
                                        title="View bin on map"
                                        style={{
                                            flexShrink: 0,
                                            marginLeft: '0.75rem',
                                            padding: '0.5rem 0.75rem',
                                            borderRadius: '0.5rem',
                                            border: 'none',
                                            cursor: 'pointer',
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.35rem',
                                            transition: 'all 0.2s ease',
                                            backgroundColor: highlightedComplaint?.complaint_id === complaint.complaint_id
                                                ? '#7c3aed'
                                                : 'rgba(139, 92, 246, 0.15)',
                                            color: highlightedComplaint?.complaint_id === complaint.complaint_id
                                                ? 'white'
                                                : '#a78bfa',
                                        }}
                                    >
                                        <MapIcon size={16} />
                                        {highlightedComplaint?.complaint_id === complaint.complaint_id ? 'Hide Map' : 'View on Map'}
                                    </button>
                                )}
                            </div>
                        </div>
                    )) : (
                        <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                            No complaints found.
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
};

export default Complaints;
