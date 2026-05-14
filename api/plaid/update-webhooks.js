// Actualiza la webhook URL en TODOS los Plaid Items existentes del usuario.
// Útil cuando agregaste webhooks DESPUÉS de conectar bancos — los items
// viejos no tienen la URL configurada y no reciben pushes.
//
// Llama una sola vez después de configurar webhooks.

import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';
import { createClient } from '@supabase/supabase-js';

const config = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV || 'sandbox'],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SECRET,
    },
  },
});

const plaid = new PlaidApi(config);

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const webhookUrl = process.env.PLAID_WEBHOOK_URL || 'https://kleopr.com/api/plaid/webhook';

    // Obtener todos los access_tokens únicos del usuario
    const { data: accounts, error } = await supabase
      .from('accounts')
      .select('plaid_access_token, plaid_item_id, institution')
      .eq('user_id', userId)
      .not('plaid_access_token', 'is', null);

    if (error) throw error;
    if (!accounts?.length) {
      return res.json({ updated: 0, message: 'No hay cuentas con Plaid' });
    }

    const seen = new Set();
    const results = [];

    for (const a of accounts) {
      if (!a.plaid_access_token || seen.has(a.plaid_access_token)) continue;
      seen.add(a.plaid_access_token);

      try {
        await plaid.itemWebhookUpdate({
          access_token: a.plaid_access_token,
          webhook: webhookUrl
        });

        // Si no teníamos plaid_item_id guardado, traerlo y guardarlo
        if (!a.plaid_item_id) {
          try {
            const itemResp = await plaid.itemGet({ access_token: a.plaid_access_token });
            const itemId = itemResp.data.item.item_id;
            await supabase.from('accounts')
              .update({ plaid_item_id: itemId })
              .eq('plaid_access_token', a.plaid_access_token);
          } catch (e) {
            console.warn('item/get failed:', e.response?.data || e.message);
          }
        }

        results.push({ institution: a.institution, ok: true });
      } catch (err) {
        results.push({
          institution: a.institution,
          ok: false,
          error: err.response?.data?.error_message || err.message
        });
      }
    }

    res.json({
      updated: results.filter(r => r.ok).length,
      total: results.length,
      webhook_url: webhookUrl,
      details: results
    });
  } catch (err) {
    console.error('update-webhooks error:', err);
    res.status(500).json({ error: err.message });
  }
}
