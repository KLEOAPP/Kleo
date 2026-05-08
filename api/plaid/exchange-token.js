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

const usingServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

const HISTORY_DAYS = 180; // 6 meses

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!process.env.PLAID_CLIENT_ID || !process.env.PLAID_SECRET) {
    return res.status(500).json({ error: 'Plaid no configurado', detail: 'Faltan PLAID_CLIENT_ID o PLAID_SECRET.', env: process.env.PLAID_ENV });
  }
  if (!process.env.VITE_SUPABASE_URL) {
    return res.status(500).json({ error: 'Supabase no configurado', detail: 'Falta VITE_SUPABASE_URL.' });
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
    const plaidAccounts = accountsResponse.data.accounts;
    const institutionId = accountsResponse.data.item?.institution_id;

    // === 3. Institución ===
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

    // === 4. Guardar accounts y mapear plaid_account_id → uuid interno ===
    stage = 'save-accounts';
    const accountIdMap = {}; // plaid_account_id → supabase uuid
    for (const acct of plaidAccounts) {
      const type = acct.type === 'depository'
        ? (acct.subtype === 'savings' ? 'savings' : 'checking')
        : acct.type === 'credit' ? 'credit' : 'checking';

      const { data: saved, error: upsertErr } = await supabase.from('accounts').upsert({
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
      }, { onConflict: 'plaid_account_id' }).select('id, plaid_account_id').single();

      if (upsertErr) {
        const isRLS = upsertErr.message?.includes('row-level security');
        return res.status(500).json({
          error: 'No se pudo guardar la cuenta en la base de datos',
          stage: 'save-accounts',
          detail: upsertErr.message,
          using_service_role: usingServiceRole,
          hint: isRLS
            ? 'El endpoint está usando ANON_KEY y RLS lo bloquea. Asegúrate que SUPABASE_SERVICE_ROLE_KEY esté en Vercel y haz redeploy.'
            : 'Revisa columnas: plaid_account_id (UNIQUE), plaid_access_token, credit_limit, institution.'
        });
      }

      if (saved) accountIdMap[saved.plaid_account_id] = saved.id;
    }

    // === 5. Fetch 180 días de transacciones (con paginación) ===
    stage = 'transactions';
    let transactionsImported = 0;
    let transactionsPending = false;
    let allTxs = [];

    try {
      const now = new Date();
      const startDate = new Date(now - HISTORY_DAYS * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const endDate = now.toISOString().split('T')[0];

      let total = null;
      let offset = 0;
      const pageSize = 500;

      while (total === null || offset < total) {
        const txResponse = await plaid.transactionsGet({
          access_token: accessToken,
          start_date: startDate,
          end_date: endDate,
          options: { count: pageSize, offset }
        });
        total = txResponse.data.total_transactions;
        allTxs = allTxs.concat(txResponse.data.transactions);
        offset += txResponse.data.transactions.length;
        if (txResponse.data.transactions.length === 0) break;
      }

      // Guardar transacciones
      for (const tx of allTxs) {
        const accountId = accountIdMap[tx.account_id];
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

        transactionsImported++;
      }
    } catch (txErr) {
      const code = txErr.response?.data?.error_code;
      if (code === 'PRODUCT_NOT_READY') {
        transactionsPending = true;
      } else {
        console.error('Transactions fetch failed:', txErr.response?.data || txErr.message);
        transactionsPending = true;
      }
    }

    // === 6. Detectar pagos recurrentes (suscripciones / mensualidades / deudas) ===
    stage = 'detect-recurring';
    let recurringDetected = 0;
    if (allTxs.length > 0) {
      try {
        const recurring = detectRecurring(allTxs);

        for (const r of recurring) {
          // Insertar como gasto fijo con metadata
          const { error: feErr } = await supabase.from('fixed_expenses').upsert({
            user_id: userId,
            name: r.merchant,
            amount: r.avg_amount,
            due_day: r.day_of_month,
            category: r.category,
            icon: r.icon,
            shared: false,
            plaid_signature: r.signature  // identifica el patrón único
          }, { onConflict: 'user_id,plaid_signature' });

          if (!feErr) recurringDetected++;
        }
      } catch (e) {
        console.warn('Recurring detection failed:', e.message);
      }
    }

    res.json({
      success: true,
      accountsLinked: plaidAccounts.length,
      transactionsImported,
      transactionsPending,
      recurringDetected,
      institution: institutionName,
      itemId,
      historyDays: HISTORY_DAYS
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

/**
 * Detecta patrones recurrentes en transacciones:
 *  - Suscripciones (Netflix, Spotify, etc.)
 *  - Mensualidades (gym, seguros)
 *  - Pagos automáticos (luz, agua, internet)
 *  - Deudas (préstamos, pagos a tarjeta)
 */
function detectRecurring(txs) {
  const byMerchant = {};
  txs.filter(t => t.amount > 0) // outflows positivos en Plaid (signo invertido)
    .forEach(t => {
      const key = (t.merchant_name || t.name || '').toLowerCase().trim();
      if (!key) return;
      if (!byMerchant[key]) byMerchant[key] = [];
      byMerchant[key].push({
        amount: t.amount,
        date: new Date(t.date),
        category: t.personal_finance_category?.primary || t.category?.[0],
        original: t
      });
    });

  const recurring = [];
  for (const [key, list] of Object.entries(byMerchant)) {
    if (list.length < 2) continue;
    list.sort((a, b) => b.date - a.date);

    // Ver gaps entre transacciones consecutivas
    const gaps = [];
    for (let i = 0; i < list.length - 1; i++) {
      gaps.push((list[i].date - list[i + 1].date) / (1000 * 60 * 60 * 24));
    }
    const avgGap = gaps.reduce((s, x) => s + x, 0) / gaps.length;
    let cadence = null;
    if (avgGap >= 6 && avgGap <= 9) cadence = 'weekly';
    else if (avgGap >= 12 && avgGap <= 16) cadence = 'biweekly';
    else if (avgGap >= 25 && avgGap <= 35) cadence = 'monthly';
    else continue; // no recurrente

    // Verificar consistencia de monto (±15%)
    const avg = list.reduce((s, t) => s + t.amount, 0) / list.length;
    const consistent = list.every(t => Math.abs(t.amount - avg) / avg <= 0.15);
    if (!consistent) continue;

    const cat = mapPlaidCategory(list[0].category);
    const icon = pickIcon(cat, list[0].original.merchant_name || list[0].original.name);
    const merchantName = list[0].original.merchant_name || list[0].original.name;

    recurring.push({
      merchant: merchantName,
      avg_amount: +avg.toFixed(2),
      cadence,
      day_of_month: Math.min(28, list[0].date.getDate()),
      category: cat,
      icon,
      occurrences: list.length,
      signature: `recurring:${key}:${cadence}`
    });
  }
  return recurring;
}

function pickIcon(cat, name = '') {
  const n = name.toLowerCase();
  if (n.includes('netflix')) return '🎬';
  if (n.includes('spotify') || n.includes('apple music')) return '🎵';
  if (n.includes('amazon') || n.includes('prime')) return '📦';
  if (n.includes('gym') || n.includes('fitness') || n.includes('planet')) return '🏋️';
  if (cat === 'servicios') return '⚡';
  if (cat === 'hogar') return '🏠';
  if (cat === 'transporte') return '🚗';
  return '🔁';
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
    'LOAN_PAYMENTS': 'deuda',
    'BANK_FEES': 'comisiones'
  };
  return map[plaidCat] || 'otros';
}
