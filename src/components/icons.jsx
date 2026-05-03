// SVG icons inline para evitar dependencias

export const Logo = ({ size = 64 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="kleoG" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#00E5B0" />
        <stop offset="100%" stopColor="#0084FF" />
      </linearGradient>
    </defs>
    <path
      d="M30 22 L30 78 M30 50 L62 22 M30 50 L65 78"
      stroke="url(#kleoG)"
      strokeWidth="11"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);

export const LogoWord = ({ size = 32 }) => (
  <span style={{
    fontSize: size,
    fontWeight: 800,
    letterSpacing: '-0.04em',
    lineHeight: 1,
    background: 'linear-gradient(135deg, #FF2D6F 0%, #A855F7 50%, #FF6B00 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
    display: 'inline-block'
  }}>
    Kleo
  </span>
);

export const LogoMark = ({ size = 36 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <defs>
      <linearGradient id="kleoMG" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#00E5B0" />
        <stop offset="100%" stopColor="#0084FF" />
      </linearGradient>
    </defs>
    <rect width="100" height="100" rx="22" fill="#0D0D14" />
    <path
      d="M30 22 L30 78 M30 50 L62 22 M30 50 L65 78"
      stroke="url(#kleoMG)"
      strokeWidth="9"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);

export const Icon = ({ name, size = 22, color = 'currentColor', stroke = 2 }) => {
  const props = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: stroke, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'home': return <svg {...props}><path d="M3 12l9-9 9 9"/><path d="M5 10v10h14V10"/></svg>;
    case 'cards': return <svg {...props}><rect x="2" y="6" width="20" height="13" rx="2"/><path d="M2 11h20"/></svg>;
    case 'plus': return <svg {...props}><path d="M12 5v14M5 12h14"/></svg>;
    case 'chart': return <svg {...props}><path d="M3 20V10M9 20V4M15 20v-6M21 20v-9"/></svg>;
    case 'target': return <svg {...props}><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill={color}/></svg>;
    case 'back': return <svg {...props}><path d="M15 18l-6-6 6-6"/></svg>;
    case 'apple': return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>;
    case 'google': return <svg width={size} height={size} viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>;
    case 'faceid': return <svg {...props}><path d="M4 8V6a2 2 0 0 1 2-2h2M4 16v2a2 2 0 0 0 2 2h2M16 4h2a2 2 0 0 1 2 2v2M16 20h2a2 2 0 0 0 2-2v-2"/><path d="M9 10h.01M15 10h.01M9.5 16c.5.5 1.5 1 2.5 1s2-.5 2.5-1M12 10v4"/></svg>;
    case 'bell': return <svg {...props}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/></svg>;
    case 'sparkle': return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5L12 2zm6 10l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3zM5 14l.8 2.4L8 17l-2.2.6L5 20l-.8-2.4L2 17l2.2-.6L5 14z"/></svg>;
    case 'camera': return <svg {...props}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>;
    case 'edit': return <svg {...props}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
    case 'link': return <svg {...props}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.72-1.71"/></svg>;
    case 'phone': return <svg {...props}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>;
    case 'check': return <svg {...props}><path d="M20 6L9 17l-5-5"/></svg>;
    case 'x': return <svg {...props}><path d="M18 6L6 18M6 6l12 12"/></svg>;
    case 'arrow-up': return <svg {...props}><path d="M12 19V5M5 12l7-7 7 7"/></svg>;
    case 'arrow-down': return <svg {...props}><path d="M12 5v14M19 12l-7 7-7-7"/></svg>;
    case 'wifi': return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><path d="M12 21l3-3a4.24 4.24 0 0 0-6 0l3 3zm0-9c-2.4 0-4.7 1-6.4 2.6l1.4 1.4c2.8-2.8 7.2-2.8 10 0l1.4-1.4C16.7 13 14.4 12 12 12zm0-4c-3.4 0-6.7 1.4-9.2 3.8l1.4 1.4c4.3-4.3 11.3-4.3 15.6 0l1.4-1.4C18.7 9.4 15.4 8 12 8z"/></svg>;
    case 'battery': return <svg {...props}><rect x="2" y="7" width="18" height="10" rx="2"/><path d="M22 11v2"/><rect x="4" y="9" width="13" height="6" rx="1" fill={color}/></svg>;
    case 'signal': return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><rect x="2" y="14" width="3" height="6" rx="1"/><rect x="7" y="11" width="3" height="9" rx="1"/><rect x="12" y="7" width="3" height="13" rx="1"/><rect x="17" y="3" width="3" height="17" rx="1"/></svg>;
    case 'lock': return <svg {...props}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
    case 'eye': return <svg {...props}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
    case 'eye-off': return <svg {...props}><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><path d="M1 1l22 22"/></svg>;
    case 'menu': return <svg {...props}><path d="M3 6h18M3 12h18M3 18h18"/></svg>;
    case 'trending-up': return <svg {...props}><path d="M23 6l-9.5 9.5-5-5L1 18"/><path d="M17 6h6v6"/></svg>;
    case 'trending-down': return <svg {...props}><path d="M23 18l-9.5-9.5-5 5L1 6"/><path d="M17 18h6v-6"/></svg>;
    case 'calendar': return <svg {...props}><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>;
    case 'flag': return <svg {...props}><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22V15"/></svg>;
    case 'info': return <svg {...props}><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>;
    case 'wallet': return <svg {...props}><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/></svg>;
    case 'credit-card': return <svg {...props}><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>;
    case 'lightbulb': return <svg {...props}><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.7.6 1 1.5 1 2.3v1h6v-1c0-.8.3-1.7 1-2.3A7 7 0 0 0 12 2z"/></svg>;
    case 'shield': return <svg {...props}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
    case 'pie-chart': return <svg {...props}><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>;
    case 'file-text': return <svg {...props}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>;
    case 'bank': return <svg {...props}><path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3"/></svg>;
    case 'more-horizontal': return <svg {...props}><circle cx="5" cy="12" r="1.5" fill={color} stroke="none"/><circle cx="12" cy="12" r="1.5" fill={color} stroke="none"/><circle cx="19" cy="12" r="1.5" fill={color} stroke="none"/></svg>;
    case 'settings': return <svg {...props}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
    default: return null;
  }
};
