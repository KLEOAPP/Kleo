// Cron de resumen semanal — corre lunes a las 13:00 UTC (9:00 AM PR).
// Manda un push con: cuánto se gastó la semana pasada, cuánto se ahorró,
// y la recomendación principal para esta semana.

import { supabase, sendUserNotification } from './_lib.js';

export default async function handler(req, res) {
  try {
    const today = new Date();
    if (today.getUTCDay() !== 1) {
      return res.json({ ok: true, skipped: 'not_monday' });
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
    const sinceISO = sevenDaysAgo.toISOString().slice(0, 10);

    const { data: users } = await supabase
      .from('push_subscriptions')
      .select('user_id')
      .neq('user_id', null);

    const userIds = [...new Set((users || []).map(u => u.user_id))];
    let sent = 0;

    for (const userId of userIds) {
      const { data: txs } = await supabase
        .from('transactions')
        .select('amount, category, date')
        .eq('user_id', userId)
        .gte('date', sinceISO)
        .neq('category', 'transferencia');

      if (!txs?.length) continue;

      const spent = txs.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
      const income = txs.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
      const net = income - spent;

      const fmtNum = n => `$${Math.round(n).toLocaleString()}`;

      const title = net >= 0
        ? `📊 Semana pasada: ahorraste ${fmtNum(net)}`
        : `📊 Semana pasada: gastaste ${fmtNum(-net)} de más`;

      const body = `Entradas: ${fmtNum(income)} · Gastos: ${fmtNum(spent)}. ${
        net < 0
          ? 'Esta semana enfócate en pagos esenciales y deja Personal por último.'
          : 'Vas brutal — considera mover ese sobrante a una meta o ahorro.'
      }`;

      const r = await sendUserNotification({
        userId,
        type: 'weekly_summary',
        refId: today.toISOString().slice(0, 10), // una vez por lunes
        prefKey: 'weekly_summary',
        title, body,
        section: 'analysis'
      });
      if (r === 'sent') sent++;
    }

    res.json({ ok: true, sent });
  } catch (err) {
    console.error('weekly-summary error:', err);
    res.status(500).json({ error: err.message });
  }
}
