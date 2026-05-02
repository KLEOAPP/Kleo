import { useEffect, useState } from 'react';
import { useI18n } from '../i18n/index.jsx';

export default function NotificationOverlay({ notification, onDismiss, onAction }) {
  const { strings: s } = useI18n();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Animación de entrada
    setTimeout(() => setVisible(true), 50);
  }, []);

  const handleAction = () => {
    setVisible(false);
    setTimeout(() => {
      if (onAction) onAction();
      else onDismiss();
    }, 300);
  };

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(onDismiss, 300);
  };

  if (!notification) return null;

  // Extraer emoji del título
  const emoji = notification.title?.match(/^[^\w\s]/u)?.[0] || '🔔';
  const title = notification.title?.replace(/^[^\w\s]\s*/u, '') || s.notification;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: visible ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0)',
        backdropFilter: visible ? 'blur(12px)' : 'blur(0px)',
        transition: 'all .3s ease',
        padding: 24
      }}
      onClick={handleDismiss}
    >
      <div
        style={{
          background: 'var(--bg)',
          borderRadius: 24,
          padding: '32px 24px 24px',
          maxWidth: 340,
          width: '100%',
          textAlign: 'center',
          transform: visible ? 'scale(1) translateY(0)' : 'scale(0.9) translateY(20px)',
          opacity: visible ? 1 : 0,
          transition: 'all .3s ease',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Emoji grande */}
        <div style={{
          width: 64,
          height: 64,
          borderRadius: 20,
          background: 'linear-gradient(135deg, rgba(0,181,137,0.15) 0%, rgba(0,122,255,0.15) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 32,
          margin: '0 auto 16px'
        }}>
          {emoji}
        </div>

        {/* Título */}
        <h3 style={{
          fontSize: 18,
          fontWeight: 700,
          marginBottom: 12,
          color: 'var(--text)'
        }}>
          {title}
        </h3>

        {/* Mensaje */}
        <p style={{
          fontSize: 15,
          lineHeight: 1.6,
          color: 'var(--text-mute)',
          marginBottom: 24
        }}>
          {notification.body}
        </p>

        {/* Botones */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {notification.section && (
            <button
              onClick={handleAction}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: 14,
                background: 'var(--gradient)',
                color: '#fff',
                fontWeight: 600,
                fontSize: 15
              }}
            >
              {notification.section === 'credit' ? s.viewCard :
               notification.section === 'calendar' ? s.viewCalendar :
               notification.section === 'goals' ? s.viewGoal :
               s.seeMore}
            </button>
          )}
          <button
            onClick={handleDismiss}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: 14,
              background: 'var(--bg-elev)',
              color: 'var(--text-mute)',
              fontWeight: 500,
              fontSize: 14
            }}
          >
            {s.close}
          </button>
        </div>
      </div>
    </div>
  );
}
