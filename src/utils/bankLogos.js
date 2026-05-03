// Mapa de instituciones financieras → dominio + estilo de fallback
// Probamos múltiples fuentes de logos en cadena para máxima confiabilidad:
//   1) Clearbit Logo API (logos limpios sobre transparente)
//   2) Google Favicon S2 (siempre funciona si el dominio existe)
//   3) DuckDuckGo icon service
// Si todas fallan, mostramos las iniciales con el color de marca.

const BANKS = {
  // Puerto Rico
  popular: { domain: 'popular.com', initials: 'BPPR', bg: '#DC143C', name: 'Banco Popular' },
  'banco popular': { domain: 'popular.com', initials: 'BPPR', bg: '#DC143C', name: 'Banco Popular' },
  bppr: { domain: 'popular.com', initials: 'BPPR', bg: '#DC143C', name: 'Banco Popular' },
  oriental: { domain: 'orientalbank.com', initials: 'OB', bg: '#34C759', name: 'Oriental Bank' },
  'oriental bank': { domain: 'orientalbank.com', initials: 'OB', bg: '#34C759', name: 'Oriental Bank' },
  firstbank: { domain: 'firstbankpr.com', initials: 'FB', bg: '#E31937', name: 'FirstBank' },
  'first bank': { domain: 'firstbankpr.com', initials: 'FB', bg: '#E31937', name: 'FirstBank' },
  santander: { domain: 'santander.com', initials: 'S', bg: '#EC0000', name: 'Santander' },
  cooperativa: { domain: 'coopcoqui.com', initials: 'COOP', bg: '#0066B3', name: 'Cooperativa' },

  // Bancos USA
  chase: { domain: 'chase.com', initials: 'CH', bg: '#117ACA', name: 'Chase' },
  'jpmorgan chase': { domain: 'chase.com', initials: 'CH', bg: '#117ACA', name: 'Chase' },
  'sapphire': { domain: 'chase.com', initials: 'CH', bg: '#117ACA', name: 'Chase Sapphire' },
  amex: { domain: 'americanexpress.com', initials: 'AX', bg: '#007BC1', name: 'American Express' },
  'american express': { domain: 'americanexpress.com', initials: 'AX', bg: '#007BC1', name: 'American Express' },
  'blue cash': { domain: 'americanexpress.com', initials: 'AX', bg: '#007BC1', name: 'American Express' },
  discover: { domain: 'discover.com', initials: 'D', bg: '#FF6000', name: 'Discover' },
  'capital one': { domain: 'capitalone.com', initials: 'C1', bg: '#004977', name: 'Capital One' },
  capital: { domain: 'capitalone.com', initials: 'C1', bg: '#004977', name: 'Capital One' },
  citi: { domain: 'citi.com', initials: 'CITI', bg: '#003B70', name: 'Citi' },
  citibank: { domain: 'citi.com', initials: 'CITI', bg: '#003B70', name: 'Citibank' },
  bofa: { domain: 'bankofamerica.com', initials: 'BoA', bg: '#012169', name: 'Bank of America' },
  'bank of america': { domain: 'bankofamerica.com', initials: 'BoA', bg: '#012169', name: 'Bank of America' },
  wells: { domain: 'wellsfargo.com', initials: 'WF', bg: '#D71E28', name: 'Wells Fargo' },
  'wells fargo': { domain: 'wellsfargo.com', initials: 'WF', bg: '#D71E28', name: 'Wells Fargo' },
  marcus: { domain: 'marcus.com', initials: 'M', bg: '#000', name: 'Marcus' },
  'marcus by goldman': { domain: 'marcus.com', initials: 'M', bg: '#000', name: 'Marcus' },
  ally: { domain: 'ally.com', initials: 'A', bg: '#6E2585', name: 'Ally' },
  'ally bank': { domain: 'ally.com', initials: 'A', bg: '#6E2585', name: 'Ally' },
  apple: { domain: 'apple.com', initials: '', bg: '#000', name: 'Apple Card' },
  'apple card': { domain: 'apple.com', initials: '', bg: '#000', name: 'Apple Card' },
  goldman: { domain: 'goldmansachs.com', initials: 'GS', bg: '#7399C6', name: 'Goldman Sachs' },
  usbank: { domain: 'usbank.com', initials: 'US', bg: '#0E5BAA', name: 'U.S. Bank' },
  'u.s. bank': { domain: 'usbank.com', initials: 'US', bg: '#0E5BAA', name: 'U.S. Bank' },
  pnc: { domain: 'pnc.com', initials: 'PNC', bg: '#F58025', name: 'PNC Bank' }
};

/** Genera la cadena de URLs candidatas para el logo de un dominio. */
function buildUrls(domain) {
  if (!domain) return [];
  return [
    `https://logo.clearbit.com/${domain}`,
    `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
    `https://icons.duckduckgo.com/ip3/${domain}.ico`
  ];
}

export function getBankLogo(institutionOrName = '') {
  const k = institutionOrName.toLowerCase().trim();
  if (!k) return fallback(institutionOrName);

  if (BANKS[k]) return withUrls(BANKS[k]);

  for (const key of Object.keys(BANKS)) {
    if (k.includes(key) || key.includes(k.split(' ')[0])) {
      return withUrls(BANKS[key]);
    }
  }

  return fallback(institutionOrName);
}

function withUrls(bank) {
  return { ...bank, urls: buildUrls(bank.domain) };
}

function fallback(name) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() || '')
    .join('') || '?';
  const colors = ['#5856D6', '#007AFF', '#00B589', '#FF9500', '#A855F7', '#FF2D6F'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return {
    urls: [],
    initials,
    bg: colors[Math.abs(hash) % colors.length],
    name
  };
}
