// Detección automática de suscripciones recurrentes y construcción de eventos del calendario.

import { daysInMonth } from './storage.js';

/**
 * Detecta suscripciones recurrentes mirando transacciones pasadas:
 * mismo merchant, monto similar (±10%), aparece en al menos 2 meses
 * con cadencia mensual (~30 días). Devuelve [{ merchant, amount, day, category }].
 */
export function detectSubscriptions(transactions) {
  if (!transactions || transactions.length === 0) return [];

  // Agrupar por merchant (case-insensitive)
  const byMerchant = {};
  transactions
    .filter(t => t.amount < 0 && t.category !== 'transferencia')
    .forEach(t => {
      const k = (t.merchant || '').toLowerCase().trim();
      if (!k) return;
      if (!byMerchant[k]) byMerchant[k] = [];
      byMerchant[k].push({
        ...t,
        amount: Math.abs(t.amount),
        date: new Date(t.date)
      });
    });

  const subs = [];
  Object.entries(byMerchant).forEach(([key, txs]) => {
    if (txs.length < 2) return;

    // Ordenar por fecha desc
    txs.sort((a, b) => b.date - a.date);

    // Verificar cadencia mensual: la diferencia entre transacciones consecutivas debe estar entre 25-35 días
    let monthlyHits = 0;
    for (let i = 0; i < txs.length - 1; i++) {
      const diffDays = (txs[i].date - txs[i + 1].date) / (1000 * 60 * 60 * 24);
      if (diffDays >= 25 && diffDays <= 35) monthlyHits++;
    }
    if (monthlyHits < 1) return;

    // Verificar montos similares (±15%)
    const avgAmount = txs.reduce((s, t) => s + t.amount, 0) / txs.length;
    const allSimilar = txs.every(t => Math.abs(t.amount - avgAmount) / avgAmount <= 0.15);
    if (!allSimilar) return;

    // Día del mes — promedio de los últimos 3
    const recentDays = txs.slice(0, 3).map(t => t.date.getDate());
    const avgDay = Math.round(recentDays.reduce((s, d) => s + d, 0) / recentDays.length);

    subs.push({
      merchant: txs[0].merchant,
      key,
      amount: avgAmount,
      day: Math.min(28, avgDay), // cap a 28 para evitar problemas en febrero
      category: txs[0].category
    });
  });

  return subs;
}

/**
 * Computa los días de aporte programado dentro de un mes específico,
 * tomando como referencia goal.schedule.nextDate y goal.schedule.frequency.
 */
export function depositDaysInMonth(schedule, year, month) {
  if (!schedule?.amount || !schedule?.frequency || !schedule?.nextDate) return [];
  const FREQ = { weekly: 7, biweekly: 14, semimonthly: 15, monthly: 30 };
  const periodDays = FREQ[schedule.frequency] || 7;
  const start = new Date(schedule.nextDate);
  const monthEnd = new Date(year, month + 1, 0, 23, 59);
  const days = [];
  let cursor = new Date(start);
  // Si nextDate es anterior al mes, avanzamos hasta el primer depósito dentro del mes
  while (cursor < new Date(year, month, 1)) {
    cursor = new Date(cursor.getTime() + periodDays * 86400000);
    if (cursor > new Date(year + 5, 0)) return []; // safety
  }
  while (cursor <= monthEnd) {
    if (cursor.getMonth() === month && cursor.getFullYear() === year) {
      days.push(cursor.getDate());
    }
    cursor = new Date(cursor.getTime() + periodDays * 86400000);
  }
  return days;
}

/**
 * Detecta si un evento ya fue pagado mirando las transacciones reales del cliente.
 * Empareja por monto cercano (±10%) + ventana de fechas (±7d) + heurística por tipo.
 */
function detectPaidEvent(event, eventDate, transactions) {
  if (!transactions || transactions.length === 0) return null;
  const windowDays = event.type === 'subscription' ? 4 : 7;
  const startMs = eventDate.getTime() - windowDays * 86400000;
  const endMs = eventDate.getTime() + windowDays * 86400000;

  for (const t of transactions) {
    const td = new Date(t.date).getTime();
    if (td < startMs || td > endMs) continue;

    // Para pagos/gastos: la transacción debe ser saliente; para metas: entrante
    const amt = Math.abs(t.amount);
    const isOutflow = t.amount < 0;
    const isInflow = t.amount > 0;
    if (event.type === 'goal' && !isInflow) continue;
    if (event.type !== 'goal' && !isOutflow) continue;

    // Tolerancia de monto (±10%, pero al menos $1)
    const tol = Math.max(1, event.amount * 0.10);
    if (Math.abs(amt - event.amount) > tol) continue;

    // Filtros adicionales por tipo
    if (event.type === 'subscription' && event.merchant) {
      const tag = event.merchant.toLowerCase().split(/\s+/)[0];
      if (!(t.merchant || '').toLowerCase().includes(tag)) continue;
    }
    if (event.type === 'fixed' && event.name) {
      const firstWord = event.name.toLowerCase().split(/\s+/)[0];
      const merchantLow = (t.merchant || '').toLowerCase();
      if (!merchantLow.includes(firstWord) && t.category !== 'servicios' && t.category !== 'hogar') continue;
    }
    if (event.type === 'payment' && event.cardId) {
      // Aceptamos cualquier salida de la cuenta corriente con monto similar; difícil de validar 100%
    }

    return { paidDate: new Date(t.date), txId: t.id, txMerchant: t.merchant };
  }
  return null;
}

/**
 * Genera todos los eventos del mes a partir de las fuentes de datos del usuario.
 * Cada evento tiene { id, type, day, name, amount, color, urgency, locked, paid, ...meta }.
 */
export function buildMonthEvents({ year, month, fixedExpenses = [], accounts = [], transactions = [], goals = [], manualEvents = [] }) {
  const events = [];
  const dim = daysInMonth(year, month);
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const todayDay = isCurrentMonth ? today.getDate() : -1;

  const urgencyForDay = (day) => {
    if (!isCurrentMonth) return 'future';
    const diff = day - todayDay;
    if (diff < 0) return 'past';
    if (diff === 0) return 'today';
    if (diff <= 3) return 'urgent';
    if (diff <= 7) return 'upcoming';
    return 'future';
  };

  // === Pagos fijos ===
  fixedExpenses.forEach(f => {
    const day = Math.min(f.dueDay, dim);
    const urgency = urgencyForDay(day);
    events.push({
      id: `fixed-${f.id}`,
      type: 'fixed',
      day,
      name: f.name,
      amount: f.amount,
      color: urgency === 'urgent' || urgency === 'today' ? '#FF4D6D' : urgency === 'upcoming' ? '#FFD60A' : '#FF9500',
      urgency,
      icon: f.icon || '🏠',
      locked: false,
      editable: { reminder: true, amount: false, date: false }
    });
  });

  // === Tarjetas de crédito: cierre + pago mínimo ===
  accounts.filter(a => a.type === 'credit').forEach(card => {
    if (card.cycleCloseDay) {
      events.push({
        id: `cycle-${card.id}`,
        type: 'cycle',
        day: Math.min(card.cycleCloseDay, dim),
        name: `Cierre ${card.name}`,
        amount: Math.abs(card.balance),
        color: '#0A84FF',
        urgency: urgencyForDay(card.cycleCloseDay),
        institution: card.institution || card.name,
        last4: card.last4,
        locked: true,
        lockedReason: 'bank-set',
        editable: { reminder: true, amount: false, date: false }
      });
    }
    if (card.paymentDueDay) {
      const day = Math.min(card.paymentDueDay, dim);
      const urgency = urgencyForDay(day);
      events.push({
        id: `pay-${card.id}`,
        type: 'payment',
        day,
        name: `Pago mín. ${card.name}`,
        amount: card.minPayment || Math.abs(card.balance),
        color: urgency === 'urgent' || urgency === 'today' ? '#FF4D6D' : urgency === 'upcoming' ? '#FFD60A' : '#FF4D6D',
        urgency,
        institution: card.institution || card.name,
        last4: card.last4,
        cardId: card.id,
        locked: true,
        lockedReason: 'bank-set',
        editable: { reminder: true, amount: false, date: false }
      });
    }
  });

  // === Suscripciones detectadas ===
  const subs = detectSubscriptions(transactions);
  subs.forEach(sub => {
    const day = Math.min(sub.day, dim);
    events.push({
      id: `sub-${sub.key}`,
      type: 'subscription',
      day,
      name: sub.merchant,
      amount: sub.amount,
      color: '#A855F7',
      urgency: urgencyForDay(day),
      merchant: sub.merchant,
      category: sub.category,
      locked: false,
      editable: { reminder: true, amount: true, date: true }
    });
  });

  // === Aportes a metas ===
  goals.forEach(g => {
    if (!g.schedule?.amount) return;
    const days = depositDaysInMonth(g.schedule, year, month);
    days.forEach(day => {
      events.push({
        id: `goal-${g.id}-${day}`,
        type: 'goal',
        day,
        name: g.name,
        amount: g.schedule.amount,
        color: '#00E5B0',
        urgency: urgencyForDay(day),
        icon: g.icon,
        goalId: g.id,
        locked: false,
        editable: { reminder: true, amount: true, date: true }
      });
    });
  });

  // === Eventos manuales del usuario ===
  manualEvents
    .filter(e => e.month === month && e.year === year)
    .forEach(e => {
      events.push({
        id: e.id,
        type: 'manual',
        day: e.day,
        name: e.name,
        amount: e.amount,
        color: e.color || '#5856D6',
        urgency: urgencyForDay(e.day),
        icon: e.icon || '🔔',
        locked: false,
        editable: { reminder: true, amount: true, date: true },
        manual: true
      });
    });

  // === Alertas IA: utilización alta cerca del cierre ===
  accounts.filter(a => a.type === 'credit').forEach(card => {
    const util = card.limit > 0 ? (Math.abs(card.balance) / card.limit) * 100 : 0;
    if (util >= 30 && card.cycleCloseDay) {
      const closeDay = Math.min(card.cycleCloseDay, dim);
      const alertDay = Math.max(1, closeDay - 3);
      events.push({
        id: `alert-util-${card.id}`,
        type: 'alert',
        day: alertDay,
        name: `Utilización alta: ${card.name}`,
        amount: 0,
        color: '#FF9500',
        urgency: urgencyForDay(alertDay),
        institution: card.institution || card.name,
        message: `${util.toFixed(0)}% de utilización antes del cierre. Considera bajarla a 5% para evitar bajar tu score.`,
        locked: true,
        lockedReason: 'ai',
        editable: { reminder: false, amount: false, date: false }
      });
    }
  });

  // Marcar pagados automáticamente con base en transacciones reales
  return events.map(e => {
    if (e.type === 'alert') return { ...e, paid: false };
    const eventDate = new Date(year, month, e.day);
    const detected = detectPaidEvent(e, eventDate, transactions);
    return detected
      ? { ...e, paid: true, paidDate: detected.paidDate, paidVia: detected.txMerchant }
      : { ...e, paid: false };
  });
}

/** Cuenta eventos por día y devuelve un mapa { [day]: events[] } */
export function eventsByDay(events) {
  const map = {};
  events.forEach(e => {
    if (!map[e.day]) map[e.day] = [];
    map[e.day].push(e);
  });
  // Ordenar cada día por urgencia → urgente, próximo, futuro
  const order = { today: 0, urgent: 1, upcoming: 2, future: 3, past: 4 };
  Object.values(map).forEach(arr => arr.sort((a, b) => (order[a.urgency] ?? 5) - (order[b.urgency] ?? 5)));
  return map;
}
