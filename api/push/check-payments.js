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

// Frases motivacionales aleatorias
const MOTIVATION = {
  paymentSoon: [
    '¡Vamos que tú puedes!',
    '¡Tú puedes, no te quites!',
    '¡Vas por buen camino!',
    '¡Dale con todo!',
    '¡Cada pago cuenta, sigue así!'
  ],
  paymentToday: [
    '¡No te quites, ya casi lo logras!',
    '¡Tu futuro financiero depende de hoy, vamos!',
    '¡Hoy es el día, dale!',
    '¡Un paso más cerca de tu meta!',
    '¡Tú puedes con esto y más!'
  ],
  cycleSoon: [
    '¡Ya hiciste lo difícil, no lo pierdas!',
    '¡Aguanta que ya casi cierra!',
    '¡Falta poco, no la uses!',
    '¡Disciplina que vale la pena!',
    '¡Tu bolsillo te lo agradece!'
  ],
  perfect: [
    '¡Eso es, así se hace!',
    '¡Brutal, sigue así!',
    '¡Vas volando, no pares!',
    '¡Excelente trabajo!',
    '¡Eres un crack con tus finanzas!'
  ]
};

function randomMotivation(type) {
  const phrases = MOTIVATION[type];
  return phrases[Math.floor(Math.random() * phrases.length)];
}

export default async function handler(req, res) {
  try {
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
      const paymentDue = card.payment_due_day;
      const limit = card.credit_limit || 0;
      const balance = Math.abs(card.balance || 0);

      if (!limit) continue;

      // Calcular 5% target
      const targetBalance = limit * 0.05;
      const amountToPay = Math.max(0, balance - targetBalance);
      const currentUtil = ((balance / limit) * 100).toFixed(0);

      // Función para calcular días hasta un día del mes
      const daysUntil = (targetDay) => {
        if (!targetDay) return -1;
        if (targetDay >= todayDay) return targetDay - todayDay;
        const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
        return (daysInMonth - todayDay) + targetDay;
      };

      const daysToPayment = daysUntil(paymentDue);
      const daysToClose = daysUntil(cycleClose);

      // === 2 DÍAS ANTES DEL PAGO ===
      if (daysToPayment === 2 && amountToPay > 0) {
        notifications.push({
          userId: card.user_id,
          title: `💳 Pago de ${card.name} en 2 días`,
          body: `Paga $${Math.ceil(amountToPay).toLocaleString()} para dejar tu tarjeta en 5% de uso. Balance: $${balance.toLocaleString()} de $${limit.toLocaleString()}. ${randomMotivation('paymentSoon')}`
        });
      }

      // === DÍA DEL PAGO ===
      if (daysToPayment === 0 && amountToPay > 0) {
        notifications.push({
          userId: card.user_id,
          title: `🚨 Hoy vence ${card.name}`,
          body: `Último día para pagar. Paga mínimo $${Math.ceil(amountToPay).toLocaleString()} para mantener tu 5% de uso. ${randomMotivation('paymentToday')}`
        });
      }

      // === 2 DÍAS ANTES DEL CIERRE DE CICLO ===
      if (daysToClose === 2 && cycleClose) {
        if (amountToPay <= 0) {
          // Ya está en 5% o menos
          notifications.push({
            userId: card.user_id,
            title: `✅ ${card.name} está perfecta`,
            body: `Tu uso es ${currentUtil}%. No la uses hasta que cierre el día ${cycleClose}. ${randomMotivation('perfect')}`
          });
        } else {
          notifications.push({
            userId: card.user_id,
            title: `🛑 No uses ${card.name}`,
            body: `El ciclo cierra el día ${cycleClose}. No la uses para que cierre en 5%. ${randomMotivation('cycleSoon')}`
          });
        }
      }
    }

    if (notifications.length === 0) {
      return res.json({ sent: 0, message: 'No hay alertas de tarjetas hoy' });
    }

    // Enviar notificaciones
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
        url: '/',
        section: 'credit'
      });

      const targetSubs = notif.userId
        ? subs?.filter(s => s.user_id === notif.userId)
        : subs;
      const finalSubs = (targetSubs?.length > 0 ? targetSubs : subs) || [];

      for (const sub of finalSubs) {
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

    res.json({ sent, failed, notifications: notifications.map(n => ({ title: n.title, body: n.body })) });
  } catch (err) {
    console.error('Check payments error:', err.message);
    res.status(500).json({ error: err.message });
  }
}
