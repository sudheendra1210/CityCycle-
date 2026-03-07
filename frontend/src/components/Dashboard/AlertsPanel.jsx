import {
    MdNotifications as Bell,
    MdFlashOn as Zap,
    MdNavigation as Navigation,
} from 'react-icons/md';

const AlertsPanel = ({ alerts }) => {
    const severityColors = {
        critical: { bg: 'rgba(239, 68, 68, 0.08)', border: 'rgba(239, 68, 68, 0.2)', text: '#ef4444' },
        warning: { bg: 'rgba(245, 158, 11, 0.08)', border: 'rgba(245, 158, 11, 0.2)', text: '#f59e0b' },
    };

    return (
        <div style={{
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '1rem',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '300px',
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
                    <Bell style={{ width: '1rem', height: '1rem', color: '#ef4444' }} />
                    <h3 style={{ fontWeight: 700, fontSize: '0.875rem', color: '#f1f5f9', margin: 0 }}>Critical Alerts</h3>
                </div>
                <span style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    color: '#ef4444',
                    fontSize: '0.625rem',
                    fontWeight: 900,
                    padding: '0.15rem 0.5rem',
                    borderRadius: '0.25rem',
                    textTransform: 'uppercase',
                }}>
                    {alerts.length} active
                </span>
            </div>

            {/* Alerts List */}
            <div style={{ overflowY: 'auto', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {alerts.length > 0 ? alerts.slice(0, 6).map((alert, i) => {
                    const sc = severityColors[alert.severity] || severityColors.warning;
                    return (
                        <div
                            key={alert.id}
                            className="stat-card-animate"
                            style={{
                                padding: '0.75rem',
                                background: sc.bg,
                                border: `1px solid ${sc.border}`,
                                borderRadius: '0.75rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                animationDelay: `${i * 60}ms`,
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateX(4px)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateX(0)'; }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                                <span style={{
                                    fontSize: '0.625rem',
                                    fontWeight: 900,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.1em',
                                    color: sc.text,
                                }}>
                                    {alert.severity}
                                </span>
                                <span style={{ fontSize: '0.625rem', color: '#64748b' }}>
                                    {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#e2e8f0', margin: '0 0 0.25rem 0' }}>
                                {alert.binId}: {alert.message}
                            </p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.625rem', color: '#64748b' }}>
                                <Navigation style={{ width: '0.75rem', height: '0.75rem' }} />
                                <span>Immediate Action</span>
                            </div>
                        </div>
                    );
                }) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
                        <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '50%', marginBottom: '0.75rem' }}>
                            <Zap style={{ width: '1.5rem', height: '1.5rem', color: 'rgba(100,116,139,0.3)' }} />
                        </div>
                        <p style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 500, margin: 0 }}>All clear — no alerts</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AlertsPanel;
