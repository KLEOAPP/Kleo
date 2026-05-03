import { useMemo, useState } from 'react';
import { Icon } from './icons.jsx';
import TopBar from './TopBar.jsx';
import BankLogo from './BankLogo.jsx';
import { CREDIT_FACTORS, CREDIT_RANGES, defaultUserFinance } from '../data/sampleData.js';
import { fmtMoney } from '../utils/storage.js';
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
  const [showApproxInfo, setShowApproxInfo] = useState(false);

  const cards = useMemo(() => accounts.filter(a => a.type === 'credit'), [accounts]);
  const cardPlans = useMemo(() => cards.map(c => ({ card: c, plan: cardActionPlan(c) })), [cards]);

  const totalUsed = cards.reduce((sum, c) => sum + Math.abs(c.balance), 0);
  const totalLimit = cards.reduce((sum, c) => sum + (c.limit || 0), 0);
  const totalUtilization = totalLimit > 0 ? (totalUsed / totalLimit) * 100 : 0;
  const totalMinPayments = cards.reduce((sum, c) => sum + (c.minPayment || 0), 0);

  // Score estimado — misma lógica que el Kleo Score del dashboard
  const score = useMemo(() => {
    let base = 750;
    if (totalUtilization > 30) base -= (totalUtilization - 30) * 4;
    else if (totalUtilization < 5) base += 70;
    else if (totalUtilization < 10) base += 40;
    return Math.max(580, Math.min(890, Math.round(base)));
  }, [totalUtilization]);

  const scoreLabel = score >= 800 ? s.excellentScore : score >= 740 ? s.goodScore : score >= 670 ? s.fairScore : s.poorScore;
  const scoreColor = score >= 800 ? '#00E5B0' : score >= 740 ? '#34C759' : score >= 670 ? '#FF9500' : '#FF3B30';

  // ===== Calculadora con selector de tarjetas =====
  const [selectedCardIds, setSelectedCardIds] = useState(() => cards.map(c => c.id));
  // Asegurar que cuando se añadan/quiten tarjetas la selección siga válida
  const validSelected = selectedCardIds.filter(id => cards.some(c => c.id === id));
  const selectedCards = cards.filter(c => validSelected.includes(c.id));

  const selectedDebt = selectedCards.reduce((sum, c) => sum + Math.abs(c.balance), 0);
  const selectedMin = selectedCards.reduce((sum, c) => sum + (c.minPayment || 0), 0);
  const selectedAvgApr = useMemo(() => {
    if (selectedCards.length === 0) return 0;
    const weighted = selectedCards.reduce((sum, c) => sum + (c.apr || 0) * Math.abs(c.balance), 0);
    return weighted / Math.max(1, selectedDebt);
  }, [selectedCards, selectedDebt]);

  const monthlyFixed = fixedExpenses.reduce((sum, f) => sum + f.amount, 0) || defaultUserFinance.monthlyAvgFixed;
  const suggestedExtra = affordableExtraPayment(defaultUserFinance.monthlyIncome, monthlyFixed, totalMinPayments);

  const highestApr = useMemo(() => {
    return selectedCards.filter(c => Math.abs(c.balance) > 0).sort((a, b) => (b.apr || 0) - (a.apr || 0))[0];
  }, [selectedCards]);

  const comparison = useMemo(() => {
    if (selectedDebt < 100 || !highestApr) return null;
    return payoffComparison(selectedDebt, selectedAvgApr, selectedMin, extraPayment);
  }, [selectedDebt, selectedAvgApr, selectedMin, extraPayment, highestApr]);

  const toggleCard = (id) => {
    setSelectedCardIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const allSelected = validSelected.length === cards.length;

  return (
    <div className="screen" style={{ paddingTop: 0 }}>
      <TopBar onHome={onHome} onBack={onBack} title={s.yourCredit} />
      <div style={{ padding: '12px 0 4px' }}>
        <span style={{ fontSize: 13, color: 'var(--text-mute)' }}>{s.personalizedPlan}</span>
      </div>

      {/* ===== Score (estilo Kleo Score del dashboard) ===== */}
      <div className="card mb-12" style={{
        padding: 18,
        borderRadius: 22,
        background: 'var(--bg-card)',
        border: '1px solid var(--border-soft)'
      }}>
        <div className="row gap-14" style={{ alignItems: 'center' }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'linear-gradient(135deg, #FF2D6F, #A855F7, #00E5B0)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 800, fontSize: 26,
            flexShrink: 0
          }}>K</div>

          <div className="col gap-2" style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 13, color: 'var(--text-mute)', fontWeight: 500 }}>{s.kleoScore}</span>
            <div className="row gap-8" style={{ alignItems: 'baseline' }}>
              <span style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.02em' }}>{score}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: scoreColor }}>{scoreLabel}</span>
            </div>
          </div>

          <ScoreGauge score={score} color={scoreColor} />
        </div>

        {/* Pill explicativa "Aproximado · saber más" */}
        <button
          onClick={() => setShowApproxInfo(!showApproxInfo)}
          className="row gap-6 pressable mt-12"
          style={{
            background: 'var(--bg-elev)',
            padding: '8px 12px',
            borderRadius: 999,
            fontSize: 12,
            color: 'var(--text-mute)',
            border: '1px solid var(--border)',
            alignItems: 'center'
          }}
        >
          <Icon name="info" size={13} color="var(--text-mute)" />
          <span style={{ fontWeight: 600 }}>{s.approximate}</span>
          <span style={{ color: 'var(--blue)', fontWeight: 600, marginLeft: 'auto' }}>
            {showApproxInfo ? '▲' : s.approxKnowMore + ' ▼'}
          </span>
        </button>

        {showApproxInfo && (
          <p style={{
            marginTop: 12,
            fontSize: 12,
            lineHeight: 1.55,
            color: 'var(--text-mute)',
            background: 'var(--bg-elev)',
            padding: 12,
            borderRadius: 12
          }}>
            {s.approxExplain}
          </p>
        )}
      </div>

      {/* ===== Resumen total compacto (subido al lado del score) ===== */}
      <div className="card mb-20" style={{ padding: 14, borderRadius: 16 }}>
        <div className="spread mb-8">
          <div className="row gap-8" style={{ alignItems: 'center' }}>
            <span style={{
              fontSize: 11, fontWeight: 700,
              color: totalUtilization < 10 ? 'var(--green)' : totalUtilization < 30 ? 'var(--orange)' : 'var(--danger)',
              textTransform: 'uppercase', letterSpacing: '0.05em'
            }}>
              {s.utilizationCompact.replace('{pct}', totalUtilization.toFixed(1))}
            </span>
          </div>
          <span className="tiny">{s.totalDebtCompact.replace('{used}', fmtMoney(totalUsed)).replace('{limit}', fmtMoney(totalLimit))}</span>
        </div>
        <div className="bar-track" style={{ height: 6, position: 'relative', borderRadius: 3, background: 'var(--bg-elev)', overflow: 'hidden' }}>
          <div style={{
            width: `${Math.min(100, totalUtilization)}%`,
            height: '100%',
            background: totalUtilization < 5 ? 'var(--green)' : totalUtilization < 30 ? 'var(--orange)' : 'var(--danger)',
            transition: 'width .3s'
          }}></div>
          <div style={{ position: 'absolute', left: '5%', top: -2, width: 1.5, height: 10, background: 'var(--green)', opacity: 0.7 }}></div>
          <div style={{ position: 'absolute', left: '30%', top: -2, width: 1.5, height: 10, background: 'var(--orange)', opacity: 0.7 }}></div>
        </div>
        <div className="row spread mt-6">
          <span className="tiny" style={{ color: 'var(--green)', fontSize: 10 }}>{s.excellent5}</span>
          <span className="tiny" style={{ color: 'var(--orange)', fontSize: 10 }}>{s.maxOk30}</span>
        </div>
      </div>

      {/* ===== Plan de Acción · Por Tarjeta ===== */}
      <div className="section-header">
        <span>{s.actionPlan}</span>
      </div>
      <div className="col gap-12 mb-20">
        {cardPlans.map(({ card, plan }) => (
          <CardActionPlan key={card.id} card={card} plan={plan} s={s} />
        ))}
      </div>

      {/* ===== Calculadora con selector de tarjetas ===== */}
      <div className="section-header">
        <span>{s.extraPayCalc}</span>
      </div>
      <div className="card mb-20">
        {/* Selector de tarjetas */}
        <div className="col gap-8 mb-16">
          <div className="spread">
            <span className="label" style={{ fontWeight: 600 }}>{s.cardsToCalc}</span>
            <button
              onClick={() => setSelectedCardIds(allSelected ? [] : cards.map(c => c.id))}
              className="tiny"
              style={{ color: 'var(--blue)', fontWeight: 700 }}
            >
              {allSelected ? s.deselectAll : s.selectAll}
            </button>
          </div>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8
          }}>
            {cards.map(c => {
              const sel = validSelected.includes(c.id);
              return (
                <button
                  key={c.id}
                  onClick={() => toggleCard(c.id)}
                  className="row gap-8 pressable"
                  style={{
                    padding: '6px 10px 6px 6px',
                    borderRadius: 999,
                    background: sel ? 'rgba(168, 85, 247, 0.15)' : 'var(--bg-elev)',
                    border: `1px solid ${sel ? 'var(--purple)' : 'var(--border)'}`,
                    alignItems: 'center'
                  }}
                >
                  <BankLogo institution={c.institution || c.name} size={22} radius={6} />
                  <span style={{ fontSize: 12, fontWeight: 600 }}>
                    {c.institution || c.name} ••{c.last4}
                  </span>
                  {sel && <Icon name="check" size={12} color="var(--purple)" stroke={3} />}
                </button>
              );
            })}
          </div>
        </div>

        {selectedCards.length === 0 ? (
          <p className="tiny" style={{ textAlign: 'center', padding: 16 }}>{s.noCardsSelected}</p>
        ) : (
          <div className="col gap-12">
            <div>
              <span className="label" style={{ display: 'block', marginBottom: 4 }}>{s.selectedDebt}</span>
              <span style={{ fontSize: 22, fontWeight: 700 }}>{fmtMoney(selectedDebt)}</span>
              <span className="tiny" style={{ display: 'block' }}>
                {s.avgApr.replace('{apr}', selectedAvgApr.toFixed(1)).replace('{amount}', fmtMoney(selectedMin))}
              </span>
            </div>

            {comparison?.minMonths && (
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
                  style={{ flex: 1, accentColor: 'var(--purple)' }}
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

            {comparison?.extraMonths && (
              <div style={{
                background: 'rgba(0, 229, 176, 0.1)',
                border: '1px solid rgba(0, 229, 176, 0.3)',
                borderRadius: 12,
                padding: 14
              }}>
                <div className="spread mb-4">
                  <span style={{ fontWeight: 600, fontSize: 14 }}>
                    {s.payingPerMonth.replace('{amount}', (selectedMin + extraPayment).toFixed(0))}
                  </span>
                  <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--green)' }}>
                    {Math.floor(comparison.extraMonths / 12)}a {comparison.extraMonths % 12}m
                  </span>
                </div>
                <span className="tiny">{s.payInterest.replace('{amount}', fmtMoney(comparison.extraInterest))}</span>
              </div>
            )}

            {comparison?.interestSaved > 0 && (
              <div style={{ background: 'var(--brand-grad)', borderRadius: 12, padding: 14, color: '#fff' }}>
                <div className="row gap-8 mb-4">
                  <Icon name="sparkle" size={16} color="#fff" />
                  <span style={{ fontWeight: 700, fontSize: 14 }}>
                    {s.savingsPayingExtra.replace('{amount}', extraPayment)}
                  </span>
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

            {highestApr && selectedDebt > 1000 && (
              <div className="ai-alert">
                <div className="ai-icon">
                  <Icon name="sparkle" size={14} color="#fff" />
                </div>
                <div className="col gap-4" style={{ flex: 1 }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{s.avalancheStrategy}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-mute)', lineHeight: 1.5 }}>
                    {s.avalancheDesc
                      .replace('{extra}', extraPayment)
                      .replace('{card}', highestApr.institution || highestApr.name)
                      .replace('{apr}', highestApr.apr)}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ===== Factores FICO ===== */}
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

/* ===== Plan de acción para UNA tarjeta ===== */
function CardActionPlan({ card, plan, s }) {
  const [expanded, setExpanded] = useState(plan.urgency === 'urgent' || plan.urgency === 'recommended');
  const [scanningApr, setScanningApr] = useState(false);
  const missingApr = !card.apr || card.apr === 0;
  const targetBalance = (card.limit || 0) * 0.05;

  const handleUploadStatement = () => {
    setScanningApr(true);
    setTimeout(() => {
      setScanningApr(false);
      alert(s.aprFound.replace('{apr}', '22.99'));
    }, 1800);
  };

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
            <BankLogo institution={card.institution || card.name} size={40} radius={10} />
            <div className="col gap-2">
              <span style={{ fontWeight: 700, fontSize: 14 }}>{card.institution || card.name}</span>
              <span className="tiny">
                {card.label || ''}{card.label ? ' · ' : ''}••{card.last4}
                {card.apr ? ` · APR ${card.apr}%` : ''}
              </span>
            </div>
          </div>
          <div className="col" style={{ alignItems: 'flex-end', gap: 2 }}>
            <span style={{ fontWeight: 800, color: plan.statusColor, fontSize: 18 }}>
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
          {/* Aviso APR no disponible */}
          {missingApr && (
            <div style={{
              background: 'rgba(255, 149, 0, 0.1)',
              border: '1px solid rgba(255, 149, 0, 0.3)',
              borderRadius: 12,
              padding: 12,
              marginBottom: 14
            }}>
              <div className="row gap-10" style={{ alignItems: 'flex-start' }}>
                <span style={{ fontSize: 18 }}>⚠️</span>
                <div className="col gap-4" style={{ flex: 1 }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--orange)' }}>{s.missingApr}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-mute)', lineHeight: 1.4 }}>{s.missingAprDesc}</span>
                  <button
                    onClick={handleUploadStatement}
                    disabled={scanningApr}
                    className="row gap-6 mt-8"
                    style={{
                      background: 'var(--orange)',
                      color: '#fff',
                      padding: '8px 12px',
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 700,
                      alignSelf: 'flex-start',
                      opacity: scanningApr ? 0.6 : 1
                    }}
                  >
                    <Icon name="camera" size={14} color="#fff" />
                    <span>{scanningApr ? s.scanningStatement : s.uploadStatement}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Acción: bajar a 5% */}
          {plan.payToReach5 > 0 && (
            <ActionStep
              icon="🎯"
              color="var(--green)"
              title={s.payForExcellent.replace('{amount}', fmtMoney(plan.payToReach5))}
              steps={[
                {
                  label: s.leaveBalanceAt.replace('{amount}', fmtMoney(targetBalance)).toUpperCase(),
                  value: fmtMoney(targetBalance),
                  sub: s.leaveBalanceWhy.replace('{limit}', fmtMoney(card.limit))
                },
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
        <span style={{ fontWeight: 700, fontSize: 14, color, flex: 1, lineHeight: 1.4 }}>{title}</span>
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

/* ===== Gauge igual al del Dashboard ===== */
function ScoreGauge({ score, color }) {
  const size = 64;
  const r = 26;
  const cx = size / 2;
  const cy = size / 2 + 4;
  const pct = Math.max(0, Math.min(1, (score - 300) / (890 - 300)));
  const angle = -Math.PI + pct * Math.PI;
  const needleX = cx + Math.cos(angle) * (r - 2);
  const needleY = cy + Math.sin(angle) * (r - 2);

  return (
    <svg width={size} height={size * 0.7} viewBox={`0 0 ${size} ${size * 0.7}`} style={{ flexShrink: 0 }}>
      <defs>
        <linearGradient id="creditGaugeGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#FF3B30" />
          <stop offset="33%" stopColor="#FF9500" />
          <stop offset="66%" stopColor="#FFCC00" />
          <stop offset="100%" stopColor="#00E5B0" />
        </linearGradient>
      </defs>
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none"
        stroke="url(#creditGaugeGrad)"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <line
        x1={cx} y1={cy}
        x2={needleX} y2={needleY}
        stroke="var(--text)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx={cx} cy={cy} r="3" fill="var(--text)" />
    </svg>
  );
}
