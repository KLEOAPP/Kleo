export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { transactions, accounts, goals, fixedExpenses, type } = req.body;

    let prompt = '';

    if (type === 'dashboard') {
      prompt = `Eres Kleo, un asistente financiero personal para usuarios en Puerto Rico. Analiza estos datos financieros y da 3 consejos cortos y accionables en español. Sé directo, amigable y usa emojis. Cada consejo máximo 2 líneas.

Cuentas: ${JSON.stringify(accounts?.map(a => ({ name: a.name, type: a.type, balance: a.balance, limit: a.limit })))}

Últimas transacciones: ${JSON.stringify(transactions?.slice(0, 15).map(t => ({ merchant: t.merchant, amount: t.amount, category: t.category, date: t.date })))}

Metas: ${JSON.stringify(goals?.map(g => ({ name: g.name, target: g.target, current: g.current, deadline: g.deadline })))}

Gastos fijos mensuales: ${JSON.stringify(fixedExpenses?.map(f => ({ name: f.name, amount: f.amount })))}

Responde SOLO con un JSON array de 3 objetos con formato: [{"emoji": "💡", "title": "título corto", "text": "consejo"}]`;
    } else if (type === 'spending') {
      prompt = `Eres Kleo, asistente financiero. Analiza el patrón de gastos y da un resumen en español con recomendaciones. Sé conciso.

Transacciones del mes: ${JSON.stringify(transactions?.slice(0, 30).map(t => ({ merchant: t.merchant, amount: t.amount, category: t.category, date: t.date })))}

Responde SOLO con JSON: {"summary": "resumen de 1-2 líneas", "topCategory": "categoría donde más gasta", "topAmount": numero, "tips": ["tip1", "tip2"]}`;
    } else if (type === 'goal') {
      prompt = `Eres Kleo, asistente financiero. Basado en los datos, da un consejo para alcanzar esta meta más rápido. En español, máximo 3 líneas.

Meta: ${JSON.stringify(goals?.[0])}
Ingresos y gastos recientes: ${JSON.stringify(transactions?.slice(0, 10).map(t => ({ amount: t.amount, category: t.category })))}

Responde SOLO con JSON: {"advice": "consejo directo", "savedPerMonth": numero_estimado}`;
    } else {
      prompt = `Eres Kleo, asistente financiero personal para Puerto Rico. El usuario pregunta: "${type}". Responde en español, corto y útil. Máximo 3 líneas.`;
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    const text = data.content?.[0]?.text || '';

    // Limpiar markdown code blocks y parsear JSON
    let clean = text.trim();
    // Remover ```json ... ``` o ``` ... ```
    clean = clean.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    clean = clean.trim();

    try {
      const parsed = JSON.parse(clean);
      res.json({ result: parsed });
    } catch {
      res.json({ result: clean });
    }
  } catch (err) {
    console.error('AI insights error:', err.message);
    res.status(500).json({ error: 'Error generating insights' });
  }
}
