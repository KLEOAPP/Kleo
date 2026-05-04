import { useMemo, useState } from 'react';
import { Icon } from './icons.jsx';
import TopBar from './TopBar.jsx';
import BankLogo from './BankLogo.jsx';
import { fmtMoney, fmtMoneyShort, daysUntil, nextPaymentDate } from '../utils/storage.js';
import { useI18n } from '../i18n/index.jsx';
import { buildMonthEvents } from '../utils/calendarEvents.js';

export default function Dashboard({
  user, accounts, transactions, fixedExpenses, goals, household,
  onOpenMenu, onOpenSection, onSwitchTab, onConnectBank,
  onNotifications, unreadCount, onAddExpense, onOpenKleoAi
}) {
  const { strings: s } = useI18n();
  const [showHowCalc, setShowHowCalc] = useState(false);

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

  // ====== NUEVO: cálculo "Disponible esta semana" ======
  // Eventos del mes + próximos 7 días
  const today = new Date();
  const upcomingEvents = useMemo(
    () => buildMonthEvents({
      year: today.getFullYear(),
      month: today.getMonth(),
      fixedExpenses, accounts, transactions, goals
    }).filter(e =>
      (e.type === 'fixed' || e.type === 'payment' || e.type === 'subscription' || e.type === 'goal') &&
      !e.paid &&
      e.day >= today.getDate() && e.day - today.getDate() <= 7
    ),
    [fixedExpenses, accounts, transactions, goals, today]
  );

  const upcomingTotal = useMemo(
    () => upcomingEvents.reduce((sum, e) => sum + (e.amount || 0), 0),
    [upcomingEvents]
  );

  const availableThisWeek = Math.max(0, patrimony.checking - upcomingTotal);

  // Promedio de gasto diario últimos 30 días
  const dailyAvg = useMemo(() => {
    const cutoff = new Date(today.getTime() - 30 * 86400000);
    const total = transactions
      .filter(t => new Date(t.date) >= cutoff && t.amount < 0 && t.category !== 'transferencia')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    return total / 30 || 60; // fallback 60$/día
  }, [transactions, today]);

  const daysSafe = Math.max(0, Math.floor(availableThisWeek / dailyAvg));

  // ====== Conteos por categoría para "Esta semana" ======
  const weekCounts = useMemo(() => {
    const counts = { payments: 0, subs: 0, cycles: 0 };
    upcomingEvents.forEach(e => {
      if (e.type === 'payment' || e.type === 'fixed') counts.payments++;
      else if (e.type === 'subscription') counts.subs++;
    });
    // Ciclos no estaban filtrados arriba; los recogemos aparte
    const cycles = buildMonthEvents({
      year: today.getFullYear(), month: today.getMonth(),
      fixedExpenses, accounts, transactions, goals
    }).filter(e => e.type === 'cycle' && e.day >= today.getDate() && e.day - today.getDate() <= 7);
    counts.cycles = cycles.length;
    return counts;
  }, [upcomingEvents, fixedExpenses, accounts, transactions, goals, today]);

  // ====== Acción recomendada hoy ======
  const todayAction = useMemo(() => {
    // 1) Tarjeta con utilización alta + cierre próximo
    const card = creditCards
      .map(c => ({
        c,
        util: c.limit ? (Math.abs(c.balance) / c.limit) * 100 : 0,
        daysToClose: c.cycleCloseDay ? daysUntil(nextPaymentDate(c.cycleCloseDay)) : 99
      }))
      .filter(x => x.util > 10 && x.daysToClose <= 7 && x.daysToClose >= 0)
      .sort((a, b) => b.util - a.util)[0];
    if (card) {
      const target5 = card.c.limit * 0.05;
      const payAmount = Math.max(0, Math.abs(card.c.balance) - target5);
      const newUtil = (target5 / card.c.limit) * 100;
      return {
        kind: 'credit',
        text: `Paga ${fmtMoney(payAmount)} a ${card.c.institution || card.c.name} antes del cierre para mantener tu utilización en ${newUtil.toFixed(1)}%.`,
        institution: card.c.institution || card.c.name,
        action: () => onOpenSection('credit')
      };
    }
    // 2) Pago vence en 0-2 días
    const urgent = upcomingEvents
      .filter(e => (e.type === 'fixed' || e.type === 'payment') && e.day - today.getDate() <= 2)
      .sort((a, b) => a.day - b.day)[0];
    if (urgent) {
      const dStr = urgent.day === today.getDate() ? 'hoy' : urgent.day === today.getDate() + 1 ? 'mañana' : `el día ${urgent.day}`;
      return {
        kind: 'bill',
        text: `Paga ${fmtMoney(urgent.amount)} de ${urgent.name} ${dStr}.`,
        action: () => onOpenSection('calendar')
      };
    }
    // 3) Meta atrasada
    const behind = goals.find(g => {
      if (!g.schedule?.nextDate) return false;
      const nd = new Date(g.schedule.nextDate);
      return nd < today && (g.current || 0) < g.target;
    });
    if (behind) {
      return {
        kind: 'goal',
        text: `Aporta ${fmtMoney(behind.schedule.amount)} a tu meta "${behind.name}" — el depósito está atrasado.`,
        action: () => onSwitchTab('goals')
      };
    }
    return null;
  }, [creditCards, upcomingEvents, goals, today, onOpenSection, onSwitchTab]);

  // ====== Riesgo de la semana ======
  const riskInfo = useMemo(() => {
    let score = 0;
    let count = 0;
    creditCards.forEach(c => {
      const util = c.limit ? (Math.abs(c.balance) / c.limit) * 100 : 0;
      if (util > 30) { score += 2; count++; }
      else if (util > 10 && c.cycleCloseDay && daysUntil(nextPaymentDate(c.cycleCloseDay)) <= 7) {
        score += 1; count++;
      }
    });
    if (upcomingTotal > patrimony.checking * 0.5) { score += 2; count++; }
    if (goals.some(g => g.schedule?.nextDate && new Date(g.schedule.nextDate) < today && (g.current || 0) < g.target)) {
      score += 1; count++;
    }
    const overdueEvents = upcomingEvents.filter(e => e.urgency === 'urgent').length;
    if (overdueEvents > 0) { score += overdueEvents; count += overdueEvents; }

    let level, color, msg;
    if (score === 0) {
      level = 'low'; color = '#00E5B0'; msg = s.riskLowZero;
    } else if (score <= 2) {
      level = 'low'; color = '#00E5B0';
      msg = s.riskLow.replace('{n}', count).replace('{s}', count === 1 ? '' : 's').replace('{s2}', count === 1 ? '' : 'n');
    } else if (score <= 4) {
      level = 'medium'; color = '#FF9500';
      msg = s.riskMedium.replace('{n}', count).replace('{s}', count === 1 ? '' : 's').replace('{s2}', count === 1 ? '' : 'n');
    } else {
      level = 'high'; color = '#FF4D6D';
      msg = s.riskHigh.replace('{n}', count).replace('{s}', count === 1 ? '' : 's').replace('{s2}', count === 1 ? '' : 'n');
    }
    return { level, color, msg, count, score };
  }, [creditCards, upcomingTotal, patrimony.checking, goals, upcomingEvents, today, s]);

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

        {/* ============ HERO: DISPONIBLE ESTA SEMANA ============ */}
        <div className="card mb-16" style={{
          background: 'linear-gradient(135deg, rgba(0, 229, 176, 0.10), rgba(168, 85, 247, 0.08))',
          border: '1px solid rgba(0, 229, 176, 0.25)',
          padding: 18,
          borderRadius: 22,
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Glow decorativo */}
          <div style={{
            position: 'absolute',
            top: -40, right: -40,
            width: 140, height: 140,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(0, 229, 176, 0.35), transparent 70%)',
            pointerEvents: 'none'
          }} />

          <div className="row gap-6 mb-4" style={{ alignItems: 'center', position: 'relative' }}>
            <span style={{ fontSize: 13, color: 'var(--text-mute)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              💰 {s.availableThisWeek}
            </span>
          </div>

          <h1 style={{
            fontSize: 42,
            fontWeight: 800,
            letterSpacing: '-0.03em',
            marginTop: 4,
            marginBottom: 8,
            position: 'relative',
            background: 'linear-gradient(135deg, #00E5B0, #A855F7)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            {fmtMoney(availableThisWeek)}
          </h1>

          <p className="tiny" style={{ fontSize: 12, lineHeight: 1.45, marginBottom: 12, position: 'relative' }}>
            {s.availableSubtext}
          </p>

          {/* Pill de seguridad */}
          <div className="row gap-6" style={{
            background: 'rgba(0, 229, 176, 0.18)',
            border: '1px solid rgba(0, 229, 176, 0.35)',
            padding: '6px 12px',
            borderRadius: 999,
            alignItems: 'center',
            display: 'inline-flex',
            position: 'relative'
          }}>
            <Icon name="shield" size={12} color="#00E5B0" />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#00E5B0' }}>
              {s.safeForXDays.replace('{n}', daysSafe || 12)}
            </span>
          </div>

          <button
            onClick={() => setShowHowCalc(true)}
            className="tiny"
            style={{
              display: 'block',
              marginTop: 12,
              color: '#A855F7',
              fontWeight: 700,
              fontSize: 12,
              textDecoration: 'underline',
              position: 'relative'
            }}
          >
            {s.howCalculated}
          </button>
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

        {/* ============ BLOQUE 1 — ACCIÓN RECOMENDADA HOY ============ */}
        <div className="card mb-12" style={{
          background: todayAction
            ? 'linear-gradient(135deg, rgba(255, 45, 111, 0.12), rgba(168, 85, 247, 0.10))'
            : 'rgba(0, 229, 176, 0.08)',
          border: `1px solid ${todayAction ? 'rgba(255, 45, 111, 0.3)' : 'rgba(0, 229, 176, 0.3)'}`,
          padding: 16,
          borderRadius: 18
        }}>
          <div className="row gap-8 mb-8" style={{ alignItems: 'center' }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10,
              background: todayAction ? 'var(--brand-grad)' : 'var(--green)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0
            }}>
              <Icon name="sparkle" size={16} color="#fff" />
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-mute)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {s.todayAction}
            </span>
          </div>

          {todayAction ? (
            <>
              <p style={{ fontSize: 14, lineHeight: 1.5, fontWeight: 600, marginBottom: 12 }}>
                {todayAction.text}
              </p>
              <button
                onClick={todayAction.action}
                className="row gap-6"
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: 10,
                  background: 'var(--brand-grad)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 13,
                  justifyContent: 'center',
                  boxShadow: '0 4px 14px rgba(168, 85, 247, 0.3)'
                }}
              >
                <span>{s.followPlan}</span>
                <Icon name="back" size={12} color="#fff" stroke={2.5} style={{ transform: 'rotate(180deg)' }} />
              </button>
            </>
          ) : (
            <>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--green)', marginBottom: 4 }}>
                {s.todayActionAllGood}
              </p>
              <p className="tiny" style={{ fontSize: 12, lineHeight: 1.4 }}>
                {s.todayActionAllGoodDesc}
              </p>
            </>
          )}
        </div>

        {/* ============ BLOQUE 2 — ESTA SEMANA ============ */}
        <div className="card mb-12" style={{
          padding: 16,
          borderRadius: 18,
          border: '1px solid var(--border-soft)'
        }}>
          <div className="row gap-8 mb-8" style={{ alignItems: 'center' }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10,
              background: 'rgba(10, 132, 255, 0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0
            }}>
              <Icon name="calendar" size={16} color="#0A84FF" />
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-mute)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {s.weekTitle}
            </span>
          </div>

          <p style={{ fontSize: 14, lineHeight: 1.5, fontWeight: 600, marginBottom: 12 }}>
            {s.weekSummaryLine
              .replace('{payments}', weekCounts.payments)
              .replace('{ps}', weekCounts.payments === 1 ? '' : 's')
              .replace('{ps2}', weekCounts.cycles === 1 ? '' : 's')
              .replace('{subs}', weekCounts.subs)
              .replace('{ss}', weekCounts.subs === 1 ? '' : 'es')
              .replace('{cycles}', weekCounts.cycles)
              .replace('{cs}', weekCounts.cycles === 1 ? '' : 's')}
          </p>

          {/* Mini chips visuales */}
          <div className="row gap-6 mb-12" style={{ flexWrap: 'wrap' }}>
            <WeekChip color="#FF4D6D" icon="💳" label={`${weekCounts.payments} pagos`} />
            <WeekChip color="#A855F7" icon="🔁" label={`${weekCounts.subs} subs`} />
            <WeekChip color="#0A84FF" icon="🔒" label={`${weekCounts.cycles} cierres`} />
          </div>

          <button
            onClick={() => onOpenSection('calendar')}
            className="row gap-6"
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: 10,
              background: 'var(--bg-elev)',
              color: 'var(--text)',
              fontWeight: 700,
              fontSize: 13,
              justifyContent: 'center',
              border: '1px solid var(--border)'
            }}
          >
            <Icon name="calendar" size={14} />
            <span>{s.viewCalendarBtn}</span>
          </button>
        </div>

        {/* ============ BLOQUE 3 — RIESGO DE LA SEMANA (CLIMA FINANCIERO) ============ */}
        <div className="card mb-20" style={{
          padding: 16,
          borderRadius: 18,
          background: `linear-gradient(135deg, ${riskInfo.color}1A, ${riskInfo.color}08)`,
          border: `1px solid ${riskInfo.color}44`
        }}>
          <div className="row gap-8 mb-8" style={{ alignItems: 'center' }}>
            <div style={{
              width: 32, height: 32, borderRadius: 10,
              background: riskInfo.color + '33',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0
            }}>
              <span style={{ fontSize: 18 }}>
                {riskInfo.level === 'low' ? '☀️' : riskInfo.level === 'medium' ? '⛅' : '⛈'}
              </span>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-mute)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {s.riskTitle}
            </span>
          </div>

          {/* Indicador visual del nivel */}
          <div className="row gap-4 mb-12" style={{ alignItems: 'center' }}>
            <RiskBar active={riskInfo.level !== ''} color="#00E5B0" filled={true} />
            <RiskBar active={riskInfo.level !== 'low' || riskInfo.score === 0} color="#FF9500" filled={riskInfo.level === 'medium' || riskInfo.level === 'high'} />
            <RiskBar active={true} color="#FF4D6D" filled={riskInfo.level === 'high'} />
            <span style={{ fontSize: 12, fontWeight: 800, marginLeft: 6, color: riskInfo.color }}>
              {riskInfo.level === 'low' ? 'BAJO' : riskInfo.level === 'medium' ? 'MEDIO' : 'ALTO'}
            </span>
          </div>

          <p style={{ fontSize: 14, lineHeight: 1.5, fontWeight: 600, marginBottom: 12 }}>
            {riskInfo.msg}
          </p>

          <button
            onClick={() => onOpenSection('calendar')}
            className="row gap-6"
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: 10,
              background: 'var(--bg-elev)',
              color: 'var(--text)',
              fontWeight: 700,
              fontSize: 13,
              justifyContent: 'center',
              border: `1px solid ${riskInfo.color}55`
            }}
          >
            <Icon name="info" size={14} color={riskInfo.color} />
            <span>{s.viewRisks}</span>
          </button>
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

      {/* Overlay: ¿Cómo se calcula? */}
      {showHowCalc && (
        <HowCalcOverlay s={s} onClose={() => setShowHowCalc(false)} />
      )}
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

function WeekChip({ color, icon, label }) {
  return (
    <div className="row gap-4" style={{
      background: color + '20',
      border: `1px solid ${color}44`,
      padding: '5px 10px',
      borderRadius: 999,
      alignItems: 'center'
    }}>
      <span style={{ fontSize: 12 }}>{icon}</span>
      <span style={{ fontSize: 11, fontWeight: 700, color }}>{label}</span>
    </div>
  );
}

function RiskBar({ color, filled }) {
  return (
    <div style={{
      flex: 1,
      height: 6,
      borderRadius: 999,
      background: filled ? color : color + '22',
      boxShadow: filled ? `0 0 8px ${color}66` : 'none',
      transition: 'background .2s'
    }} />
  );
}

function HowCalcOverlay({ s, onClose }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
        zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        backdropFilter: 'blur(6px)'
      }}
      onClick={onClose}
    >
      <div
        className="app-shell"
        style={{
          background: 'var(--bg)',
          maxHeight: '80vh',
          overflowY: 'auto',
          borderRadius: '24px 24px 0 0',
          padding: 20,
          paddingBottom: 32,
          animation: 'fadeUp .3s ease',
          border: '1px solid var(--border)'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ width: 36, height: 5, background: 'var(--border)', borderRadius: 3, margin: '0 auto 16px' }} />

        <div className="spread mb-16">
          <h2 className="h2">{s.howCalcTitle}</h2>
          <button
            onClick={onClose}
            style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--bg-elev)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Icon name="x" size={16} />
          </button>
        </div>

        <div className="col gap-12">
          {[s.howCalcStep1, s.howCalcStep2, s.howCalcStep3].map((step, i) => (
            <div key={i} className="row gap-12" style={{ alignItems: 'flex-start' }}>
              <div style={{
                width: 28, height: 28, borderRadius: 999,
                background: 'var(--pill-grad)',
                color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: 13,
                flexShrink: 0
              }}>{i + 1}</div>
              <p style={{ fontSize: 14, lineHeight: 1.5, flex: 1 }}>{step}</p>
            </div>
          ))}
        </div>

        <div className="card mt-16" style={{
          padding: 12,
          borderRadius: 12,
          background: 'rgba(0, 229, 176, 0.08)',
          border: '1px solid rgba(0, 229, 176, 0.25)'
        }}>
          <div className="row gap-10" style={{ alignItems: 'flex-start' }}>
            <span style={{ fontSize: 18 }}>🛡️</span>
            <p style={{ fontSize: 13, lineHeight: 1.5, flex: 1 }}>{s.howCalcDays}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
