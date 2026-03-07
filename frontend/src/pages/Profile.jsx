import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { MdPhone as Phone, MdLocationOn as MapPin, MdVerified as CheckCircle, MdWarning as AlertTriangle, MdPerson as PersonIcon } from 'react-icons/md';

const Profile = () => {
    const { user, requestPhoneOtp, verifyPhoneOtp, updateProfile, loading } = useAuth();
    const navigate = useNavigate();
    const [name, setName] = useState(user?.name || '');
    const [phone, setPhone] = useState(user?.phone || '');
    const [area, setArea] = useState(user?.area || '');
    const [otp, setOtp] = useState('');
    const [step, setStep] = useState(1); // 1: input, 2: verify
    const [message, setMessage] = useState({ type: '', text: '' });
    const [isSaving, setIsSaving] = useState(false);
    const [isNewUser, setIsNewUser] = useState(false);

    useEffect(() => {
        if (user && !user.name) {
            setIsNewUser(true);
        }
    }, [user]);

    const handleSaveName = async (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        setIsSaving(true);
        setMessage({ type: '', text: '' });
        try {
            await updateProfile({ name: name.trim() });
            setIsNewUser(false);
            setMessage({ type: 'success', text: 'Name saved successfully!' });
            // Navigate to dashboard after successful save
            setTimeout(() => navigate('/'), 500);
        } catch (err) {
            console.error('Profile save error:', err);
            setMessage({ type: 'error', text: 'Failed to save name. Please try again.' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleSendOtp = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setMessage({ type: '', text: '' });
        try {
            await requestPhoneOtp(phone);
            setStep(2);
            setMessage({ type: 'success', text: 'Verification code sent!' });
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to send code.' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setMessage({ type: '', text: '' });
        try {
            await verifyPhoneOtp(phone, otp);
            setStep(1);
            setMessage({ type: 'success', text: 'Phone verified successfully!' });
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.detail || 'Invalid code.' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        setMessage({ type: '', text: '' });
        try {
            await updateProfile({ area });
            setMessage({ type: 'success', text: 'Profile updated!' });
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to update profile.' });
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-400">Loading profile...</div>;

    // New user prompt — show a focused name entry screen
    if (isNewUser) {
        return (
            <div className="max-w-md mx-auto p-6" style={{ marginTop: '10vh' }}>
                <div className="glass-card p-8 rounded-2xl border border-dark-800 text-center">
                    <div style={{
                        width: '64px', height: '64px', borderRadius: '50%',
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 1.5rem'
                    }}>
                        <PersonIcon size={32} color="white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Welcome to CityCycle! 👋</h1>
                    <p className="text-gray-400 mb-6">Let's set up your profile. What's your name?</p>
                    <form onSubmit={handleSaveName}>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter your full name"
                            required
                            autoFocus
                            className="w-full bg-dark-900 border border-dark-800 rounded-xl px-4 py-3 text-white text-center text-lg outline-none focus:border-primary-500 mb-4"
                        />
                        <button
                            type="submit"
                            disabled={isSaving || !name.trim()}
                            className="w-full bg-success-500 hover:bg-success-600 text-white px-8 py-3 rounded-xl font-semibold transition-colors disabled:opacity-50"
                        >
                            {isSaving ? 'Saving...' : 'Continue →'}
                        </button>
                    </form>
                    {message.text && (
                        <div className={`mt-4 p-3 rounded-xl text-sm font-medium ${message.type === 'success' ? 'bg-success-500/10 text-success-500' : 'bg-danger-500/10 text-danger-500'}`}>
                            {message.text}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-6">
            <h1 className="text-3xl font-bold text-white mb-8">User Profile</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Account Details */}
                <div className="glass-card p-6 rounded-2xl border border-dark-800">
                    <h2 className="text-xl font-semibold text-gray-100 mb-6 flex items-center gap-2">
                        <PersonIcon size={20} className="text-primary-500" />
                        Account Information
                    </h2>
                    <div className="space-y-4">
                        <div>
                            <p className="text-sm text-gray-500 mb-1">Full Name</p>
                            <form onSubmit={handleSaveName} className="flex gap-2">
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Enter your name"
                                    className="flex-1 bg-dark-900 border border-dark-800 rounded-xl px-4 py-2 text-white outline-none focus:border-primary-500"
                                />
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-xl font-semibold transition-colors disabled:opacity-50"
                                >
                                    Save
                                </button>
                            </form>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 mb-1">Email Address</p>
                            <p className="text-gray-200">{user?.email || '—'}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 mb-1">Phone Number</p>
                            <p className="text-gray-200">{user?.phone || '—'}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 mb-1">Assigned Role</p>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${user?.role === 'admin' ? 'bg-danger-500/20 text-danger-400' :
                                user?.role === 'worker' ? 'bg-primary-500/20 text-primary-400' :
                                    'bg-success-500/20 text-success-400'
                                }`}>
                                {user?.role}
                            </span>
                        </div>
                    </div>
                </div>

                {/* SMS & Notifications */}
                <div className="glass-card p-6 rounded-2xl border border-dark-800">
                    <h2 className="text-xl font-semibold text-gray-100 mb-6 flex items-center gap-2">
                        <Phone size={20} className="text-primary-500" />
                        SMS Notifications
                    </h2>

                    {user?.is_phone_verified ? (
                        <div className="bg-success-500/10 border border-success-500/20 p-4 rounded-xl flex items-start gap-3 mb-6">
                            <CheckCircle className="text-success-500 mt-1" size={20} />
                            <div>
                                <p className="text-success-400 font-semibold text-sm">Phone Verified</p>
                                <p className="text-gray-400 text-xs">You will receive SMS alerts at {user.phone}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-warning-500/10 border border-warning-500/20 p-4 rounded-xl flex items-start gap-3 mb-6">
                            <AlertTriangle className="text-warning-500 mt-1" size={20} />
                            <div>
                                <p className="text-warning-400 font-semibold text-sm">Not Signed Up for SMS</p>
                                <p className="text-gray-400 text-xs">Verify your phone to receive real-time alerts.</p>
                            </div>
                        </div>
                    )}

                    <form onSubmit={step === 1 ? handleSendOtp : handleVerifyOtp} className="space-y-4">
                        {step === 1 ? (
                            <div>
                                <label className="block text-sm text-gray-500 mb-2">Phone Number</label>
                                <div className="flex gap-2">
                                    <input
                                        type="tel"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        placeholder="+91XXXXXXXXXX"
                                        className="flex-1 bg-dark-900 border border-dark-800 rounded-xl px-4 py-2 text-white outline-none focus:border-primary-500"
                                        required
                                    />
                                    <button
                                        type="submit"
                                        disabled={isSaving}
                                        className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-xl font-semibold transition-colors disabled:opacity-50"
                                    >
                                        Verify
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <label className="block text-sm text-gray-500 mb-2">Enter 6-Digit Code</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value)}
                                        placeholder="000000"
                                        maxLength={6}
                                        className="flex-1 bg-dark-900 border border-dark-800 rounded-xl px-4 py-2 text-white text-center text-lg tracking-widest outline-none focus:border-primary-500"
                                        required
                                    />
                                    <button
                                        type="submit"
                                        disabled={isSaving}
                                        className="bg-success-500 hover:bg-success-600 text-white px-4 py-2 rounded-xl font-semibold transition-colors disabled:opacity-50"
                                    >
                                        Submit
                                    </button>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setStep(1)}
                                    className="text-xs text-gray-500 mt-2 hover:text-gray-300"
                                >
                                    Change phone number
                                </button>
                            </div>
                        )}
                    </form>
                </div>

                {/* Regional Settings */}
                <div className="glass-card p-6 rounded-2xl border border-dark-800 md:col-span-2">
                    <h2 className="text-xl font-semibold text-gray-100 mb-6 flex items-center gap-2">
                        <MapPin size={20} className="text-success-500" />
                        Locality & Personalization
                    </h2>
                    <form onSubmit={handleUpdateProfile} className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-1 w-full">
                            <label className="block text-sm text-gray-500 mb-2">Assigned Area / Locality</label>
                            <input
                                type="text"
                                value={area}
                                onChange={(e) => setArea(e.target.value)}
                                placeholder="Enter your neighborhood e.g. Indiranagar"
                                className="w-full bg-dark-900 border border-dark-800 rounded-xl px-4 py-2 text-white outline-none focus:border-success-500"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="bg-success-500 hover:bg-success-600 text-white px-8 py-2 rounded-xl font-semibold transition-colors disabled:opacity-50 w-full md:w-auto"
                        >
                            Save Changes
                        </button>
                    </form>
                </div>
            </div>

            {message.text && (
                <div className={`mt-6 p-4 rounded-xl text-center font-medium ${message.type === 'success' ? 'bg-success-500/10 text-success-500' : 'bg-danger-500/10 text-danger-500'
                    }`}>
                    {message.text}
                </div>
            )}
        </div>
    );
};

export default Profile;
