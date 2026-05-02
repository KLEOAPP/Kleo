import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

webpush.setVapidDetails(
  'mailto:riiverv.pr@gmail.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

export default async function handler(req, res) {
  try {
    // Buscar todas las cuentas de crédito
    const { data: accounts, error: accErr } = await supabase
      .from('accounts')
      .select('*')
      .eq('type', 'credit');

    if (accErr) throw accErr;

    const today = new Date();
    const todayDay = today.getDate();
    const notifications = [];

    for (const card of accounts || []) {
      const cycleClose = card.cycle_close_day;
      const limit = card.credit_limit || 0;
      const balance = Math.abs(card.balance || 0);

      if (!cycleClose || !limit) continue;

      // Calcular días hasta cierre de ciclo
      let daysUntilClose;
      if (cycleClose >= todayDay) {
        daysUntilClose = cycleClose - todayDay;
      } else {
        // El cierre es el próximo mes
        const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
        daysUntilClose = (daysInMonth - todayDay) + cycleClose;
      }

      // Solo notificar si faltan 2 días para el cierre
      if (daysUntilClose !== 2) continue;

      // Calcular cuánto pagar para dejar 5% de utilización
      const targetBalance = limit * 0.05;
      const amountToPay = balance - targetBalance;

      if (amountToPay <= 0) {
        // Ya está en 5% o menos, felicitar
        notifications.push({
          userId: card.user_id,
          title: `✅ ${card.name} está perfecta`,
          body: `Tu balance es $${balance.toFixed(0)} (${((balance / limit) * 100).toFixed(0)}% de utilización). No la uses hasta que cierre el ciclo el día ${cycleClose}. ¡Tu score te lo agradece!`
        });
      } else {
        // Necesita pagar
        const currentUtil = ((balance / limit) * 100).toFixed(0);
        notifications.push({
          userId: card.user_id,
          title: `💳 ${card.name} cierra en 2 días`,
          body: `Balance: $${balance.toLocaleString()}. Paga $${Math.ceil(amountToPay).toLocaleString()} para dejar solo $${Math.round(targetBalance).toLocaleString()} (5% de $${limit.toLocaleString()}). Estás en ${currentUtil}% — bájalo a 5% y NO uses la tarjeta hasta que cierre el día ${cycleClose}.`
        });
      }
    }

    if (notifications.length === 0) {
      return res.json({ sent: 0, message: 'No hay tarjetas con cierre en 2 días' });
    }

    // Buscar todas las suscripciones push
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('*');

    let sent = 0;
    let failed = 0;

    for (const notif of notifications) {
      const payload = JSON.stringify({
        title: notif.title,
        body: notif.body,
        icon: '/apple-touch-icon.png',
        badge: '/apple-touch-icon.png',
        url: '/'
      });

      // Filtrar suscripciones del usuario (o enviar a todas si no hay user_id match)
      const targetSubs = notif.userId
        ? subs.filter(s => s.user_id === notif.userId)
        : subs;

      // Si no hay subs para ese user, enviar a todas
      const finalSubs = targetSubs.length > 0 ? targetSubs : subs;

      for (const sub of finalSubs || []) {
        try {
          await webpush.sendNotification({
            endpoint: sub.endpoint,
            keys: { p256dh: sub.keys_p256dh, auth: sub.keys_auth }
          }, payload);
          sent++;
        } catch (err) {
          failed++;
          if (err.statusCode === 410 || err.statusCode === 404) {
            await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
          }
        }
      }
    }

    res.json({ sent, failed, notifications: notifications.map(n => n.title) });
  } catch (err) {
    console.error('Check payments error:', err.message);
    res.status(500).json({ error: err.message });
  }
}
