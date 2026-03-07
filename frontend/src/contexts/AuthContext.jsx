import React, { createContext, useContext, useEffect, useState } from 'react';
import { useUser, useAuth as useClerkAuth } from '@clerk/clerk-react';
import axios from 'axios';

const AuthContext = createContext({});

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const { isLoaded, user: clerkUser, isSignedIn } = useUser();
    const { getToken, signOut: clerkSignOut } = useClerkAuth();
    const [dbUser, setDbUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [backendToken, setBackendToken] = useState(localStorage.getItem('citycycle_token'));

    const logout = async () => {
        localStorage.removeItem('citycycle_token');
        setBackendToken(null);
        setDbUser(null);
        if (isSignedIn) {
            await clerkSignOut({ redirectUrl: '/login' });
        }
    };

    const syncUserWithDb = async () => {
        try {
            const token = (await getToken()) || backendToken;
            if (!token) {
                setDbUser(null);
                setLoading(false);
                return;
            }

            const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/auth/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setDbUser(response.data);
        } catch (error) {
            console.error('Error syncing user with DB:', error);
            if (error.response?.status === 401 && backendToken) {
                logout();
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isLoaded) {
            if (isSignedIn || backendToken) {
                syncUserWithDb();
            } else {
                setDbUser(null);
                setLoading(false);
            }
        }
    }, [isLoaded, isSignedIn, clerkUser, backendToken]);

    const value = {
        user: dbUser || (clerkUser ? {
            id: clerkUser.id,
            email: clerkUser.primaryEmailAddress?.emailAddress,
            name: clerkUser.fullName || clerkUser.firstName || '',
            fullName: clerkUser.fullName,
            role: 'user' // Fallback
        } : null),
        clerkUser,
        loading: !isLoaded || loading,
        isAuthenticated: !!(isSignedIn || backendToken),

        // Auth Actions
        refreshUser: syncUserWithDb,
        logout,

        // Direct Phone Auth (Hybrid)
        directSendOtp: async (phone, name) => {
            await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/phone/send-otp`, { phone, name });
        },

        directVerifyOtp: async (phone, code) => {
            const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/phone/verify-otp`, { phone, code });
            const { token, user } = response.data;
            localStorage.setItem('citycycle_token', token);
            setBackendToken(token);
            setDbUser(user);
            return response.data;
        },

        requestPhoneOtp: async (phone) => {
            const token = (await getToken()) || backendToken;
            await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/request-otp`,
                { phone },
                { headers: { Authorization: `Bearer ${token}` } }
            );
        },

        verifyPhoneOtp: async (phone, code) => {
            const token = (await getToken()) || backendToken;
            const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/verify-otp`,
                { phone, code },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            await syncUserWithDb(); // Refresh the user data (is_phone_verified=true)
            return response.data;
        },

        updateProfile: async (data) => {
            const token = (await getToken()) || backendToken;
            await axios.patch(`${import.meta.env.VITE_API_URL}/api/auth/update-profile`,
                data,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            await syncUserWithDb();
        }
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
