// Receptor de webhooks de Plaid.
// Plaid llama a este endpoint cuando hay nuevas transacciones, balances
// actualizados, errores con el item, etc. Procesamos el evento y
// actualizamos Supabase. Como las tablas tienen Realtime activado,
// el cliente recibe el cambio inmediatamente.
//
// URL pública: https://kleopr.com/api/plaid/webhook
// Configurada en Plaid Dashboard + en cada link_token al crearlo.

import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:riiverv.pr@gmail.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

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
  // Plaid hace POST. GET es solo para verificar que el endpoint existe.
  if (req.method === 'GET') return res.json({ ok: true, name: 'kleo-plaid-webhook' });
  if (req.method !== 'POST') return res.status(405).end();

  const event = req.body || {};
  const { webhook_type, webhook_code, item_id, removed_transactions } = event;
  console.log('🔔 Plaid webhook:', webhook_type, webhook_code, 'item:', item_id);

  // Respondemos 200 inmediatamente para que Plaid no reintente.
  // El procesamiento corre en paralelo.
  res.status(200).json({ received: true });

  try {
    if (webhook_type === 'TRANSACTIONS') {
      await handleTransactionsEvent(event);
    } else if (webhook_type === 'ITEM') {
      await handleItemEvent(event);
    }
  } catch (err) {
    console.error('Webhook processing error:', err);
  }
}

// ───────────────────────────────────────────────
// Eventos de transacciones
// ───────────────────────────────────────────────
async function handleTransactionsEvent(event) {
  const { webhook_code, item_id, removed_transactions } = event;

  // Encontrar las cuentas/usuario asociados al item_id
  const { data: accounts } = await supabase
    .from('accounts')
    .select('id, user_id, type, plaid_account_id, plaid_access_token, plaid_item_id')
    .eq('plaid_item_id', item_id);

  if (!accounts?.length) {
    console.warn('No accounts for item_id', item_id);
    return;
  }

  const accessToken = accounts[0].plaid_access_token;
  const userId = accounts[0].user_id;

  if (webhook_code === 'TRANSACTIONS_REMOVED' && removed_transactions?.length) {
    await supabase
      .from('transactions')
      .delete()
      .in('plaid_transaction_id', removed_transactions);
    console.log(`Removed ${removed_transactions.length} transactions`);
    return;
  }

  // INITIAL_UPDATE / DEFAULT_UPDATE / HISTORICAL_UPDATE / SYNC_UPDATES_AVAILABLE
  // En todos los casos: bajar las transacciones nuevas
  await syncRecentTransactions(accessToken, userId, accounts);
}

async function handleItemEvent(event) {
  const { webhook_code, item_id, error } = event;
  if (webhook_code === 'ERROR' && error) {
    console.warn('Plaid item error', item_id, error);
    // Podríamos marcar la cuenta como inactiva o pedir re-link
    await supabase
      .from('accounts')
      .update({ is_active: false })
      .eq('plaid_item_id', item_id);
  }
}

// ───────────────────────────────────────────────
// Sync de transacciones recientes para un item
// ───────────────────────────────────────────────
async function syncRecentTransactions(accessToken, userId, accounts) {
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
      }
    }
  } catch (e) {
    console.warn('Balance refresh failed:', e.response?.data || e.message);
  }

  // 2. Pull últimos 14 días
  try {
    const now = new Date();
    const startDate = new Date(now - 14 * 86400000).toISOString().split('T')[0];
    const endDate = now.toISOString().split('T')[0];

    const txResponse = await plaid.transactionsGet({
      access_token: accessToken,
      start_date: startDate,
      end_date: endDate,
      options: { count: 500 }
    });

    // Antes de upsert, verificamos cuáles son nuevas (no existen aún en Supabase)
    // para mandar push solo de ellas y no de las que ya teníamos.
    const txIds = txResponse.data.transactions.map(t => t.transaction_id);
    let existingIds = new Set();
    if (txIds.length > 0) {
      const { data: existing } = await supabase
        .from('transactions')
        .select('plaid_transaction_id')
        .in('plaid_transaction_id', txIds);
      existingIds = new Set((existing || []).map(e => e.plaid_transaction_id));
    }

    let inserted = 0;
    const newOnes = [];
    for (const tx of txResponse.data.transactions) {
      const matched = accounts.find(a => a.plaid_account_id === tx.account_id);
      if (!matched) continue;

      const acctType = matched.type;
      const primary = tx.personal_finance_category?.primary;
      const detailed = tx.personal_finance_category?.detailed;
      const merchantLow = (tx.merchant_name || tx.name || '').toLowerCase();
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

      if (isPayroll && tx.amount < 0) category = 'ingreso';
      else if (isCardPayment) category = 'transferencia';
      else if (
        detailed?.includes('CREDIT_CARD_PAYMENT') ||
        detailed?.includes('TRANSFER_IN') ||
        detailed?.includes('TRANSFER_OUT') ||
        primary === 'TRANSFER_IN' || primary === 'TRANSFER_OUT'
      ) {
        category = 'transferencia';
      }

      const isNew = !existingIds.has(tx.transaction_id);

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
        inserted++;
        if (isNew && category !== 'transferencia') {
          newOnes.push({
            merchant: tx.merchant_name || tx.name,
            amount: Math.abs(tx.amount),
            isIncome: tx.amount < 0, // en Plaid negativo = entrada
            date: tx.date,
            account: matched
          });
        }
      }
    }
    console.log(`✓ Synced ${inserted} transactions (${newOnes.length} new) for user ${userId}`);

    if (newOnes.length > 0) {
      await sendTransactionPush(userId, newOnes);
    }
  } catch (e) {
    console.warn('Transactions sync failed:', e.response?.data || e.message);
  }
}

// ───────────────────────────────────────────────
// Push notification cuando llegan transacciones nuevas
// ───────────────────────────────────────────────
async function sendTransactionPush(userId, transactions) {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return;

  // Buscar subscripciones push del usuario
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('endpoint, keys_p256dh, keys_auth')
    .eq('user_id', userId);

  if (!subs?.length) {
    console.log('No push subs for user', userId);
    return;
  }

  // Construir mensaje
  let title, body;
  if (transactions.length === 1) {
    const t = transactions[0];
    const fmtMoney = `$${Math.abs(t.amount).toFixed(2)}`;
    if (t.isIncome) {
      title = `💵 +${fmtMoney}`;
      body = `${t.merchant} · ${t.account?.institution || 'tu cuenta'}`;
    } else {
      title = `💳 ${fmtMoney}`;
      body = `${t.merchant} · ${t.account?.institution || 'tu cuenta'}`;
    }
  } else {
    const total = transactions.reduce((s, t) => s + Math.abs(t.amount), 0);
    title = `🔔 ${transactions.length} transacciones nuevas`;
    body = `$${total.toFixed(2)} en total — toca para ver`;
  }

  const payload = JSON.stringify({
    title, body,
    icon: '/apple-touch-icon.png',
    badge: '/apple-touch-icon.png',
    url: '/?section=transactions',
    section: 'transactions',
    tag: 'kleo-transaction'
  });

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.keys_p256dh, auth: sub.keys_auth } },
        payload
      );
    } catch (err) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
      }
    }
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
