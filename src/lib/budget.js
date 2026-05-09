// Presupuesto del usuario — frecuencia de cobro + alocación por categorías.
// Se guarda en localStorage por ahora; cuando exista la tabla user_budgets
// se sincroniza con Supabase.

const STORAGE_KEY = 'kleo_budget';

export const FREQUENCIES = [
  { id: 'weekly',      label: 'Semanal',     days: 7,  hint: 'Cada 7 días' },
  { id: 'biweekly',    label: 'Bisemanal',   days: 14, hint: 'Cada 2 semanas' },
  { id: 'semimonthly', label: 'Quincenal',   days: 15, hint: 'Días 15 y 30' },
  { id: 'monthly',     label: 'Mensual',     days: 30, hint: 'Una vez al mes' }
];

export const DEFAULT_ALLOCATION = {
  essentials: 50,  // renta, luz, agua, comida, transporte
  savings: 20,     // ahorro / fondo de emergencia
  plans: 10,       // metas / viajes / objetivos específicos
  personal: 20     // entretenimiento, ropa, comer fuera
};

export const ALLOCATION_LABELS = {
  essentials: { label: 'Esenciales', emoji: '🏠', color: '#FF4D6D', desc: 'Renta, luz, agua, comida, transporte' },
  savings:    { label: 'Ahorro',     emoji: '💰', color: '#00E5B0', desc: 'Fondo de emergencia, retiro' },
  plans:      { label: 'Planes',     emoji: '✈️', color: '#A855F7', desc: 'Viajes, metas específicas' },
  personal:   { label: 'Personal',   emoji: '🎯', color: '#FF9500', desc: 'Entretenimiento, ropa, comer fuera' }
};

export function getBudget() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const b = JSON.parse(raw);
    if (!b.pay_frequency || !b.paycheck_amount) return null;
    return b;
  } catch { return null; }
}

export function saveBudget(budget) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(budget));
  } catch {}
}

export function clearBudget() {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
}

/**
 * Calcula días restantes hasta el próximo cheque.
 */
export function daysUntilNextPaycheck(budget) {
  if (!budget?.next_paycheck_date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const next = new Date(budget.next_paycheck_date);
  next.setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil((next - today) / 86400000));
}

/**
 * Devuelve el monto absoluto por cada categoría usando los porcentajes
 * y el monto del cheque.
 */
export function budgetAmounts(budget) {
  if (!budget?.paycheck_amount) return null;
  const total = budget.paycheck_amount;
  const alloc = budget.allocation || DEFAULT_ALLOCATION;
  return {
    essentials: +(total * (alloc.essentials / 100)).toFixed(2),
    savings:    +(total * (alloc.savings / 100)).toFixed(2),
    plans:      +(total * (alloc.plans / 100)).toFixed(2),
    personal:   +(total * (alloc.personal / 100)).toFixed(2)
  };
}

/**
 * Calcula el "disponible" según un periodo elegido por el usuario.
 * El periodo divide el presupuesto del ciclo de pago en chunks.
 *
 * - day: monto del cheque dividido entre los días del ciclo
 * - week: monto del cheque escalado a 7 días
 * - period: monto completo del cheque (todo el ciclo)
 *
 * Solo cuenta lo "personal" (los esenciales/savings/planes están comprometidos).
 */
export function disponibleByPeriod(budget, period) {
  if (!budget) return null;
  const amounts = budgetAmounts(budget);
  if (!amounts) return null;

  const cycleDays = FREQUENCIES.find(f => f.id === budget.pay_frequency)?.days || 14;
  // El "disponible para gastar libremente" es Personal + Planes
  const freelySpendable = amounts.personal + amounts.plans;

  if (period === 'day')    return +(freelySpendable / cycleDays).toFixed(2);
  if (period === 'week')   return +(freelySpendable * (7 / cycleDays)).toFixed(2);
  if (period === 'period') return freelySpendable;
  if (period === 'month')  return +(freelySpendable * (30 / cycleDays)).toFixed(2);
  return freelySpendable;
}

/**
 * Detecta la frecuencia desde transacciones (entrada de dinero positiva).
 * Devuelve { frequency, avgAmount, nextPaycheckDate } o null si no hay data.
 */
export function detectFrequencyFromTransactions(transactions = []) {
  const inflows = transactions
    .filter(t => t.amount > 0 && t.category !== 'transferencia')
    .filter(t => {
      const m = (t.merchant || '').toLowerCase();
      return m.includes('payroll') || m.includes('deposit') || m.includes('nomina') ||
             m.includes('salary') || m.includes('direct dep');
    })
    .map(t => ({ ...t, dateObj: new Date(t.date) }))
    .sort((a, b) => b.dateObj - a.dateObj);

  if (inflows.length < 2) return null;

  const gaps = [];
  for (let i = 0; i < inflows.length - 1; i++) {
    const d = (inflows[i].dateObj - inflows[i + 1].dateObj) / 86400000;
    if (d > 1) gaps.push(d);
  }
  if (gaps.length === 0) return null;

  const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  let frequency = null;
  if (avgGap >= 5 && avgGap <= 9) frequency = 'weekly';
  else if (avgGap >= 12 && avgGap <= 16) frequency = 'biweekly';
  else if (avgGap >= 13 && avgGap <= 17) frequency = 'semimonthly';
  else if (avgGap >= 27 && avgGap <= 33) frequency = 'monthly';

  if (!frequency) return null;

  const avgAmount = +(inflows.slice(0, 6).reduce((s, t) => s + t.amount, 0) / Math.min(6, inflows.length)).toFixed(2);
  const nextPaycheckDate = new Date(inflows[0].dateObj.getTime() + avgGap * 86400000).toISOString().slice(0, 10);

  return { frequency, avgAmount, nextPaycheckDate };
}
