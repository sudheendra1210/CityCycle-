import { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api.js';
import { MdLocationOn as MapPin, MdSend as Send, MdInfo as Info } from 'react-icons/md';
import { complaintsService } from '../services/complaintsService';
import { useLocation } from '../contexts/LocationContext';

const Complaints = () => {
    const { coords, areaName, loading: locationLoading, permissionStatus } = useLocation();

    // Use Convex for real-time complaints data
    const allComplaints = useQuery(api.complaints.get, {
        status: undefined
    }) || [];

    const createComplaint = useMutation(api.complaints.create);

    // Filter complaints based on areaName
    const complaints = allComplaints.filter(c => {
        if (areaName === 'Global View') return true;
        return c.area_name === areaName;
    });

    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        complaint_type: 'overflowing_bin',
        description: '',
        urgency: 'medium',
    });

    const fetchComplaints = () => {
        // No longer needed, as useQuery handles it
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!coords) {
            alert("Location access is required to submit a complaint. Please enable location permissions.");
            return;
        }

        try {
            const submissionData = {
                complaint_id: `CMP-${Math.floor(Math.random() * 10000)}`,
                complaint_type: formData.complaint_type,
                latitude: coords.lat,
                longitude: coords.lng,
                area_name: areaName,
                description: formData.description,
                urgency: formData.urgency
            };

            await createComplaint(submissionData);
            setShowForm(false);
            setFormData({
                complaint_type: 'overflowing_bin',
                description: '',
                urgency: 'medium',
            });
        } catch (error) {
            console.error('Error creating complaint:', error);
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
        backgroundColor: `${color}33`, // 20% opacity
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

                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.75rem',
                            backgroundColor: '#374151',
                            borderRadius: '0.5rem',
                            border: '1px border #4b5563',
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

                        <button type="submit" style={{
                            width: '100%',
                            backgroundColor: '#7c3aed',
                            color: 'white',
                            fontWeight: 600,
                            padding: '0.75rem 1rem',
                            borderRadius: '0.5rem',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            transition: 'background-color 0.2s ease',
                        }}>
                            <Send size={20} />
                            Submit Complaint
                        </button>
                    </form>
                </div>
            )}

            {/* Complaints List */}
            <div style={{ backgroundColor: '#1f2937', borderRadius: '0.5rem', padding: '1.5rem', border: '1px solid #374151' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: 'white', marginBottom: '1rem', marginTop: 0 }}>Recent Complaints</h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {complaints.length > 0 ? complaints.map((complaint) => (
                        <div
                            key={complaint.complaint_id}
                            style={{
                                padding: '1rem',
                                backgroundColor: 'rgba(55, 65, 81, 0.4)',
                                borderRadius: '0.5rem',
                                border: '1px solid rgba(75, 85, 99, 0.3)',
                                transition: 'background-color 0.2s ease',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                                        <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#8b5cf6', margin: 0 }}>
                                            {complaint.area_name || "Local Area"} – {complaint.bin_id || "Global"}
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

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                        <h5 style={{ fontSize: '0.875rem', fontWeight: 500, color: '#e5e7eb', margin: 0, textTransform: 'capitalize' }}>
                                            {complaint.complaint_type.replace(/_/g, ' ')}
                                        </h5>
                                    </div>

                                    {complaint.description && (
                                        <p style={{ fontSize: '0.875rem', color: '#9ca3af', margin: '0 0 0.75rem 0' }}>{complaint.description}</p>
                                    )}

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', fontSize: '0.75rem', color: '#6b7280' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                            <MapPin size={14} />
                                            {complaint.latitude.toFixed(4)}, {complaint.longitude.toFixed(4)}
                                        </span>
                                        <span>
                                            {new Date(complaint.timestamp).toLocaleDateString()} at {new Date(complaint.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        <span style={{ color: '#8b5cf6', fontWeight: 500 }}>ID: {complaint.complaint_id}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                            No complaints found.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Complaints;
