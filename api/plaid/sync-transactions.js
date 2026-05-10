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
    const { userId, days = 30 } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const { data: accounts } = await supabase
      .from('accounts')
      .select('id, type, plaid_account_id, plaid_access_token')
      .eq('user_id', userId)
      .not('plaid_access_token', 'is', null);

    if (!accounts?.length) {
      return res.json({ synced: 0, message: 'No linked accounts' });
    }

    const now = new Date();
    const startDate = new Date(now - days * 86400000).toISOString().split('T')[0];
    const endDate = now.toISOString().split('T')[0];

    let totalSynced = 0;
    let balanceUpdates = 0;
    const tokens = [...new Set(accounts.map(a => a.plaid_access_token))];

    for (const accessToken of tokens) {
      // 1. Refresh balances
      try {
        const balResponse = await plaid.accountsGet({ access_token: accessToken });
        for (const bal of balResponse.data.accounts) {
          const matched = accounts.find(a => a.plaid_account_id === bal.account_id);
          if (matched) {
            const isCredit = bal.type === 'credit';
            await supabase.from('accounts').update({
              balance: (bal.balances.current || 0) * (isCredit ? -1 : 1),
              credit_limit: bal.balances.limit || null
            }).eq('id', matched.id);
            balanceUpdates++;
          }
        }
      } catch (e) {
        console.warn('Balance refresh failed:', e.response?.data || e.message);
      }

      // 2. Pull transactions
      try {
        const txResponse = await plaid.transactionsGet({
          access_token: accessToken,
          start_date: startDate,
          end_date: endDate,
          options: { count: 500 }
        });

        for (const tx of txResponse.data.transactions) {
          const matched = accounts.find(a => a.plaid_account_id === tx.account_id);
          if (!matched) continue;

          const acctType = matched.type;
          const primary = tx.personal_finance_category?.primary;
          const detailed = tx.personal_finance_category?.detailed;
          const merchantLow = (tx.merchant_name || tx.name || '').toLowerCase();

          let category = mapCategory(primary);

          // Reglas de clasificación quirúrgicas (ver CLASSIFICATION_RULES.md)
          const isCardPayment =
            merchantLow.includes('payment thank you') ||
            merchantLow.includes('payment - thank') ||
            merchantLow.includes('- thank you') ||
            merchantLow.includes('mobile payment') ||
            merchantLow.includes('online payment') ||
            merchantLow.includes('internet payment') ||
            merchantLow.includes('autopay') ||
            /\bpymt\b/.test(merchantLow) ||
            merchantLow.includes('credit card payment') ||
            merchantLow.includes('cc payment') ||
            /eft pmt/.test(merchantLow) ||
            /e-payment/.test(merchantLow);

          const isPayroll =
            merchantLow.includes('payroll') ||
            merchantLow.includes('eft deposit') ||
            merchantLow.includes('direct dep') ||
            merchantLow.includes('direct deposit') ||
            merchantLow.includes('nomina') ||
            merchantLow.includes('salary') ||
            merchantLow.includes('ssa treas') ||
            merchantLow.includes('irs treas');

          if (isPayroll && tx.amount < 0) {
            category = 'ingreso';
          } else if (isCardPayment) {
            category = 'transferencia';
          } else if (
            detailed?.includes('CREDIT_CARD_PAYMENT') ||
            detailed?.includes('TRANSFER_IN') ||
            detailed?.includes('TRANSFER_OUT') ||
            primary === 'TRANSFER_IN' || primary === 'TRANSFER_OUT'
          ) {
            category = 'transferencia';
          }

          await supabase.from('transactions').upsert({
            user_id: userId,
            account_id: matched.id,
            amount: -tx.amount,
            merchant: tx.merchant_name || tx.name,
            category,
            date: tx.date,
            method: 'auto',
            plaid_transaction_id: tx.transaction_id
          }, { onConflict: 'plaid_transaction_id' });

          totalSynced++;
        }
      } catch (e) {
        console.warn('Transactions fetch failed:', e.response?.data || e.message);
      }
    }

    res.json({
      synced: totalSynced,
      balanceUpdates,
      from: startDate,
      to: endDate
    });
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
