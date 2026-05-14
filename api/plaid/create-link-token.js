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

  // Diagnóstico mínimo
  if (!process.env.PLAID_CLIENT_ID || !process.env.PLAID_SECRET) {
    return res.status(500).json({
      error: 'Plaid no configurado',
      detail: 'Faltan PLAID_CLIENT_ID o PLAID_SECRET en las variables de entorno.',
      env: process.env.PLAID_ENV || 'sandbox'
    });
  }

  try {
    const { userId } = req.body;

    const webhookUrl = process.env.PLAID_WEBHOOK_URL || 'https://kleopr.com/api/plaid/webhook';

    const baseConfig = {
      user: { client_user_id: userId || 'demo-user' },
      client_name: 'Kleo',
      products: ['transactions'],
      country_codes: ['US'],
      language: 'es',
      webhook: webhookUrl
    };

    // redirect_uri solo si está explícitamente configurado y registrado en Plaid
    if (process.env.PLAID_REDIRECT_URI) {
      baseConfig.redirect_uri = process.env.PLAID_REDIRECT_URI;
    }

    const response = await plaid.linkTokenCreate(baseConfig);

    res.json({ link_token: response.data.link_token });
  } catch (err) {
    const plaidErr = err.response?.data;
    console.error('Plaid create-link-token error:', plaidErr || err.message);
    res.status(500).json({
      error: plaidErr?.error_message || err.message || 'Error creating link token',
      error_code: plaidErr?.error_code,
      error_type: plaidErr?.error_type,
      env: process.env.PLAID_ENV || 'sandbox'
    });
  }
}
