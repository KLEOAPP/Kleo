import { useState, useEffect } from 'react';
import { Icon } from './icons.jsx';
import { isPushSupported, subscribeToPush, unsubscribeFromPush, isSubscribed as checkSubscribed } from '../lib/push.js';
import { useI18n } from '../i18n/index.jsx';

export default function MoreMenu({ onNavigate, onClose, onLogout, onHome, onFeedback, user }) {
  const { strings: s, lang, setLang } = useI18n();
  const [theme, setTheme] = useState(() => localStorage.getItem('kleo_theme') || 'light');
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const pushSupported = isPushSupported();

  useEffect(() => {
    checkSubscribed().then(setPushEnabled);
  }, []);

  const togglePush = async () => {
    setPushLoading(true);
    try {
      if (pushEnabled) {
        await unsubscribeFromPush();
        setPushEnabled(false);
      } else {
        await subscribeToPush(user?.id || user?.email || 'anonymous');
        setPushEnabled(true);
      }
    } catch (err) {
      console.error('Push toggle error:', err);
      if (err.message === 'Permiso denegado') {
        alert('Activa las notificaciones en Ajustes → Kleo para recibir alertas.');
      }
    }
    setPushLoading(false);
  };

  const toggleTheme = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('kleo_theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const sections = [
    { id: 'credit', icon: '💳', title: s.menuCredit, subtitle: s.menuCreditDesc, color: 'var(--section-credit)' },
    { id: 'analysis', icon: '📈', title: s.menuAnalysis, subtitle: s.menuAnalysisDesc, color: 'var(--section-analysis)' },
    { id: 'budget', icon: '💰', title: s.menuBudget, subtitle: s.menuBudgetDesc, color: 'var(--section-budget)' },
    { id: 'calendar', icon: '📅', title: s.menuCalendar, subtitle: s.menuCalendarDesc, color: 'var(--section-calendar)' },
    { id: 'transactions', icon: '🧾', title: s.menuTransactions, subtitle: s.menuTransactionsDesc, color: 'var(--section-accounts)' },
    { id: 'reports', icon: '📊', title: s.menuReports, subtitle: s.menuReportsDesc, color: 'var(--section-reports)' }
  ];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        backdropFilter: 'blur(4px)'
      }}
      onClick={onClose}
    >
      <div
        className="app-shell"
        style={{
          background: 'var(--bg)',
          height: '90vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '20px 20px 0 0',
          animation: 'fadeUp .3s ease',
          border: '1px solid var(--border)',
          overflow: 'hidden'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle + cerrar */}
        <div style={{ paddingTop: 8, paddingBottom: 4, flexShrink: 0, position: 'relative' }}>
          <div style={{
            width: 36, height: 5,
            background: 'var(--border)',
            borderRadius: 3,
            margin: '0 auto'
          }}></div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            style={{
              position: 'absolute',
              top: 6, right: 12,
              width: 32, height: 32,
              borderRadius: '50%',
              background: 'var(--bg-elev)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            <Icon name="x" size={16} />
          </button>
        </div>

        {/* Botón Volver al Inicio (sticky arriba) */}
        <div style={{ padding: '12px 16px 12px', flexShrink: 0, borderBottom: '1px solid var(--border-soft)' }}>
          <button
            onClick={() => { onClose(); onHome(); }}
            className="row gap-10 pressable"
            style={{
              width: '100%',
              padding: '14px 16px',
              background: 'var(--gradient)',
              borderRadius: 14,
              color: '#fff',
              fontWeight: 700,
              fontSize: 15,
              boxShadow: '0 4px 14px rgba(168, 85, 247, 0.3)'
            }}
          >
            <Icon name="home" size={20} color="#fff" stroke={2.5} />
            <span style={{ flex: 1, textAlign: 'left' }}>{s.goHome}</span>
            <Icon name="back" size={14} color="#fff" stroke={2.5} style={{ transform: 'rotate(180deg)' }} />
          </button>
        </div>

        {/* Contenido scrollable */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain',
            padding: '16px'
          }}
        >
          {/* Perfil */}
          <div className="card mb-20" style={{ background: 'var(--bg-elev)', border: 'none' }}>
            <div className="row gap-12">
              <div style={{
                width: 50, height: 50, borderRadius: '50%',
                background: 'var(--gradient)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 700, fontSize: 20
              }}>
                {user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <div className="col gap-2" style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontWeight: 600, fontSize: 16 }}>{user?.name}</span>
                <span className="tiny">{user?.email}</span>
              </div>
            </div>
          </div>

          <div className="section-header" style={{ margin: '0 0 8px' }}>
            <span>{s.sectionsLabel}</span>
          </div>
          <div className="ios-list mb-20">
            {sections.map(item => (
              <button
                key={item.id}
                className="ios-list-item"
                onClick={() => onNavigate(item.id)}
                style={{ alignItems: 'flex-start', paddingTop: 12, paddingBottom: 12 }}
              >
                <span style={{
                  width: 36, height: 36, borderRadius: 9,
                  background: item.color, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, flexShrink: 0
                }}>
                  {item.icon}
                </span>
                <div className="col gap-2" style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 15, fontWeight: 500 }}>{item.title}</span>
                  <span className="tiny">{item.subtitle}</span>
                </div>
                <Icon name="back" size={14} color="var(--text-mute)" stroke={2} />
              </button>
            ))}
          </div>

          <div className="section-header" style={{ margin: '0 0 8px' }}>
            <span>{s.appearance}</span>
          </div>
          <div className="ios-list mb-20">
            <button className="ios-list-item" onClick={() => toggleTheme('light')}>
              <span style={{
                width: 32, height: 32, borderRadius: 8,
                background: '#FFFFFF', border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, flexShrink: 0
              }}>☀️</span>
              <span style={{ flex: 1, fontSize: 15 }}>{s.lightMode}</span>
              {theme === 'light' && <Icon name="check" size={18} color="var(--blue)" />}
            </button>
            <button className="ios-list-item" onClick={() => toggleTheme('dark')}>
              <span style={{
                width: 32, height: 32, borderRadius: 8,
                background: '#1C1C1E',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, flexShrink: 0
              }}>🌙</span>
              <span style={{ flex: 1, fontSize: 15 }}>{s.darkMode}</span>
              {theme === 'dark' && <Icon name="check" size={18} color="var(--blue)" />}
            </button>
          </div>

          <div className="section-header" style={{ margin: '0 0 8px' }}>
            <span>{s.language}</span>
          </div>
          <div className="ios-list mb-20">
            <button className="ios-list-item" onClick={() => setLang('es')}>
              <span style={{
                width: 32, height: 32, borderRadius: 8,
                background: 'var(--bg-elev)',
                border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, flexShrink: 0
              }}>🇪🇸</span>
              <span style={{ flex: 1, fontSize: 15 }}>{s.spanish}</span>
              {lang === 'es' && <Icon name="check" size={18} color="var(--blue)" />}
            </button>
            <button className="ios-list-item" onClick={() => setLang('en')}>
              <span style={{
                width: 32, height: 32, borderRadius: 8,
                background: 'var(--bg-elev)',
                border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, flexShrink: 0
              }}>🇺🇸</span>
              <span style={{ flex: 1, fontSize: 15 }}>{s.english}</span>
              {lang === 'en' && <Icon name="check" size={18} color="var(--blue)" />}
            </button>
          </div>

          <div className="section-header" style={{ margin: '0 0 8px' }}>
            <span>{s.notificationsLabel}</span>
          </div>
          <div className="ios-list mb-20">
            {pushSupported ? (
              <button
                className="ios-list-item"
                onClick={togglePush}
                disabled={pushLoading}
              >
                <span style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: pushEnabled ? 'var(--green)' : 'var(--bg-elev)',
                  border: pushEnabled ? 'none' : '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, flexShrink: 0
                }}>🔔</span>
                <div className="col gap-2" style={{ flex: 1 }}>
                  <span style={{ fontSize: 15, fontWeight: 500 }}>
                    {pushLoading ? s.configuring : pushEnabled ? s.notificationsActive : s.activateNotifications}
                  </span>
                  <span className="tiny">
                    {pushEnabled ? s.notificationsActiveDesc : s.notificationsInactiveDesc}
                  </span>
                </div>
                <div style={{
                  width: 44, height: 26, borderRadius: 13,
                  background: pushEnabled ? 'var(--green)' : 'var(--border)',
                  position: 'relative',
                  transition: 'background .2s'
                }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: '#fff',
                    position: 'absolute',
                    top: 2,
                    left: pushEnabled ? 20 : 2,
                    transition: 'left .2s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                  }}></div>
                </div>
              </button>
            ) : (
              <div className="ios-list-item" style={{ opacity: 0.5 }}>
                <span style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: 'var(--bg-elev)',
                  border: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, flexShrink: 0
                }}>🔕</span>
                <div className="col gap-2" style={{ flex: 1 }}>
                  <span style={{ fontSize: 15, fontWeight: 500 }}>{s.notAvailable}</span>
                  <span className="tiny">{s.installAsApp}</span>
                </div>
              </div>
            )}
          </div>

          <div className="section-header" style={{ margin: '0 0 8px' }}>
            <span>{s.account}</span>
          </div>
          <div className="ios-list mb-20">
            <button
              className="ios-list-item"
              onClick={onLogout}
              style={{ color: 'var(--danger)' }}
            >
              <Icon name="lock" size={20} color="var(--danger)" />
              <span style={{ flex: 1, fontSize: 15, fontWeight: 500 }}>{s.logout}</span>
            </button>
          </div>

          {/* Feedback */}
          <button
            onClick={() => { onClose(); onFeedback(); }}
            className="pressable"
            style={{
              width: '100%',
              padding: '16px 20px',
              borderRadius: 16,
              background: 'linear-gradient(135deg, rgba(0,181,137,0.1) 0%, rgba(0,122,255,0.1) 100%)',
              border: '1px solid rgba(0,181,137,0.25)',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 8
            }}
          >
            <span style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'var(--gradient)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20
            }}>💡</span>
            <div className="col gap-2" style={{ flex: 1, textAlign: 'left' }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>{s.feedbackQuestion}</span>
              <span className="tiny">{s.feedbackDesc}</span>
            </div>
          </button>

          <p className="tiny" style={{ textAlign: 'center', padding: '8px 0 24px' }}>
            {s.version}
          </p>
        </div>
      </div>
    </div>
  );
}
