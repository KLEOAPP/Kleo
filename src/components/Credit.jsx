import { useMemo, useState } from 'react';
import { Icon } from './icons.jsx';
import TopBar from './TopBar.jsx';
import { CREDIT_FACTORS, CREDIT_RANGES, defaultUserFinance } from '../data/sampleData.js';
import { fmtMoney, daysUntil, nextPaymentDate } from '../utils/storage.js';
import {
  cardActionPlan,
  payoffComparison,
  fmtShortDate,
  affordableExtraPayment
} from '../utils/creditAdvisor.js';

export default function Credit({ accounts, fixedExpenses = [], onBack, onHome }) {
  const [openFactor, setOpenFactor] = useState(null);
  const [extraPayment, setExtraPayment] = useState(150);

  const cards = useMemo(() => accounts.filter(a => a.type === 'credit'), [accounts]);
  const cardPlans = useMemo(() => cards.map(c => ({ card: c, plan: cardActionPlan(c) })), [cards]);

  const totalUsed = cards.reduce((s, c) => s + Math.abs(c.balance), 0);
  const totalLimit = cards.reduce((s, c) => s + (c.limit || 0), 0);
  const totalUtilization = totalLimit > 0 ? (totalUsed / totalLimit) * 100 : 0;
  const totalMinPayments = cards.reduce((s, c) => s + (c.minPayment || 0), 0);

  // Score estimado
  const estimatedScore = useMemo(() => {
    let base = 750;
    if (totalUtilization > 30) base -= (totalUtilization - 30) * 4;
    else if (totalUtilization < 5) base += 30;
    else if (totalUtilization < 10) base += 15;
    return Math.max(580, Math.min(820, Math.round(base)));
  }, [totalUtilization]);
  const range = CREDIT_RANGES.find(r => estimatedScore >= r.min && estimatedScore <= r.max) || CREDIT_RANGES[2];

  const monthlyFixed = fixedExpenses.reduce((s, f) => s + f.amount, 0) || defaultUserFinance.monthlyAvgFixed;
  const suggestedExtra = affordableExtraPayment(defaultUserFinance.monthlyIncome, monthlyFixed, totalMinPayments);

  // Tarjeta con APR más alto (mejor para pagar primero - método avalanche)
  const highestApr = useMemo(() => {
    return cards.filter(c => Math.abs(c.balance) > 0).sort((a, b) => (b.apr || 0) - (a.apr || 0))[0];
  }, [cards]);

  const totalDebt = totalUsed;
  const avgApr = useMemo(() => {
    if (cards.length === 0) return 0;
    const weighted = cards.reduce((s, c) => s + (c.apr || 0) * Math.abs(c.balance), 0);
    return weighted / Math.max(1, totalUsed);
  }, [cards, totalUsed]);

  // Comparación de pago
  const comparison = useMemo(() => {
    if (totalDebt < 100 || !highestApr) return null;
    return payoffComparison(totalDebt, avgApr, totalMinPayments, extraPayment);
  }, [totalDebt, avgApr, totalMinPayments, extraPayment]);

  return (
    <div className="screen" style={{ paddingTop: 0 }}>
      <TopBar onHome={onHome} onBack={onBack} title="Tu Crédito" />
      <div style={{ padding: '12px 0 4px' }}>
        <span style={{ fontSize: 13, color: 'var(--text-mute)' }}>Plan de acción personalizado</span>
      </div>

      {/* Score estimado */}
      <div className="card mb-16" style={{ borderColor: range.color + '44' }}>
        <div className="spread mb-8">
          <span className="label">Score Estimado</span>
          <span className="tiny">⚠️ Aproximado</span>
        </div>
        <div className="row gap-12" style={{ alignItems: 'baseline' }}>
          <span style={{ fontSize: 48, fontWeight: 800, color: range.color, lineHeight: 1 }}>{estimatedScore}</span>
          <div className="col gap-2">
            <span style={{ fontWeight: 700, fontSize: 16, color: range.color }}>{range.label}</span>
            <span className="tiny">{range.desc}</span>
          </div>
        </div>
        <div style={{ marginTop: 14 }}>
          <div style={{ position: 'relative', height: 6, background: 'linear-gradient(90deg, #FF3B30 0%, #FF8800 25%, #FF9500 45%, #34C759 70%, #00B589 100%)', borderRadius: 3 }}>
            <div style={{
              position: 'absolute',
              top: -5,
              left: `${((estimatedScore - 300) / 550) * 100}%`,
              transform: 'translateX(-50%)',
              width: 4, height: 16,
              background: 'var(--text)',
              borderRadius: 2
            }}></div>
          </div>
          <div className="spread tiny mt-8">
            <span>300</span><span>670</span><span>740</span><span>800</span>
          </div>
        </div>
      </div>

      {/* PLAN DE ACCIÓN POR TARJETA — la pieza importante */}
      <div className="section-header">
        <span>Plan de Acción · Por Tarjeta</span>
      </div>
      <div className="col gap-12 mb-20">
        {cardPlans.map(({ card, plan }) => (
          <CardActionPlan key={card.id} card={card} plan={plan} />
        ))}
      </div>

      {/* CALCULADORA DE PAGO EXTRA si hay deuda significativa */}
      {comparison && totalDebt > 500 && (
        <>
          <div className="section-header">
            <span>Calculadora · Pago Extra</span>
          </div>
          <div className="card mb-20">
            <div className="col gap-12">
              <div>
                <span className="label" style={{ display: 'block', marginBottom: 4 }}>
                  Tu deuda total de crédito
                </span>
                <span style={{ fontSize: 22, fontWeight: 700 }}>{fmtMoney(totalDebt)}</span>
                <span className="tiny" style={{ display: 'block' }}>APR promedio {avgApr.toFixed(1)}% · Pago mínimo total {fmtMoney(totalMinPayments)}</span>
              </div>

              {comparison.minMonths && (
                <div style={{
                  background: 'rgba(255, 59, 48, 0.08)',
                  border: '1px solid rgba(255, 59, 48, 0.2)',
                  borderRadius: 12,
                  padding: 14
                }}>
                  <div className="spread mb-4">
                    <span style={{ fontWeight: 600, fontSize: 14 }}>Pagando solo el mínimo</span>
                    <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--danger)' }}>
                      {Math.floor(comparison.minMonths / 12)}a {comparison.minMonths % 12}m
                    </span>
                  </div>
                  <span className="tiny">Pagas {fmtMoney(comparison.minInterest)} en intereses</span>
                </div>
              )}

              <div className="col gap-8">
                <span className="label">Si pagas extra cada mes:</span>
                <div className="row gap-8" style={{ alignItems: 'center' }}>
                  <input
                    type="range"
                    min="0"
                    max={Math.max(500, suggestedExtra * 2)}
                    step="25"
                    value={extraPayment}
                    onChange={e => setExtraPayment(Number(e.target.value))}
                    style={{ flex: 1, accentColor: 'var(--green)' }}
                  />
                  <span style={{ fontWeight: 700, fontSize: 18, minWidth: 80, textAlign: 'right' }}>
                    +{fmtMoney(extraPayment)}
                  </span>
                </div>
                {suggestedExtra > 0 && (
                  <button
                    onClick={() => setExtraPayment(suggestedExtra)}
                    className="tiny"
                    style={{
                      color: 'var(--blue)',
                      fontWeight: 600,
                      textAlign: 'left',
                      padding: 0
                    }}
                  >
                    💡 Te sugiero ${suggestedExtra} (50% de tu disponible)
                  </button>
                )}
              </div>

              {comparison.extraMonths && (
                <div style={{
                  background: 'rgba(0, 181, 137, 0.1)',
                  border: '1px solid rgba(0, 181, 137, 0.3)',
                  borderRadius: 12,
                  padding: 14
                }}>
                  <div className="spread mb-4">
                    <span style={{ fontWeight: 600, fontSize: 14 }}>Pagando ${(totalMinPayments + extraPayment).toFixed(0)}/mes</span>
                    <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--green)' }}>
                      {Math.floor(comparison.extraMonths / 12)}a {comparison.extraMonths % 12}m
                    </span>
                  </div>
                  <span className="tiny">Pagas {fmtMoney(comparison.extraInterest)} en intereses</span>
                </div>
              )}

              {comparison.interestSaved > 0 && (
                <div style={{
                  background: 'var(--gradient)',
                  borderRadius: 12,
                  padding: 14,
                  color: '#fff'
                }}>
                  <div className="row gap-8 mb-4">
                    <Icon name="sparkle" size={16} color="#fff" />
                    <span style={{ fontWeight: 700, fontSize: 14 }}>Ahorras pagando ${extraPayment} extra</span>
                  </div>
                  <div className="row gap-12">
                    <div className="col gap-2">
                      <span style={{ fontSize: 11, opacity: 0.85 }}>Tiempo</span>
                      <span style={{ fontSize: 18, fontWeight: 700 }}>
                        {Math.floor(comparison.monthsSaved / 12) > 0 && `${Math.floor(comparison.monthsSaved / 12)}a `}
                        {comparison.monthsSaved % 12}m menos
                      </span>
                    </div>
                    <div className="col gap-2">
                      <span style={{ fontSize: 11, opacity: 0.85 }}>Intereses</span>
                      <span style={{ fontSize: 18, fontWeight: 700 }}>{fmtMoney(comparison.interestSaved)}</span>
                    </div>
                  </div>
                </div>
              )}

              {highestApr && totalDebt > 1000 && (
                <div className="ai-alert">
                  <div className="ai-icon">
                    <Icon name="sparkle" size={14} color="#fff" />
                  </div>
                  <div className="col gap-4" style={{ flex: 1 }}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>Estrategia recomendada (Avalanche)</span>
                    <span style={{ fontSize: 12, color: 'var(--text-mute)', lineHeight: 1.5 }}>
                      Aplica el extra de <strong>${extraPayment}</strong> a <strong>{highestApr.name}</strong> primero (APR {highestApr.apr}%, el más alto). Cuando la termines, mueve ese pago a la siguiente. Te ahorra más intereses que distribuirlo.
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Resumen utilización total */}
      <div className="section-header">
        <span>Resumen Total</span>
      </div>
      <div className="card mb-20">
        <span className="label">Utilización Total</span>
        <div className="row gap-8" style={{ alignItems: 'baseline', marginTop: 6 }}>
          <span style={{ fontSize: 28, fontWeight: 700 }}>{totalUtilization.toFixed(1)}%</span>
          <span className="tiny">{fmtMoney(totalUsed)} / {fmtMoney(totalLimit)}</span>
        </div>
        <div className="bar-track mt-8" style={{ height: 8, position: 'relative' }}>
          <div className="bar-fill" style={{
            width: `${Math.min(100, totalUtilization)}%`,
            background: totalUtilization < 5 ? 'var(--green)' : totalUtilization < 30 ? 'var(--orange)' : 'var(--danger)'
          }}></div>
          <div style={{ position: 'absolute', left: '5%', top: -2, width: 2, height: 12, background: 'var(--green)', borderRadius: 1 }}></div>
          <div style={{ position: 'absolute', left: '30%', top: -2, width: 2, height: 12, background: 'var(--orange)', borderRadius: 1 }}></div>
        </div>
        <div className="row spread mt-8">
          <span className="tiny" style={{ color: 'var(--green)' }}>● 5% Excelente</span>
          <span className="tiny" style={{ color: 'var(--orange)' }}>● 30% Máximo OK</span>
        </div>
      </div>

      {/* Educación: Factores FICO */}
      <div className="section-header">
        <span>Factores que Afectan tu Score</span>
      </div>
      <p className="tiny mb-12" style={{ lineHeight: 1.5 }}>
        Tu FICO Score se calcula con 5 factores. Toca cada uno para entenderlo.
      </p>

      <div className="col gap-8 mb-20">
        {CREDIT_FACTORS.map(f => {
          const isOpen = openFactor === f.id;
          return (
            <div key={f.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <button
                onClick={() => setOpenFactor(isOpen ? null : f.id)}
                style={{ width: '100%', padding: 14, textAlign: 'left' }}
              >
                <div className="spread">
                  <div className="row gap-12">
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: f.color + '22',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 18
                    }}>{f.icon}</div>
                    <div className="col gap-2">
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{f.label}</span>
                      <span className="tiny" style={{ color: f.color, fontWeight: 700 }}>{f.weight}% de tu score</span>
                    </div>
                  </div>
                  <div style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(-90deg)', transition: 'transform .2s' }}>
                    <Icon name="back" size={14} color="var(--text-mute)" />
                  </div>
                </div>
                <div className="bar-track mt-12" style={{ height: 4 }}>
                  <div className="bar-fill" style={{ width: `${f.weight * 2}%`, background: f.color }}></div>
                </div>
              </button>

              {isOpen && (
                <div style={{ padding: '0 14px 14px', borderTop: '1px solid var(--border-soft)' }}>
                  <p style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--text)', marginTop: 12 }}>
                    {f.description}
                  </p>
                  <div className="col gap-8 mt-12">
                    <span className="label">Cómo mejorarlo:</span>
                    {f.tips.map((tip, i) => (
                      <div key={i} className="row gap-8" style={{ alignItems: 'flex-start' }}>
                        <span style={{ color: f.color, fontSize: 14, marginTop: 1 }}>✓</span>
                        <span style={{ fontSize: 13, color: 'var(--text-mute)', lineHeight: 1.5, flex: 1 }}>{tip}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ===== Plan de acción para UNA tarjeta ===== */
function CardActionPlan({ card, plan }) {
  const [expanded, setExpanded] = useState(plan.urgency === 'urgent' || plan.urgency === 'recommended');

  return (
    <div className="card" style={{
      padding: 0,
      overflow: 'hidden',
      borderColor: plan.urgency === 'urgent' ? plan.statusColor : 'var(--border)'
    }}>
      {/* Header tocable */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{ width: '100%', padding: 14, textAlign: 'left' }}
      >
        <div className="spread mb-8">
          <div className="row gap-12">
            <div style={{ width: 36, height: 36, borderRadius: 8, background: card.color, flexShrink: 0 }}></div>
            <div className="col gap-2">
              <span style={{ fontWeight: 600, fontSize: 14 }}>{card.name}</span>
              <span className="tiny">••{card.last4} · APR {card.apr}%</span>
            </div>
          </div>
          <div className="col" style={{ alignItems: 'flex-end', gap: 2 }}>
            <span style={{ fontWeight: 700, color: plan.statusColor, fontSize: 16 }}>
              {plan.utilization.toFixed(1)}%
            </span>
            <span style={{
              fontSize: 10,
              fontWeight: 700,
              color: plan.statusColor
            }}>
              {plan.status}
            </span>
          </div>
        </div>

        <div className="bar-track" style={{ height: 6 }}>
          <div className="bar-fill" style={{
            width: `${Math.min(100, plan.utilization)}%`,
            background: plan.statusColor
          }}></div>
        </div>

        <div className="spread mt-8">
          <span className="tiny">Balance {fmtMoney(plan.balance)} / Límite {fmtMoney(plan.limit)}</span>
          <span className="tiny" style={{ color: 'var(--blue)', fontWeight: 600 }}>
            {expanded ? 'Ocultar plan ▲' : 'Ver plan ▼'}
          </span>
        </div>
      </button>

      {/* Plan detallado */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--border-soft)', padding: 14 }}>
          {/* Acción principal: bajar a 5% */}
          {plan.payToReach5 > 0 && (
            <ActionStep
              icon="🎯"
              color="var(--green)"
              title={`Paga ${fmtMoney(plan.payToReach5)} para crédito EXCELENTE`}
              steps={[
                {
                  label: 'CUÁNDO PAGAR',
                  value: plan.payByDate
                    ? `Antes del ${fmtShortDate(plan.payByDate)}`
                    : 'Antes del cierre',
                  sub: plan.daysUntilPayBy !== null
                    ? plan.daysUntilPayBy < 0
                      ? `Pasó hace ${Math.abs(plan.daysUntilPayBy)} días — el próximo cierre es el ${fmtShortDate(plan.cycleCloseDate)}`
                      : plan.daysUntilPayBy === 0
                      ? '⚠️ HOY es el día'
                      : `En ${plan.daysUntilPayBy} días`
                    : null
                },
                {
                  label: 'NO USES LA TARJETA',
                  value: plan.payByDate && plan.cycleCloseDate
                    ? `Del ${fmtShortDate(plan.payByDate)} al ${fmtShortDate(plan.cycleCloseDate)}`
                    : 'Hasta que cierre el ciclo',
                  sub: 'Para que el balance reportado sea exactamente lo que dejes después de pagar'
                },
                {
                  label: 'POR QUÉ',
                  value: 'El buró de crédito ve solo el balance al cierre del ciclo',
                  sub: 'No el balance del día del pago. Por eso pagar 2 días antes y no usar funciona.'
                }
              ]}
            />
          )}

          {/* Acción si está sobre 30% */}
          {plan.utilization >= 30 && plan.payToReach30 > 0 && (
            <ActionStep
              icon="⚠️"
              color="var(--danger)"
              title={`MÍNIMO paga ${fmtMoney(plan.payToReach30)} para no afectar tu score`}
              steps={[
                {
                  label: 'URGENTE',
                  value: 'Pasar de 30% baja tu score notablemente',
                  sub: 'Si no puedes los $' + plan.payToReach5.toFixed(0) + ' para 5%, al menos haz este pago'
                }
              ]}
            />
          )}

          {/* Pago mínimo (siempre obligatorio) */}
          {plan.paymentDueDate && card.minPayment && (
            <ActionStep
              icon="💳"
              color={plan.daysUntilDue <= 5 ? 'var(--danger)' : 'var(--blue)'}
              title={`Pago mínimo: ${fmtMoney(card.minPayment)}`}
              steps={[
                {
                  label: 'VENCE',
                  value: fmtShortDate(plan.paymentDueDate),
                  sub: plan.daysUntilDue === 0
                    ? '⚠️ HOY'
                    : plan.daysUntilDue === 1
                    ? '⚠️ MAÑANA'
                    : plan.daysUntilDue <= 5
                    ? `En ${plan.daysUntilDue} días — recordatorio activo`
                    : `En ${plan.daysUntilDue} días`
                },
                {
                  label: 'AVISO',
                  value: 'Te recordaré 2 días antes y el día del vencimiento',
                  sub: 'NUNCA pagues tarde. Un atraso de 30+ días puede bajar tu score 60-110 puntos.'
                }
              ]}
            />
          )}

          {/* Si está en EXCELENTE */}
          {plan.utilization < 5 && (
            <div className="ai-alert">
              <div className="ai-icon">
                <Icon name="check" size={14} color="#fff" stroke={3} />
              </div>
              <div className="col gap-4" style={{ flex: 1 }}>
                <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--green)' }}>
                  ✓ Esta tarjeta está PERFECTA
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-mute)', lineHeight: 1.5 }}>
                  Mantén bajo 5% al cierre del día {card.cycleCloseDay} y seguirás en zona excelente. Próximo pago mínimo {fmtMoney(card.minPayment)} el {fmtShortDate(plan.paymentDueDate)}.
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ActionStep({ icon, color, title, steps }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div className="row gap-8 mb-8" style={{ alignItems: 'flex-start' }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <span style={{ fontWeight: 600, fontSize: 14, color, flex: 1, lineHeight: 1.4 }}>{title}</span>
      </div>
      <div style={{
        background: 'var(--bg-elev)',
        borderRadius: 10,
        padding: 12,
        marginLeft: 26
      }}>
        {steps.map((s, i) => (
          <div key={i} style={{
            paddingBottom: i < steps.length - 1 ? 10 : 0,
            marginBottom: i < steps.length - 1 ? 10 : 0,
            borderBottom: i < steps.length - 1 ? '1px solid var(--border)' : 'none'
          }}>
            <span style={{
              fontSize: 10,
              fontWeight: 700,
              color: 'var(--text-mute)',
              letterSpacing: '0.05em'
            }}>{s.label}</span>
            <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{s.value}</div>
            {s.sub && <div className="tiny" style={{ marginTop: 2, lineHeight: 1.4 }}>{s.sub}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
