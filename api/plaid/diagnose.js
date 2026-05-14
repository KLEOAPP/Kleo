// Diagnóstico completo de Plaid: compara lo que Plaid tiene vs lo que
// está en Supabase. Si hay transacciones en Plaid pero no en Supabase,
// algo de nuestro código las está perdiendo. Si Plaid no las tiene,
// el banco aún no las reportó o el Item necesita re-link.

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

    const report = { userId, items: [], totals: {} };

    const { data: accounts } = await supabase
      .from('accounts')
      .select('id, institution, last4, type, plaid_access_token, plaid_item_id')
      .eq('user_id', userId)
      .not('plaid_access_token', 'is', null);

    if (!accounts?.length) {
      return res.json({ ...report, message: 'No hay cuentas con Plaid' });
    }

    // Conteo total de transacciones en Supabase
    const { count: supabaseTxCount } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);
    report.totals.supabase_transactions = supabaseTxCount;

    // Agrupar cuentas por access_token (cada Item)
    const byToken = {};
    for (const a of accounts) {
      if (!byToken[a.plaid_access_token]) byToken[a.plaid_access_token] = [];
      byToken[a.plaid_access_token].push(a);
    }

    for (const [accessToken, accts] of Object.entries(byToken)) {
      const itemReport = {
        institution: accts[0].institution,
        accounts: accts.map(a => ({ id: a.id, last4: a.last4, type: a.type })),
        item_id: accts[0].plaid_item_id || null
      };

      // 1. /item/get — estado del Item
      try {
        const itemResp = await plaid.itemGet({ access_token: accessToken });
        const item = itemResp.data.item;
        itemReport.item_status = {
          item_id: item.item_id,
          institution_id: item.institution_id,
          webhook: item.webhook || null,
          error: item.error || null,
          available_products: item.available_products,
          billed_products: item.billed_products
        };
        if (item.error) {
          itemReport.needs_relink = true;
          itemReport.error_code = item.error.error_code;
        }
      } catch (e) {
        itemReport.item_status_error = e.response?.data || e.message;
        if (e.response?.data?.error_code === 'ITEM_LOGIN_REQUIRED') {
          itemReport.needs_relink = true;
          itemReport.error_code = 'ITEM_LOGIN_REQUIRED';
        }
      }

      // 2. /transactions/get — últimos 30 días
      const now = new Date();
      const startDate = new Date(now - 30 * 86400000).toISOString().split('T')[0];
      const endDate = now.toISOString().split('T')[0];
      try {
        const txResp = await plaid.transactionsGet({
          access_token: accessToken,
          start_date: startDate,
          end_date: endDate,
          options: { count: 500 }
        });
        const plaidCount = txResp.data.transactions.length;
        const plaidTotal = txResp.data.total_transactions;
        itemReport.plaid_transactions_30d = plaidCount;
        itemReport.plaid_total_count = plaidTotal;
        itemReport.recent_5 = txResp.data.transactions.slice(0, 5).map(t => ({
          date: t.date,
          merchant: t.merchant_name || t.name,
          amount: t.amount,
          account_id: t.account_id
        }));

        // 3. Comparar con Supabase para esas mismas cuentas
        const acctIds = accts.map(a => a.id);
        const { count: supCount } = await supabase
          .from('transactions')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .in('account_id', acctIds)
          .gte('date', startDate);
        itemReport.supabase_transactions_30d = supCount;
        itemReport.gap = plaidCount - (supCount || 0);
      } catch (e) {
        itemReport.transactions_error = e.response?.data || e.message;
      }

      report.items.push(itemReport);
    }

    res.json(report);
  } catch (err) {
    console.error('diagnose error:', err);
    res.status(500).json({ error: err.message });
  }
}
