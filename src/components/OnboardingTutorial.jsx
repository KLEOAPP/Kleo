import { useState } from 'react';
import { Icon } from './icons.jsx';

/**
 * Tutorial obligatorio que se muestra después del primer login.
 * 16 slides cubriendo cada sección de la app con datos de ejemplo.
 *
 * Persistencia: localStorage.kleo_tutorial_completed = 'true'
 */
export default function OnboardingTutorial({ onComplete }) {
  const [step, setStep] = useState(0);

  const slides = SLIDES;
  const isLast = step === slides.length - 1;
  const slide = slides[step];

  const finish = () => {
    try { localStorage.setItem('kleo_tutorial_completed', 'true'); } catch {}
    onComplete?.();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'var(--bg)',
      display: 'flex', flexDirection: 'column',
      animation: 'fadeUp .25s ease'
    }}>
      {/* Top bar */}
      <div style={{
        padding: '40px 16px 12px',
        display: 'flex', alignItems: 'center',
        gap: 6
      }}>
        {slides.map((_, i) => (
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: 999,
            background: i < step ? 'var(--brand-grad)'
              : i === step ? 'var(--brand-grad)'
              : 'var(--bg-elev)',
            opacity: i === step ? 1 : i < step ? 0.6 : 1
          }} />
        ))}
      </div>

      {/* Slide content */}
      <div style={{
        flex: 1,
        padding: '20px 20px 0',
        overflowY: 'auto'
      }}>
        {/* Hero illustration */}
        <div style={{
          width: '100%',
          height: 180,
          borderRadius: 22,
          background: slide.bgGradient || 'linear-gradient(135deg, rgba(168, 85, 247, 0.15), rgba(0, 229, 176, 0.12))',
          border: `1px solid ${slide.borderColor || 'rgba(168, 85, 247, 0.25)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 80, marginBottom: 24,
          position: 'relative', overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: -40, right: -40,
            width: 140, height: 140,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${slide.glow || 'rgba(168, 85, 247, 0.3)'}, transparent 70%)`,
            pointerEvents: 'none'
          }} />
          <span style={{ position: 'relative' }}>{slide.emoji}</span>
        </div>

        {/* Tag */}
        <div className="row gap-6 mb-8" style={{ alignItems: 'center' }}>
          <span style={{
            fontSize: 11, fontWeight: 800,
            color: slide.tagColor || '#A855F7',
            background: (slide.tagColor || '#A855F7') + '22',
            padding: '4px 10px', borderRadius: 999,
            textTransform: 'uppercase', letterSpacing: '0.05em'
          }}>
            {slide.tag}
          </span>
          <span className="tiny" style={{ fontSize: 11, color: 'var(--text-mute)' }}>
            {step + 1} de {slides.length}
          </span>
        </div>

        {/* Title */}
        <h1 style={{
          fontSize: 26, fontWeight: 800, lineHeight: 1.2,
          letterSpacing: '-0.02em', marginBottom: 12
        }}>
          {slide.title}
        </h1>

        {/* Body */}
        <p style={{
          fontSize: 15, lineHeight: 1.5, color: 'var(--text)',
          marginBottom: 16
        }}>
          {slide.body}
        </p>

        {/* Bullets */}
        {slide.bullets && (
          <div className="col gap-10 mb-16">
            {slide.bullets.map((b, i) => (
              <div key={i} className="row gap-10" style={{ alignItems: 'flex-start' }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{b.icon}</span>
                <div className="col gap-2" style={{ flex: 1 }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{b.title}</span>
                  {b.desc && <span style={{ fontSize: 12, lineHeight: 1.4, color: 'var(--text-mute)' }}>{b.desc}</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tip box */}
        {slide.tip && (
          <div style={{
            background: 'rgba(0, 229, 176, 0.10)',
            border: '1px solid rgba(0, 229, 176, 0.3)',
            borderRadius: 14, padding: 14, marginBottom: 16
          }}>
            <div className="row gap-10" style={{ alignItems: 'flex-start' }}>
              <span style={{ fontSize: 20 }}>💡</span>
              <span style={{ fontSize: 12, lineHeight: 1.5 }}>{slide.tip}</span>
            </div>
          </div>
        )}

        {/* Formula box (slide del Kleo Score) */}
        {slide.formula && (
          <div className="card" style={{
            padding: 12, borderRadius: 14, marginBottom: 16,
            background: 'var(--bg-elev)'
          }}>
            <span className="tiny" style={{ fontWeight: 800, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Fórmula FICO
            </span>
            <div className="col gap-6 mt-8">
              {slide.formula.map((f, i) => (
                <div key={i} className="row gap-8" style={{ alignItems: 'center' }}>
                  <span style={{ fontSize: 14 }}>{f.emoji}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>{f.name}</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: f.color }}>{f.weight}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer buttons */}
      <div style={{
        padding: '16px 20px 28px',
        background: 'var(--bg)',
        borderTop: '1px solid var(--border-soft)',
        display: 'flex', gap: 10
      }}>
        {step > 0 && (
          <button
            onClick={() => setStep(s => Math.max(0, s - 1))}
            style={{
              flex: '0 0 auto', padding: '14px 18px',
              borderRadius: 12, background: 'var(--bg-elev)',
              fontWeight: 700, fontSize: 14
            }}
          >
            <Icon name="back" size={16} />
          </button>
        )}
        <button
          onClick={() => isLast ? finish() : setStep(s => s + 1)}
          style={{
            flex: 1, padding: '14px 18px',
            borderRadius: 12,
            background: isLast ? 'var(--brand-grad)' : 'var(--brand-grad)',
            color: '#fff', fontWeight: 800, fontSize: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: isLast ? '0 6px 18px rgba(168, 85, 247, 0.4)' : '0 4px 14px rgba(168, 85, 247, 0.3)'
          }}
        >
          <span>{isLast ? '✨ Empezar a usar Kleo' : 'Siguiente'}</span>
          {!isLast && <Icon name="back" size={14} color="#fff" stroke={2.5} style={{ transform: 'rotate(180deg)' }} />}
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// Contenido del tutorial — 16 slides
// ════════════════════════════════════════════════════════════
const SLIDES = [
  {
    tag: 'Bienvenido',
    tagColor: '#A855F7',
    emoji: '👋',
    title: 'Hola, soy Kleo',
    body: 'Tu asesor financiero personal. No soy una app de tracking — soy un asistente que conoce tus finanzas tan bien como un advisor que lleva años contigo.',
    bullets: [
      { icon: '🎯', title: 'Te digo qué hacer hoy', desc: 'Acción específica del día con monto, fecha y por qué.' },
      { icon: '🛡', title: 'Detecto riesgos antes de que ocurran', desc: 'Sobregiros, atrasos, deudas crecientes.' },
      { icon: '💪', title: 'Protejo tu crédito y tu liquidez', desc: 'Cada decisión optimiza tu score y tu efectivo.' }
    ],
    tip: 'Este recorrido toma 2 minutos. Te muestro cada parte de Kleo con datos de ejemplo.'
  },
  {
    tag: 'Disponible',
    tagColor: '#00E5B0',
    emoji: '💰',
    bgGradient: 'linear-gradient(135deg, rgba(0, 229, 176, 0.15), rgba(168, 85, 247, 0.10))',
    glow: 'rgba(0, 229, 176, 0.35)',
    title: 'Disponible esta semana',
    body: 'El número más importante de tu día a día. Lo que puedes gastar libremente sin descuadrar nada.',
    bullets: [
      { icon: '📅', title: 'Se basa en cuándo cobras', desc: 'Semanal, bisemanal, quincenal o mensual.' },
      { icon: '🧮', title: 'Resta lo comprometido', desc: 'Gastos esenciales, ahorro y planes ya tienen dueño.' },
      { icon: '🔄', title: 'Cambia el periodo cuando quieras', desc: 'Día / Semana / Ciclo / Mes — toca y se recalcula.' }
    ],
    tip: 'Cuando conectes tu banco voy a calcular este número con TU data real.'
  },
  {
    tag: 'Acción del día',
    tagColor: '#FF2D6F',
    emoji: '✨',
    bgGradient: 'linear-gradient(135deg, rgba(255, 45, 111, 0.15), rgba(168, 85, 247, 0.10))',
    glow: 'rgba(255, 45, 111, 0.35)',
    title: 'La acción más importante de hoy',
    body: 'Cada día te muestro UNA cosa que debes hacer. La más importante para tu salud financiera.',
    bullets: [
      { icon: '💳', title: 'Ej: Paga $385 a Chase antes del cierre', desc: 'Para que tu utilización reportada baje a 5%.' },
      { icon: '⚡', title: 'Botón "Seguir plan"', desc: 'Te abre un overlay con el por qué, con qué pagar y los pasos exactos.' }
    ],
    tip: 'No tienes que pensar. Yo decido qué es prioritario y tú solo ejecutas.'
  },
  {
    tag: 'Esta semana',
    tagColor: '#0A84FF',
    emoji: '📅',
    bgGradient: 'linear-gradient(135deg, rgba(10, 132, 255, 0.15), rgba(168, 85, 247, 0.10))',
    glow: 'rgba(10, 132, 255, 0.35)',
    title: 'Tu semana en un vistazo',
    body: 'Cuántos pagos, suscripciones y cierres de ciclo vienen los próximos 7 días.',
    bullets: [
      { icon: '💳', title: 'X pagos', desc: 'Renta, luz, agua, mínimos de tarjeta.' },
      { icon: '🔁', title: 'X suscripciones', desc: 'Netflix, Spotify, gym, etc.' },
      { icon: '🔒', title: 'X cierres de ciclo', desc: 'Días donde tu tarjeta reporta al buró.' }
    ],
    tip: 'Toca "Ver calendario" para ver el detalle día por día con logos de cada pago.'
  },
  {
    tag: 'Riesgo',
    tagColor: '#FF9500',
    emoji: '⛅',
    bgGradient: 'linear-gradient(135deg, rgba(255, 149, 0, 0.15), rgba(168, 85, 247, 0.10))',
    glow: 'rgba(255, 149, 0, 0.35)',
    title: 'Riesgo de la semana',
    body: 'El "clima financiero" — ☀️ Bajo, ⛅ Medio o ⛈ Alto. Te lee la semana en 2 segundos.',
    bullets: [
      { icon: '☀️', title: 'BAJO', desc: 'Todo bajo control, sin eventos críticos.' },
      { icon: '⛅', title: 'MEDIO', desc: '1-3 eventos requieren tu atención.' },
      { icon: '⛈', title: 'ALTO', desc: 'Riesgo real de quedarte corto. Toca "Ver riesgos".' }
    ],
    tip: 'El riesgo se calcula con tu utilización, los pagos vs tu balance, y patrones de gasto.'
  },
  {
    tag: 'Kleo Score',
    tagColor: '#A855F7',
    emoji: '🤖',
    bgGradient: 'linear-gradient(135deg, rgba(255, 45, 111, 0.10), rgba(168, 85, 247, 0.10), rgba(0, 229, 176, 0.10))',
    glow: 'rgba(168, 85, 247, 0.35)',
    title: 'Tu Kleo Score',
    body: 'Estimación de tu FICO Score basada en tus tarjetas. Va de 300 a 850.',
    formula: [
      { emoji: '✅', name: 'Historial de pagos',     weight: '35%', color: '#00E5B0' },
      { emoji: '📊', name: 'Utilización de crédito', weight: '30%', color: '#0A84FF' },
      { emoji: '📅', name: 'Antigüedad del crédito', weight: '15%', color: '#FFB02E' },
      { emoji: '🎨', name: 'Mezcla de crédito',      weight: '10%', color: '#A78BFA' },
      { emoji: '🆕', name: 'Crédito nuevo',          weight: '10%', color: '#FF6B9D' }
    ],
    tip: 'Lo más impactante: pagar a tiempo SIEMPRE y mantener utilización bajo 10%.'
  },
  {
    tag: 'Cuentas',
    tagColor: '#5856D6',
    emoji: '🏦',
    bgGradient: 'linear-gradient(135deg, rgba(88, 86, 214, 0.15), rgba(0, 229, 176, 0.10))',
    glow: 'rgba(88, 86, 214, 0.35)',
    title: 'Tus cuentas bancarias',
    body: 'Lista de cuentas corrientes y de ahorros conectadas. Sin tarjetas — esas tienen su propia sección.',
    bullets: [
      { icon: '👁', title: 'Toca cualquier cuenta', desc: 'Ves balance grande, transacciones recientes, APY si tiene.' },
      { icon: '✏', title: 'Cambia el nombre', desc: 'Editar para ponerle uno fácil de reconocer.' },
      { icon: '🗑', title: 'Eliminar cuenta', desc: 'Si ya no la usas, la quitas y deja de afectar tus números.' }
    ],
    tip: 'Los logos oficiales del banco aparecen automáticamente — Banco Popular, Chase, Discover, etc.'
  },
  {
    tag: 'Crédito',
    tagColor: '#00B589',
    emoji: '💳',
    bgGradient: 'linear-gradient(135deg, rgba(0, 181, 137, 0.15), rgba(255, 45, 111, 0.10))',
    glow: 'rgba(0, 181, 137, 0.35)',
    title: 'Tarjetas y plan de pago',
    body: 'Por cada tarjeta te calculo cuánto pagar y cuándo, para mantener utilización óptima.',
    bullets: [
      { icon: '🎯', title: 'Pagar antes del cierre, no del due date', desc: 'Lo que reporta el banco al buró es el balance al cierre del ciclo.' },
      { icon: '💵', title: 'Cuánto pagar', desc: 'Te calculo el monto exacto para llegar a 5% (o el % que elijas).' },
      { icon: '🔢', title: 'APR — el interés anual', desc: 'Si tu banco no lo da, te lo pido para hacer cálculos exactos.' },
      { icon: '🧮', title: 'Calculadora de pago extra', desc: 'Mueves el slider y ves cuánto te ahorras en intereses.' }
    ],
    tip: 'Para crédito EXCELENTE mantén utilización bajo 5%. Sobre 30% afecta tu score notablemente.'
  },
  {
    tag: 'Calendario',
    tagColor: '#34C759',
    emoji: '🗓',
    bgGradient: 'linear-gradient(135deg, rgba(52, 199, 89, 0.15), rgba(0, 132, 255, 0.10))',
    glow: 'rgba(52, 199, 89, 0.35)',
    title: 'Calendario inteligente',
    body: 'Auto-poblado con tus pagos fijos, suscripciones, cierres de ciclo y aportes a metas.',
    bullets: [
      { icon: '🤖', title: 'Detecta solo', desc: 'Netflix, Spotify, gym, renta, etc. — sin que los configures.' },
      { icon: '✓', title: 'Marca pagado automático', desc: 'Cuando pagas, Kleo lo detecta de tu transacción y marca el día.' },
      { icon: '🚦', title: 'Códigos de color', desc: 'Rojo urgente, amarillo próximo, azul cierre, verde meta, morado suscripción.' },
      { icon: '👆', title: 'Toca un día', desc: 'Ves el detalle de cada evento con logo del banco/marca.' }
    ],
    tip: 'NO tienes que marcar nada como pagado. Yo lo detecto cuando llega la transacción.'
  },
  {
    tag: 'Metas',
    tagColor: '#FF9500',
    emoji: '🎯',
    bgGradient: 'linear-gradient(135deg, rgba(255, 149, 0, 0.15), rgba(168, 85, 247, 0.10))',
    glow: 'rgba(255, 149, 0, 0.35)',
    title: 'Tus metas y ahorros',
    body: 'Crea metas específicas (viaje, casa, fondo de emergencia) y vincula la cuenta donde guardas el dinero.',
    bullets: [
      { icon: '🔗', title: 'Vincula una cuenta', desc: 'Cualquier depósito a esa cuenta suma a tu meta automáticamente.' },
      { icon: '📅', title: 'Plan de depósitos', desc: 'Semanal / bisemanal / quincenal / mensual con monto y fecha de inicio.' },
      { icon: '🚀', title: 'Si vas adelantado', desc: 'Te ofrezco bajar tu cuota o llegar más rápido a la meta.' },
      { icon: '🔔', title: 'Recordatorios y celebraciones', desc: 'Te aviso 25%, 50%, 75% y 100% cuando llegas.' }
    ],
    tip: 'Te sugiero abrir una cuenta SEPARADA para las metas — Banco Popular, Oriental y FirstBank tienen cuentas virtuales gratis.'
  },
  {
    tag: 'Presupuesto',
    tagColor: '#FF2D6F',
    emoji: '🗂',
    bgGradient: 'linear-gradient(135deg, rgba(255, 45, 111, 0.15), rgba(0, 229, 176, 0.10))',
    glow: 'rgba(255, 45, 111, 0.35)',
    title: 'Tu presupuesto',
    body: 'Distribuye cada cheque en 4 categorías: Esenciales, Ahorro, Planes y Personal.',
    bullets: [
      { icon: '🏠', title: 'Esenciales 50%', desc: 'Renta, luz, agua, comida, transporte.' },
      { icon: '💰', title: 'Ahorro 20%', desc: 'Fondo de emergencia y retiro.' },
      { icon: '✈️', title: 'Planes 10%', desc: 'Metas específicas (viaje, casa, carro).' },
      { icon: '🎯', title: 'Personal 20%', desc: 'Entretenimiento, ropa, comer fuera.' }
    ],
    tip: '¿No sabes cómo distribuir? Modo "🤖 Kleo me ayuda" en el wizard te genera uno a tu medida con 3 preguntas. También puedes activar gastos compartidos con tu pareja.'
  },
  {
    tag: 'Transacciones',
    tagColor: '#007AFF',
    emoji: '🧾',
    bgGradient: 'linear-gradient(135deg, rgba(0, 122, 255, 0.15), rgba(168, 85, 247, 0.10))',
    glow: 'rgba(0, 122, 255, 0.35)',
    title: 'Tus transacciones',
    body: 'Lista completa filtrable de todo el movimiento en tus cuentas.',
    bullets: [
      { icon: '🔍', title: 'Buscar por comercio', desc: 'Empieza a escribir y filtra al instante.' },
      { icon: '🏦', title: 'Filtrar por cuenta', desc: 'Solo las transacciones de Chase, BPPR, etc.' },
      { icon: '↔', title: 'Transferencias en gris', desc: 'Pagos a tarjeta no cuentan como gasto ni como ingreso.' },
      { icon: '💵', title: 'Totales reales', desc: 'Ingresos y gastos arriba excluyen transferencias.' }
    ],
    tip: 'Los pagos a tarjeta de crédito se ven en gris con "↔ TRANSFERENCIA" para que no inflen tus números.'
  },
  {
    tag: 'Análisis',
    tagColor: '#AF52DE',
    emoji: '📊',
    bgGradient: 'linear-gradient(135deg, rgba(175, 82, 222, 0.15), rgba(255, 149, 0, 0.10))',
    glow: 'rgba(175, 82, 222, 0.35)',
    title: 'Rendimiento y reportes',
    body: 'Cómo te está yendo este mes vs el pasado, en qué categorías gastas más, y reportes mensuales y trimestrales.',
    bullets: [
      { icon: '📈', title: 'Rendimiento', desc: 'Tendencia mes-a-mes y comparativa con el anterior.' },
      { icon: '🥧', title: 'Categorías', desc: 'Donut chart con tus top categorías de gasto.' },
      { icon: '📑', title: 'Reportes', desc: 'Vista mensual y trimestral con comparativa histórica.' },
      { icon: '💡', title: 'Insights de Kleo', desc: 'Te digo qué cambió y por qué.' }
    ]
  },
  {
    tag: 'Kleo AI',
    tagColor: '#A855F7',
    emoji: '🤖',
    bgGradient: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15), rgba(0, 229, 176, 0.10))',
    glow: 'rgba(168, 85, 247, 0.40)',
    title: 'Kleo AI · tu asesor 24/7',
    body: 'Toca "Analizar mis finanzas" y te genero un plan completo en segundos.',
    bullets: [
      { icon: '💰', title: 'Disponible esta semana', desc: 'Calculado de tu data real con explicación.' },
      { icon: '⚠️', title: 'Riesgos detectados', desc: 'Con severidad bajo/medio/alto y recomendación específica.' },
      { icon: '🎯', title: 'Acciones recomendadas', desc: 'Pasos numerados con monto, fecha y razonamiento.' },
      { icon: '💳', title: 'Plan puente con tarjeta', desc: 'Si te falta efectivo, te digo qué pagar con tarjeta y cuándo repagar.' }
    ],
    tip: 'El análisis usa 6 meses de tu historial. Mientras más data tenga, más afinadas las recomendaciones.'
  },
  {
    tag: 'Notificaciones',
    tagColor: '#FF9500',
    emoji: '🔔',
    bgGradient: 'linear-gradient(135deg, rgba(255, 149, 0, 0.15), rgba(255, 45, 111, 0.10))',
    glow: 'rgba(255, 149, 0, 0.35)',
    title: 'Avisos que importan',
    body: 'Te aviso solo cuando hay algo accionable. Máximo 3 push al día. Nada entre 9pm y 7am.',
    bullets: [
      { icon: '⏰', title: '2 días antes del cierre', desc: 'Cuánto pagar para llegar a tu utilización meta.' },
      { icon: '🚨', title: 'Día del pago', desc: 'Si no detecté el pago, te recuerdo antes de que cargues atraso.' },
      { icon: '🔒', title: 'No uses la tarjeta', desc: 'Después de pagar, hasta que cierre el ciclo.' },
      { icon: '✅', title: 'Ciclo cerrado', desc: 'Cuando ya puedes volver a usar la tarjeta normal.' }
    ],
    tip: 'Puedes prender o apagar cada tipo de notificación en el menú "Más → Notificaciones".'
  },
  {
    tag: 'Empezar',
    tagColor: '#00E5B0',
    emoji: '🚀',
    bgGradient: 'linear-gradient(135deg, rgba(255, 45, 111, 0.15), rgba(168, 85, 247, 0.15), rgba(0, 229, 176, 0.15))',
    glow: 'rgba(0, 229, 176, 0.40)',
    title: 'Conecta tu primer banco',
    body: 'Listo. Ahora conecta tus cuentas y voy a analizar tus últimos 6 meses para activar TODO esto con tu data real.',
    bullets: [
      { icon: '🔒', title: 'Seguro y encriptado', desc: 'Usamos Plaid — la misma tecnología de Venmo y Robinhood.' },
      { icon: '👁', title: 'Solo lectura', desc: 'Kleo nunca puede mover tu dinero, solo ver tus transacciones.' },
      { icon: '🇵🇷', title: 'Bancos de PR + USA', desc: 'Banco Popular, Oriental, FirstBank, Chase, Capital One, Discover, Amex y más.' }
    ],
    tip: 'Después de conectar te voy a hacer 4 preguntas rápidas para personalizar todo a TU situación.'
  }
];
