// Helpers compartidos para todos los endpoints de notificaciones.
// Anti-spam, quiet hours, preferencias del usuario, envío de push.

import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:riiverv.pr@gmail.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

/**
 * Quiet hours en hora de Puerto Rico (UTC-4).
 * No se envían pushes entre 9:00 PM y 7:00 AM hora local del usuario.
 */
export function isQuietHoursPR() {
  const utcHour = new Date().getUTCHours();
  const prHour = (utcHour - 4 + 24) % 24;
  return prHour < 7 || prHour >= 21;
}

/**
 * ¿Ya se envió esta notificación al usuario en las últimas 24h?
 * Anti-spam por (user_id, type, ref_id).
 */
export async function hasBeenNotifiedRecently(userId, type, refId, hoursWindow = 24) {
  const since = new Date(Date.now() - hoursWindow * 3600 * 1000).toISOString();
  const { data } = await supabase
    .from('notifications_sent')
    .select('id')
    .eq('user_id', userId)
    .eq('type', type)
    .eq('ref_id', refId || '')
    .gte('sent_at', since)
    .limit(1);
  return (data?.length || 0) > 0;
}

/**
 * Marca una notificación como enviada.
 */
export async function markNotificationSent(userId, type, refId) {
  await supabase.from('notifications_sent').insert({
    user_id: userId,
    type,
    ref_id: refId || '',
    sent_at: new Date().toISOString()
  });
}

/**
 * Obtiene preferencias de notificación. Defaults conservadores.
 */
export async function getUserPrefs(userId) {
  const { data } = await supabase
    .from('user_notification_prefs')
    .select('*')
    .eq('user_id', userId)
    .single();

  return {
    cycle_close_reminder:    data?.cycle_close_reminder    ?? true,
    payment_due_reminder:    data?.payment_due_reminder    ?? true,
    do_not_use_reminder:     data?.do_not_use_reminder     ?? true,
    cycle_closed_notice:     data?.cycle_closed_notice     ?? true,
    fixed_expense_reminder:  data?.fixed_expense_reminder  ?? true,
    overdraft_alert:         data?.overdraft_alert         ?? true,
    paycheck_arrival:        data?.paycheck_arrival        ?? true,
    goal_milestone:          data?.goal_milestone          ?? true,
    weekly_summary:          data?.weekly_summary          ?? true,
    unusual_spending:        data?.unusual_spending        ?? false, // opt-in
    daily_ai_tip:            data?.daily_ai_tip            ?? false  // opt-in
  };
}

/**
 * Lee el perfil del asesor del usuario (target_utilization, etc.)
 */
export async function getAdvisorProfileServer(userId) {
  const { data } = await supabase
    .from('user_advisor_profile')
    .select('*')
    .eq('user_id', userId)
    .single();
  return data || { target_utilization: 5 };
}

/**
 * Cuenta cuántas notificaciones se enviaron al usuario hoy.
 * Para enforce el límite de 3 por día.
 */
export async function notificationsSentToday(userId) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const { data } = await supabase
    .from('notifications_sent')
    .select('id')
    .eq('user_id', userId)
    .gte('sent_at', startOfDay.toISOString());
  return data?.length || 0;
}

/**
 * Envía push a todas las subscripciones del usuario, registra en
 * notifications_sent y respeta anti-spam + quiet hours + límite diario.
 *
 * @returns 'sent' | 'queued' (cuando es quiet hours y debería re-intentar) |
 *          'skipped_recent' | 'skipped_limit' | 'skipped_pref'
 */
export async function sendUserNotification({
  userId, type, refId, title, body, url = '/', section = '',
  prefKey = null, ignoreQuietHours = false, ignoreLimit = false
}) {
  if (!userId) return 'skipped_no_user';

  // 1) Pref del usuario
  if (prefKey) {
    const prefs = await getUserPrefs(userId);
    if (!prefs[prefKey]) return 'skipped_pref';
  }

  // 2) Quiet hours
  if (!ignoreQuietHours && isQuietHoursPR()) {
    return 'queued_quiet_hours';
  }

  // 3) Anti-spam
  if (await hasBeenNotifiedRecently(userId, type, refId)) {
    return 'skipped_recent';
  }

  // 4) Límite diario
  if (!ignoreLimit) {
    const count = await notificationsSentToday(userId);
    if (count >= 3) return 'skipped_limit';
  }

  // 5) Buscar subscripciones del usuario
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', userId);

  if (!subs?.length) return 'skipped_no_subs';

  const payload = JSON.stringify({
    title, body,
    icon: '/apple-touch-icon.png',
    badge: '/apple-touch-icon.png',
    url, section
  });

  let anySent = false;
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.keys_p256dh, auth: sub.keys_auth } },
        payload
      );
      anySent = true;
    } catch (err) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
      }
    }
  }

  if (anySent) {
    await markNotificationSent(userId, type, refId);
    return 'sent';
  }
  return 'skipped_no_send';
}

/**
 * Calcula días hasta un día del mes (manejando wrap-around).
 */
export function daysUntilDayOfMonth(targetDay, today = new Date()) {
  if (!targetDay) return -1;
  const todayDay = today.getDate();
  if (targetDay >= todayDay) return targetDay - todayDay;
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  return (daysInMonth - todayDay) + targetDay;
}

/**
 * ¿Hay una transacción reciente que cubre este pago?
 */
export async function hasRecentPaymentForCard(userId, cardId, hoursWindow = 72) {
  const since = new Date(Date.now() - hoursWindow * 3600 * 1000).toISOString();
  // Buscamos cualquier salida en la cuenta del usuario relacionada con la tarjeta
  // o un movimiento positivo en la propia tarjeta
  const { data } = await supabase
    .from('transactions')
    .select('id, amount, account_id')
    .eq('user_id', userId)
    .gte('date', since.slice(0, 10))
    .or(`account_id.eq.${cardId},category.eq.transferencia`)
    .limit(5);
  return (data?.length || 0) > 0;
}

/**
 * Calcula el monto a pagar para llegar a una utilización meta.
 */
export function paymentToReachTarget(currentBalance, limit, targetPct) {
  if (!limit || limit <= 0) return 0;
  const targetBalance = limit * (targetPct / 100);
  return Math.max(0, currentBalance - targetBalance);
}

/**
 * Lista de frases motivacionales por tipo (recicladas del check-payments viejo).
 */
const MOTIVATION = {
  cycleSoon:    ['¡Aguanta que ya casi cierra!', '¡Disciplina que vale la pena!', '¡Tu bolsillo te lo agradece!'],
  paymentToday: ['¡No te quites, tú puedes!', '¡Hoy es el día, dale!', '¡Un paso más cerca de tu meta!'],
  perfect:      ['¡Eso es, así se hace!', '¡Vas volando, no pares!', '¡Eres un crack con tus finanzas!'],
  paycheck:     ['¡Llegó el cheque, planifica bien!', '¡Aprovecha y dale prioridad a lo importante!']
};
export function motivation(type) {
  const list = MOTIVATION[type];
  if (!list) return '';
  return list[Math.floor(Math.random() * list.length)];
}
