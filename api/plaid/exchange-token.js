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
    const { public_token, userId } = req.body;

    const exchange = await plaid.itemPublicTokenExchange({ public_token });
    const accessToken = exchange.data.access_token;

    const accountsResponse = await plaid.accountsGet({ access_token: accessToken });
    const accounts = accountsResponse.data.accounts;

    for (const acct of accounts) {
      const type = acct.type === 'depository'
        ? (acct.subtype === 'savings' ? 'savings' : 'checking')
        : acct.type === 'credit' ? 'credit' : 'checking';

      await supabase.from('accounts').upsert({
        user_id: userId,
        name: acct.name,
        type,
        label: acct.official_name || acct.name,
        institution: accountsResponse.data.item?.institution_id || 'bank',
        last4: acct.mask,
        balance: acct.balances.current * (type === 'credit' ? -1 : 1),
        credit_limit: acct.balances.limit || null,
        plaid_account_id: acct.account_id,
        plaid_access_token: accessToken,
        color: type === 'credit'
          ? 'linear-gradient(135deg, #FF6000 0%, #B84500 100%)'
          : type === 'savings'
          ? 'linear-gradient(135deg, #34C759 0%, #1C8B3F 100%)'
          : 'linear-gradient(135deg, #007AFF 0%, #003D80 100%)',
        is_active: true
      }, { onConflict: 'plaid_account_id' });
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const startDate = thirtyDaysAgo.toISOString().split('T')[0];
    const endDate = now.toISOString().split('T')[0];

    const txResponse = await plaid.transactionsGet({
      access_token: accessToken,
      start_date: startDate,
      end_date: endDate,
      options: { count: 100 }
    });

    for (const tx of txResponse.data.transactions) {
      const { data: matchedAccounts } = await supabase
        .from('accounts')
        .select('id')
        .eq('plaid_account_id', tx.account_id)
        .limit(1);

      const accountId = matchedAccounts?.[0]?.id;

      await supabase.from('transactions').upsert({
        user_id: userId,
        account_id: accountId,
        amount: -tx.amount,
        merchant: tx.merchant_name || tx.name,
        category: mapPlaidCategory(tx.personal_finance_category?.primary || tx.category?.[0]),
        date: tx.date,
        method: 'auto',
        plaid_transaction_id: tx.transaction_id
      }, { onConflict: 'plaid_transaction_id' });
    }

    res.json({ success: true, accountsLinked: accounts.length, transactionsImported: txResponse.data.transactions.length });
  } catch (err) {
    console.error('Plaid exchange error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Error connecting bank account' });
  }
}

function mapPlaidCategory(plaidCat) {
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
