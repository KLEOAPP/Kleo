// Perfil del asesor — preferencias y respuestas del onboarding.
// Vive en localStorage por ahora (`kleo_advisor_profile`), luego se sincroniza
// con Supabase user_advisor_profile.

const STORAGE_KEY = 'kleo_advisor_profile';

/**
 * Estructura del perfil:
 * {
 *   onboarding_completed: bool,
 *   has_existing_plan: bool | null,
 *   existing_plan_description: string | null,
 *   target_utilization: 5 | 10 | 15 | 20 | 25 | 30,
 *   manual_aprs: { [card_id]: number },         // APR ingresado a mano
 *   uploaded_statements: { [card_id]: string }, // referencia al statement
 *   created_at, updated_at
 * }
 */

export function getAdvisorProfile() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

export function saveAdvisorProfile(profile) {
  const existing = getAdvisorProfile() || {};
  const next = {
    ...existing,
    ...profile,
    updated_at: new Date().toISOString(),
    created_at: existing.created_at || new Date().toISOString()
  };
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
  return next;
}

export function setManualApr(cardId, apr) {
  const p = getAdvisorProfile() || {};
  const aprs = { ...(p.manual_aprs || {}), [cardId]: parseFloat(apr) };
  return saveAdvisorProfile({ manual_aprs: aprs });
}

export function clearAdvisorProfile() {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
}

// ============================================================
// UTILIZACIÓN — opciones que el usuario puede escoger
// ============================================================

export const UTILIZATION_OPTIONS = [
  {
    pct: 5,
    badge: 'Excelente',
    badgeColor: '#00E5B0',
    impact: 'Máximo impacto positivo en tu score',
    bestFor: 'Quien quiere score 800+',
    pros: 'Score sube rápido. Crédito disponible para emergencias.',
    cons: 'Requiere disciplina y pagos frecuentes.',
    recommended: true
  },
  {
    pct: 10,
    badge: 'Muy bueno',
    badgeColor: '#00E5B0',
    impact: 'Score alto sin tanto estrés',
    bestFor: 'Mantener score alto con uso moderado',
    pros: 'Buen balance entre uso y score.',
    cons: 'Score sube más lento que 5%.'
  },
  {
    pct: 15,
    badge: 'Bueno',
    badgeColor: '#34C759',
    impact: 'Score estable',
    bestFor: 'Balance entre uso real y score',
    pros: 'Más flexibilidad para usar la tarjeta.',
    cons: 'Score crece pero no rápido.'
  },
  {
    pct: 20,
    badge: 'Aceptable',
    badgeColor: '#FFD60A',
    impact: 'Score estable, no sube mucho',
    bestFor: 'Uso moderado de la tarjeta',
    pros: 'Más espacio para usar crédito.',
    cons: 'Score se mantiene pero no mejora.'
  },
  {
    pct: 25,
    badge: 'Justo',
    badgeColor: '#FF9500',
    impact: 'Riesgo si subes',
    bestFor: 'Solo si necesitas usar la tarjeta como herramienta',
    pros: 'Más uso disponible.',
    cons: 'Cerca del límite de 30%. Cualquier compra extra puede afectar.'
  },
  {
    pct: 30,
    badge: 'Límite',
    badgeColor: '#FF4D6D',
    impact: 'No bajes de aquí',
    bestFor: 'Es el techo absoluto recomendado',
    pros: 'Máximo uso permitido sin afectar score.',
    cons: 'Sobre 30% el score baja notablemente. Sin margen.'
  }
];

/**
 * Cuánto pagar para llegar a la utilización meta.
 */
export function paymentToReachTarget(currentBalance, limit, targetPct) {
  if (!limit || limit <= 0) return 0;
  const targetBalance = limit * (targetPct / 100);
  return Math.max(0, currentBalance - targetBalance);
}

/**
 * Obtiene el APR efectivo de una tarjeta:
 * primero el de Plaid, si no hay usa el manual del perfil.
 */
export function effectiveApr(card, profile) {
  if (card?.apr) return card.apr;
  return profile?.manual_aprs?.[card?.id] || null;
}

/**
 * Lista de tarjetas que aún no tienen APR (ni de Plaid ni manual).
 */
export function cardsWithoutApr(cards, profile) {
  return cards.filter(c => !effectiveApr(c, profile));
}
