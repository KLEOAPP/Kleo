const PREFIX = 'kleo_';

export const storage = {
  get(key, fallback = null) {
    try {
      const v = localStorage.getItem(PREFIX + key);
      return v ? JSON.parse(v) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {}
  },
  remove(key) {
    try {
      localStorage.removeItem(PREFIX + key);
    } catch {}
  },
  clear() {
    Object.keys(localStorage)
      .filter(k => k.startsWith(PREFIX))
      .forEach(k => localStorage.removeItem(k));
  }
};

export const fmtMoney = (n, sign = false) => {
  const num = Number(n) || 0;
  const fmt = num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  if (sign) return (num >= 0 ? '+' : '−') + '$' + Math.abs(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return '$' + fmt;
};

export const fmtMoneyShort = (n) => {
  const num = Math.abs(Number(n) || 0);
  if (num >= 1000) return '$' + (num / 1000).toFixed(1) + 'k';
  return '$' + num.toFixed(0);
};

export const todayISO = () => new Date().toISOString();

export const fmtDate = (iso) => {
  const d = new Date(iso);
  return d.toLocaleDateString('es-PR', { day: 'numeric', month: 'short' });
};

export const fmtDateLong = (iso) => {
  const d = new Date(iso);
  return d.toLocaleDateString('es-PR', { weekday: 'long', day: 'numeric', month: 'long' });
};

export const fmtTime = (iso) => {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
};

export const fmtDateTime = (iso) => `${fmtDate(iso)} · ${fmtTime(iso)}`;

export const relativeDate = (iso) => {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) return `Hace ${diffDays} días`;
  return fmtDate(iso);
};

export const monthName = (m, year) => {
  const d = new Date(year, m, 1);
  return d.toLocaleDateString('es-PR', { month: 'long', year: 'numeric' });
};

export const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();

// Calcula el due date real para una tarjeta de crédito
export const nextPaymentDate = (paymentDueDay) => {
  const today = new Date();
  const day = today.getDate();
  let month = today.getMonth();
  let year = today.getFullYear();
  if (day >= paymentDueDay) {
    month += 1;
    if (month > 11) { month = 0; year += 1; }
  }
  return new Date(year, month, paymentDueDay);
};

export const daysUntil = (date) => {
  const d = date instanceof Date ? date : new Date(date);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.round((d - now) / (1000 * 60 * 60 * 24));
};
