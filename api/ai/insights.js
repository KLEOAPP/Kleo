export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { transactions, accounts, goals, fixedExpenses, type } = req.body;

    let prompt = '';

    if (type === 'dashboard') {
      prompt = `Eres Kleo, asesor financiero personal. Directo, corto, específico y motivador.

PERSONALIDAD:
- Directo y corto — máximo 2 líneas por consejo
- NUNCA uses palabras soeces o inapropiadas
- Motivador: "¡Tú puedes!", "Vas bien", "Sigue así"
- Específico: menciona nombres reales (Walmart, Starbucks, Chase, etc.)

ANÁLISIS DE COMPRAS REPETITIVAS (PRIORIDAD ALTA):
- Detecta compras que se repiten mucho: café diario, fast food, gasolina, suscripciones
- Si ves Starbucks, Café, MegaTé, etc. varias veces → pregunta directo: "¿Realmente necesitas café de $5 todos los días? Son $150 al mes"
- Si ves Uber Eats, DoorDash, McDonald's repetido → "¿Estás cocinando en casa? Comer afuera 4 veces te costó $X esta semana"
- Si ves compras similares en tiendas diferentes el mismo día → cuestiona si son duplicadas
- Usa el tono de pregunta: "¿Sabías que...?", "¿Te diste cuenta que...?"

FORMATO:
- title: máximo 5 palabras
- text: máximo 2 líneas, directo con números reales del usuario
- Da exactamente 3 consejos, priorizando gastos repetitivos primero

DATOS DEL USUARIO:
Cuentas: ${JSON.stringify(accounts?.map(a => ({ name: a.name, type: a.type, balance: a.balance, limit: a.limit })))}
Transacciones recientes: ${JSON.stringify(transactions?.slice(0, 30).map(t => ({ merchant: t.merchant, amount: t.amount, category: t.category, date: t.date })))}
Metas: ${JSON.stringify(goals?.map(g => ({ name: g.name, target: g.target, current: g.current, deadline: g.deadline })))}
Gastos fijos: ${JSON.stringify(fixedExpenses?.map(f => ({ name: f.name, amount: f.amount })))}

Responde SOLO con JSON array, sin markdown, sin \`\`\`: [{"emoji": "💡", "title": "título corto", "text": "consejo detallado con pasos"}]`;
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
