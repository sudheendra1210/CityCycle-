import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    MdDashboard as LayoutDashboard,
    MdDelete as Trash2,
    MdLocalShipping as Truck,
    MdAssignment as ClipboardList,
    MdMessage as MessageSquare,
    MdBarChart as BarChart3,
    MdPsychology as Brain,
    MdTrendingUp as TrendingUp,
    MdMenu as Menu,
    MdClose as X,
    MdPerson as UserIcon,
    MdCategory as CategoryIcon,
    MdScience as ScienceIcon
} from 'react-icons/md';
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

const Sidebar = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(true);
    const { user, logout } = useAuth();

    const menuItems = [
        { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/bins', icon: Trash2, label: 'Bins' },
        { path: '/vehicles', icon: Truck, label: 'Vehicles', roles: ['admin', 'worker'] },
        { path: '/collections', icon: ClipboardList, label: 'Collections', roles: ['admin', 'worker'] },
        { path: '/complaints', icon: MessageSquare, label: 'Complaints' },
        { path: '/analytics', icon: BarChart3, label: 'Analytics', roles: ['admin'] },
        { path: '/predictions', icon: Brain, label: 'Predictions', roles: ['admin'] },
        { path: '/forecasting', icon: TrendingUp, label: 'Forecasting', roles: ['admin'] },
        { path: '/classification', icon: CategoryIcon, label: 'Classification', roles: ['admin'] },
        { path: '/simulation', icon: ScienceIcon, label: 'Simulation', roles: ['admin'] },
        { path: '/profile', icon: UserIcon, label: 'Profile' },
    ];

    const filteredMenuItems = menuItems.filter(item =>
        !item.roles || item.roles.includes(user?.role)
    );

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            console.error('Logout failed:', error);
        }
    };

    return (
        <>
            {/* Mobile toggle */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    display: 'none',
                    position: 'fixed',
                    top: '1rem',
                    left: '1rem',
                    zIndex: 50,
                    padding: '0.5rem',
                    backgroundColor: '#1f2937',
                    borderRadius: '0.5rem',
                    border: 'none',
                    cursor: 'pointer',
                }}
                className="lg-hidden"
            >
                {isOpen ? <X size={24} color="white" /> : <Menu size={24} color="white" />}
            </button>

            {/* Sidebar */}
            <aside
                style={{
                    position: 'fixed',
                    left: 0,
                    top: 0,
                    height: '100vh',
                    width: isOpen ? '256px' : '80px',
                    backgroundColor: '#1f2937',
                    borderRight: '1px solid #374151',
                    transition: 'width 0.3s ease',
                    zIndex: 40,
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '1rem' }}>
                    {/* Logo */}
                    <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            background: 'linear-gradient(135deg, #10b981, #059669)',
                            borderRadius: '0.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            <Trash2 color="white" size={24} />
                        </div>
                        {isOpen && (
                            <div>
                                <h1 style={{
                                    fontSize: '1.25rem',
                                    fontWeight: 'bold',
                                    background: 'linear-gradient(to right, #10b981, #34d399)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    margin: 0,
                                }}>
                                    SmartWaste
                                </h1>
                                <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>Management System</p>
                            </div>
                        )}
                    </div>

                    {/* Navigation */}
                    <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {filteredMenuItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = location.pathname === item.path;

                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.75rem',
                                        padding: '0.75rem 1rem',
                                        borderRadius: '0.5rem',
                                        textDecoration: 'none',
                                        transition: 'all 0.2s ease',
                                        backgroundColor: isActive ? 'rgba(139, 92, 246, 0.25)' : 'transparent',
                                        color: isActive ? '#a78bfa' : '#9ca3af',
                                        border: isActive ? '1px solid rgba(139, 92, 246, 0.4)' : '1px solid transparent',
                                        backdropFilter: isActive ? 'blur(8px)' : 'none',
                                        WebkitBackdropFilter: isActive ? 'blur(8px)' : 'none',
                                    }}
                                >
                                    <Icon size={20} />
                                    {isOpen && <span style={{ fontWeight: 500 }}>{item.label}</span>}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Footer */}
                    {isOpen && (
                        <div style={{ paddingTop: '1rem', borderTop: '1px solid #374151' }}>
                            {/* User Info */}
                            <div style={{ padding: '0.5rem', marginBottom: '0.75rem' }}>
                                <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0, marginBottom: '0.25rem' }}>Logged in as</p>
                                <p style={{ fontSize: '0.875rem', color: '#d1d5db', fontWeight: 500, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {user?.name || user?.email || 'User'}
                                </p>
                            </div>

                            {/* Logout Button */}
                            <button
                                onClick={handleLogout}
                                style={{
                                    width: '100%',
                                    padding: '0.5rem 1rem',
                                    backgroundColor: '#ea580c',
                                    color: 'white',
                                    borderRadius: '0.5rem',
                                    border: 'none',
                                    fontSize: '0.875rem',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    marginBottom: '0.75rem',
                                }}
                            >
                                Logout
                            </button>

                            <p style={{ fontSize: '0.75rem', color: '#4b5563', textAlign: 'center', margin: 0 }}>
                                © 2026 SmartWaste v1.0
                            </p>
                        </div>
                    )}
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
