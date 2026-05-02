import { useMemo, useState } from 'react';
import { Icon } from './icons.jsx';
import TopBar from './TopBar.jsx';
import AiInsights from './AiInsights.jsx';
import { fmtMoney, fmtMoneyShort, daysUntil, nextPaymentDate } from '../utils/storage.js';

export default function Dashboard({ user, accounts, transactions, fixedExpenses, goals, household, onOpenMenu, onOpenSection, onSwitchTab, onConnectBank, onNotifications, unreadCount }) {
  const [hideBalance, setHideBalance] = useState(false);

  // Patrimonio neto = corriente + ahorros − deuda crédito
  const patrimony = useMemo(() => {
    const checking = accounts.filter(a => a.type === 'checking').reduce((s, a) => s + a.balance, 0);
    const savings = accounts.filter(a => a.type === 'savings').reduce((s, a) => s + a.balance, 0);
    const debt = accounts.filter(a => a.type === 'credit').reduce((s, a) => s + Math.abs(a.balance), 0);
    return { net: checking + savings - debt, checking, savings, debt };
  }, [accounts]);

  const monthSpending = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return transactions
      .filter(t => new Date(t.date) >= monthStart && t.amount < 0 && t.category !== 'transferencia')
      .reduce((s, t) => s + Math.abs(t.amount), 0);
  }, [transactions]);

  const monthIncome = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return transactions
      .filter(t => new Date(t.date) >= monthStart && t.amount > 0)
      .reduce((s, t) => s + t.amount, 0);
  }, [transactions]);

  const creditCards = useMemo(() => accounts.filter(a => a.type === 'credit'), [accounts]);
  const creditUtilization = useMemo(() => {
    const used = creditCards.reduce((s, c) => s + Math.abs(c.balance), 0);
    const limit = creditCards.reduce((s, c) => s + (c.limit || 0), 0);
    return limit > 0 ? (used / limit) * 100 : 0;
  }, [creditCards]);

  // Cuántos pagos próximos en los próximos 7 días
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

  const totalGoals = useMemo(() => goals?.reduce((s, g) => s + g.current, 0) || 0, [goals]);
  const txThisMonth = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return transactions.filter(t => new Date(t.date) >= start).length;
  }, [transactions]);

  // Tu parte del presupuesto compartido (ejemplo: gastos compartidos × incomeRatio)
  const myBudgetShare = useMemo(() => {
    if (!household?.enabled) return null;
    const me = household.members.find(m => m.isMe);
    const fixedShared = fixedExpenses.filter(f => f.shared).reduce((s, f) => s + f.amount, 0);
    return fixedShared * (me?.incomeRatio || 0.5);
  }, [household, fixedExpenses]);

  // FICO simulado
  const score = useMemo(() => {
    let base = 750;
    if (creditUtilization > 30) base -= (creditUtilization - 30) * 4;
    else if (creditUtilization < 5) base += 30;
    else if (creditUtilization < 10) base += 15;
    return Math.max(580, Math.min(820, Math.round(base)));
  }, [creditUtilization]);

  const utilColor = creditUtilization < 5 ? '#00B589' : creditUtilization < 30 ? '#FF9500' : '#FF3B30';

  // Secciones para el grid
  const sections = [
    {
      id: 'credit',
      type: 'section',
      title: 'Crédito',
      icon: '💳',
      color: 'var(--section-credit)',
      gradient: 'linear-gradient(135deg, #00B589 0%, #007A5C 100%)',
      metric: `${creditUtilization.toFixed(0)}%`,
      sub: `Score ${score}`,
      action: () => onOpenSection('credit')
    },
    {
      id: 'accounts',
      type: 'tab',
      title: 'Cuentas',
      icon: '🏦',
      color: 'var(--section-accounts)',
      gradient: 'linear-gradient(135deg, #5856D6 0%, #3634A3 100%)',
      metric: fmtMoneyShort(patrimony.checking + patrimony.savings),
      sub: 'corriente + ahorros',
      action: () => onSwitchTab('accounts')
    },
    {
      id: 'goals',
      type: 'tab',
      title: 'Metas',
      icon: '🎯',
      color: 'var(--section-goals)',
      gradient: 'linear-gradient(135deg, #FF9500 0%, #B86600 100%)',
      metric: fmtMoneyShort(totalGoals),
      sub: 'ahorrado',
      action: () => onSwitchTab('goals')
    },
    {
      id: 'budget',
      type: 'section',
      title: 'Presupuesto',
      icon: '💰',
      color: 'var(--section-budget)',
      gradient: 'linear-gradient(135deg, #FF2D6F 0%, #B0124A 100%)',
      metric: myBudgetShare ? fmtMoneyShort(myBudgetShare) : '—',
      sub: myBudgetShare ? 'tu parte' : 'configurar',
      action: () => onOpenSection('budget')
    },
    {
      id: 'calendar',
      type: 'section',
      title: 'Calendario',
      icon: '📅',
      color: 'var(--section-calendar)',
      gradient: 'linear-gradient(135deg, #34C759 0%, #1C8B3F 100%)',
      metric: upcomingCount,
      sub: 'esta semana',
      action: () => onOpenSection('calendar')
    },
    {
      id: 'analysis',
      type: 'section',
      title: 'Rendimiento',
      icon: '📈',
      color: 'var(--section-analysis)',
      gradient: 'linear-gradient(135deg, #AF52DE 0%, #6F2D9A 100%)',
      metric: `−12%`,
      sub: 'vs mes pasado',
      action: () => onOpenSection('analysis')
    },
    {
      id: 'transactions',
      type: 'section',
      title: 'Transacciones',
      icon: '🧾',
      color: 'var(--section-accounts)',
      gradient: 'linear-gradient(135deg, #007AFF 0%, #003D80 100%)',
      metric: txThisMonth,
      sub: 'este mes',
      action: () => onOpenSection('transactions')
    },
    {
      id: 'reports',
      type: 'section',
      title: 'Reportes',
      icon: '📊',
      color: 'var(--section-reports)',
      gradient: 'linear-gradient(135deg, #FF9500 0%, #B86600 100%)',
      metric: 'Ver',
      sub: 'mensual y trimestral',
      action: () => onOpenSection('reports')
    }
  ];

  return (
    <div className="screen" style={{ paddingTop: 0 }}>
      <TopBar onMenu={onOpenMenu} onHome={() => window.scrollTo({ top: 0, behavior: 'smooth' })} onNotifications={onNotifications} unreadCount={unreadCount} />

      <div style={{ padding: '8px 0 16px' }}>
        {/* Saludo */}
        <span className="tiny">Hola, {user.name.split(' ')[0]}</span>

        {/* Patrimonio Neto */}
        <div className="row gap-8 mt-4 mb-4">
          <span className="label">Patrimonio Neto</span>
          <button onClick={() => setHideBalance(!hideBalance)} style={{ color: 'var(--text-mute)', display: 'flex' }}>
            <Icon name={hideBalance ? 'eye-off' : 'eye'} size={14} />
          </button>
        </div>
        <h1 className="h1" style={{ fontSize: 42, fontWeight: 700, letterSpacing: '-0.03em' }}>
          {hideBalance ? '$••••••' : fmtMoney(patrimony.net)}
        </h1>
        <span className="tiny" style={{ display: 'block', marginTop: 4 }}>
          Lo que tienes menos lo que debes
        </span>

        {/* Mini stats: ingresos, gastos, ahorros */}
        <div className="card mt-16" style={{
          background: 'var(--bg-elev)',
          border: 'none',
          padding: '14px 16px'
        }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div className="col gap-2">
              <span className="tiny">Ingresos mes</span>
              <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--green)' }}>+{fmtMoneyShort(monthIncome || 2850)}</span>
            </div>
            <div style={{ width: 1, background: 'var(--border)' }}></div>
            <div className="col gap-2">
              <span className="tiny">Gastos mes</span>
              <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--danger)' }}>−{fmtMoneyShort(monthSpending)}</span>
            </div>
            <div style={{ width: 1, background: 'var(--border)' }}></div>
            <div className="col gap-2">
              <span className="tiny">Ahorrado</span>
              <span style={{ fontWeight: 700, fontSize: 16 }}>{fmtMoneyShort(patrimony.savings)}</span>
            </div>
          </div>
        </div>

        {/* Kleo IA */}
        <div style={{ marginTop: 16 }}>
          <AiInsights
            transactions={transactions}
            accounts={accounts}
            goals={goals}
            fixedExpenses={fixedExpenses}
          />
        </div>

        {/* Conectar banco */}
        {onConnectBank && (
          <button
            onClick={onConnectBank}
            className="card pressable mt-16"
            style={{
              width: '100%',
              padding: '14px 16px',
              background: 'var(--bg-elev)',
              border: '1px dashed var(--border)',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: 12
            }}
          >
            <span style={{ fontSize: 24 }}>🏦</span>
            <div className="col gap-2" style={{ flex: 1 }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>Conectar banco</span>
              <span className="tiny">Sincroniza tus cuentas y transacciones</span>
            </div>
            <Icon name="back" size={14} color="var(--text-mute)" stroke={2} style={{ transform: 'rotate(180deg)' }} />
          </button>
        )}

        {/* Resumen rápido */}
        <div className="section-header">
          <span>Tu resumen</span>
        </div>
        <div className="col gap-10">
          {/* Crédito */}
          <button onClick={() => onOpenSection('credit')} className="card pressable" style={{
            background: 'var(--bg-elev)', border: 'none', padding: '14px 16px',
            display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left'
          }}>
            <span style={{ fontSize: 24 }}>💳</span>
            <div className="col gap-2" style={{ flex: 1 }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>Crédito</span>
              <span className="tiny">{creditUtilization.toFixed(0)}% utilización · Score {score}</span>
            </div>
            <span style={{ fontWeight: 700, fontSize: 16, color: utilColor }}>{creditUtilization.toFixed(0)}%</span>
          </button>

          {/* Próximos pagos */}
          <button onClick={() => onOpenSection('calendar')} className="card pressable" style={{
            background: 'var(--bg-elev)', border: 'none', padding: '14px 16px',
            display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left'
          }}>
            <span style={{ fontSize: 24 }}>📅</span>
            <div className="col gap-2" style={{ flex: 1 }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>Próximos pagos</span>
              <span className="tiny">{upcomingCount} esta semana</span>
            </div>
            <span style={{ fontWeight: 700, fontSize: 16 }}>{upcomingCount}</span>
          </button>

          {/* Metas */}
          <button onClick={() => onSwitchTab('goals')} className="card pressable" style={{
            background: 'var(--bg-elev)', border: 'none', padding: '14px 16px',
            display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left'
          }}>
            <span style={{ fontSize: 24 }}>🎯</span>
            <div className="col gap-2" style={{ flex: 1 }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>Metas</span>
              <span className="tiny">{fmtMoneyShort(totalGoals)} ahorrado</span>
            </div>
            <span style={{ fontWeight: 700, fontSize: 16 }}>{fmtMoneyShort(totalGoals)}</span>
          </button>

          {/* Transacciones */}
          <button onClick={() => onOpenSection('transactions')} className="card pressable" style={{
            background: 'var(--bg-elev)', border: 'none', padding: '14px 16px',
            display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left'
          }}>
            <span style={{ fontSize: 24 }}>🧾</span>
            <div className="col gap-2" style={{ flex: 1 }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>Movimientos</span>
              <span className="tiny">{txThisMonth} este mes</span>
            </div>
            <span style={{ fontWeight: 700, fontSize: 16 }}>{txThisMonth}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
