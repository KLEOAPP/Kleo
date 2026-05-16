// Auto-recovery: corre al abrir la app. Hace lo que el usuario haría manualmente:
//   1. Verifica el estado de cada Item de Plaid
//   2. Para cada Item OK: trae 30 días, hace upsert, marca lo nuevo
//   3. Si un Item necesita re-link (login expirado): lo reporta al cliente
//   4. Si hay gap entre Plaid y Supabase: hace deep sync agresivo
//
// El cliente llama esto en cada apertura. Todo silencioso. Sin botones.

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

    const { data: accounts } = await supabase
      .from('accounts')
      .select('id, institution, last4, type, plaid_account_id, plaid_access_token, plaid_item_id')
      .eq('user_id', userId)
      .not('plaid_access_token', 'is', null);

    if (!accounts?.length) {
      return res.json({ items: [], totalInserted: 0 });
    }

    const byToken = {};
    for (const a of accounts) {
      if (!byToken[a.plaid_access_token]) byToken[a.plaid_access_token] = [];
      byToken[a.plaid_access_token].push(a);
    }

    const items = [];
    let totalInserted = 0;

    for (const [accessToken, accts] of Object.entries(byToken)) {
      const itemInfo = {
        institution: accts[0].institution,
        accounts: accts.map(a => `••${a.last4}`),
        needs_relink: false,
        synced: 0,
        new: 0
      };

      // 1. Verificar status del item — y de paso, asegurar webhook
      try {
        await plaid.itemWebhookUpdate({
          access_token: accessToken,
          webhook: process.env.PLAID_WEBHOOK_URL || 'https://kleopr.com/api/plaid/webhook'
        });
      } catch (e) {
        // ITEM_LOGIN_REQUIRED u otro error
        const code = e.response?.data?.error_code;
        if (code === 'ITEM_LOGIN_REQUIRED' || code === 'PENDING_EXPIRATION' || code === 'ITEM_LOCKED') {
          itemInfo.needs_relink = true;
          itemInfo.error_code = code;
          items.push(itemInfo);
          continue;
        }
        // Otro error — registrar pero seguir
        itemInfo.warning = code || e.message;
      }

      // 2. Refresh balances
      try {
        const balResponse = await plaid.accountsGet({ access_token: accessToken });
        for (const bal of balResponse.data.accounts) {
          const matched = accts.find(a => a.plaid_account_id === bal.account_id);
          if (matched) {
            const isCredit = bal.type === 'credit';
            await supabase.from('accounts').update({
              balance: (bal.balances.current || 0) * (isCredit ? -1 : 1),
              credit_limit: bal.balances.limit || null
            }).eq('id', matched.id);
          }
        }
      } catch (e) {
        // ignore
      }

      // 3. Sync 30 días
      try {
        const now = new Date();
        const startDate = new Date(now - 30 * 86400000).toISOString().split('T')[0];
        const endDate = now.toISOString().split('T')[0];
        const txResp = await plaid.transactionsGet({
          access_token: accessToken,
          start_date: startDate,
          end_date: endDate,
          options: { count: 500 }
        });

        // Detectar nuevas
        const txIds = txResp.data.transactions.map(t => t.transaction_id);
        let existingIds = new Set();
        if (txIds.length > 0) {
          const { data: existing } = await supabase
            .from('transactions')
            .select('plaid_transaction_id')
            .in('plaid_transaction_id', txIds);
          existingIds = new Set((existing || []).map(e => e.plaid_transaction_id));
        }

        for (const tx of txResp.data.transactions) {
          const matched = accts.find(a => a.plaid_account_id === tx.account_id);
          if (!matched) continue;

          const merchantLow = (tx.merchant_name || tx.name || '').toLowerCase();
          const primary = tx.personal_finance_category?.primary;
          const detailed = tx.personal_finance_category?.detailed;
          let category = mapCategory(primary);

          const isCardPayment =
            merchantLow.includes('payment thank you') ||
            merchantLow.includes('payment - thank') ||
            merchantLow.includes('- thank you') ||
            merchantLow.includes('mobile payment') ||
            merchantLow.includes('online payment') ||
            merchantLow.includes('internet payment') ||
            merchantLow.includes('autopay') ||
            /\bpymt\b/.test(merchantLow) ||
            /eft pmt/.test(merchantLow) ||
            /e-payment/.test(merchantLow);

          const isPayroll =
            merchantLow.includes('payroll') ||
            merchantLow.includes('eft deposit') ||
            merchantLow.includes('direct dep') ||
            merchantLow.includes('nomina') ||
            merchantLow.includes('salary');

          if (isPayroll && tx.amount < 0) category = 'ingreso';
          else if (isCardPayment) category = 'transferencia';
          else if (
            detailed?.includes('CREDIT_CARD_PAYMENT') ||
            primary === 'TRANSFER_IN' || primary === 'TRANSFER_OUT'
          ) category = 'transferencia';

          const { error } = await supabase.from('transactions').upsert({
            user_id: userId,
            account_id: matched.id,
            amount: -tx.amount,
            merchant: tx.merchant_name || tx.name,
            category,
            date: tx.date,
            method: 'auto',
            plaid_transaction_id: tx.transaction_id
          }, { onConflict: 'plaid_transaction_id' });

          if (!error) {
            itemInfo.synced++;
            if (!existingIds.has(tx.transaction_id)) {
              itemInfo.new++;
              totalInserted++;
            }
          }
        }
      } catch (e) {
        itemInfo.sync_error = e.response?.data?.error_code || e.message;
      }

      items.push(itemInfo);
    }

    res.json({ items, totalInserted });
  } catch (err) {
    console.error('auto-recover error:', err);
    res.status(500).json({ error: err.message });
  }
}

function mapCategory(plaidCat) {
  const map = {
    'FOOD_AND_DRINK': 'comida',
    'GROCERIES': 'supermercado',
    'TRANSPORTATION': 'transporte',
    'ENTERTAINMENT': 'entretenimiento',
    'SHOPPING': 'compras',
    'HEALTH': 'salud',
    'UTILITIES': 'servicios',
    'HOUSING': 'hogar',
    'EDUCATION': 'educacion',
    'PERSONAL_CARE': 'personal',
    'TRANSFER': 'transferencia',
    'INCOME': 'ingreso'
  };
  return map[plaidCat] || 'otros';
}
