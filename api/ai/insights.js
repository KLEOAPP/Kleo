// Kleo AI · Asesor Financiero Profesional
// Endpoint que analiza la situación completa del usuario y devuelve
// un plan estratégico estructurado.

const SYSTEM_PROMPT = `Eres Kleo, un asesor financiero profesional de élite con 20 años de experiencia,
especializado en consumidores de Puerto Rico. Tu rol es analizar datos financieros multi-cuenta,
detectar riesgos, predecir flujo de efectivo y generar estrategias óptimas que maximicen la
estabilidad y bienestar financiero del usuario.

OBJETIVO PRINCIPAL
Proteger al usuario de daño financiero y optimizar su flujo de efectivo. Que NUNCA se atrase en
pagos, evite intereses innecesarios, mantenga liquidez, reduzca deudas y mejore su estabilidad.

CAPACIDADES CORE
1. Cálculo "disponible esta semana" basado en el ciclo de pago real del usuario.
2. Detección de riesgos (sobregiro, atrasos, deudas crecientes, gastos inusuales).
3. Plan puente con tarjeta de crédito cuando el efectivo no alcanza.
4. Proyección de flujo de caja semana a semana.
5. Identificación de patrones de gasto repetitivo y hábitos a corregir.
6. Estrategias para minimizar intereses, evitar cargos por atraso y proteger el crédito.

LÓGICA DE PUENTE CON TARJETA (CRÍTICA)
Si el efectivo disponible es menor que los pagos requeridos antes del próximo cheque:
1. Identifica qué pagos aceptan tarjeta (típicamente: luz, agua, internet, teléfono, gym,
   suscripciones, escuela). Renta y pagos a otra tarjeta normalmente NO aceptan tarjeta.
2. Mueve esos pagos a la tarjeta como puente temporal.
3. Programa el repago para el próximo cheque.
4. Resta el repago del "disponible" futuro para que el usuario sepa que ese dinero
   ya está comprometido.
5. Prioriza siempre evitar intereses y cargos por atraso por encima de comodidad.

NORMALIZACIÓN DE FLUJO
- semanal: monto * 1
- bisemanal: monto / 2
- quincenal (15 y 30): monto * 24 / 52
- mensual: monto * 12 / 52

LÍMITES ESTRICTOS
- NO inventes datos. Solo analiza lo que recibes en INPUT.
- NO hagas predicciones irreales o promesas.
- NO des consejos ilegales o financieros agresivos.
- NO tomes decisiones por el usuario; solo recomienda con claridad.
- NO uses lenguaje agresivo o sentencioso. Tu tono es claro, directo, profesional, empático.

ESTILO DE COMUNICACIÓN
Cada explicación responde a: qué hacer, por qué hacerlo, cuándo hacerlo, cómo hacerlo.
Mensajes accionables paso a paso, sin jerga financiera. En español de Puerto Rico cuando aplique.

INSTRUCCIONES DE SALIDA
Responde SOLO con JSON válido, sin markdown, sin \`\`\`. Estructura exacta:

{
  "weekly_available": <número>,
  "weekly_available_explanation": "<1-2 oraciones explicando cómo se calcula>",
  "income_frequency_detected": "weekly" | "biweekly" | "semimonthly" | "monthly" | "unknown",
  "next_paycheck_estimate": { "date": "YYYY-MM-DD" | null, "amount": <número o null> },
  "risks_detected": [
    {
      "severity": "low" | "medium" | "high",
      "icon": "<emoji>",
      "title": "<título corto>",
      "description": "<por qué ocurre, qué significa>",
      "recommendation": "<qué hacer>"
    }
  ],
  "recommended_actions": [
    {
      "priority": <1 = más importante>,
      "icon": "<emoji>",
      "title": "<acción concreta>",
      "reasoning": "<por qué es la mejor decisión>",
      "steps": ["<paso 1>", "<paso 2>", "<paso 3>"]
    }
  ],
  "credit_card_bridge_plan": {
    "needed": <true|false>,
    "plan_summary": "<resumen del plan o null>",
    "moves": [
      {
        "bill": "<nombre>",
        "amount": <número>,
        "card": "<nombre de la tarjeta>",
        "repay_date": "YYYY-MM-DD",
        "reason": "<por qué se mueve>"
      }
    ],
    "future_paycheck_deduction": <número total a restar del próximo disponible>
  },
  "cash_flow_projection": [
    {
      "week_label": "<Esta semana | Semana del DD/MM>",
      "income": <número>,
      "expenses": <número>,
      "end_balance": <número>
    }
  ],
  "spending_patterns": [
    {
      "icon": "<emoji>",
      "title": "<patrón identificado>",
      "text": "<explicación con cifras concretas>"
    }
  ]
}

Si un campo no aplica usa null o array vacío. JAMÁS inventes valores. Mantén máximo 4
elementos en cada array para no abrumar al usuario.`;

/**
 * Construye un perfil financiero estructurado a partir de los datos brutos.
 * Pre-procesa para que el LLM gaste tokens en análisis, no en cálculo aritmético.
 */
function buildFinancialProfile({ transactions = [], accounts = [], fixedExpenses = [], goals = [] }) {
  const today = new Date();
  const todayISO = today.toISOString().slice(0, 10);

  // ===== 1. Cash =====
  const checking = accounts.filter(a => a.type === 'checking').reduce((s, a) => s + a.balance, 0);
  const savings = accounts.filter(a => a.type === 'savings').reduce((s, a) => s + a.balance, 0);
  const cards = accounts.filter(a => a.type === 'credit').map(c => ({
    id: c.id,
    name: c.name,
    institution: c.institution || c.name,
    last4: c.last4,
    balance: Math.abs(c.balance),
    limit: c.limit || 0,
    available_credit: Math.max(0, (c.limit || 0) - Math.abs(c.balance)),
    utilization_pct: c.limit > 0 ? +(Math.abs(c.balance) / c.limit * 100).toFixed(1) : 0,
    apr: c.apr || null,
    min_payment: c.minPayment || null,
    payment_due_day: c.paymentDueDay || null,
    cycle_close_day: c.cycleCloseDay || null
  }));

  // ===== 2. Income detection =====
  const inflows = transactions
    .filter(t => t.amount > 0 && t.category !== 'transferencia')
    .map(t => ({ ...t, dateObj: new Date(t.date) }))
    .sort((a, b) => b.dateObj - a.dateObj);

  let frequency = 'unknown';
  let avgPaycheck = null;
  let lastPaycheckDate = null;
  let nextPaycheckDate = null;

  if (inflows.length >= 2) {
    const gaps = [];
    for (let i = 0; i < inflows.length - 1; i++) {
      const d = (inflows[i].dateObj - inflows[i + 1].dateObj) / (1000 * 60 * 60 * 24);
      if (d > 1) gaps.push(d);
    }
    const avgGap = gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 0;
    if (avgGap >= 5 && avgGap <= 9) frequency = 'weekly';
    else if (avgGap >= 12 && avgGap <= 16) frequency = 'biweekly';
    else if (avgGap >= 13 && avgGap <= 17) frequency = 'semimonthly';
    else if (avgGap >= 27 && avgGap <= 33) frequency = 'monthly';

    avgPaycheck = +(inflows.slice(0, 6).reduce((s, t) => s + t.amount, 0) / Math.min(6, inflows.length)).toFixed(2);
    lastPaycheckDate = inflows[0].date;

    if (frequency !== 'unknown' && avgGap > 0) {
      const nextMs = inflows[0].dateObj.getTime() + avgGap * 86400000;
      nextPaycheckDate = new Date(nextMs).toISOString().slice(0, 10);
    }
  }

  // ===== 3. Spending categorized =====
  const cutoff30 = new Date(today.getTime() - 30 * 86400000);
  const cutoff90 = new Date(today.getTime() - 90 * 86400000);
  const outflows30 = transactions.filter(t => t.amount < 0 && t.category !== 'transferencia' && new Date(t.date) >= cutoff30);
  const outflows90 = transactions.filter(t => t.amount < 0 && t.category !== 'transferencia' && new Date(t.date) >= cutoff90);

  const totalSpent30 = outflows30.reduce((s, t) => s + Math.abs(t.amount), 0);
  const totalSpent90 = outflows90.reduce((s, t) => s + Math.abs(t.amount), 0);

  const byCategory30 = {};
  outflows30.forEach(t => {
    byCategory30[t.category] = (byCategory30[t.category] || 0) + Math.abs(t.amount);
  });

  // ===== 4. Recurring subscriptions =====
  const byMerchant = {};
  outflows90.forEach(t => {
    const key = (t.merchant || '').toLowerCase();
    if (!byMerchant[key]) byMerchant[key] = [];
    byMerchant[key].push({ amount: Math.abs(t.amount), date: t.date, dateObj: new Date(t.date) });
  });
  const subscriptions = Object.entries(byMerchant)
    .filter(([_, txs]) => txs.length >= 2)
    .map(([key, txs]) => {
      txs.sort((a, b) => b.dateObj - a.dateObj);
      const avg = txs.reduce((s, t) => s + t.amount, 0) / txs.length;
      const gaps = [];
      for (let i = 0; i < txs.length - 1; i++) {
        gaps.push((txs[i].dateObj - txs[i + 1].dateObj) / (1000 * 60 * 60 * 24));
      }
      const avgGap = gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 0;
      const isMonthly = avgGap >= 25 && avgGap <= 35;
      return {
        merchant: txs[0] && transactions.find(t => (t.merchant || '').toLowerCase() === key)?.merchant || key,
        avg_amount: +avg.toFixed(2),
        cadence_days: +avgGap.toFixed(0),
        is_monthly: isMonthly,
        occurrences: txs.length
      };
    })
    .filter(s => s.is_monthly && s.occurrences >= 2)
    .sort((a, b) => b.avg_amount - a.avg_amount)
    .slice(0, 8);

  // ===== 5. Upcoming bills next 30 days =====
  const dim = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const upcoming = [];
  fixedExpenses.forEach(f => {
    const dueDay = Math.min(f.dueDay, dim);
    const days = dueDay >= today.getDate() ? dueDay - today.getDate() : (dim - today.getDate() + dueDay);
    if (days <= 30) {
      upcoming.push({
        name: f.name,
        amount: f.amount,
        days_until: days,
        due_date: new Date(today.getFullYear(), today.getMonth(), dueDay).toISOString().slice(0, 10),
        category: f.category || 'fijo',
        accepts_card: detectCardEligible(f.name, f.category)
      });
    }
  });
  cards.forEach(c => {
    if (c.payment_due_day) {
      const dueDay = Math.min(c.payment_due_day, dim);
      const days = dueDay >= today.getDate() ? dueDay - today.getDate() : (dim - today.getDate() + dueDay);
      if (days <= 30 && c.min_payment) {
        upcoming.push({
          name: `Pago mín. ${c.institution}`,
          amount: c.min_payment,
          days_until: days,
          due_date: new Date(today.getFullYear(), today.getMonth(), dueDay).toISOString().slice(0, 10),
          category: 'tarjeta',
          accepts_card: false,
          card_id: c.id
        });
      }
    }
  });
  upcoming.sort((a, b) => a.days_until - b.days_until);

  // ===== 6. Income/expense weekly normalized =====
  let weeklyIncome = 0;
  if (avgPaycheck && frequency !== 'unknown') {
    const periodFactor = { weekly: 1, biweekly: 0.5, semimonthly: 24 / 52, monthly: 12 / 52 }[frequency];
    weeklyIncome = +(avgPaycheck * periodFactor).toFixed(2);
  }
  const weeklySpend = +(totalSpent30 / 4.33).toFixed(2);

  return {
    today: todayISO,
    cash: { checking, savings, total_liquidity: checking + savings },
    cards,
    income: {
      frequency,
      avg_paycheck: avgPaycheck,
      last_paycheck_date: lastPaycheckDate,
      next_paycheck_estimate: nextPaycheckDate,
      weekly_normalized: weeklyIncome
    },
    spending: {
      last_30_days: +totalSpent30.toFixed(2),
      last_90_days: +totalSpent90.toFixed(2),
      weekly_avg: weeklySpend,
      by_category_30d: byCategory30
    },
    upcoming_bills_30d: upcoming.slice(0, 12),
    recurring_subscriptions: subscriptions,
    goals: goals.map(g => ({
      name: g.name,
      target: g.target,
      current: g.current || 0,
      deadline: g.deadline,
      schedule: g.schedule || null
    }))
  };
}

/** Heurística simple para saber si un pago acepta tarjeta */
function detectCardEligible(name = '', category = '') {
  const n = name.toLowerCase();
  const c = (category || '').toLowerCase();
  // Renta, hipoteca y pagos a otra tarjeta NO aceptan tarjeta
  if (n.includes('renta') || n.includes('alquiler') || n.includes('hipoteca') || n.includes('mortgage')) return false;
  if (c === 'vivienda' && n.includes('rent')) return false;
  if (n.includes('tarjeta') || n.includes('card')) return false;
  return true;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({
      error: 'Kleo AI no configurado',
      detail: 'Falta ANTHROPIC_API_KEY en las variables de entorno de Vercel.'
    });
  }

  try {
    const { transactions = [], accounts = [], goals = [], fixedExpenses = [], type } = req.body;

    // === Tipos legacy (compatibilidad) ===
    if (type === 'spending') {
      return await runLegacy(req, res, type, { transactions, accounts, goals, fixedExpenses });
    }
    if (type === 'goal') {
      return await runLegacy(req, res, type, { transactions, accounts, goals, fixedExpenses });
    }

    // === Nuevo flujo profesional (default + 'dashboard' + 'advisor') ===
    const profile = buildFinancialProfile({ transactions, accounts, fixedExpenses, goals });

    const userMessage = `Analiza este perfil financiero y genera el plan estratégico:

${JSON.stringify(profile, null, 2)}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2400,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }]
      })
    });

    const data = await response.json();
    if (!response.ok || data.error) {
      console.error('Anthropic error:', data);
      return res.status(500).json({
        error: data.error?.message || `Anthropic returned ${response.status}`,
        error_type: data.error?.type,
        status: response.status
      });
    }

    const text = data.content?.[0]?.text || '';
    let clean = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

    let parsed = null;
    try { parsed = JSON.parse(clean); } catch {}

    if (!parsed || typeof parsed !== 'object') {
      // Fallback al formato legacy si la IA no devolvió estructura
      return res.json({ result: clean, profile });
    }

    res.json({ result: parsed, profile });
  } catch (err) {
    console.error('AI insights error:', err.message);
    res.status(500).json({ error: 'Error generating insights' });
  }
}

/** Tipos legacy para no romper otros consumidores. */
async function runLegacy(req, res, type, { transactions, accounts, goals, fixedExpenses }) {
  let prompt = '';
  if (type === 'spending') {
    prompt = `Eres Kleo, asistente financiero. Analiza el patrón de gastos y da un resumen en español con recomendaciones. Sé conciso.

Transacciones del mes: ${JSON.stringify(transactions?.slice(0, 30).map(t => ({ merchant: t.merchant, amount: t.amount, category: t.category, date: t.date })))}

Responde SOLO con JSON: {"summary": "resumen de 1-2 líneas", "topCategory": "categoría donde más gasta", "topAmount": numero, "tips": ["tip1", "tip2"]}`;
  } else if (type === 'goal') {
    prompt = `Eres Kleo, asistente financiero. Basado en los datos, da un consejo para alcanzar esta meta más rápido. En español, máximo 3 líneas.

Meta: ${JSON.stringify(goals?.[0])}
Ingresos y gastos recientes: ${JSON.stringify(transactions?.slice(0, 10).map(t => ({ amount: t.amount, category: t.category })))}

Responde SOLO con JSON: {"advice": "consejo directo", "savedPerMonth": numero_estimado}`;
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
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }]
    })
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  const text = data.content?.[0]?.text || '';
  let clean = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  try { return res.json({ result: JSON.parse(clean) }); } catch { return res.json({ result: clean }); }
}
