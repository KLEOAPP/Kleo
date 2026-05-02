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
    // Buscar datos del usuario para generar consejo
    const { data: accounts } = await supabase.from('accounts').select('*');
    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false })
      .limit(30);
    const { data: goals } = await supabase.from('goals').select('*');
    const { data: fixedExpenses } = await supabase.from('fixed_expenses').select('*');

    // Pedir a Claude un solo consejo corto
    const prompt = `Eres Kleo, asesor financiero personal. Da UN solo consejo corto para una notificación push.

REGLAS:
- Máximo 1 línea (20 palabras o menos)
- Específico con datos reales del usuario
- Detecta compras repetitivas (café, fast food, suscripciones)
- Termina con frase motivacional: "¡Vamos!", "¡Tú puedes!", "¡Dale!", "¡No te quites!"
- NUNCA uses palabras inapropiadas
- Si ves un patrón de gasto, pregunta: "¿Sabías que...?"

DATOS:
Cuentas: ${JSON.stringify(accounts?.map(a => ({ name: a.name, type: a.type, balance: a.balance })))}
Transacciones: ${JSON.stringify(transactions?.map(t => ({ merchant: t.merchant, amount: t.amount, category: t.category, date: t.date })))}
Metas: ${JSON.stringify(goals?.map(g => ({ name: g.name, target: g.target, current: g.current })))}

Responde SOLO con JSON sin markdown: {"emoji": "💡", "tip": "el consejo corto"}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 150,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const aiData = await response.json();
    const text = aiData.content?.[0]?.text || '';

    let tip;
    try {
      const clean = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      tip = JSON.parse(clean);
    } catch {
      tip = { emoji: '💡', tip: text.slice(0, 100) };
    }

    // Enviar push a todos los suscriptores
    const { data: subs } = await supabase.from('push_subscriptions').select('*');

    const payload = JSON.stringify({
      title: `${tip.emoji || '💡'} Consejo de Kleo`,
      body: tip.tip,
      icon: '/apple-touch-icon.png',
      badge: '/apple-touch-icon.png',
      url: '/',
      section: 'ai-insights'
    });

    let sent = 0;
    for (const sub of subs || []) {
      try {
        await webpush.sendNotification({
          endpoint: sub.endpoint,
          keys: { p256dh: sub.keys_p256dh, auth: sub.keys_auth }
        }, payload);
        sent++;
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
        }
      }
    }

    res.json({ sent, tip: tip.tip });
  } catch (err) {
    console.error('AI tips push error:', err.message);
    res.status(500).json({ error: err.message });
  }
}
