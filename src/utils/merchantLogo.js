// Mapea nombres de comercios a sus dominios y devuelve la URL del logo.
// Usa el servicio gratis de Google que devuelve favicons de alta calidad.

const MERCHANT_DOMAINS = {
  // Supermercados y compras PR/USA
  'walmart': 'walmart.com',
  'costco': 'costco.com',
  'pueblo': 'puebloiq.com',
  'econo': 'econopr.com',
  'sams': 'samsclub.com',
  'sam\'s': 'samsclub.com',
  'kmart': 'kmart.com',
  'ralphs': 'ralphs.com',
  'amigo': 'supermercadosamigo.com',
  'selectos': 'supermercadosselectos.com',

  // Restaurantes
  'el meson': 'elmesonsandwiches.com',
  'el mesón': 'elmesonsandwiches.com',
  'subway': 'subway.com',
  'chili': 'chilis.com',
  'burger king': 'bk.com',
  'mcdonald': 'mcdonalds.com',
  'wendy': 'wendys.com',
  'kfc': 'kfc.com',
  'taco bell': 'tacobell.com',
  'pollo tropical': 'pollotropical.com',
  'denny': 'dennys.com',
  'applebee': 'applebees.com',
  'olive garden': 'olivegarden.com',
  'starbucks': 'starbucks.com',
  'chocobar': 'chocobar.pr',
  'panera': 'panerabread.com',
  'pizza hut': 'pizzahut.com',
  'domino': 'dominos.com',

  // Salud / Farmacia
  'walgreens': 'walgreens.com',
  'cvs': 'cvs.com',
  'rite aid': 'riteaid.com',

  // Gasolina
  'texaco': 'texaco.com',
  'shell': 'shell.com',
  'chevron': 'chevron.com',
  'mobil': 'exxonmobil.com',
  'total': 'totalenergies.com',
  'puma': 'pumaenergy.com',
  'gulf': 'gulfoil.com',
  'sunoco': 'sunoco.com',

  // Bancos
  'banco popular': 'popular.com',
  'popular': 'popular.com',
  'chase': 'chase.com',
  'discover': 'discover.com',
  'oriental': 'orientalbank.com',
  'firstbank': 'firstbankpr.com',
  'bank of america': 'bankofamerica.com',
  'wells fargo': 'wellsfargo.com',
  'capital one': 'capitalone.com',
  'amex': 'americanexpress.com',
  'american express': 'americanexpress.com',

  // Pago / Transferencias
  'ath': 'athmovil.com',
  'paypal': 'paypal.com',
  'venmo': 'venmo.com',
  'zelle': 'zellepay.com',
  'cash app': 'cash.app',

  // Tiendas
  'marshalls': 'marshalls.com',
  'tj maxx': 'tjmaxx.com',
  'jc penney': 'jcpenney.com',
  'jcpenney': 'jcpenney.com',
  'target': 'target.com',
  'home depot': 'homedepot.com',
  'lowes': 'lowes.com',
  'best buy': 'bestbuy.com',
  'macy': 'macys.com',
  'old navy': 'oldnavy.com',
  'gap': 'gap.com',
  'ross': 'rossstores.com',
  'sephora': 'sephora.com',
  'ulta': 'ulta.com',
  'apple store': 'apple.com',
  'apple': 'apple.com',

  // Online
  'amazon': 'amazon.com',
  'ebay': 'ebay.com',
  'shein': 'shein.com',
  'temu': 'temu.com',

  // Streaming / Suscripciones
  'netflix': 'netflix.com',
  'spotify': 'spotify.com',
  'apple music': 'apple.com',
  'disney': 'disneyplus.com',
  'hbo': 'hbomax.com',
  'max': 'max.com',
  'youtube': 'youtube.com',
  'paramount': 'paramountplus.com',
  'hulu': 'hulu.com',
  'prime video': 'primevideo.com',

  // Servicios PR
  'luma': 'lumapr.com',
  'aaa': 'acueductospr.com',
  'acueductos': 'acueductospr.com',
  'claro': 'claropr.com',
  't-mobile': 't-mobile.com',
  'tmobile': 't-mobile.com',
  'liberty': 'libertypr.com',
  'at&t': 'att.com',
  'att': 'att.com',
  'verizon': 'verizon.com',
  'mapfre': 'mapfre.pr',
  'triple-s': 'ssspr.com',
  'humana': 'humana.com',
  'mcs': 'mcs.com.pr',

  // Cines y entretenimiento
  'cinepolis': 'cinepolis.com',
  'cinépolis': 'cinepolis.com',
  'caribbean cinemas': 'caribbeancinemas.com',
  'amc': 'amctheatres.com',

  // Gimnasios
  'smart fit': 'smartfit.com',
  'planet fitness': 'planetfitness.com',
  'gold': 'goldsgym.com',

  // Transporte
  'uber': 'uber.com',
  'lyft': 'lyft.com',
  'jetblue': 'jetblue.com',
  'american airlines': 'aa.com',
  'delta': 'delta.com',
  'spirit': 'spirit.com',
  'frontier': 'flyfrontier.com'
};

function findDomain(merchantName) {
  if (!merchantName) return null;
  const lower = merchantName.toLowerCase().trim();

  // Match exacto primero
  for (const key of Object.keys(MERCHANT_DOMAINS)) {
    if (lower.includes(key)) {
      return MERCHANT_DOMAINS[key];
    }
  }
  return null;
}

/**
 * Devuelve la URL del logo del comercio o null si no se encuentra
 * @param {string} merchant - Nombre del comercio
 * @param {number} size - Tamaño en pixels
 */
export function merchantLogo(merchant, size = 64) {
  const domain = findDomain(merchant);
  if (!domain) return null;
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`;
}

export function hasLogo(merchant) {
  return findDomain(merchant) !== null;
}
