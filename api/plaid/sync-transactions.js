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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = req.body;

    // Buscar todas las cuentas con plaid_access_token
    const { data: accounts } = await supabase
      .from('accounts')
      .select('id, plaid_account_id, plaid_access_token')
      .eq('user_id', userId)
      .not('plaid_access_token', 'is', null);

    if (!accounts?.length) {
      return res.json({ synced: 0, message: 'No linked accounts' });
    }

    const now = new Date();
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const startDate = sevenDaysAgo.toISOString().split('T')[0];
    const endDate = now.toISOString().split('T')[0];

    let totalSynced = 0;

    // Agrupar por access_token (un token puede tener varias cuentas)
    const tokens = [...new Set(accounts.map(a => a.plaid_access_token))];

    for (const accessToken of tokens) {
      // Actualizar balances
      const balResponse = await plaid.accountsGet({ access_token: accessToken });
      for (const bal of balResponse.data.accounts) {
        const matched = accounts.find(a => a.plaid_account_id === bal.account_id);
        if (matched) {
          const isCredit = bal.type === 'credit';
          await supabase.from('accounts').update({
            balance: bal.balances.current * (isCredit ? -1 : 1)
          }).eq('id', matched.id);
        }
      }

      // Obtener transacciones nuevas
      const txResponse = await plaid.transactionsGet({
        access_token: accessToken,
        start_date: startDate,
        end_date: endDate,
        options: { count: 100 }
      });

      for (const tx of txResponse.data.transactions) {
        const matched = accounts.find(a => a.plaid_account_id === tx.account_id);

        await supabase.from('transactions').upsert({
          user_id: userId,
          account_id: matched?.id,
          amount: -tx.amount,
          merchant: tx.merchant_name || tx.name,
          category: mapCategory(tx.personal_finance_category?.primary || tx.category?.[0]),
          date: tx.date,
          method: 'auto',
          plaid_transaction_id: tx.transaction_id
        }, { onConflict: 'plaid_transaction_id' });

        totalSynced++;
      }
    }

    res.json({ synced: totalSynced });
  } catch (err) {
    console.error('Sync error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Error syncing transactions' });
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
    'INCOME': 'ingreso',
  };
  return map[plaidCat] || 'otros';
}
