// Revoca un Item de Plaid (cuando el usuario desconecta todas las cuentas
// asociadas a un access_token). Plaid deja de mandar webhooks y libera la
// suscripción mensual de ese item.

import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';

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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { accessToken } = req.body;
    if (!accessToken) return res.status(400).json({ error: 'accessToken required' });

    await plaid.itemRemove({ access_token: accessToken });
    res.json({ ok: true });
  } catch (err) {
    console.error('Plaid item remove failed:', err.response?.data || err.message);
    // No fallar el flujo del cliente — la cuenta local ya se va a borrar
    res.json({ ok: false, error: err.response?.data?.error_message || err.message });
  }
}
