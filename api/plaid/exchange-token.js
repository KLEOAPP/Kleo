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

  // Diagnóstico
  if (!process.env.PLAID_CLIENT_ID || !process.env.PLAID_SECRET) {
    return res.status(500).json({
      error: 'Plaid no configurado',
      detail: 'Faltan PLAID_CLIENT_ID o PLAID_SECRET.',
      env: process.env.PLAID_ENV
    });
  }
  if (!process.env.VITE_SUPABASE_URL) {
    return res.status(500).json({
      error: 'Supabase no configurado',
      detail: 'Falta VITE_SUPABASE_URL.'
    });
  }

  let stage = 'init';
  try {
    const { public_token, userId } = req.body;
    if (!public_token) return res.status(400).json({ error: 'public_token faltante' });
    if (!userId) return res.status(400).json({ error: 'userId faltante' });

    // === 1. Exchange ===
    stage = 'exchange';
    const exchange = await plaid.itemPublicTokenExchange({ public_token });
    const accessToken = exchange.data.access_token;
    const itemId = exchange.data.item_id;

    // === 2. Accounts ===
    stage = 'accounts';
    const accountsResponse = await plaid.accountsGet({ access_token: accessToken });
    const accounts = accountsResponse.data.accounts;
    const institutionId = accountsResponse.data.item?.institution_id;

    // === 3. Institución (best effort) ===
    stage = 'institution';
    let institutionName = 'Banco';
    if (institutionId) {
      try {
        const instResp = await plaid.institutionsGetById({
          institution_id: institutionId,
          country_codes: ['US']
        });
        institutionName = instResp.data.institution?.name || institutionName;
      } catch (e) {
        console.warn('Institution lookup failed:', e.response?.data || e.message);
      }
    }

    // === 4. Guardar accounts ===
    stage = 'save-accounts';
    for (const acct of accounts) {
      const type = acct.type === 'depository'
        ? (acct.subtype === 'savings' ? 'savings' : 'checking')
        : acct.type === 'credit' ? 'credit' : 'checking';

      const { error: upsertErr } = await supabase.from('accounts').upsert({
        user_id: userId,
        name: acct.name,
        type,
        label: acct.official_name || acct.name,
        institution: institutionName,
        last4: acct.mask,
        balance: (acct.balances.current || 0) * (type === 'credit' ? -1 : 1),
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

      if (upsertErr) {
        console.error('Supabase accounts upsert error:', upsertErr);
        return res.status(500).json({
          error: 'No se pudo guardar la cuenta en la base de datos',
          stage: 'save-accounts',
          detail: upsertErr.message,
          hint: 'Revisa que la tabla accounts tenga las columnas plaid_account_id (UNIQUE), plaid_access_token, credit_limit, institution.'
        });
      }
    }

    // === 5. Transactions (con tolerancia a PRODUCT_NOT_READY) ===
    stage = 'transactions';
    let transactionsImported = 0;
    let transactionsPending = false;

    try {
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
        if (!accountId) continue;

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
      transactionsImported = txResponse.data.transactions.length;
    } catch (txErr) {
      const code = txErr.response?.data?.error_code;
      // PRODUCT_NOT_READY es normal: Plaid aún no terminó de sincronizar.
      // Las transacciones llegarán por webhook después. No es un fallo.
      if (code === 'PRODUCT_NOT_READY') {
        console.log('Transactions still syncing — webhook will deliver them.');
        transactionsPending = true;
      } else {
        console.error('Transactions fetch failed:', txErr.response?.data || txErr.message);
        // No abortamos — las cuentas ya se guardaron. Avisamos al cliente.
        transactionsPending = true;
      }
    }

    res.json({
      success: true,
      accountsLinked: accounts.length,
      transactionsImported,
      transactionsPending,
      institution: institutionName,
      itemId
    });
  } catch (err) {
    const plaidErr = err.response?.data;
    console.error(`Plaid exchange error at stage=${stage}:`, plaidErr || err.message);
    res.status(500).json({
      error: plaidErr?.error_message || err.message || 'Error connecting bank account',
      error_code: plaidErr?.error_code,
      error_type: plaidErr?.error_type,
      stage,
      env: process.env.PLAID_ENV
    });
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
