import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { locationService } from '../services/locationService';

const LocationContext = createContext();

// Hyderabad fallback coordinates
const FALLBACK_COORDS = { lat: 17.3850, lng: 78.4867 };
const FALLBACK_AREA = 'Hyderabad';

export const LocationProvider = ({ children }) => {
    const [coords, setCoords] = useState(null);
    const [areaName, setAreaName] = useState('Global View');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [permissionStatus, setPermissionStatus] = useState('prompt');

    const updateLocation = useCallback(async () => {
        setLoading(true);
        try {
            const userCoords = await locationService.getCurrentLocation();
            setCoords(userCoords);
            setPermissionStatus('granted');

            // Get human-readable area name
            const area = await locationService.reverseGeocode(userCoords.lat, userCoords.lng);
            setAreaName(area);
            setError(null);
        } catch (err) {
            console.warn("Location error:", err.message, "— using Hyderabad fallback");
            setError(err.message);
            if (err.message.includes("denied")) {
                setPermissionStatus('denied');
            }
            // Always fall back to Hyderabad so features still work
            setCoords(FALLBACK_COORDS);
            setAreaName(FALLBACK_AREA);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        updateLocation();
    }, [updateLocation]);

    const value = {
        coords,
        areaName,
        loading,
        error,
        permissionStatus,
        refreshLocation: updateLocation,
    };

    return (
        <LocationContext.Provider value={value}>
            {children}
        </LocationContext.Provider>
    );
};

export const useLocation = () => {
    const context = useContext(LocationContext);
    if (context === undefined) {
        throw new Error('useLocation must be used within a LocationProvider');
    }
    return context;
};
