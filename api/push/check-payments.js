// Cron diario que evalúa todas las reglas de notificación del spec
// (KLEO_NOTIFICATIONS_SPEC.md) y dispara los pushes apropiados.
//
// Programado en vercel.json para correr a las 11:00 UTC (07:00 PR).

import {
  supabase, sendUserNotification, daysUntilDayOfMonth,
  paymentToReachTarget, getAdvisorProfileServer, motivation,
  hasRecentPaymentForCard
} from './_lib.js';

export default async function handler(req, res) {
  try {
    const today = new Date();
    const todayDay = today.getDate();
    const isMonday = today.getUTCDay() === 1;
    const utcHour = new Date().getUTCHours();
    const prHour = (utcHour - 4 + 24) % 24;

    const summary = {
      cycle_close_2d: 0,
      payment_due_today: 0,
      cycle_closed_yesterday: 0,
      fixed_3d: 0,
      fixed_today: 0,
      weekly_summary: 0,
      skipped: 0
    };

    // Iteramos por usuario con suscripciones activas
    const { data: users } = await supabase
      .from('push_subscriptions')
      .select('user_id')
      .neq('user_id', null);

    const userIds = [...new Set((users || []).map(u => u.user_id))];

    for (const userId of userIds) {
      const advisorProfile = await getAdvisorProfileServer(userId);
      const targetUtil = advisorProfile?.target_utilization || 5;

      // ===== TARJETAS DE CRÉDITO =====
      const { data: cards } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', userId)
        .eq('type', 'credit')
        .eq('is_active', true);

      for (const card of cards || []) {
        const limit = card.credit_limit || 0;
        const balance = Math.abs(card.balance || 0);
        if (!limit) continue;

        const cycleClose = card.cycle_close_day;
        const paymentDue = card.payment_due_day;
        const daysToClose = daysUntilDayOfMonth(cycleClose, today);
        const daysToPayment = daysUntilDayOfMonth(paymentDue, today);
        const amountToPay = paymentToReachTarget(balance, limit, targetUtil);
        const currentUtil = ((balance / limit) * 100).toFixed(0);
        const cardLabel = `${card.institution || card.name} ••${card.last4}`;

        // ── 1) 2 días antes del cycle close — recordatorio de pago ──
        if (daysToClose === 2 && amountToPay > 0) {
          const r = await sendUserNotification({
            userId, type: 'cycle_close_2d', refId: `${card.id}-${today.getMonth()}`,
            prefKey: 'cycle_close_reminder',
            title: `💳 Paga $${Math.ceil(amountToPay).toLocaleString()} de ${card.institution || card.name}`,
            body: `Tu ${cardLabel} cierra ciclo en 2 días. Pagando $${Math.ceil(amountToPay).toLocaleString()} reportas ${targetUtil}% al buró y tu score sube. ${motivation('cycleSoon')}`,
            section: 'credit'
          });
          if (r === 'sent') summary.cycle_close_2d++;
          else summary.skipped++;
        }

        // ── 2) Día del pago mínimo — si no hay pago detectado ──
        if (daysToPayment === 0) {
          const paid = await hasRecentPaymentForCard(userId, card.id);
          if (!paid) {
            const minPay = card.min_payment || amountToPay || 25;
            const r = await sendUserNotification({
              userId, type: 'payment_due_today', refId: `${card.id}-${today.getMonth()}`,
              prefKey: 'payment_due_reminder', ignoreLimit: true, // crítico, ignora límite
              title: `⚠️ Vence hoy: ${cardLabel}`,
              body: `Hoy es el día. Paga al menos $${Math.ceil(minPay).toLocaleString()} para evitar cargo por atraso ($35) y proteger tu score. ${motivation('paymentToday')}`,
              section: 'credit'
            });
            if (r === 'sent') summary.payment_due_today++;
            else summary.skipped++;
          }
        }

        // ── 3) Ciclo cerró ayer — "ya puedes usarla" ──
        const yesterdayDay = new Date(today.getTime() - 86400000).getDate();
        if (cycleClose === yesterdayDay && currentUtil <= targetUtil + 2) {
          const r = await sendUserNotification({
            userId, type: 'cycle_closed', refId: `${card.id}-${today.getMonth()}`,
            prefKey: 'cycle_closed_notice',
            title: `✅ Tu ${card.institution || card.name} ya reportó`,
            body: `El ciclo cerró ayer al ${currentUtil}%. Ya puedes usar la tarjeta normal hasta 2 días antes del próximo cierre. ${motivation('perfect')}`,
            section: 'credit'
          });
          if (r === 'sent') summary.cycle_closed_yesterday++;
        }
      }

      // ===== GASTOS FIJOS =====
      const { data: bills } = await supabase
        .from('fixed_expenses')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true);

      for (const bill of bills || []) {
        const daysToBill = daysUntilDayOfMonth(bill.due_day, today);

        // ── 4) 3 días antes del pago fijo ──
        if (daysToBill === 3) {
          const r = await sendUserNotification({
            userId, type: 'fixed_3d', refId: `${bill.id}-${today.getMonth()}`,
            prefKey: 'fixed_expense_reminder',
            title: `📅 ${bill.name} vence en 3 días`,
            body: `Tu pago de $${Math.ceil(bill.amount).toLocaleString()} (${bill.name}) es el día ${bill.due_day}. Te aviso de nuevo el día.`,
            section: 'calendar'
          });
          if (r === 'sent') summary.fixed_3d++;
        }

        // ── 5) Día del pago fijo — si no se detectó pago ──
        if (daysToBill === 0) {
          const r = await sendUserNotification({
            userId, type: 'fixed_today', refId: `${bill.id}-${today.getMonth()}`,
            prefKey: 'fixed_expense_reminder', ignoreLimit: true,
            title: `🏠 Hoy: ${bill.name} $${Math.ceil(bill.amount).toLocaleString()}`,
            body: `Es el día. Asegúrate de pagar ${bill.name} antes de que cierre el día.`,
            section: 'calendar'
          });
          if (r === 'sent') summary.fixed_today++;
        }
      }

      // ===== RESUMEN SEMANAL — solo lunes 9am PR (= 13:00 UTC) =====
      // Como este cron corre a las 11 UTC (7am PR), saltamos el weekly aquí.
      // Lo maneja un cron separado los lunes a las 13 UTC.
    }

    res.json({ ok: true, prHour, summary });
  } catch (err) {
    console.error('check-payments error:', err);
    res.status(500).json({ error: err.message });
  }
}
