// Datos de ejemplo realistas del mercado de Puerto Rico

export const CATEGORIES = {
  comida: { label: 'Comida', icon: '🍽️', color: '#FF6B9D' },
  supermercado: { label: 'Supermercado', icon: '🛒', color: '#00E5B0' },
  transporte: { label: 'Transporte', icon: '⛽', color: '#FFB02E' },
  entretenimiento: { label: 'Entretenimiento', icon: '🎬', color: '#A78BFA' },
  salud: { label: 'Salud', icon: '⚕️', color: '#FF4D6D' },
  compras: { label: 'Compras', icon: '🛍️', color: '#0084FF' },
  hogar: { label: 'Hogar', icon: '🏠', color: '#10B981' },
  servicios: { label: 'Servicios', icon: '💡', color: '#F59E0B' },
  cafe: { label: 'Café', icon: '☕', color: '#92400E' },
  educacion: { label: 'Educación', icon: '📚', color: '#3B82F6' },
  transferencia: { label: 'Transferencia', icon: '↔️', color: '#8B5CF6' },
  ingreso: { label: 'Ingreso', icon: '💵', color: '#00E5B0' },
  otro: { label: 'Otro', icon: '📦', color: '#6B7280' }
};

export const defaultAccounts = [
  // ===== CUENTAS CORRIENTES =====
  {
    id: 'acc_popular',
    name: 'Banco Popular',
    type: 'checking',
    label: 'Cuenta Corriente',
    balance: 4287.42,
    last4: '4821',
    color: 'linear-gradient(135deg, #DC143C 0%, #8B0000 100%)',
    institution: 'Popular',
    purpose: 'gastos del día'
  },

  // ===== CUENTAS DE AHORRO =====
  {
    id: 'acc_savings_main',
    name: 'Banco Popular',
    type: 'savings',
    label: 'Ahorros Principal',
    balance: 8540.00,
    last4: '9182',
    color: 'linear-gradient(135deg, #00B589 0%, #007A5C 100%)',
    institution: 'Popular',
    apy: 4.25,
    purpose: 'ahorro general'
  },
  {
    id: 'acc_emergency',
    name: 'Oriental Bank',
    type: 'savings',
    label: 'Fondo de Emergencia',
    balance: 3200.00,
    last4: '3045',
    color: 'linear-gradient(135deg, #34C759 0%, #1C8B3F 100%)',
    institution: 'Oriental',
    apy: 4.50,
    purpose: 'emergencias',
    targetAmount: 18000,
    icon: '🛡️'
  },
  {
    id: 'acc_travel',
    name: 'Marcus by Goldman',
    type: 'savings',
    label: 'Viaje a Madrid',
    balance: 1850.00,
    last4: '7721',
    color: 'linear-gradient(135deg, #007AFF 0%, #003D80 100%)',
    institution: 'Marcus',
    apy: 4.40,
    purpose: 'meta: viaje',
    targetAmount: 4500,
    icon: '✈️'
  },
  {
    id: 'acc_car',
    name: 'Ally Bank',
    type: 'savings',
    label: 'Pronto Auto Nuevo',
    balance: 950.00,
    last4: '5588',
    color: 'linear-gradient(135deg, #FF9500 0%, #B86600 100%)',
    institution: 'Ally',
    apy: 4.35,
    purpose: 'meta: auto',
    targetAmount: 5000,
    icon: '🚗'
  },

  // ===== TARJETAS DE CRÉDITO =====
  {
    id: 'acc_chase',
    name: 'Chase',
    type: 'credit',
    label: 'Sapphire Preferred',
    balance: -1245.30,
    limit: 8000,
    last4: '7392',
    color: 'linear-gradient(135deg, #117ACA 0%, #003F7D 100%)',
    institution: 'Chase',
    cycleCloseDay: 15,
    paymentDueDay: 10,
    apr: 24.99,
    minPayment: 35
  },
  {
    id: 'acc_discover',
    name: 'Discover',
    type: 'credit',
    label: 'Discover it Cash Back',
    balance: -842.15,
    limit: 5500,
    last4: '5104',
    color: 'linear-gradient(135deg, #FF6000 0%, #B84500 100%)',
    institution: 'Discover',
    cycleCloseDay: 22,
    paymentDueDay: 18,
    apr: 22.99,
    minPayment: 25
  },
  {
    id: 'acc_amex',
    name: 'Amex',
    type: 'credit',
    label: 'Blue Cash Everyday',
    balance: -385.50,
    limit: 6000,
    last4: '8810',
    color: 'linear-gradient(135deg, #007BC1 0%, #00497A 100%)',
    institution: 'American Express',
    cycleCloseDay: 28,
    paymentDueDay: 25,
    apr: 21.49,
    minPayment: 25
  }
];

export const defaultFixedExpenses = [
  { id: 'fx1', name: 'Hipoteca', amount: 1450.00, dueDay: 1, category: 'hogar', accountId: 'acc_popular', icon: '🏠', shared: true },
  { id: 'fx2', name: 'Pago del Carro', amount: 385.50, dueDay: 5, category: 'transporte', accountId: 'acc_popular', icon: '🚗', shared: false },
  { id: 'fx3', name: 'Claro Móvil', amount: 95.00, dueDay: 12, category: 'servicios', accountId: 'acc_chase', icon: '📱', shared: false },
  { id: 'fx4', name: 'LUMA Energy', amount: 187.45, dueDay: 18, category: 'servicios', accountId: 'acc_popular', icon: '💡', shared: true },
  { id: 'fx5', name: 'AAA Acueductos', amount: 48.30, dueDay: 22, category: 'servicios', accountId: 'acc_popular', icon: '💧', shared: true },
  { id: 'fx6', name: 'Seguro Mapfre', amount: 135.00, dueDay: 28, category: 'servicios', accountId: 'acc_chase', icon: '🛡️', shared: false },
  { id: 'fx7', name: 'Internet Liberty', amount: 79.99, dueDay: 8, category: 'servicios', accountId: 'acc_popular', icon: '📡', shared: true },
  { id: 'fx8', name: 'Netflix', amount: 15.49, dueDay: 14, category: 'entretenimiento', accountId: 'acc_chase', icon: '🎬', shared: true },
  { id: 'fx9', name: 'Spotify Family', amount: 16.99, dueDay: 20, category: 'entretenimiento', accountId: 'acc_chase', icon: '🎵', shared: true },
  { id: 'fx10', name: 'Gimnasio Smart Fit', amount: 24.99, dueDay: 3, category: 'salud', accountId: 'acc_chase', icon: '💪', shared: false }
];

const today = new Date();
const daysAgo = (d, hours = null, minutes = null) => {
  const date = new Date(today);
  date.setDate(date.getDate() - d);
  if (hours !== null) date.setHours(hours, minutes || 0);
  return date.toISOString();
};

export const defaultTransactions = [
  { id: 't1', accountId: 'acc_chase', amount: -42.18, merchant: 'Walmart Caguas', category: 'supermercado', date: daysAgo(0, 14, 23), method: 'auto', shared: true },
  { id: 't2', accountId: 'acc_popular', amount: -25.00, merchant: 'ATH Móvil — María', category: 'transferencia', date: daysAgo(0, 11, 5), method: 'ath', shared: false },
  { id: 't3', accountId: 'acc_chase', amount: -8.75, merchant: 'Starbucks Plaza', category: 'cafe', date: daysAgo(1, 8, 12), method: 'auto', shared: false },
  { id: 't4', accountId: 'acc_discover', amount: -67.40, merchant: 'Texaco Bayamón', category: 'transporte', date: daysAgo(1, 17, 45), method: 'auto', shared: false },
  { id: 't5', accountId: 'acc_chase', amount: -156.32, merchant: 'Costco Carolina', category: 'supermercado', date: daysAgo(2, 13, 30), method: 'auto', shared: true },
  { id: 't6', accountId: 'acc_popular', amount: 2850.00, merchant: 'Depósito Nómina', category: 'ingreso', date: daysAgo(2, 9, 0), method: 'auto', shared: false },
  { id: 't7', accountId: 'acc_chase', amount: -34.99, merchant: 'El Mesón Sándwiches', category: 'comida', date: daysAgo(3, 19, 22), method: 'auto', shared: true },
  { id: 't8', accountId: 'acc_discover', amount: -89.50, merchant: 'Walgreens Hato Rey', category: 'salud', date: daysAgo(3, 16, 18), method: 'auto', shared: false },
  { id: 't9', accountId: 'acc_chase', amount: -52.80, merchant: 'Chili\'s Plaza', category: 'comida', date: daysAgo(4, 20, 30), method: 'auto', shared: true },
  { id: 't10', accountId: 'acc_popular', amount: -15.00, merchant: 'ATH Móvil — Pedro', category: 'transferencia', date: daysAgo(4, 12, 8), method: 'ath', shared: false },
  { id: 't11', accountId: 'acc_discover', amount: -120.00, merchant: 'Marshalls', category: 'compras', date: daysAgo(5, 15, 42), method: 'auto', shared: false },
  { id: 't12', accountId: 'acc_chase', amount: -18.25, merchant: 'Subway Río Piedras', category: 'comida', date: daysAgo(6, 12, 50), method: 'auto', shared: false },
  { id: 't13', accountId: 'acc_chase', amount: -45.60, merchant: 'Total Petroleum', category: 'transporte', date: daysAgo(7, 7, 35), method: 'auto', shared: false },
  { id: 't14', accountId: 'acc_discover', amount: -78.90, merchant: 'Pueblo Supermercados', category: 'supermercado', date: daysAgo(8, 18, 15), method: 'auto', shared: true },
  { id: 't15', accountId: 'acc_chase', amount: -12.99, merchant: 'Netflix', category: 'entretenimiento', date: daysAgo(9, 0, 1), method: 'auto', shared: true },
  { id: 't16', accountId: 'acc_chase', amount: -32.45, merchant: 'Amazon.com', category: 'compras', date: daysAgo(10, 21, 18), method: 'auto', shared: false },
  { id: 't17', accountId: 'acc_popular', amount: -50.00, merchant: 'ATH Móvil — Luis', category: 'transferencia', date: daysAgo(11, 14, 0), method: 'ath', shared: false },
  { id: 't18', accountId: 'acc_discover', amount: -28.50, merchant: 'Cinépolis Plaza', category: 'entretenimiento', date: daysAgo(12, 19, 30), method: 'auto', shared: true },
  { id: 't19', accountId: 'acc_chase', amount: -64.20, merchant: 'Econo Supermercados', category: 'supermercado', date: daysAgo(13, 17, 22), method: 'auto', shared: true },
  { id: 't20', accountId: 'acc_popular', amount: 2850.00, merchant: 'Depósito Nómina', category: 'ingreso', date: daysAgo(16, 9, 0), method: 'auto', shared: false },
  { id: 't21', accountId: 'acc_chase', amount: -22.00, merchant: 'Burger King Caguas', category: 'comida', date: daysAgo(14, 13, 45), method: 'auto', shared: false },
  { id: 't22', accountId: 'acc_discover', amount: -38.75, merchant: 'CVS Pharmacy', category: 'salud', date: daysAgo(15, 10, 33), method: 'auto', shared: false },
  { id: 't23', accountId: 'acc_chase', amount: -210.50, merchant: 'JC Penney Plaza', category: 'compras', date: daysAgo(18, 16, 50), method: 'auto', shared: false },
  { id: 't24', accountId: 'acc_popular', amount: -75.00, merchant: 'ATH Móvil — Renta', category: 'transferencia', date: daysAgo(20, 18, 20), method: 'ath', shared: false }
];

// Tipos de meta personalizables
export const GOAL_TYPES = {
  emergency: { label: 'Fondo de Emergencia', icon: '🛡️', color: '#00E5B0', recommendedMonths: 6, suggestedTarget: 'gastos_x_meses' },
  savings:   { label: 'Ahorro General',     icon: '💰', color: '#FFB02E', recommendedPct: 20 },
  travel:    { label: 'Viaje',              icon: '✈️', color: '#0084FF' },
  car:       { label: 'Auto',               icon: '🚗', color: '#FF6B9D' },
  home:      { label: 'Casa / Hogar',       icon: '🏠', color: '#10B981' },
  education: { label: 'Educación',          icon: '🎓', color: '#3B82F6' },
  custom:    { label: 'Personalizado',      icon: '🎯', color: '#A78BFA' }
};

export const defaultGoals = [
  {
    id: 'g1',
    name: 'Viaje a Madrid',
    type: 'travel',
    target: 4500,
    current: 1850,
    deadline: '2026-12-15',
    icon: '✈️',
    color: '#0084FF',
    notes: 'Vuelo + hotel + comidas para 10 días'
  },
  {
    id: 'g2',
    name: 'Fondo de Emergencia',
    type: 'emergency',
    target: 18000,
    current: 3200,
    deadline: '2027-06-30',
    icon: '🛡️',
    color: '#00E5B0',
    notes: '6 meses de gastos cubiertos'
  },
  {
    id: 'g3',
    name: 'Pronto del Carro Nuevo',
    type: 'car',
    target: 5000,
    current: 950,
    deadline: '2027-03-01',
    icon: '🚗',
    color: '#FF6B9D'
  }
];

// Datos del usuario para cálculos personalizados
export const defaultUserFinance = {
  monthlyIncome: 5700,        // Ingreso mensual neto (después de impuestos)
  monthlyAvgFixed: 2520,      // Promedio gastos fijos mensuales
  payCycle: 'biweekly',       // 'biweekly' | 'monthly' | 'weekly'
  paydays: [15, 30],          // días que cobra
};

// Hogar / pareja con quien se comparten gastos
export const defaultHousehold = {
  enabled: true,
  members: [
    { id: 'me', name: 'Carlos', avatar: 'CR', incomeRatio: 0.55, isMe: true },
    { id: 'partner', name: 'María', avatar: 'MR', incomeRatio: 0.45, isMe: false }
  ],
  splitMethod: 'income', // 'equal', 'income', 'custom'
  pendingConfirmations: [
    { id: 'pc1', merchant: 'Costco Carolina', amount: 156.32, date: '2026-04-27', suggestedShared: true, reason: 'Compras grandes históricamente compartidas' },
    { id: 'pc2', merchant: 'Texaco Bayamón', amount: 67.40, date: '2026-04-27', suggestedShared: false, reason: 'Gasolina típicamente individual' }
  ]
};

// sample merchants for receipt OCR mock
export const sampleReceiptMerchants = [
  { merchant: 'Walmart Caguas', amount: 67.42, category: 'supermercado', items: ['Pan', 'Leche', 'Huevos', 'Detergente'] },
  { merchant: 'Pueblo Supermercados', amount: 45.18, category: 'supermercado', items: ['Frutas', 'Vegetales', 'Pollo'] },
  { merchant: 'Walgreens', amount: 23.50, category: 'salud', items: ['Vitaminas', 'Tylenol'] },
  { merchant: 'El Mesón Sándwiches', amount: 18.75, category: 'comida', items: ['Tripleta', 'Refresco'] },
  { merchant: 'Starbucks Plaza', amount: 9.40, category: 'cafe', items: ['Caramel Macchiato', 'Croissant'] }
];

// Factores de FICO Score con sus pesos reales
export const CREDIT_FACTORS = [
  {
    id: 'payment_history',
    label: 'Historial de Pagos',
    weight: 35,
    icon: '✅',
    color: '#00E5B0',
    description: 'Pagar a tiempo es lo más importante. Un solo pago tarde de 30+ días puede bajar tu score 60-110 puntos.',
    tips: [
      'Programa pagos automáticos del mínimo en cada tarjeta',
      'Si te atrasas, paga inmediatamente — bajo 30 días no afecta tu reporte',
      'Mantén récord limpio por al menos 7 años para que un atraso desaparezca'
    ]
  },
  {
    id: 'utilization',
    label: 'Utilización de Crédito',
    weight: 30,
    icon: '📊',
    color: '#0084FF',
    description: 'Cuánto crédito usas vs cuánto tienes disponible. Para crédito EXCELENTE, mantenlo bajo 5%. Bajo 30% es bueno; sobre 30% empieza a bajar tu score.',
    tips: [
      '5% o menos = score excelente (top tier)',
      '30% es el máximo aceptable',
      'Calcula así: Balance ÷ Límite × 100',
      'Tip: paga ANTES del cierre del ciclo, no antes del due date',
      'Pide aumentos de límite cada 6-12 meses'
    ]
  },
  {
    id: 'length',
    label: 'Antigüedad del Crédito',
    weight: 15,
    icon: '📅',
    color: '#FFB02E',
    description: 'Cuánto tiempo llevas con crédito. Cuenta el promedio de antigüedad de TODAS tus cuentas. Por eso cerrar tarjetas viejas es mala idea.',
    tips: [
      'Nunca cierres tu tarjeta más vieja',
      'Si una tarjeta no la usas, hazle un cargo pequeño cada 3-6 meses',
      'Abrir muchas cuentas nuevas baja tu promedio'
    ]
  },
  {
    id: 'mix',
    label: 'Mezcla de Crédito',
    weight: 10,
    icon: '🎨',
    color: '#A78BFA',
    description: 'Tener distintos tipos de crédito (tarjetas, préstamo de auto, hipoteca) muestra que sabes manejarlos.',
    tips: [
      'Mezclar revolving (tarjetas) con installment (préstamos) ayuda',
      'No abras cuentas que no necesites solo para mejorar este factor',
      'Es el factor más fácil de mejorar pasivamente con el tiempo'
    ]
  },
  {
    id: 'new_credit',
    label: 'Crédito Nuevo',
    weight: 10,
    icon: '🆕',
    color: '#FF6B9D',
    description: 'Cada vez que aplicas para crédito te hacen un "hard inquiry" que baja tu score 5-10 puntos por 12 meses.',
    tips: [
      'No apliques a más de 1-2 productos en 6 meses',
      'Pre-cualificaciones (soft inquiry) NO afectan tu score',
      'Si vas a comprar carro o casa, junta todas las pre-aprobaciones en 14 días — cuentan como una sola'
    ]
  }
];

// Rangos de FICO
export const CREDIT_RANGES = [
  { min: 800, max: 850, label: 'Excepcional', color: '#00E5B0', desc: 'Calificas para las mejores tasas y productos' },
  { min: 740, max: 799, label: 'Muy Bueno',   color: '#10B981', desc: 'Tasas mejor del promedio' },
  { min: 670, max: 739, label: 'Bueno',        color: '#FFB02E', desc: 'Aceptable para la mayoría de productos' },
  { min: 580, max: 669, label: 'Regular',      color: '#FF8800', desc: 'Tasas más altas; algunas aprobaciones difíciles' },
  { min: 300, max: 579, label: 'Pobre',        color: '#FF4D6D', desc: 'Necesita mejorar antes de aplicar' }
];
