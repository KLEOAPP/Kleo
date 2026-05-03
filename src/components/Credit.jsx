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
import { useI18n } from '../i18n/index.jsx';

export default function Credit({ accounts, fixedExpenses = [], onBack, onHome }) {
  const { strings: s } = useI18n();
  const [openFactor, setOpenFactor] = useState(null);
  const [extraPayment, setExtraPayment] = useState(150);

  const cards = useMemo(() => accounts.filter(a => a.type === 'credit'), [accounts]);
  const cardPlans = useMemo(() => cards.map(c => ({ card: c, plan: cardActionPlan(c) })), [cards]);

  const totalUsed = cards.reduce((sum, c) => sum + Math.abs(c.balance), 0);
  const totalLimit = cards.reduce((sum, c) => sum + (c.limit || 0), 0);
  const totalUtilization = totalLimit > 0 ? (totalUsed / totalLimit) * 100 : 0;
  const totalMinPayments = cards.reduce((sum, c) => sum + (c.minPayment || 0), 0);

  const estimatedScore = useMemo(() => {
    let base = 750;
    if (totalUtilization > 30) base -= (totalUtilization - 30) * 4;
    else if (totalUtilization < 5) base += 30;
    else if (totalUtilization < 10) base += 15;
    return Math.max(580, Math.min(820, Math.round(base)));
  }, [totalUtilization]);
  const range = CREDIT_RANGES.find(r => estimatedScore >= r.min && estimatedScore <= r.max) || CREDIT_RANGES[2];

  const monthlyFixed = fixedExpenses.reduce((sum, f) => sum + f.amount, 0) || defaultUserFinance.monthlyAvgFixed;
  const suggestedExtra = affordableExtraPayment(defaultUserFinance.monthlyIncome, monthlyFixed, totalMinPayments);

  const highestApr = useMemo(() => {
    return cards.filter(c => Math.abs(c.balance) > 0).sort((a, b) => (b.apr || 0) - (a.apr || 0))[0];
  }, [cards]);

  const totalDebt = totalUsed;
  const avgApr = useMemo(() => {
    if (cards.length === 0) return 0;
    const weighted = cards.reduce((sum, c) => sum + (c.apr || 0) * Math.abs(c.balance), 0);
    return weighted / Math.max(1, totalUsed);
  }, [cards, totalUsed]);

  const comparison = useMemo(() => {
    if (totalDebt < 100 || !highestApr) return null;
    return payoffComparison(totalDebt, avgApr, totalMinPayments, extraPayment);
  }, [totalDebt, avgApr, totalMinPayments, extraPayment]);

  return (
    <div className="screen" style={{ paddingTop: 0 }}>
      <TopBar onHome={onHome} onBack={onBack} title={s.yourCredit} />
      <div style={{ padding: '12px 0 4px' }}>
        <span style={{ fontSize: 13, color: 'var(--text-mute)' }}>{s.personalizedPlan}</span>
      </div>

      {/* Score estimado */}
      <div className="card mb-16" style={{ borderColor: range.color + '44' }}>
        <div className="spread mb-8">
          <span className="label">{s.estimatedScore}</span>
          <span className="tiny">{s.approximate}</span>
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

      {/* Plan de acción por tarjeta */}
      <div className="section-header">
        <span>{s.actionPlan}</span>
      </div>
      <div className="col gap-12 mb-20">
        {cardPlans.map(({ card, plan }) => (
          <CardActionPlan key={card.id} card={card} plan={plan} s={s} />
        ))}
      </div>

      {/* Calculadora */}
      {comparison && totalDebt > 500 && (
        <>
          <div className="section-header">
            <span>{s.extraPayCalc}</span>
          </div>
          <div className="card mb-20">
            <div className="col gap-12">
              <div>
                <span className="label" style={{ display: 'block', marginBottom: 4 }}>{s.totalCreditDebt}</span>
                <span style={{ fontSize: 22, fontWeight: 700 }}>{fmtMoney(totalDebt)}</span>
                <span className="tiny" style={{ display: 'block' }}>
                  {s.avgApr.replace('{apr}', avgApr.toFixed(1)).replace('{amount}', fmtMoney(totalMinPayments))}
                </span>
              </div>

              {comparison.minMonths && (
                <div style={{
                  background: 'rgba(255, 59, 48, 0.08)',
                  border: '1px solid rgba(255, 59, 48, 0.2)',
                  borderRadius: 12,
                  padding: 14
                }}>
                  <div className="spread mb-4">
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{s.payingMinOnly}</span>
                    <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--danger)' }}>
                      {Math.floor(comparison.minMonths / 12)}a {comparison.minMonths % 12}m
                    </span>
                  </div>
                  <span className="tiny">{s.payInterest.replace('{amount}', fmtMoney(comparison.minInterest))}</span>
                </div>
              )}

              <div className="col gap-8">
                <span className="label">{s.payExtraMonthly}</span>
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
                    style={{ color: 'var(--blue)', fontWeight: 600, textAlign: 'left', padding: 0 }}
                  >
                    {s.suggested50pct.replace('{amount}', suggestedExtra)}
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
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{s.payingPerMonth.replace('{amount}', (totalMinPayments + extraPayment).toFixed(0))}</span>
                    <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--green)' }}>
                      {Math.floor(comparison.extraMonths / 12)}a {comparison.extraMonths % 12}m
                    </span>
                  </div>
                  <span className="tiny">{s.payInterest.replace('{amount}', fmtMoney(comparison.extraInterest))}</span>
                </div>
              )}

              {comparison.interestSaved > 0 && (
                <div style={{ background: 'var(--gradient)', borderRadius: 12, padding: 14, color: '#fff' }}>
                  <div className="row gap-8 mb-4">
                    <Icon name="sparkle" size={16} color="#fff" />
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{s.savingsPayingExtra.replace('{amount}', extraPayment)}</span>
                  </div>
                  <div className="row gap-12">
                    <div className="col gap-2">
                      <span style={{ fontSize: 11, opacity: 0.85 }}>{s.time}</span>
                      <span style={{ fontSize: 18, fontWeight: 700 }}>
                        {Math.floor(comparison.monthsSaved / 12) > 0 && `${Math.floor(comparison.monthsSaved / 12)}a `}
                        {s.lessTime.replace('{time}', `${comparison.monthsSaved % 12}m`)}
                      </span>
                    </div>
                    <div className="col gap-2">
                      <span style={{ fontSize: 11, opacity: 0.85 }}>{s.interest}</span>
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
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{s.avalancheStrategy}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-mute)', lineHeight: 1.5 }}>
                      {s.avalancheDesc
                        .replace('{extra}', extraPayment)
                        .replace('{card}', highestApr.name)
                        .replace('{apr}', highestApr.apr)}
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
        <span>{s.totalSummary}</span>
      </div>
      <div className="card mb-20">
        <span className="label">{s.totalUtilization}</span>
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
          <span className="tiny" style={{ color: 'var(--green)' }}>{s.excellent5}</span>
          <span className="tiny" style={{ color: 'var(--orange)' }}>{s.maxOk30}</span>
        </div>
      </div>

      {/* Factores FICO */}
      <div className="section-header">
        <span>{s.factorsTitle}</span>
      </div>
      <p className="tiny mb-12" style={{ lineHeight: 1.5 }}>{s.factorsDesc}</p>

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
                      <span className="tiny" style={{ color: f.color, fontWeight: 700 }}>{f.weight}% {s.ofYourScore}</span>
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
                    <span className="label">{s.howToImprove}</span>
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

function CardActionPlan({ card, plan, s }) {
  const [expanded, setExpanded] = useState(plan.urgency === 'urgent' || plan.urgency === 'recommended');

  return (
    <div className="card" style={{
      padding: 0,
      overflow: 'hidden',
      borderColor: plan.urgency === 'urgent' ? plan.statusColor : 'var(--border)'
    }}>
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
            <span style={{ fontSize: 10, fontWeight: 700, color: plan.statusColor }}>
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
          <span className="tiny">{s.balance} {fmtMoney(plan.balance)} / {s.limit.replace('{amount}', fmtMoney(plan.limit))}</span>
          <span className="tiny" style={{ color: 'var(--blue)', fontWeight: 600 }}>
            {expanded ? s.hidePlan : s.showPlan}
          </span>
        </div>
      </button>

      {expanded && (
        <div style={{ borderTop: '1px solid var(--border-soft)', padding: 14 }}>
          {plan.payToReach5 > 0 && (
            <ActionStep
              icon="🎯"
              color="var(--green)"
              title={s.payForExcellent.replace('{amount}', fmtMoney(plan.payToReach5))}
              steps={[
                {
                  label: s.whenToPay,
                  value: plan.payByDate
                    ? s.beforeDate.replace('{date}', fmtShortDate(plan.payByDate))
                    : s.beforeClose,
                  sub: plan.daysUntilPayBy !== null
                    ? plan.daysUntilPayBy < 0
                      ? s.passedDaysAgo.replace('{n}', Math.abs(plan.daysUntilPayBy)).replace('{date}', fmtShortDate(plan.cycleCloseDate))
                      : plan.daysUntilPayBy === 0
                      ? s.todayIsDay
                      : s.inDays.replace('{n}', plan.daysUntilPayBy)
                    : null
                },
                {
                  label: s.dontUseCard,
                  value: plan.payByDate && plan.cycleCloseDate
                    ? s.fromTo.replace('{from}', fmtShortDate(plan.payByDate)).replace('{to}', fmtShortDate(plan.cycleCloseDate))
                    : s.untilCycleClose,
                  sub: s.dontUseReason
                },
                {
                  label: s.whyLabel,
                  value: s.whyValue,
                  sub: s.whySub
                }
              ]}
            />
          )}

          {plan.utilization >= 30 && plan.payToReach30 > 0 && (
            <ActionStep
              icon="⚠️"
              color="var(--danger)"
              title={s.minPayAtLeast.replace('{amount}', fmtMoney(plan.payToReach30))}
              steps={[
                {
                  label: s.urgentLabel,
                  value: s.urgentOver30,
                  sub: s.urgentIfCant.replace('{amount}', plan.payToReach5.toFixed(0))
                }
              ]}
            />
          )}

          {plan.paymentDueDate && card.minPayment && (
            <ActionStep
              icon="💳"
              color={plan.daysUntilDue <= 5 ? 'var(--danger)' : 'var(--blue)'}
              title={s.minPayment.replace('{amount}', fmtMoney(card.minPayment))}
              steps={[
                {
                  label: s.dueLabel,
                  value: fmtShortDate(plan.paymentDueDate),
                  sub: plan.daysUntilDue === 0
                    ? s.todayExcl
                    : plan.daysUntilDue === 1
                    ? s.tomorrowExcl
                    : plan.daysUntilDue <= 5
                    ? s.reminderActive.replace('{n}', plan.daysUntilDue)
                    : s.inDays.replace('{n}', plan.daysUntilDue)
                },
                {
                  label: s.warningLabel,
                  value: s.warningValue,
                  sub: s.warningSub
                }
              ]}
            />
          )}

          {plan.utilization < 5 && (
            <div className="ai-alert">
              <div className="ai-icon">
                <Icon name="check" size={14} color="#fff" stroke={3} />
              </div>
              <div className="col gap-4" style={{ flex: 1 }}>
                <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--green)' }}>{s.cardPerfect}</span>
                <span style={{ fontSize: 12, color: 'var(--text-mute)', lineHeight: 1.5 }}>
                  {s.cardPerfectDesc
                    .replace('{day}', card.cycleCloseDay)
                    .replace('{amount}', fmtMoney(card.minPayment))
                    .replace('{date}', fmtShortDate(plan.paymentDueDate))}
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
        {steps.map((step, i) => (
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
            }}>{step.label}</span>
            <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>{step.value}</div>
            {step.sub && <div className="tiny" style={{ marginTop: 2, lineHeight: 1.4 }}>{step.sub}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
