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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, title, body, icon, url, section } = req.body;

    // Buscar suscripciones del usuario
    let query = supabase.from('push_subscriptions').select('*');
    if (userId) {
      query = query.eq('user_id', userId);
    }
    const { data: subs, error } = await query;

    if (error) throw error;
    if (!subs || subs.length === 0) {
      return res.json({ sent: 0, message: 'No subscriptions found' });
    }

    const payload = JSON.stringify({
      title: title || 'Kleo',
      body: body || 'Tienes una notificación',
      icon: icon || '/apple-touch-icon.png',
      url: url || '/',
      badge: '/apple-touch-icon.png',
      section: section || ''
    });

    let sent = 0;
    let failed = 0;

    for (const sub of subs) {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.keys_p256dh,
          auth: sub.keys_auth
        }
      };

      try {
        await webpush.sendNotification(pushSubscription, payload);
        sent++;
      } catch (err) {
        failed++;
        // Si la suscripción expiró, eliminarla
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('endpoint', sub.endpoint);
        }
      }
    }

    res.json({ sent, failed });
  } catch (err) {
    console.error('Push send error:', err.message);
    res.status(500).json({ error: 'Error sending push' });
  }
}
