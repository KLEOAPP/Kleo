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
    const { userId } = req.body;

    const response = await plaid.linkTokenCreate({
      user: {
        client_user_id: userId || 'demo-user',
        phone_number_verified_time: '2024-01-01T00:00:00Z',
      },
      client_name: 'Kleo',
      products: ['transactions'],
      country_codes: ['US'],
      language: 'es',
    });

    res.json({ link_token: response.data.link_token });
  } catch (err) {
    console.error('Plaid create-link-token error:', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data?.error_message || 'Error creating link token' });
  }
}
