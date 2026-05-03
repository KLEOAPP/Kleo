// Mapa de instituciones financieras → estilo del logo (iniciales + color)
// Cubre los bancos principales de Puerto Rico y los emisores de tarjetas más comunes en EE.UU.

const BANKS = {
  // Puerto Rico
  popular: { initials: 'BPPR', bg: '#DC143C', fg: '#fff', name: 'Banco Popular' },
  oriental: { initials: 'OB', bg: '#34C759', fg: '#fff', name: 'Oriental Bank' },
  firstbank: { initials: 'FB', bg: '#E31937', fg: '#fff', name: 'FirstBank' },
  santander: { initials: 'S', bg: '#EC0000', fg: '#fff', name: 'Santander' },
  cooperativa: { initials: 'COOP', bg: '#0066B3', fg: '#fff', name: 'Cooperativa' },

  // Bancos USA principales
  chase: { initials: 'CH', bg: '#117ACA', fg: '#fff', name: 'Chase' },
  amex: { initials: 'AX', bg: '#007BC1', fg: '#fff', name: 'American Express' },
  'american express': { initials: 'AX', bg: '#007BC1', fg: '#fff', name: 'American Express' },
  discover: { initials: 'D', bg: '#FF6000', fg: '#fff', name: 'Discover' },
  capital: { initials: 'C1', bg: '#004977', fg: '#fff', name: 'Capital One' },
  'capital one': { initials: 'C1', bg: '#004977', fg: '#fff', name: 'Capital One' },
  citi: { initials: 'CITI', bg: '#003B70', fg: '#fff', name: 'Citi' },
  citibank: { initials: 'CITI', bg: '#003B70', fg: '#fff', name: 'Citibank' },
  bofa: { initials: 'BoA', bg: '#012169', fg: '#fff', name: 'Bank of America' },
  'bank of america': { initials: 'BoA', bg: '#012169', fg: '#fff', name: 'Bank of America' },
  wells: { initials: 'WF', bg: '#D71E28', fg: '#fff', name: 'Wells Fargo' },
  'wells fargo': { initials: 'WF', bg: '#D71E28', fg: '#fff', name: 'Wells Fargo' },
  marcus: { initials: 'M', bg: '#000', fg: '#fff', name: 'Marcus' },
  ally: { initials: 'A', bg: '#6E2585', fg: '#fff', name: 'Ally' },
  'ally bank': { initials: 'A', bg: '#6E2585', fg: '#fff', name: 'Ally' },
  apple: { initials: '', bg: '#000', fg: '#fff', name: 'Apple Card', icon: '' },
  goldman: { initials: 'GS', bg: '#7399C6', fg: '#fff', name: 'Goldman Sachs' }
};

/**
 * Obtén el estilo del logo para un nombre de banco/institución.
 * Coincidencia case-insensitive y por substring para que "Banco Popular" → 'popular'.
 */
export function getBankLogo(institutionOrName = '') {
  const k = institutionOrName.toLowerCase().trim();
  if (!k) return fallback(institutionOrName);

  // Match exacto
  if (BANKS[k]) return BANKS[k];

  // Match por substring (popular en "Banco Popular", chase en "Chase Sapphire")
  for (const key of Object.keys(BANKS)) {
    if (k.includes(key) || key.includes(k.split(' ')[0])) {
      return BANKS[key];
    }
  }

  return fallback(institutionOrName);
}

function fallback(name) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() || '')
    .join('') || '?';
  // Color basado en hash del nombre — consistente
  const colors = ['#5856D6', '#007AFF', '#00B589', '#FF9500', '#A855F7', '#FF2D6F'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return { initials, bg: colors[Math.abs(hash) % colors.length], fg: '#fff', name };
}
