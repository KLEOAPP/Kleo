// Kleo AI · Asesor Financiero Profesional de Élite
// Endpoint que combina análisis profundo + detección de riesgos + estrategia
// con tarjetas de puente + proyección de flujo + patrones de comportamiento.

const SYSTEM_PROMPT = `Eres Kleo, un asesor financiero profesional de élite con 20 años de
experiencia, especializado en consumidores de Puerto Rico. Tu nivel es el de un wealth
advisor de banco privado: analizas profundamente la situación del usuario, anticipas
problemas, optimizas decisiones y ofreces soluciones estratégicas que maximicen su
estabilidad y bienestar financiero.

═══════════════════════════════════════════════════
1. CONOCIMIENTO PROFUNDO DEL USUARIO
═══════════════════════════════════════════════════
Tu input incluye 6 meses de historial financiero. Debes analizar:
- Transacciones bancarias completas
- Ingresos: frecuencia, fechas típicas de cobro, monto promedio, variación
- Gastos esenciales (renta, luz, agua, comida, transporte) vs no-esenciales (entretenimiento, comida fuera)
- Pagos recurrentes detectados (suscripciones, mensualidades)
- Deudas activas, intereses, fechas de vencimiento
- Uso de tarjetas de crédito (utilización, balances, mínimos)
- Patrones de consumo: ciclos, días típicos de gasto, gastos que aumentan/bajan
- Categorías que generan estrés financiero
- Comportamiento histórico con tarjetas: pagos tardíos, balances crecientes
- Meses con déficit vs superávit

Conoces al usuario como si llevaras años asesorándolo.

═══════════════════════════════════════════════════
2. DETECCIÓN INTELIGENTE DE PROBLEMAS
═══════════════════════════════════════════════════
Monitoreas continuamente:
- Saldo actual en todas las cuentas
- Pagos próximos a vencer (fixed_expenses + card minimums)
- Ingresos próximos (próximo cheque)
- Disponibilidad de crédito por tarjeta
- Riesgo de sobregiro
- Riesgo de no poder cubrir pagos antes del próximo cheque
- Riesgo de intereses o cargos por atraso
- Riesgo de que una deuda crezca (pagar solo el mínimo en alta utilización)
- Riesgo de quedar sin dinero antes del próximo cheque
- Gastos inusuales que rompen patrón

Para cada problema:
1. Identifícalo con precisión (qué, cuándo, cuánto)
2. Explica POR QUÉ ocurre (causa)
3. Propón la mejor solución
4. Da instrucciones paso a paso
5. Ajusta el "disponible" si aplica

═══════════════════════════════════════════════════
3. CÁLCULO DE "DISPONIBLE ESTA SEMANA"
═══════════════════════════════════════════════════
Calcula según frecuencia de cobro detectada (weekly | biweekly | semimonthly | monthly):

weekly_available = saldo_checking
                 + ingresos_próximos_7d
                 - pagos_atrasados
                 - pagos_próximos_7d
                 - pagos_automáticos_próximos_7d
                 - aportes_a_metas_próximos_7d
                 - reserva_para_repago_de_tarjeta_si_hay_puente

Normalización a semanal:
- weekly:      monto × 1
- biweekly:    monto / 2
- semimonthly: monto × 24/52
- monthly:     monto × 12/52

═══════════════════════════════════════════════════
4. ESTRATEGIA CON TARJETAS DE CRÉDITO (PUENTE)
═══════════════════════════════════════════════════
Si efectivo_disponible < pagos_requeridos antes del próximo cheque:

1. Identifica qué pagos ACEPTAN tarjeta:
   ✅ Aceptan: luz, agua, internet, teléfono, gym, suscripciones, escuela, seguros
   ❌ NO aceptan: renta, hipoteca, pagos a otra tarjeta, préstamos

2. Mueve esos pagos a la tarjeta con MENOR APR y MAYOR available_credit
3. Calcula cuánto repagar el día del próximo cheque
4. Resta ese repago del "disponible futuro"
5. Explica el plan paso a paso
6. Prioriza siempre evitar intereses y cargos por atraso

ESCENARIO EJEMPLO 1 — Déficit semanal:
  Saldo: $40, Cheque en 5 días: $330
  Pagos: Luz $60 (card ok), Agua $30 (card ok), Pago tarjeta A $50 (no card)
  → Plan: Carga Luz $60 y Agua $30 a tarjeta. Usa $40 cash para Tarjeta A.
    El día del cheque: $90 a la tarjeta puente, $10 al pago de Tarjeta A.

ESCENARIO EJEMPLO 2 — Riesgo de sobregiro:
  Saldo: $120, Débito automático mañana: $150
  → Plan: Deposita $30 hoy mismo, o paga con tarjeta y cancela el débito.

ESCENARIO EJEMPLO 3 — Deuda creciente:
  Tarjeta A: balance $2,000, APR 29%
  → Plan: Pagos adicionales prioritarios. Reducir gastos no-esenciales.
    NO usar esa tarjeta hasta bajar utilización.

═══════════════════════════════════════════════════
5. SOLUCIONES ÓPTIMAS
═══════════════════════════════════════════════════
Toda recomendación debe optimizar simultáneamente:
- minimizar intereses
- evitar cargos por atraso
- proteger el crédito (utilización, historial de pagos)
- mantener liquidez
- priorizar pagos esenciales
- reducir estrés financiero
- crear estabilidad a largo plazo

═══════════════════════════════════════════════════
6. ESTILO DE COMUNICACIÓN
═══════════════════════════════════════════════════
- Claro, directo, profesional, empático
- Sin jerga financiera
- Cada explicación responde: qué hacer / por qué / cuándo / cómo
- Mensajes accionables paso a paso
- Español de Puerto Rico cuando aplique
- Tono de aliado, no de juez

═══════════════════════════════════════════════════
7. LÍMITES
═══════════════════════════════════════════════════
- NO inventes datos. Solo analiza el INPUT.
- NO hagas predicciones irreales.
- NO des consejos ilegales o financieros agresivos.
- NO tomes decisiones por el usuario; solo recomienda.
- Si faltan datos para una recomendación responsable, dilo en lugar de adivinar.

═══════════════════════════════════════════════════
8. OBJETIVO FINAL
═══════════════════════════════════════════════════
Que el usuario:
- nunca se atrase en pagos
- evite intereses innecesarios
- mantenga control total de su dinero
- reduzca deudas
- mejore su estabilidad financiera
- tome decisiones inteligentes con tu guía

═══════════════════════════════════════════════════
9. FORMATO DE SALIDA (CRÍTICO)
═══════════════════════════════════════════════════
Responde SOLO con JSON válido — sin markdown, sin \`\`\`, sin texto extra.
Estructura exacta:

{
  "weekly_available": <número>,
  "weekly_available_explanation": "<1-2 oraciones explicando el cálculo>",
  "income_frequency_detected": "weekly" | "biweekly" | "semimonthly" | "monthly" | "unknown",
  "next_paycheck_estimate": { "date": "YYYY-MM-DD" | null, "amount": <número o null> },
  "risks_detected": [
    {
      "severity": "low" | "medium" | "high",
      "icon": "<emoji>",
      "title": "<título corto: máx 6 palabras>",
      "description": "<por qué ocurre, qué significa, cuándo>",
      "recommendation": "<acción concreta>"
    }
  ],
  "recommended_actions": [
    {
      "priority": <1 = más importante>,
      "icon": "<emoji>",
      "title": "<acción concreta>",
      "reasoning": "<por qué es la mejor decisión>",
      "steps": ["<paso 1 accionable>", "<paso 2>", "<paso 3>"]
    }
  ],
  "credit_card_bridge_plan": {
    "needed": <true|false>,
    "plan_summary": "<1-2 oraciones>",
    "moves": [
      {
        "bill": "<nombre del pago>",
        "amount": <número>,
        "card": "<institución + ••last4>",
        "repay_date": "YYYY-MM-DD",
        "reason": "<por qué este pago a esta tarjeta>"
      }
    ],
    "future_paycheck_deduction": <número>
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
      "title": "<patrón en 4-6 palabras>",
      "text": "<explicación con cifras concretas>"
    }
  ]
}

Reglas:
- Máximo 4 elementos por array (no abrumes al usuario)
- Si un campo no aplica usa null o []
- JAMÁS inventes valores
- Las acciones recomendadas deben venir de los datos reales del INPUT`;

const FEW_SHOT_USER = `Perfil de prueba:
{
  "today": "2026-01-12",
  "cash": { "checking": 40, "savings": 0 },
  "cards": [
    { "institution": "Discover", "last4": "1234", "balance": 50, "limit": 1000, "apr": 22.99, "min_payment": 25, "payment_due_day": 15, "cycle_close_day": 5, "available_credit": 950 }
  ],
  "income": { "frequency": "biweekly", "avg_paycheck": 660, "next_paycheck_estimate": "2026-01-17" },
  "upcoming_bills_30d": [
    { "name": "Luz", "amount": 60, "due_date": "2026-01-13", "accepts_card": true },
    { "name": "Agua", "amount": 30, "due_date": "2026-01-13", "accepts_card": true },
    { "name": "Pago mín. Discover", "amount": 25, "due_date": "2026-01-15", "accepts_card": false }
  ]
}`;

const FEW_SHOT_ASSISTANT = `{
  "weekly_available": 0,
  "weekly_available_explanation": "Tu saldo es $40 y tienes $90 en pagos esta semana. Sin el cheque del 17, no alcanzas.",
  "income_frequency_detected": "biweekly",
  "next_paycheck_estimate": { "date": "2026-01-17", "amount": 660 },
  "risks_detected": [
    {
      "severity": "high",
      "icon": "⚠️",
      "title": "Déficit antes del cheque",
      "description": "Te faltan $50 para cubrir Luz, Agua y el pago mínimo de Discover antes del 17 de enero.",
      "recommendation": "Carga Luz y Agua a tu Discover y guarda los $40 cash para el pago mínimo."
    }
  ],
  "recommended_actions": [
    {
      "priority": 1,
      "icon": "💳",
      "title": "Usa Discover como puente para Luz y Agua",
      "reasoning": "Ambos aceptan tarjeta y tu Discover tiene $950 disponibles. Evitas atraso y mantienes liquidez para el pago mínimo.",
      "steps": [
        "Paga Luz $60 con Discover desde la app del proveedor.",
        "Paga Agua $30 con Discover desde la app del proveedor.",
        "Usa los $40 de checking para el pago mínimo de Discover el 15.",
        "Cuando entre el cheque del 17 ($660), separa $90 para repagar el cargo de Luz+Agua a Discover ese mismo día."
      ]
    }
  ],
  "credit_card_bridge_plan": {
    "needed": true,
    "plan_summary": "Carga Luz $60 y Agua $30 a Discover para mantener liquidez. Repaga $90 el 17 cuando entre el cheque.",
    "moves": [
      { "bill": "Luz", "amount": 60, "card": "Discover ••1234", "repay_date": "2026-01-17", "reason": "Acepta tarjeta y libera $60 cash para el pago mínimo." },
      { "bill": "Agua", "amount": 30, "card": "Discover ••1234", "repay_date": "2026-01-17", "reason": "Acepta tarjeta. Junto con Luz suma $90 que repagas el día del cheque." }
    ],
    "future_paycheck_deduction": 90
  },
  "cash_flow_projection": [
    { "week_label": "Esta semana", "income": 0, "expenses": 25, "end_balance": 15 },
    { "week_label": "Semana del 17/01", "income": 660, "expenses": 90, "end_balance": 585 }
  ],
  "spending_patterns": [
    {
      "icon": "💡",
      "title": "Cobras cada 2 semanas",
      "text": "Tu cheque entra los viernes biweekly (~$660). Planifica pagos críticos para los primeros 3 días después de cobrar."
    }
  ]
}`;

/**
 * Construye el perfil financiero detallado a partir de los datos del usuario.
 */
function buildFinancialProfile({ transactions = [], accounts = [], fixedExpenses = [], goals = [] }) {
  const today = new Date();
  const todayISO = today.toISOString().slice(0, 10);

  // ===== Cash =====
  const checking = accounts.filter(a => a.type === 'checking').reduce((s, a) => s + a.balance, 0);
  const savings = accounts.filter(a => a.type === 'savings').reduce((s, a) => s + a.balance, 0);
  const cards = accounts.filter(a => a.type === 'credit').map(c => ({
    id: c.id,
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

  // ===== Income detection =====
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
      nextPaycheckDate = new Date(inflows[0].dateObj.getTime() + avgGap * 86400000).toISOString().slice(0, 10);
    }
  }

  // ===== 6 meses por mes (mes-a-mes) =====
  const monthly = {};
  const cutoff180 = new Date(today.getTime() - 180 * 86400000);
  transactions.filter(t => new Date(t.date) >= cutoff180 && t.category !== 'transferencia').forEach(t => {
    const d = new Date(t.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!monthly[key]) monthly[key] = { income: 0, expenses: 0, net: 0, top_categories: {} };
    if (t.amount > 0) monthly[key].income += t.amount;
    else {
      const a = Math.abs(t.amount);
      monthly[key].expenses += a;
      monthly[key].top_categories[t.category] = (monthly[key].top_categories[t.category] || 0) + a;
    }
  });
  Object.values(monthly).forEach(m => { m.net = +(m.income - m.expenses).toFixed(2); });

  // ===== Categorización 30/90 días =====
  const cutoff30 = new Date(today.getTime() - 30 * 86400000);
  const cutoff90 = new Date(today.getTime() - 90 * 86400000);
  const out30 = transactions.filter(t => t.amount < 0 && t.category !== 'transferencia' && new Date(t.date) >= cutoff30);
  const out90 = transactions.filter(t => t.amount < 0 && t.category !== 'transferencia' && new Date(t.date) >= cutoff90);

  const totalSpent30 = out30.reduce((s, t) => s + Math.abs(t.amount), 0);
  const totalSpent90 = out90.reduce((s, t) => s + Math.abs(t.amount), 0);
  const byCategory30 = {};
  out30.forEach(t => { byCategory30[t.category] = (byCategory30[t.category] || 0) + Math.abs(t.amount); });

  // Tendencias por categoría: comparar últimos 30d vs los 30d previos
  const cutoff60 = new Date(today.getTime() - 60 * 86400000);
  const out_30_60 = transactions.filter(t => t.amount < 0 && t.category !== 'transferencia' && new Date(t.date) >= cutoff60 && new Date(t.date) < cutoff30);
  const byCatPrev = {};
  out_30_60.forEach(t => { byCatPrev[t.category] = (byCatPrev[t.category] || 0) + Math.abs(t.amount); });
  const category_trends = Object.keys(byCategory30).map(cat => {
    const now = byCategory30[cat] || 0;
    const prev = byCatPrev[cat] || 0;
    const change_pct = prev > 0 ? +(((now - prev) / prev) * 100).toFixed(0) : null;
    return { category: cat, last_30d: +now.toFixed(2), prev_30d: +prev.toFixed(2), change_pct };
  }).sort((a, b) => b.last_30d - a.last_30d).slice(0, 8);

  // ===== Suscripciones =====
  const byMerchant = {};
  out90.forEach(t => {
    const key = (t.merchant || '').toLowerCase();
    if (!byMerchant[key]) byMerchant[key] = [];
    byMerchant[key].push({ amount: Math.abs(t.amount), date: new Date(t.date), dateObj: new Date(t.date) });
  });
  const subscriptions = Object.entries(byMerchant)
    .filter(([_, txs]) => txs.length >= 2)
    .map(([key, txs]) => {
      txs.sort((a, b) => b.dateObj - a.dateObj);
      const avg = txs.reduce((s, t) => s + t.amount, 0) / txs.length;
      const gaps = [];
      for (let i = 0; i < txs.length - 1; i++) gaps.push((txs[i].dateObj - txs[i + 1].dateObj) / (1000 * 60 * 60 * 24));
      const avgGap = gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 0;
      const isMonthly = avgGap >= 25 && avgGap <= 35;
      return {
        merchant: transactions.find(t => (t.merchant || '').toLowerCase() === key)?.merchant || key,
        avg_amount: +avg.toFixed(2),
        cadence_days: +avgGap.toFixed(0),
        is_monthly: isMonthly,
        occurrences: txs.length
      };
    })
    .filter(s => s.is_monthly && s.occurrences >= 2)
    .sort((a, b) => b.avg_amount - a.avg_amount)
    .slice(0, 10);

  // ===== Bills próximos 30 días =====
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
    if (c.payment_due_day && c.min_payment) {
      const dueDay = Math.min(c.payment_due_day, dim);
      const days = dueDay >= today.getDate() ? dueDay - today.getDate() : (dim - today.getDate() + dueDay);
      if (days <= 30) {
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

  // ===== Riesgos pre-calculados =====
  const upcoming7d_total = upcoming.filter(b => b.days_until <= 7).reduce((s, b) => s + b.amount, 0);
  const overdraft_risk_accounts = accounts
    .filter(a => a.type === 'checking')
    .map(a => ({
      name: a.name,
      balance: a.balance,
      pending_outflows_7d: upcoming7d_total,
      risk: a.balance < upcoming7d_total
    }))
    .filter(a => a.risk);

  let weeklyIncome = 0;
  if (avgPaycheck && frequency !== 'unknown') {
    const factor = { weekly: 1, biweekly: 0.5, semimonthly: 24 / 52, monthly: 12 / 52 }[frequency];
    weeklyIncome = +(avgPaycheck * factor).toFixed(2);
  }

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
      weekly_avg: +(totalSpent30 / 4.33).toFixed(2),
      by_category_30d: byCategory30,
      category_trends_30d_vs_30d: category_trends
    },
    monthly_history_6m: monthly,
    upcoming_bills_30d: upcoming.slice(0, 14),
    recurring_subscriptions: subscriptions,
    overdraft_risk: overdraft_risk_accounts,
    goals: goals.map(g => ({
      name: g.name,
      target: g.target,
      current: g.current || 0,
      deadline: g.deadline,
      schedule: g.schedule || null
    }))
  };
}

function detectCardEligible(name = '', category = '') {
  const n = name.toLowerCase();
  const c = (category || '').toLowerCase();
  if (n.includes('renta') || n.includes('alquiler') || n.includes('hipoteca') || n.includes('mortgage')) return false;
  if (c === 'vivienda' && n.includes('rent')) return false;
  if (n.includes('tarjeta') || n.includes('card') || n.includes('pago mín')) return false;
  if (n.includes('préstamo') || n.includes('loan')) return false;
  return true;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({
      error: 'Kleo AI no configurado',
      detail: 'Falta ANTHROPIC_API_KEY en Vercel.'
    });
  }

  try {
    const { transactions = [], accounts = [], goals = [], fixedExpenses = [], type } = req.body;

    if (type === 'spending' || type === 'goal') {
      return await runLegacy(req, res, type, { transactions, accounts, goals, fixedExpenses });
    }

    const profile = buildFinancialProfile({ transactions, accounts, fixedExpenses, goals });
    const userMessage = `Analiza este perfil y genera el plan estratégico (responde SOLO con JSON):

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
        messages: [
          { role: 'user', content: userMessage }
        ]
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
      // El modelo devolvió texto en vez de JSON — error explícito al cliente
      return res.status(500).json({
        error: 'La AI no devolvió JSON válido',
        detail: clean.slice(0, 500),
        hint: 'Reintenta en unos segundos.'
      });
    }

    res.json({ result: parsed, profile });
  } catch (err) {
    console.error('AI insights error:', err.message);
    res.status(500).json({ error: err.message || 'Error generating insights' });
  }
}

async function runLegacy(req, res, type, { transactions, accounts, goals, fixedExpenses }) {
  let prompt = '';
  if (type === 'spending') {
    prompt = `Eres Kleo. Analiza el patrón de gastos brevemente y devuelve JSON:
Transacciones: ${JSON.stringify(transactions?.slice(0, 30).map(t => ({ merchant: t.merchant, amount: t.amount, category: t.category, date: t.date })))}
Responde SOLO con JSON: {"summary": "...", "topCategory": "...", "topAmount": numero, "tips": ["..."]}`;
  } else if (type === 'goal') {
    prompt = `Eres Kleo. Da un consejo para esta meta. JSON:
Meta: ${JSON.stringify(goals?.[0])}
Responde SOLO con JSON: {"advice": "...", "savedPerMonth": numero}`;
  }
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }]
    })
  });
  const data = await response.json();
  if (!response.ok || data.error) {
    return res.status(500).json({ error: data.error?.message || 'AI error' });
  }
  const text = data.content?.[0]?.text || '';
  let clean = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  try { return res.json({ result: JSON.parse(clean) }); } catch { return res.json({ result: clean }); }
}
