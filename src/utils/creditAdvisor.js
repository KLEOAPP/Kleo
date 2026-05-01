// Asesor de crédito — calcula plan de acción exacto por tarjeta
// y proyecciones de pago de deuda.

import { fmtMoney } from './storage.js';

/**
 * Calcula la próxima fecha futura para un día del mes dado.
 * Si el día ya pasó este mes, devuelve la del próximo mes.
 */
export function nextDateForDay(day) {
  const today = new Date();
  const todayDay = today.getDate();
  let target = new Date(today.getFullYear(), today.getMonth(), day);
  if (todayDay >= day) {
    target = new Date(today.getFullYear(), today.getMonth() + 1, day);
  }
  return target;
}

export function daysFromToday(date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return Math.round((d - today) / (1000 * 60 * 60 * 24));
}

export function fmtShortDate(date) {
  return new Date(date).toLocaleDateString('es-PR', { day: 'numeric', month: 'long' });
}

/**
 * Genera el plan de acción para UNA tarjeta de crédito.
 * Devuelve qué pagar, cuándo, y hasta cuándo no usarla.
 */
export function cardActionPlan(card) {
  const balance = Math.abs(card.balance);
  const limit = card.limit || 1;
  const utilization = (balance / limit) * 100;

  // Targets
  const target5 = limit * 0.05;
  const target30 = limit * 0.30;
  const payToReach5 = Math.max(0, balance - target5);
  const payToReach30 = Math.max(0, balance - target30);

  // Fechas
  const cycleCloseDate = card.cycleCloseDay ? nextDateForDay(card.cycleCloseDay) : null;
  const paymentDueDate = card.paymentDueDay ? nextDateForDay(card.paymentDueDay) : null;
  const daysUntilClose = cycleCloseDate ? daysFromToday(cycleCloseDate) : null;
  const daysUntilDue = paymentDueDate ? daysFromToday(paymentDueDate) : null;

  // "Paga 2 días antes del cierre"
  const payByDate = cycleCloseDate
    ? new Date(cycleCloseDate.getTime() - 2 * 24 * 60 * 60 * 1000)
    : null;
  const daysUntilPayBy = payByDate ? daysFromToday(payByDate) : null;

  // Estado
  let status, statusColor, urgency;
  if (utilization < 5) {
    status = 'EXCELENTE';
    statusColor = '#00B589';
    urgency = 'none';
  } else if (utilization < 30) {
    status = 'BUENO';
    statusColor = '#FF9500';
    urgency = 'optional';
  } else if (utilization < 50) {
    status = 'ALTO';
    statusColor = '#FF8800';
    urgency = 'recommended';
  } else {
    status = 'CRÍTICO';
    statusColor = '#FF3B30';
    urgency = 'urgent';
  }

  // Acciones priorizadas
  const actions = [];

  if (utilization >= 5) {
    actions.push({
      priority: utilization >= 30 ? 'high' : 'medium',
      type: 'pay_for_5',
      title: `Paga ${fmtMoney(payToReach5)} para crédito EXCELENTE`,
      detail: `Bajará tu utilización de ${utilization.toFixed(1)}% a 5%. Te puede subir 20-50 puntos en tu score.`,
      payBy: payByDate,
      payByLabel: payByDate ? `Antes del ${fmtShortDate(payByDate)} (2 días antes del cierre)` : null,
      noUseFrom: payByDate,
      noUseUntil: cycleCloseDate,
      noUseLabel: cycleCloseDate ? `No uses la tarjeta del ${fmtShortDate(payByDate)} al ${fmtShortDate(cycleCloseDate)}` : null,
      whyText: `El balance que se reporta al buró es el del día del cierre (${fmtShortDate(cycleCloseDate)}). Si no usas la tarjeta esos 2 días, el balance reportado será exactamente lo que dejaste.`
    });
  }

  if (utilization >= 30) {
    actions.push({
      priority: 'critical',
      type: 'pay_for_30',
      title: `Mínimo paga ${fmtMoney(payToReach30)} para no afectar tu score`,
      detail: `Sobre 30% empieza a bajarte el score. Es el límite mínimo aceptable.`,
      payBy: payByDate,
      payByLabel: payByDate ? `Antes del ${fmtShortDate(payByDate)}` : null
    });
  }

  // Pago mínimo (siempre obligatorio para evitar atraso)
  if (paymentDueDate && card.minPayment) {
    actions.push({
      priority: daysUntilDue <= 5 ? 'critical' : 'medium',
      type: 'min_payment',
      title: `Pago mínimo: ${fmtMoney(card.minPayment)}`,
      detail: 'NUNCA pagues tarde. Un atraso de 30+ días puede bajar tu score 60-110 puntos.',
      payBy: paymentDueDate,
      payByLabel: `Vence el ${fmtShortDate(paymentDueDate)} (${daysUntilDue === 0 ? 'hoy' : daysUntilDue === 1 ? 'mañana' : `en ${daysUntilDue} días`})`
    });
  }

  return {
    balance,
    limit,
    utilization,
    target5,
    target30,
    payToReach5,
    payToReach30,
    cycleCloseDate,
    paymentDueDate,
    daysUntilClose,
    daysUntilDue,
    payByDate,
    daysUntilPayBy,
    status,
    statusColor,
    urgency,
    actions
  };
}

/**
 * Calcula meses para saldar una deuda con pago fijo.
 * Si el pago no cubre el interés, devuelve null.
 */
export function payoffMonths(balance, apr, monthlyPayment) {
  const r = apr / 100 / 12;
  if (monthlyPayment <= balance * r) return null; // nunca termina
  const months = -Math.log(1 - (balance * r) / monthlyPayment) / Math.log(1 + r);
  return Math.ceil(months);
}

export function totalInterest(balance, apr, monthlyPayment) {
  const months = payoffMonths(balance, apr, monthlyPayment);
  if (!months) return null;
  return monthlyPayment * months - balance;
}

/**
 * Compara pagar el mínimo vs pagar extra.
 * Devuelve cuántos meses ahorras y cuánto en intereses.
 */
export function payoffComparison(balance, apr, minPayment, extraPayment) {
  const minMonths = payoffMonths(balance, apr, minPayment);
  const minInterest = totalInterest(balance, apr, minPayment);
  const extraMonths = payoffMonths(balance, apr, minPayment + extraPayment);
  const extraInterest = totalInterest(balance, apr, minPayment + extraPayment);

  return {
    minMonths,
    minInterest,
    extraMonths,
    extraInterest,
    monthsSaved: minMonths && extraMonths ? minMonths - extraMonths : null,
    interestSaved: minInterest && extraInterest ? minInterest - extraInterest : null
  };
}

/**
 * Recomienda pago basado en ingreso disponible
 */
export function affordableExtraPayment(monthlyIncome, fixedExpenses, currentMinPayments) {
  const disposable = monthlyIncome - fixedExpenses - currentMinPayments;
  // Sugerir 50% del disponible para pago extra
  return Math.max(0, Math.floor(disposable * 0.5));
}
