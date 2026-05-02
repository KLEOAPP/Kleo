import { useState, useEffect } from 'react';
import { Icon } from './icons.jsx';

// Guardar notificaciones en localStorage
const STORAGE_KEY = 'kleo_notifications';

export function saveNotification(notif) {
  const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  stored.unshift({
    id: Date.now(),
    title: notif.title,
    body: notif.body,
    time: new Date().toISOString(),
    read: false
  });
  // Máximo 50 notificaciones
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stored.slice(0, 50)));
}

export function getUnreadCount() {
  const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  return stored.filter(n => !n.read).length;
}

export function markAllRead() {
  const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  stored.forEach(n => n.read = true);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
}

export default function Notifications({ onClose }) {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    setNotifications(stored);
    // Marcar todas como leídas al abrir
    markAllRead();
  }, []);

  const clearAll = () => {
    localStorage.setItem(STORAGE_KEY, '[]');
    setNotifications([]);
  };

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Ahora';
    if (mins < 60) return `Hace ${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Hace ${hours}h`;
    const days = Math.floor(hours / 24);
    return `Hace ${days}d`;
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--bg)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'stretch',
        justifyContent: 'center'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg)',
          width: '100%',
          maxWidth: 430,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          animation: 'fadeUp .3s ease',
          overflow: 'hidden'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          paddingTop: 'max(16px, env(safe-area-inset-top, 16px))',
          padding: 'max(16px, env(safe-area-inset-top, 16px)) 16px 16px',
          flexShrink: 0,
          borderBottom: '1px solid var(--border-soft)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12
        }}>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32,
              borderRadius: '50%',
              background: 'var(--bg-elev)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18
            }}
          >✕</button>
          <span style={{ fontWeight: 700, fontSize: 20, flex: 1, textAlign: 'center' }}>🔔 Notificaciones</span>
          {notifications.length > 0 ? (
            <button
              onClick={clearAll}
              style={{ fontSize: 13, color: 'var(--blue)', fontWeight: 600, minWidth: 32 }}
            >
              Borrar
            </button>
          ) : <span style={{ minWidth: 32 }}></span>}
        </div>

        {/* Lista */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          padding: '12px 16px'
        }}>
          {notifications.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: 'var(--text-mute)'
            }}>
              <span style={{ fontSize: 48, display: 'block', marginBottom: 12 }}>🔕</span>
              <p style={{ fontSize: 15, fontWeight: 500 }}>Sin notificaciones</p>
              <p style={{ fontSize: 13, marginTop: 4 }}>Aquí verás alertas de pagos y consejos de Kleo</p>
            </div>
          ) : (
            <div className="col gap-10">
              {notifications.map(n => (
                <div
                  key={n.id}
                  className="card"
                  style={{
                    background: n.read ? 'var(--bg-elev)' : 'rgba(0,181,137,0.08)',
                    border: n.read ? 'none' : '1px solid rgba(0,181,137,0.2)',
                    padding: '14px 16px'
                  }}
                >
                  <div className="row gap-10" style={{ alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 20, flexShrink: 0, marginTop: 2 }}>
                      {n.title?.includes('🚨') ? '🚨' : n.title?.includes('🛑') ? '🛑' : n.title?.includes('✅') ? '✅' : '💳'}
                    </span>
                    <div className="col gap-4" style={{ flex: 1 }}>
                      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>
                          {n.title?.replace(/^[^\s]+\s/, '')}
                        </span>
                        <span className="tiny" style={{ flexShrink: 0 }}>{timeAgo(n.time)}</span>
                      </div>
                      <span style={{ fontSize: 13, color: 'var(--text-mute)', lineHeight: 1.5 }}>
                        {n.body}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
