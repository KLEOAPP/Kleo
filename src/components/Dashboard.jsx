import { useMemo, useState, useRef } from 'react';
import { Icon } from './icons.jsx';
import TopBar from './TopBar.jsx';
import { fmtMoney, fmtMoneyShort, daysUntil, nextPaymentDate } from '../utils/storage.js';
import { useI18n } from '../i18n/index.jsx';

const PERIODS = ['day', 'week', 'month', '3m', '6m', 'ytd'];

export default function Dashboard({
  user, accounts, transactions, fixedExpenses, goals, household,
  onOpenMenu, onOpenSection, onSwitchTab, onConnectBank,
  onNotifications, unreadCount, onAddExpense, onOpenKleoAi
}) {
  const { strings: s } = useI18n();
  const [period, setPeriod] = useState('month');

  /* ---------------- Derived data ---------------- */
  const patrimony = useMemo(() => {
    const checking = accounts.filter(a => a.type === 'checking').reduce((acc, a) => acc + a.balance, 0);
    const savings = accounts.filter(a => a.type === 'savings').reduce((acc, a) => acc + a.balance, 0);
    const debt = accounts.filter(a => a.type === 'credit').reduce((acc, a) => acc + Math.abs(a.balance), 0);
    return { net: checking + savings - debt, checking, savings, debt };
  }, [accounts]);

  const monthSpending = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return transactions
      .filter(t => new Date(t.date) >= monthStart && t.amount < 0 && t.category !== 'transferencia')
      .reduce((acc, t) => acc + Math.abs(t.amount), 0);
  }, [transactions]);

  const monthIncome = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return transactions
      .filter(t => new Date(t.date) >= monthStart && t.amount > 0)
      .reduce((acc, t) => acc + t.amount, 0);
  }, [transactions]);

  const creditCards = useMemo(() => accounts.filter(a => a.type === 'credit'), [accounts]);
  const creditUsed = creditCards.reduce((acc, c) => acc + Math.abs(c.balance), 0);
  const creditLimit = creditCards.reduce((acc, c) => acc + (c.limit || 0), 0);
  const creditUtilization = creditLimit > 0 ? (creditUsed / creditLimit) * 100 : 0;

  const score = useMemo(() => {
    let base = 750;
    if (creditUtilization > 30) base -= (creditUtilization - 30) * 4;
    else if (creditUtilization < 5) base += 70;
    else if (creditUtilization < 10) base += 40;
    return Math.max(580, Math.min(890, Math.round(base)));
  }, [creditUtilization]);

  const scoreLabel = score >= 800 ? s.excellentScore : score >= 740 ? s.goodScore : score >= 670 ? s.fairScore : s.poorScore;
  const scoreColor = score >= 800 ? '#00E5B0' : score >= 740 ? '#34C759' : score >= 670 ? '#FF9500' : '#FF3B30';

  // Available to spend = checking - upcoming bills due in next 12 days
  const safeToSpend = useMemo(() => {
    const upcoming = fixedExpenses.reduce((acc, f) => acc + f.amount, 0);
    return Math.max(0, patrimony.checking - upcoming);
  }, [patrimony.checking, fixedExpenses]);

  const utilStatus = creditUtilization < 10 ? s.veryGoodLabel : creditUtilization < 30 ? s.goodLabel : s.watchOutLabel;
  const utilColor = creditUtilization < 10 ? '#00E5B0' : creditUtilization < 30 ? '#FF9500' : '#FF3B30';

  // Insight: simple savings opportunity
  const savingsOpportunity = useMemo(() => {
    const diff = monthIncome - monthSpending;
    return Math.max(50, Math.round(Math.abs(diff) * 0.12));
  }, [monthIncome, monthSpending]);

  // Synthetic net worth history per period
  const chartData = useMemo(() => {
    const points = period === 'day' ? 12 : period === 'week' ? 14 : period === 'month' ? 30 : period === '3m' ? 12 : period === '6m' ? 24 : 12;
    const seed = patrimony.net || 46000;
    const base = seed * 0.78;
    const arr = [];
    for (let i = 0; i < points; i++) {
      const t = i / (points - 1);
      // smooth growth + noise
      const noise = Math.sin(i * 1.7) * (seed * 0.015) + Math.cos(i * 0.9) * (seed * 0.008);
      arr.push(base + (seed - base) * t + noise);
    }
    arr[arr.length - 1] = seed;
    return arr;
  }, [period, patrimony.net]);

  const change = useMemo(() => {
    const first = chartData[0];
    const last = chartData[chartData.length - 1];
    return first > 0 ? ((last - first) / first) * 100 : 0;
  }, [chartData]);

  // Sections grid (rich cards with metric + sub)
  const totalGoals = goals?.reduce((acc, g) => acc + g.current, 0) || 0;
  const txThisMonth = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return transactions.filter(t => new Date(t.date) >= start).length;
  }, [transactions]);
  const upcomingCount = useMemo(() => {
    const today = new Date();
    const day = today.getDate();
    let count = 0;
    fixedExpenses.forEach(f => {
      const days = f.dueDay >= day ? f.dueDay - day : (30 - day + f.dueDay);
      if (days <= 7) count++;
    });
    creditCards.forEach(c => {
      if (c.paymentDueDay) {
        const days = daysUntil(nextPaymentDate(c.paymentDueDay));
        if (days <= 7) count++;
      }
    });
    return count;
  }, [fixedExpenses, creditCards]);
  const myBudgetShare = useMemo(() => {
    if (!household?.enabled) return null;
    const me = household.members.find(m => m.isMe);
    const fixedShared = fixedExpenses.filter(f => f.shared).reduce((acc, f) => acc + f.amount, 0);
    return fixedShared * (me?.incomeRatio || 0.5);
  }, [household, fixedExpenses]);
  const monthChangePct = monthIncome > 0 ? Math.round(((monthSpending - monthIncome * 0.85) / (monthIncome * 0.85)) * 100) : -12;

  const sectionCards = [
    {
      id: 'credit', emoji: '💳', title: s.sCredit,
      metric: `${creditUtilization.toFixed(0)}%`,
      sub: s.sScore.replace('{score}', score),
      gradient: 'linear-gradient(135deg, #00B589, #007A5C)',
      onClick: () => onOpenSection('credit')
    },
    {
      id: 'accounts', emoji: '🏦', title: s.sAccounts,
      metric: fmtMoneyShort(patrimony.checking + patrimony.savings),
      sub: s.sCheckSavings,
      gradient: 'linear-gradient(135deg, #5856D6, #3634A3)',
      onClick: () => onSwitchTab('accounts')
    },
    {
      id: 'goals', emoji: '🎯', title: s.sGoals,
      metric: fmtMoneyShort(totalGoals),
      sub: s.sSaved,
      gradient: 'linear-gradient(135deg, #FF9500, #B86600)',
      onClick: () => onSwitchTab('goals')
    },
    {
      id: 'budget', emoji: '💰', title: s.sBudget,
      metric: myBudgetShare ? fmtMoneyShort(myBudgetShare) : '—',
      sub: myBudgetShare ? s.sYourPart : s.sConfigure,
      gradient: 'linear-gradient(135deg, #FF2D6F, #B0124A)',
      onClick: () => onOpenSection('budget')
    },
    {
      id: 'calendar', emoji: '📅', title: s.sCalendar,
      metric: upcomingCount,
      sub: s.sThisWeek,
      gradient: 'linear-gradient(135deg, #34C759, #1C8B3F)',
      onClick: () => onOpenSection('calendar')
    },
    {
      id: 'analysis', emoji: '📈', title: s.sAnalysis,
      metric: `${monthChangePct >= 0 ? '+' : ''}${monthChangePct}%`,
      sub: s.sVsLastMonth,
      gradient: 'linear-gradient(135deg, #AF52DE, #6F2D9A)',
      onClick: () => onOpenSection('analysis')
    },
    {
      id: 'transactions', emoji: '🧾', title: s.sTransactions,
      metric: txThisMonth,
      sub: s.sThisMonth,
      gradient: 'linear-gradient(135deg, #007AFF, #003D80)',
      onClick: () => onOpenSection('transactions')
    },
    {
      id: 'reports', emoji: '📊', title: s.sReports,
      metric: s.sView,
      sub: s.sMonthlyQuarterly,
      gradient: 'linear-gradient(135deg, #FF9500, #B86600)',
      onClick: () => onOpenSection('reports')
    }
  ];

  /* ---------------- Render ---------------- */
  return (
    <div className="screen" style={{ paddingTop: 0 }}>
      <TopBar
        onMenu={onOpenMenu}
        onHome={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        onNotifications={onNotifications}
        unreadCount={unreadCount}
      />

      <div style={{ padding: '4px 0 24px' }}>
        {/* Greeting */}
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>
          {s.hello.replace('{name}', user.name.split(' ')[0])} 👋
        </h2>

        {/* ============ HERO: NET WORTH + CHART ============ */}
        <div className="card mb-16" style={{
          background: 'var(--bg-card)',
          borderColor: 'var(--border-soft)',
          padding: 18,
          borderRadius: 22
        }}>
          <div className="spread mb-4" style={{ alignItems: 'flex-start' }}>
            <div className="row gap-6" style={{ alignItems: 'center' }}>
              <span style={{ fontSize: 14, color: 'var(--text-mute)', fontWeight: 500 }}>{s.netWorth}</span>
              <Icon name="info" size={13} color="var(--text-mute)" />
            </div>
            <div className="row gap-4" style={{
              background: change >= 0 ? 'rgba(0, 229, 176, 0.12)' : 'rgba(255, 77, 109, 0.12)',
              color: change >= 0 ? '#00E5B0' : '#FF4D6D',
              padding: '5px 10px',
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 600,
              alignItems: 'center'
            }}>
              <Icon name={change >= 0 ? 'trending-up' : 'trending-down'} size={12} />
              <span>{change >= 0 ? s.growing : s.declining}</span>
            </div>
          </div>

          <h1 style={{
            fontSize: 38,
            fontWeight: 700,
            letterSpacing: '-0.03em',
            marginTop: 4,
            marginBottom: 6
          }}>
            {fmtMoney(patrimony.net || 46112.16)}
          </h1>

          <div className="row gap-4" style={{ alignItems: 'center' }}>
            <span style={{ color: change >= 0 ? '#00E5B0' : '#FF4D6D', fontWeight: 600, fontSize: 13 }}>
              {change >= 0 ? '↑' : '↓'} {Math.abs(change).toFixed(1)}%
            </span>
            <span className="tiny">{s.vsLastMonthShort}</span>
          </div>

          {/* Period tabs */}
          <div style={{
            display: 'flex',
            gap: 4,
            marginTop: 16,
            marginBottom: 8,
            background: 'transparent'
          }}>
            {PERIODS.map(p => {
              const label =
                p === 'day' ? s.periodDay :
                p === 'week' ? s.periodWeek :
                p === 'month' ? s.periodMonth :
                p === '3m' ? s.period3M :
                p === '6m' ? s.period6M : s.periodYTD;
              const active = period === p;
              return (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  style={{
                    flex: 1,
                    padding: '7px 0',
                    borderRadius: 999,
                    background: active ? 'var(--pill-grad)' : 'transparent',
                    border: active ? 'none' : '1px solid var(--border)',
                    color: active ? '#fff' : 'var(--text-mute)',
                    boxShadow: active ? '0 4px 14px rgba(124, 58, 237, 0.4)' : 'none',
                    fontSize: 12,
                    fontWeight: 600,
                    transition: 'all .15s'
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Chart */}
          <Sparkline data={chartData} />
        </div>

        {/* ============ CONNECT BANK ============ */}
        {onConnectBank && (
          <button
            onClick={onConnectBank}
            className="pressable mb-20"
            style={{
              width: '100%',
              padding: 14,
              borderRadius: 18,
              background: 'var(--bg-card)',
              border: '1px solid var(--border-soft)',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: 12
            }}
          >
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'linear-gradient(135deg, #7C3AED, #A855F7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(124, 58, 237, 0.4)'
            }}>
              <Icon name="bank" size={22} color="#fff" />
            </div>
            <div className="col gap-2" style={{ flex: 1 }}>
              <span style={{ fontWeight: 600, fontSize: 15 }}>{s.connectBank}</span>
              <span className="tiny">{s.connectBankDesc}</span>
            </div>
            <Icon name="back" size={16} color="#A78BFA" stroke={2.5} style={{ transform: 'rotate(180deg)' }} />
          </button>
        )}

        {/* ============ TU RESUMEN ============ */}
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>{s.yourSummary}</h3>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 10,
          marginBottom: 20
        }}>
          {/* Disponible */}
          <SummaryCard
            iconName="wallet"
            iconColor="#00E5B0"
            iconBg="rgba(0, 229, 176, 0.18)"
            glow="var(--glow-green)"
            borderColor="rgba(0, 229, 176, 0.25)"
            label={s.availableLabel}
            labelColor="#00E5B0"
            value={fmtMoneyShort(safeToSpend || 1240)}
            sub={s.toSpend}
            footer={
              <div className="row gap-4" style={{ alignItems: 'center', color: '#00E5B0', fontSize: 10 }}>
                <Icon name="shield" size={11} color="#00E5B0" />
                <span style={{ fontWeight: 600 }}>{s.safeForDays.replace('{n}', 12)}</span>
              </div>
            }
            onClick={() => onSwitchTab('accounts')}
          />

          {/* Uso de crédito */}
          <SummaryCard
            iconName="credit-card"
            iconColor="#A855F7"
            iconBg="rgba(168, 85, 247, 0.18)"
            glow="var(--glow-purple)"
            borderColor="rgba(168, 85, 247, 0.25)"
            label={s.creditUse}
            labelColor="#A855F7"
            value={`${creditUtilization.toFixed(0)}%`}
            sub={utilStatus}
            subColor={utilColor}
            footer={
              <>
                <span className="tiny" style={{ fontSize: 10, marginBottom: 4, display: 'block' }}>
                  {s.limitUsed.replace('{amount}', fmtMoneyShort(creditUsed))}
                </span>
                <div style={{ height: 4, background: 'var(--bg-elev)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{
                    width: `${Math.min(100, creditUtilization)}%`,
                    height: '100%',
                    background: utilColor
                  }} />
                </div>
              </>
            }
            onClick={() => onOpenSection('credit')}
          />

          {/* Insight */}
          <SummaryCard
            iconName="lightbulb"
            iconColor="#FF9500"
            iconBg="rgba(255, 149, 0, 0.18)"
            glow="var(--glow-orange)"
            borderColor="rgba(255, 149, 0, 0.25)"
            label={s.insightForYou}
            labelColor="#FF9500"
            value={null}
            customBody={
              <>
                <div style={{ fontSize: 11, color: 'var(--text)', fontWeight: 500, lineHeight: 1.3 }}>
                  {s.youCanSave}
                </div>
                <div style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: '#FF9500',
                  letterSpacing: '-0.02em',
                  margin: '2px 0'
                }}>
                  ${savingsOpportunity}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-mute)' }}>{s.thisMonthRocket}</div>
              </>
            }
            footer={
              <button
                onClick={(e) => { e.stopPropagation(); onOpenSection('analysis'); }}
                className="row gap-2"
                style={{
                  background: 'rgba(255, 149, 0, 0.15)',
                  color: '#FF9500',
                  fontSize: 10,
                  fontWeight: 600,
                  padding: '4px 8px',
                  borderRadius: 6,
                  width: '100%',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <span>{s.seeHow}</span>
                <Icon name="back" size={10} stroke={2.5} style={{ transform: 'rotate(180deg)' }} />
              </button>
            }
            onClick={() => onOpenSection('analysis')}
          />
        </div>

        {/* ============ KLEO SCORE ============ */}
        <button
          onClick={() => onOpenSection('credit')}
          className="card pressable mb-20"
          style={{
            width: '100%',
            padding: 18,
            borderRadius: 22,
            background: 'var(--bg-card)',
            border: '1px solid var(--border-soft)',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            gap: 14
          }}
        >
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: 'linear-gradient(135deg, #FF2D6F, #A855F7, #00E5B0)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 800, fontSize: 24,
            flexShrink: 0
          }}>
            K
          </div>

          <div className="col gap-2" style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 13, color: 'var(--text-mute)', fontWeight: 500 }}>{s.kleoScore}</span>
            <div className="row gap-8" style={{ alignItems: 'baseline' }}>
              <span style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em' }}>{score}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: scoreColor }}>{scoreLabel}</span>
            </div>
          </div>

          <ScoreGauge score={score} color={scoreColor} />

          <div className="col" style={{ alignItems: 'flex-end', flexShrink: 0, maxWidth: 110 }}>
            <span style={{ fontSize: 11, color: 'var(--text-mute)', textAlign: 'right', lineHeight: 1.3 }}>
              {s.financialHealth}
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-mute)', textAlign: 'right', lineHeight: 1.3 }}>
              {s.isInState.split('{state}')[0]}
              <span style={{ color: scoreColor, fontWeight: 600 }}>{scoreLabel.toLowerCase()}</span>
              {s.isInState.split('{state}')[1]}
            </span>
          </div>
        </button>

        {/* ============ KLEO AI TIPS BANNER ============ */}
        {onOpenKleoAi && (
          <button
            onClick={onOpenKleoAi}
            className="pressable mb-12"
            style={{
              width: '100%',
              padding: 14,
              borderRadius: 16,
              background: 'linear-gradient(135deg, rgba(0, 229, 176, 0.10), rgba(0, 132, 255, 0.10))',
              border: '1px solid rgba(0, 229, 176, 0.25)',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: 12
            }}
          >
            <span style={{ fontSize: 28 }}>🤖</span>
            <div className="col gap-2" style={{ flex: 1 }}>
              <span style={{ fontWeight: 700, fontSize: 15 }}>{s.kleoAiTipsTitle}</span>
              <span className="tiny">{s.kleoAiTipsDesc}</span>
            </div>
            <Icon name="back" size={14} color="var(--text-mute)" stroke={2.5} style={{ transform: 'rotate(180deg)' }} />
          </button>
        )}

        {/* ============ SECCIONES GRID ============ */}
        <div className="section-header" style={{ marginTop: 8 }}>
          <span>{s.sections}</span>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 12
        }}>
          {sectionCards.map(c => (
            <SectionCard key={c.id} {...c} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================ Sub-components ============================ */

function Sparkline({ data, height = 120 }) {
  const width = 320;
  const padding = 8;
  const [hoverIdx, setHoverIdx] = useState(null);
  const svgRef = useRef(null);

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = (width - padding * 2) / (data.length - 1);

  const points = data.map((v, i) => ({
    x: padding + i * stepX,
    y: padding + (1 - (v - min) / range) * (height - padding * 2),
    v
  }));

  const path = points.reduce((acc, p, i, arr) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    const prev = arr[i - 1];
    const cx = (prev.x + p.x) / 2;
    return `${acc} C ${cx} ${prev.y}, ${cx} ${p.y}, ${p.x} ${p.y}`;
  }, '');

  const areaPath = `${path} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;
  const yLabels = [max, min + range * 0.66, min + range * 0.33, min];

  const active = hoverIdx !== null ? points[hoverIdx] : points[points.length - 1];
  const isScrubbing = hoverIdx !== null;

  const handleMove = (clientX) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const scale = (width + 40) / rect.width;
    const x = (clientX - rect.left) * scale - padding;
    const idx = Math.round(x / stepX);
    if (idx >= 0 && idx < points.length) setHoverIdx(idx);
  };

  return (
    <div style={{ position: 'relative', marginTop: 8 }}>
      {isScrubbing && (
        <div style={{
          position: 'absolute',
          top: -22,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--bg-elev)',
          border: '1px solid var(--border)',
          padding: '4px 10px',
          borderRadius: 8,
          fontSize: 12,
          fontWeight: 700,
          whiteSpace: 'nowrap',
          zIndex: 2
        }}>
          {fmtMoneyShort(active.v)}
        </div>
      )}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width + 40} ${height + 8}`}
        width="100%"
        style={{ display: 'block', touchAction: 'pan-y', cursor: 'crosshair' }}
        onTouchStart={(e) => handleMove(e.touches[0].clientX)}
        onTouchMove={(e) => { e.preventDefault(); handleMove(e.touches[0].clientX); }}
        onTouchEnd={() => setHoverIdx(null)}
        onMouseDown={(e) => handleMove(e.clientX)}
        onMouseMove={(e) => { if (e.buttons === 1) handleMove(e.clientX); }}
        onMouseLeave={() => setHoverIdx(null)}
        onMouseUp={() => setHoverIdx(null)}
      >
        <defs>
          <linearGradient id="kleoLineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#FF2D6F" />
            <stop offset="50%" stopColor="#A855F7" />
            <stop offset="100%" stopColor="#00E5B0" />
          </linearGradient>
          <linearGradient id="kleoAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#A855F7" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#A855F7" stopOpacity="0" />
          </linearGradient>
        </defs>

        {yLabels.map((v, i) => {
          const y = padding + (i / (yLabels.length - 1)) * (height - padding * 2);
          return (
            <g key={i}>
              <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="var(--border)" strokeWidth="0.5" strokeDasharray="2 4" opacity="0.5" />
              <text x={width + 4} y={y + 3} fill="var(--text-mute)" fontSize="9" fontWeight="500">
                {fmtMoneyShort(v).replace('$', '')}
              </text>
            </g>
          );
        })}

        <path d={areaPath} fill="url(#kleoAreaGrad)" />
        <path d={path} fill="none" stroke="url(#kleoLineGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* Vertical guide line when scrubbing */}
        {isScrubbing && (
          <line x1={active.x} y1={padding} x2={active.x} y2={height - padding} stroke="var(--text-mute)" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
        )}

        {/* Active dot */}
        <circle cx={active.x} cy={active.y} r="4" fill="#00E5B0" />
        <circle cx={active.x} cy={active.y} r="7" fill="#00E5B0" opacity="0.3" />
      </svg>
    </div>
  );
}

function SummaryCard({ iconName, iconColor, iconBg, glow, borderColor, label, labelColor, value, sub, subColor, customBody, footer, onClick }) {
  return (
    <button
      onClick={onClick}
      className="pressable"
      style={{
        position: 'relative',
        padding: 14,
        borderRadius: 18,
        background: `${glow || ''}, var(--bg-card)`.replace(/^,\s*/, ''),
        backgroundColor: 'var(--bg-card)',
        border: `1px solid ${borderColor || 'var(--border-soft)'}`,
        textAlign: 'left',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        minHeight: 175,
        overflow: 'hidden'
      }}
    >
      <div style={{
        width: 32, height: 32, borderRadius: 10,
        background: iconBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <Icon name={iconName} size={16} color={iconColor} />
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {customBody ? customBody : (
          <>
            <span style={{ fontSize: 11, color: labelColor, fontWeight: 600 }}>{label}</span>
            <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1 }}>{value}</span>
            {sub && <span style={{ fontSize: 11, color: subColor || 'var(--text-mute)', fontWeight: subColor ? 600 : 500 }}>{sub}</span>}
          </>
        )}
      </div>

      {footer && <div style={{ marginTop: 'auto' }}>{footer}</div>}
    </button>
  );
}

function ScoreGauge({ score, color }) {
  const size = 60;
  const r = 24;
  const cx = size / 2;
  const cy = size / 2 + 4;
  // Half circle from -180° to 0°
  const pct = Math.max(0, Math.min(1, (score - 300) / (890 - 300)));
  const angle = -Math.PI + pct * Math.PI;
  const needleX = cx + Math.cos(angle) * (r - 2);
  const needleY = cy + Math.sin(angle) * (r - 2);

  return (
    <svg width={size} height={size * 0.7} viewBox={`0 0 ${size} ${size * 0.7}`} style={{ flexShrink: 0 }}>
      <defs>
        <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#FF3B30" />
          <stop offset="33%" stopColor="#FF9500" />
          <stop offset="66%" stopColor="#FFCC00" />
          <stop offset="100%" stopColor="#00E5B0" />
        </linearGradient>
      </defs>
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none"
        stroke="url(#gaugeGrad)"
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

function SectionCard({ emoji, title, metric, sub, gradient, onClick }) {
  return (
    <button
      onClick={onClick}
      className="pressable"
      style={{
        position: 'relative',
        padding: 14,
        borderRadius: 18,
        background: 'var(--bg-card)',
        border: '1px solid var(--border-soft)',
        textAlign: 'left',
        aspectRatio: '1.05',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.04))'
      }}
    >
      {/* Decorative blob top-right */}
      <div style={{
        position: 'absolute',
        top: -28, right: -28,
        width: 90, height: 90,
        borderRadius: '50%',
        background: gradient,
        opacity: 0.18,
        pointerEvents: 'none'
      }} />

      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: gradient,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 22,
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
      }}>
        {emoji}
      </div>

      <div className="col gap-2">
        <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-mute)' }}>{title}</span>
        <span style={{
          fontWeight: 800,
          fontSize: typeof metric === 'string' && metric.length > 5 ? 18 : 22,
          letterSpacing: '-0.02em',
          lineHeight: 1.1
        }}>
          {metric}
        </span>
        <span className="tiny" style={{ marginTop: -2 }}>{sub}</span>
      </div>
    </button>
  );
}

function QuickAction({ iconName, color, label, sub, onClick }) {
  return (
    <button
      onClick={onClick}
      className="pressable"
      style={{
        padding: 14,
        borderRadius: 16,
        background: 'var(--bg-card)',
        border: '1px solid var(--border-soft)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 10
      }}
    >
      <div style={{
        width: 32, height: 32, borderRadius: 10,
        background: color + '22',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <Icon name={iconName} size={16} color={color} />
      </div>
      <div className="col" style={{ alignItems: 'flex-start', gap: 0 }}>
        <span style={{ fontSize: 12, fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 11, color: 'var(--text-mute)' }}>{sub}</span>
      </div>
    </button>
  );
}
