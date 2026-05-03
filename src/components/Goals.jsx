import { useMemo, useState } from 'react';
import { Icon } from './icons.jsx';
import TopBar from './TopBar.jsx';
import BankLogo from './BankLogo.jsx';
import { GOAL_TYPES } from '../data/sampleData.js';
import { fmtMoney, fmtMoneyShort } from '../utils/storage.js';
import { useI18n } from '../i18n/index.jsx';

const FREQ_DAYS = { weekly: 7, biweekly: 14, semimonthly: 15, monthly: 30 };

/** Formatea un valor numérico a "1,234.56" */
function formatMoneyInput(value) {
  if (value === '' || value === null || value === undefined) return '';
  const cleaned = String(value).replace(/,/g, '').replace(/[^0-9.]/g, '');
  const num = parseFloat(cleaned);
  if (isNaN(num)) return '';
  return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Convierte "1,234.56" a 1234.56 */
function parseMoneyInput(value) {
  if (value === '' || value === null || value === undefined) return 0;
  return parseFloat(String(value).replace(/,/g, '').replace(/[^0-9.]/g, '')) || 0;
}

/**
 * Calcula el progreso "real" de una meta:
 *  - Si tiene cuenta vinculada → suma los depósitos (transacciones positivas) en esa cuenta desde startedAt
 *  - Si no, usa goal.current
 * Devuelve también el historial de depósitos para mostrar en detalle.
 */
function computeProgress(goal, transactions) {
  if (!goal.accountId) {
    return { current: goal.current || 0, deposits: [] };
  }
  const start = goal.startedAt ? new Date(goal.startedAt) : new Date(0);
  const deposits = transactions
    .filter(t => t.accountId === goal.accountId && t.amount > 0 && new Date(t.date) >= start)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  const sum = deposits.reduce((acc, t) => acc + t.amount, 0);
  return { current: Math.min(goal.target, sum), deposits };
}

/** Devuelve la fecha del próximo depósito programado y si está atrasado. */
function nextScheduledDate(goal) {
  if (!goal.schedule?.frequency || !goal.schedule?.nextDate) return null;
  const next = new Date(goal.schedule.nextDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  next.setHours(0, 0, 0, 0);
  const diff = Math.round((next - today) / (1000 * 60 * 60 * 24));
  return { date: next, daysFromNow: diff };
}

export default function Goals({
  goals, accounts = [], transactions = [], fixedExpenses,
  onAddSavings, onCreate, onUpdate, onDelete,
  onHome, onMenu
}) {
  const { strings: s } = useI18n();
  const [showCreate, setShowCreate] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);

  // Cuentas elegibles para vincular (ahorros / metas)
  const linkableAccounts = useMemo(
    () => accounts.filter(a => a.type === 'savings' || a.type === 'checking'),
    [accounts]
  );

  // Snapshot con progreso calculado para cada meta
  const goalsWithProgress = useMemo(
    () => goals.map(g => ({ ...g, progress: computeProgress(g, transactions) })),
    [goals, transactions]
  );

  const totalSaved = useMemo(
    () => goalsWithProgress.reduce((s, g) => s + g.progress.current, 0),
    [goalsWithProgress]
  );
  const totalTarget = useMemo(() => goals.reduce((s, g) => s + g.target, 0), [goals]);

  const monthlyFixed = fixedExpenses?.reduce((s, f) => s + f.amount, 0) || 0;
  const recommendedEmergency = monthlyFixed * 6;

  const calcSuggestion = (g, currentNow) => {
    const today = new Date();
    const deadline = new Date(g.deadline);
    const weeks = Math.max(1, Math.ceil((deadline - today) / (1000 * 60 * 60 * 24 * 7)));
    const remaining = Math.max(0, g.target - currentNow);
    return { weekly: remaining / weeks, weeks };
  };

  if (showCreate || editingGoal) {
    return (
      <GoalForm
        s={s}
        goal={editingGoal}
        accounts={linkableAccounts}
        recommendedEmergency={recommendedEmergency}
        onCancel={() => { setShowCreate(false); setEditingGoal(null); }}
        onSubmit={(data) => {
          if (editingGoal) onUpdate(editingGoal.id, data);
          else onCreate(data);
          setShowCreate(false);
          setEditingGoal(null);
        }}
      />
    );
  }

  return (
    <div className="screen" style={{ paddingTop: 0 }}>
      <TopBar onHome={onHome} onMenu={onMenu} title={s.goals} />
      <div className="spread" style={{ padding: '12px 0' }}>
        <span style={{ fontSize: 13, color: 'var(--text-mute)' }}>{s.yourSavingsGoals}</span>
        <button
          style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-elev)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setShowCreate(true)}
        >
          <Icon name="plus" size={18} />
        </button>
      </div>

      <div className="card mb-20" style={{
        background: 'linear-gradient(135deg, rgba(0,229,176,0.08), rgba(0,132,255,0.08))',
        borderColor: 'rgba(0,229,176,0.2)'
      }}>
        <span className="label">{s.totalSaved}</span>
        <h1 className="h1 mt-8" style={{ fontSize: 36 }}>{fmtMoney(totalSaved)}</h1>
        <span className="tiny">{s.ofGoals.replace('{amount}', fmtMoney(totalTarget))}</span>
        <div className="progress-track mt-12">
          <div className="progress-fill" style={{ width: totalTarget > 0 ? `${Math.min(100, (totalSaved / totalTarget) * 100)}%` : '0%' }}></div>
        </div>
      </div>

      <div className="col gap-16">
        {goalsWithProgress.map(g => (
          <GoalCard
            key={g.id}
            goal={g}
            accounts={accounts}
            s={s}
            calcSuggestion={calcSuggestion}
            onEdit={() => setEditingGoal(g)}
            onUpdate={(updates) => onUpdate(g.id, updates)}
            onDelete={() => {
              if (window.confirm(s.deleteGoalConfirm.replace('{name}', g.name))) {
                onDelete(g.id);
              }
            }}
          />
        ))}
      </div>

      {goals.length === 0 && (
        <div className="card col" style={{ alignItems: 'center', padding: 40, gap: 12 }}>
          <Icon name="target" size={48} color="var(--text-dim)" />
          <span style={{ fontWeight: 600 }}>{s.noGoalsYet}</span>
          <span className="tiny" style={{ textAlign: 'center' }}>{s.noGoalsDesc}</span>
          <button className="btn-primary mt-16" onClick={() => setShowCreate(true)}>
            {s.createGoal}
          </button>
        </div>
      )}
    </div>
  );
}

/* =============================================================
 *  Goal Card — versión rica con cuenta vinculada y plan
 * ============================================================= */
function GoalCard({ goal: g, accounts, s, calcSuggestion, onEdit, onDelete, onUpdate }) {
  const [showMenu, setShowMenu] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const currentNow = g.progress.current;
  const pct = g.target > 0 ? (currentNow / g.target) * 100 : 0;
  const sug = calcSuggestion(g, currentNow);
  const remaining = Math.max(0, g.target - currentNow);
  const goalType = GOAL_TYPES[g.type] || GOAL_TYPES.custom;
  const linkedAccount = accounts.find(a => a.id === g.accountId);

  // Estado del plan: a tiempo / atrasado / adelantado / completado
  const scheduleInfo = nextScheduledDate(g);
  let planStatus = null;
  if (currentNow >= g.target) {
    planStatus = { kind: 'done', text: s.goalReached, color: 'var(--green)' };
  } else if (g.schedule?.amount && scheduleInfo) {
    if (scheduleInfo.daysFromNow < 0) {
      // Atrasado: cuántos depósitos perdió
      const periodDays = FREQ_DAYS[g.schedule.frequency] || 7;
      const missed = Math.floor(Math.abs(scheduleInfo.daysFromNow) / periodDays) + 1;
      const expected = (g.schedule.amount * missed);
      const newAmount = sug.weekly *
        (g.schedule.frequency === 'monthly' ? 4 : g.schedule.frequency === 'biweekly' ? 2 : 1);
      planStatus = {
        kind: 'behind',
        text: s.behindSchedule.replace('{days}', Math.abs(scheduleInfo.daysFromNow)).replace('{s}', Math.abs(scheduleInfo.daysFromNow) === 1 ? '' : 's'),
        recalc: s.behindRecalc
          .replace('{amount}', fmtMoney(newAmount))
          .replace('{old}', fmtMoney(g.schedule.amount))
          .replace(/\{freq\}/g, freqLabel(g.schedule.frequency, s)),
        color: 'var(--orange)'
      };
    } else {
      planStatus = { kind: 'ontrack', text: s.onTrack, color: 'var(--green)' };
    }
  }

  // Detección de "vas adelantado": ¿ha aportado más de lo planeado?
  let overDeposit = null;
  if (g.schedule?.amount && g.startedAt && currentNow < g.target) {
    const periodDays = FREQ_DAYS[g.schedule.frequency] || 7;
    const start = new Date(g.startedAt);
    const today = new Date();
    const daysElapsed = Math.max(0, (today - start) / (1000 * 60 * 60 * 24));
    const periodsElapsed = Math.max(1, Math.floor(daysElapsed / periodDays));
    const expectedByNow = periodsElapsed * g.schedule.amount;
    if (currentNow > expectedByNow * 1.15) {
      // Cliente va adelantado por al menos 15%
      const extra = currentNow - expectedByNow;
      const deadline = new Date(g.deadline);
      const remainingPeriods = Math.max(1, Math.ceil((deadline - today) / (1000 * 60 * 60 * 24 * periodDays)));
      const newAmount = Math.max(5, Math.round((g.target - currentNow) / remainingPeriods));
      const periodsNeeded = Math.ceil((g.target - currentNow) / g.schedule.amount);
      const newDeadlineMs = today.getTime() + periodsNeeded * periodDays * 86400000;
      const newDeadline = new Date(newDeadlineMs);
      overDeposit = {
        extra,
        newAmount,
        newDeadline,
        applyLower: () => onUpdate({
          schedule: { ...g.schedule, amount: newAmount }
        }),
        applyFaster: () => onUpdate({
          deadline: newDeadline.toISOString().slice(0, 10)
        })
      };
    }
  }

  return (
    <div className="card" style={{ position: 'relative', overflow: 'visible' }}>
      {/* Top: icono + nombre + 3 puntos */}
      <div className="spread">
        <div className="row gap-12">
          <div className="cat-icon" style={{ background: g.color + '22', fontSize: 22 }}>
            {g.icon}
          </div>
          <div className="col gap-4">
            <span style={{ fontWeight: 700, fontSize: 16 }}>{g.name}</span>
            <span className="tiny" style={{
              background: g.color + '22',
              color: g.color,
              padding: '2px 8px',
              borderRadius: 6,
              alignSelf: 'flex-start',
              fontWeight: 600
            }}>
              {goalType.label}
            </span>
          </div>
        </div>
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'var(--bg-elev)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            <Icon name="more-horizontal" size={16} />
          </button>
          {showMenu && (
            <>
              <div
                onClick={() => setShowMenu(false)}
                style={{ position: 'fixed', inset: 0, zIndex: 10 }}
              />
              <div style={{
                position: 'absolute',
                top: 38, right: 0,
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: 4,
                boxShadow: 'var(--shadow-md)',
                zIndex: 11,
                minWidth: 160
              }}>
                <button
                  onClick={() => { setShowMenu(false); onEdit(); }}
                  className="row gap-8"
                  style={{
                    width: '100%', padding: '10px 12px', textAlign: 'left',
                    fontSize: 14, fontWeight: 500, borderRadius: 8
                  }}
                >
                  <Icon name="edit" size={14} />
                  <span>{s.editGoal}</span>
                </button>
                <button
                  onClick={() => { setShowMenu(false); onDelete(); }}
                  className="row gap-8"
                  style={{
                    width: '100%', padding: '10px 12px', textAlign: 'left',
                    fontSize: 14, fontWeight: 500, borderRadius: 8,
                    color: 'var(--danger)'
                  }}
                >
                  <Icon name="x" size={14} color="var(--danger)" />
                  <span>{s.deleteGoal}</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {g.notes && (
        <p className="tiny mt-8" style={{ lineHeight: 1.5 }}>📝 {g.notes}</p>
      )}

      {/* Progreso */}
      <div className="progress-track mt-16">
        <div
          className="progress-fill"
          style={{
            width: `${Math.min(100, pct)}%`,
            background: `linear-gradient(135deg, ${g.color}, var(--blue))`
          }}
        ></div>
      </div>

      <div className="spread mt-12">
        <span style={{ fontSize: 14 }}>
          <span style={{ fontWeight: 700 }}>{fmtMoney(currentNow)}</span>
          <span className="tiny"> / {fmtMoney(g.target)}</span>
        </span>
        <span style={{ fontWeight: 700, fontSize: 16 }}>{pct.toFixed(0)}%</span>
      </div>
      {remaining > 0 && (
        <span className="tiny" style={{ display: 'block', marginTop: 4 }}>
          {s.remaining.replace('{amount}', fmtMoney(remaining))}
        </span>
      )}

      {/* Cuenta vinculada */}
      {linkedAccount && (
        <div className="row gap-10 mt-12" style={{
          background: 'var(--bg-elev)',
          padding: 10,
          borderRadius: 10,
          alignItems: 'center'
        }}>
          <BankLogo institution={linkedAccount.institution || linkedAccount.name} size={28} radius={8} />
          <div className="col gap-2" style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-mute)' }}>{s.linkedAccount}</span>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{linkedAccount.label || linkedAccount.name} ••{linkedAccount.last4}</span>
          </div>
          <span style={{ fontSize: 11, color: 'var(--green)', fontWeight: 700 }}>● Auto</span>
        </div>
      )}

      {/* Plan / programa */}
      {g.schedule?.amount && scheduleInfo && (
        <div className="row gap-10 mt-8" style={{
          background: planStatus?.kind === 'behind' ? 'rgba(255, 149, 0, 0.1)' : 'var(--bg-elev)',
          border: planStatus?.kind === 'behind' ? '1px solid rgba(255, 149, 0, 0.3)' : 'none',
          padding: 10,
          borderRadius: 10
        }}>
          <span style={{ fontSize: 18 }}>📅</span>
          <div className="col gap-2" style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-mute)' }}>{s.nextDeposit}</span>
            <span style={{ fontSize: 13, fontWeight: 600 }}>
              {fmtMoney(g.schedule.amount)} · {freqLabel(g.schedule.frequency, s).toLowerCase()}
            </span>
            <span className="tiny" style={{ fontSize: 11 }}>
              {scheduleInfo.daysFromNow === 0 ? s.duesToday :
               scheduleInfo.daysFromNow === 1 ? s.tomorrow :
               scheduleInfo.daysFromNow > 0 ? s.inNDays.replace('{n}', scheduleInfo.daysFromNow) :
               `${Math.abs(scheduleInfo.daysFromNow)}d ${planStatus?.kind === 'behind' ? 'atrasado' : ''}`}
            </span>
          </div>
        </div>
      )}

      {/* Estado del plan */}
      {planStatus && (
        <div className="ai-alert mt-12">
          <div className="ai-icon">
            <Icon name="sparkle" size={14} color="#0D0D14" />
          </div>
          <div className="col gap-4" style={{ flex: 1 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: planStatus.color }}>
              {planStatus.text}
            </span>
            {planStatus.recalc && (
              <span style={{ fontSize: 12, color: 'var(--text-mute)', lineHeight: 1.4 }}>
                {planStatus.recalc}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Vas adelantado · ofrecer dos opciones */}
      {overDeposit && (
        <div className="card mt-12" style={{
          background: 'linear-gradient(135deg, rgba(0, 229, 176, 0.12), rgba(168, 85, 247, 0.12))',
          border: '1px solid rgba(0, 229, 176, 0.3)',
          padding: 14,
          borderRadius: 14
        }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--green)' }}>
            {s.overDepositTitle}
          </span>
          <p className="tiny mt-4" style={{ lineHeight: 1.5 }}>
            {s.overDepositDesc.replace('{extra}', fmtMoney(overDeposit.extra))}
          </p>
          <div className="col gap-8 mt-12">
            <button
              onClick={overDeposit.applyLower}
              className="row gap-10"
              style={{
                width: '100%', padding: 12,
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                textAlign: 'left'
              }}
            >
              <span style={{ fontSize: 18 }}>⬇</span>
              <div className="col gap-2" style={{ flex: 1 }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{s.optionLowerAmount}</span>
                <span className="tiny" style={{ fontSize: 11, lineHeight: 1.4 }}>
                  {s.optionLowerDesc
                    .replace('{amount}', fmtMoney(overDeposit.newAmount))
                    .replace('{freq}', freqLabel(g.schedule.frequency, s).toLowerCase())}
                </span>
              </div>
              <Icon name="back" size={14} stroke={2.5} style={{ transform: 'rotate(180deg)' }} />
            </button>
            <button
              onClick={overDeposit.applyFaster}
              className="row gap-10"
              style={{
                width: '100%', padding: 12,
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                textAlign: 'left'
              }}
            >
              <span style={{ fontSize: 18 }}>🚀</span>
              <div className="col gap-2" style={{ flex: 1 }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{s.optionFasterDeadline}</span>
                <span className="tiny" style={{ fontSize: 11, lineHeight: 1.4 }}>
                  {s.optionFasterDesc.replace('{date}',
                    overDeposit.newDeadline.toLocaleDateString('es-PR', { day: 'numeric', month: 'long', year: 'numeric' })
                  )}
                </span>
              </div>
              <Icon name="back" size={14} stroke={2.5} style={{ transform: 'rotate(180deg)' }} />
            </button>
          </div>
        </div>
      )}

      {/* Sugerencia de ahorro semanal (si no tiene plan) */}
      {remaining > 0 && !g.schedule?.amount && (
        <div className="ai-alert mt-12">
          <div className="ai-icon">
            <Icon name="sparkle" size={14} color="#0D0D14" />
          </div>
          <div className="col gap-4" style={{ flex: 1 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>
              {s.savePerWeek.replace('{amount}', fmtMoney(sug.weekly))}
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-mute)' }}>
              {s.achieveInWeeks.replace('{n}', sug.weeks).replace('{s}', sug.weeks > 1 ? 's' : '')}
            </span>
          </div>
        </div>
      )}

      {/* Historial de depósitos (toggle) */}
      {linkedAccount && (
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="row gap-6 mt-12"
          style={{
            width: '100%',
            padding: '10px 12px',
            background: 'var(--bg-elev)',
            borderRadius: 10,
            fontSize: 12,
            fontWeight: 600,
            justifyContent: 'space-between'
          }}
        >
          <span>{s.depositHistory} · {g.progress.deposits.length}</span>
          <Icon name="back" size={12} stroke={2.5} style={{ transform: showHistory ? 'rotate(90deg)' : 'rotate(-90deg)' }} />
        </button>
      )}

      {showHistory && (
        <div className="col gap-6 mt-8">
          {g.progress.deposits.length === 0 ? (
            <p className="tiny" style={{ textAlign: 'center', padding: 12 }}>{s.noDepositsYet}</p>
          ) : (
            g.progress.deposits.slice(0, 8).map(d => (
              <div key={d.id} className="row gap-10 spread" style={{
                background: 'var(--bg-elev)',
                padding: 10,
                borderRadius: 8
              }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{d.merchant}</span>
                <div className="col" style={{ alignItems: 'flex-end' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)' }}>+{fmtMoney(d.amount)}</span>
                  <span className="tiny" style={{ fontSize: 10 }}>
                    {new Date(d.date).toLocaleDateString('es-PR', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

    </div>
  );
}

function freqLabel(freq, s) {
  if (freq === 'weekly') return s.freqWeekly;
  if (freq === 'biweekly') return s.freqBiweekly;
  if (freq === 'semimonthly') return s.freqSemimonthly;
  if (freq === 'monthly') return s.freqMonthly;
  return '';
}

/* =============================================================
 *  GoalForm — usado tanto para crear como para editar
 * ============================================================= */
function GoalForm({ s, goal, accounts, recommendedEmergency, onCancel, onSubmit }) {
  const isEdit = !!goal;
  const [step, setStep] = useState(isEdit ? 2 : 1);
  const [type, setType] = useState(goal?.type || null);
  const [name, setName] = useState(goal?.name || '');
  const [target, setTarget] = useState(goal?.target ? formatMoneyInput(goal.target) : '');
  const [deadline, setDeadline] = useState(goal?.deadline || '');
  const [notes, setNotes] = useState(goal?.notes || '');
  const [accountId, setAccountId] = useState(goal?.accountId || '');
  const [scheduleAmount, setScheduleAmount] = useState(
    goal?.schedule?.amount ? formatMoneyInput(goal.schedule.amount) : ''
  );
  const [scheduleFreq, setScheduleFreq] = useState(goal?.schedule?.frequency || 'biweekly');
  const [scheduleNext, setScheduleNext] = useState(
    goal?.schedule?.nextDate || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
  );
  const [hasSchedule, setHasSchedule] = useState(!!goal?.schedule?.amount);
  const [notifications, setNotifications] = useState(goal?.notifications || {
    reminder: true, progress: true, milestones: true
  });
  const [customNotifs, setCustomNotifs] = useState(false);

  const selectType = (t) => {
    setType(t);
    const tpl = GOAL_TYPES[t];
    setName(tpl.label);
    if (t === 'emergency') setTarget(String(recommendedEmergency.toFixed(0)));
    setStep(2);
  };

  const submit = () => {
    const tpl = GOAL_TYPES[type];
    const data = {
      name,
      type,
      target: parseMoneyInput(target),
      deadline,
      icon: tpl?.icon || '🎯',
      color: tpl?.color || '#A855F7',
      notes,
      accountId: accountId || null,
      schedule: hasSchedule && parseMoneyInput(scheduleAmount) > 0
        ? { amount: parseMoneyInput(scheduleAmount), frequency: scheduleFreq, nextDate: scheduleNext }
        : null,
      notifications
    };
    if (!isEdit) data.current = 0;
    onSubmit(data);
  };

  return (
    <div className="screen">
      <button className="back-btn" onClick={step === 1 ? onCancel : (isEdit ? onCancel : () => setStep(1))}>
        <Icon name="back" size={20} />
      </button>

      {step === 1 && !isEdit && (
        <>
          <h2 className="h2 mb-8">{s.whatGoalType}</h2>
          <p className="label mb-20">{s.chooseTypeAi}</p>
          <div className="col gap-12">
            {Object.entries(GOAL_TYPES).map(([key, t]) => (
              <button
                key={key}
                className="card row gap-12"
                style={{ textAlign: 'left', padding: 16 }}
                onClick={() => selectType(key)}
              >
                <div className="cat-icon" style={{ background: t.color + '22', fontSize: 22 }}>{t.icon}</div>
                <div className="col gap-4" style={{ flex: 1 }}>
                  <span style={{ fontWeight: 600, fontSize: 15 }}>{t.label}</span>
                  <span className="tiny">
                    {key === 'emergency' && s.recommended6months.replace('{amount}', fmtMoney(recommendedEmergency))}
                    {key === 'savings' && s.save20pct}
                    {key === 'travel' && s.travelItems}
                    {key === 'car' && s.carItems}
                    {key === 'home' && s.homeItems}
                    {key === 'education' && s.educationItems}
                    {key === 'custom' && s.customGoal}
                  </span>
                </div>
                <Icon name="back" size={18} color="var(--text-mute)" stroke={2} />
              </button>
            ))}
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <h2 className="h2 mb-8">{isEdit ? s.editGoal : s.goalDetails}</h2>
          {type && <p className="label mb-12">{GOAL_TYPES[type]?.label}</p>}

          {/* Cómo funciona */}
          {!isEdit && (
            <div className="card mb-16" style={{
              background: 'rgba(168, 85, 247, 0.08)',
              border: '1px solid rgba(168, 85, 247, 0.2)',
              padding: 12,
              borderRadius: 12
            }}>
              <div className="row gap-10" style={{ alignItems: 'flex-start' }}>
                <span style={{ fontSize: 22 }}>💡</span>
                <div className="col gap-2" style={{ flex: 1 }}>
                  <span style={{ fontWeight: 700, fontSize: 13 }}>{s.goalsHowTitle}</span>
                  <span className="tiny" style={{ lineHeight: 1.5 }}>{s.goalsHowDesc}</span>
                </div>
              </div>
            </div>
          )}

          <div className="col gap-16">
            <div className="col gap-6">
              <span className="label">{s.goalName}</span>
              <input className="input-field" value={name} onChange={e => setName(e.target.value)} />
            </div>

            <div className="col gap-6">
              <span className="label">{s.targetAmount}</span>
              <div className="row" style={{ background: 'var(--bg-input)', borderRadius: 14, border: '1px solid var(--border)', padding: '0 16px', height: 54 }}>
                <span style={{ fontSize: 18, color: 'var(--text-mute)' }}>$</span>
                <input
                  style={{ background: 'transparent', border: 'none', height: 54, fontSize: 18, fontWeight: 600, padding: '0 8px', flex: 1, outline: 'none', color: 'inherit' }}
                  value={target}
                  onChange={e => setTarget(e.target.value.replace(/[^0-9.,]/g, ''))}
                  onBlur={e => {
                    const formatted = formatMoneyInput(e.target.value);
                    if (formatted) setTarget(formatted);
                  }}
                  inputMode="decimal"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="col gap-6">
              <span className="label">{s.deadline}</span>
              <input
                type="date"
                className="input-field"
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
                style={{ colorScheme: 'dark' }}
              />
            </div>

            {/* Preview en vivo: cuánto tendrías que ahorrar (math correcto: ceil de cuotas) */}
            {target && deadline && parseMoneyInput(target) > 0 && (() => {
              const start = scheduleNext ? new Date(scheduleNext) : new Date();
              const d = new Date(deadline);
              const days = Math.max(1, (d - start) / (1000 * 60 * 60 * 24));
              const remaining = Math.max(0, parseMoneyInput(target) - (goal?.current || 0));
              // Para que cuadre: amount = remaining / floor(days/periodDays)
              // Esto asegura que con N cuotas ENTERAS de ese amount llegamos en o antes de deadline
              const calc = (periodDays) => {
                const periods = Math.max(1, Math.floor(days / periodDays));
                const amount = remaining / periods;
                // Redondear hacia arriba al .01 para evitar centavos
                return Math.ceil(amount * 100) / 100;
              };
              const weekly = calc(7);
              const biweekly = calc(14);
              const semimonthly = calc(15);
              const monthly = calc(30);

              const setSchedule = (freq, amount) => {
                setHasSchedule(true);
                setScheduleFreq(freq);
                setScheduleAmount(formatMoneyInput(amount));
              };

              const FreqTile = ({ freqKey, amount, label, hint }) => {
                const sel = hasSchedule && scheduleFreq === freqKey;
                return (
                  <button
                    onClick={() => setSchedule(freqKey, amount)}
                    style={{
                      flex: 1, padding: '10px 6px',
                      borderRadius: 12,
                      background: sel ? 'var(--pill-grad)' : 'var(--bg-elev)',
                      color: sel ? '#fff' : 'var(--text)',
                      border: 'none',
                      display: 'flex', flexDirection: 'column', gap: 2,
                      alignItems: 'center',
                      minWidth: 0
                    }}
                  >
                    <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.02em' }}>
                      ${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 700, opacity: sel ? 0.95 : 0.85, lineHeight: 1.1 }}>
                      {label}
                    </span>
                    {hint && (
                      <span style={{ fontSize: 9, fontWeight: 500, opacity: sel ? 0.85 : 0.55, lineHeight: 1.1 }}>
                        {hint}
                      </span>
                    )}
                  </button>
                );
              };
              return (
                <div className="card" style={{
                  background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.10), rgba(0, 229, 176, 0.08))',
                  border: '1px solid rgba(168, 85, 247, 0.25)',
                  padding: 14,
                  borderRadius: 14
                }}>
                  <div className="row gap-8 mb-10" style={{ alignItems: 'center' }}>
                    <Icon name="sparkle" size={16} color="#A855F7" />
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{s.toReachGoal}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <FreqTile freqKey="weekly" amount={weekly} label={s.freqWeekly} />
                    <FreqTile freqKey="biweekly" amount={biweekly} label={s.freqBiweekly} hint={s.freqBiweeklyHint} />
                    <FreqTile freqKey="semimonthly" amount={semimonthly} label={s.freqSemimonthly} hint={s.freqSemimonthlyHint} />
                    <FreqTile freqKey="monthly" amount={monthly} label={s.freqMonthly} />
                  </div>
                  <span className="tiny mt-8" style={{ display: 'block', fontSize: 11, lineHeight: 1.4 }}>
                    💡 {s.goalRecommendHint}
                  </span>
                </div>
              );
            })()}

            {/* Vincular cuenta */}
            <div className="col gap-6">
              <span className="label">{s.linkedAccount}</span>
              <span className="tiny" style={{ marginTop: -4, lineHeight: 1.4 }}>{s.linkAccountHint}</span>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                <button
                  onClick={() => setAccountId('')}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 999,
                    background: !accountId ? 'var(--pill-grad)' : 'var(--bg-elev)',
                    color: !accountId ? '#fff' : 'var(--text)',
                    fontSize: 12, fontWeight: 600,
                    border: 'none'
                  }}
                >
                  {s.noAccountLinked}
                </button>
                {accounts.map(a => {
                  const sel = accountId === a.id;
                  return (
                    <button
                      key={a.id}
                      onClick={() => setAccountId(a.id)}
                      className="row gap-6"
                      style={{
                        padding: '6px 10px 6px 6px',
                        borderRadius: 999,
                        background: sel ? 'var(--pill-grad)' : 'var(--bg-elev)',
                        color: sel ? '#fff' : 'var(--text)',
                        border: 'none',
                        alignItems: 'center'
                      }}
                    >
                      <BankLogo institution={a.institution || a.name} size={20} radius={5} />
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{a.label || a.name} ••{a.last4}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Plan de depósitos */}
            <div className="col gap-6">
              <div className="spread">
                <span className="label">{s.depositSchedule}</span>
                <button
                  onClick={() => setHasSchedule(!hasSchedule)}
                  style={{
                    width: 44, height: 26, borderRadius: 999,
                    background: hasSchedule ? 'var(--green)' : 'var(--bg-elev)',
                    position: 'relative',
                    transition: 'background .2s'
                  }}
                >
                  <div style={{
                    position: 'absolute', top: 3, left: hasSchedule ? 21 : 3,
                    width: 20, height: 20, borderRadius: '50%', background: '#fff',
                    transition: 'left .2s'
                  }}></div>
                </button>
              </div>
              <span className="tiny" style={{ marginTop: -4, lineHeight: 1.4 }}>{s.depositScheduleHint}</span>

              {hasSchedule && (() => {
                // Cálculo dinámico de fecha de término según monto + frecuencia
                const periodDays = FREQ_DAYS[scheduleFreq] || 7;
                const amt = parseMoneyInput(scheduleAmount);
                const remaining = Math.max(0, parseMoneyInput(target) - (goal?.current || 0));
                let endDate = null;
                let onTime = true;
                if (amt > 0 && remaining > 0) {
                  const periodsNeeded = Math.ceil(remaining / amt);
                  const startMs = scheduleNext ? new Date(scheduleNext).getTime() : Date.now();
                  // El último depósito completa la meta — endDate = start + (periodsNeeded - 1) * periodDays
                  endDate = new Date(startMs + Math.max(0, periodsNeeded - 1) * periodDays * 86400000);
                  if (deadline) {
                    const ddl = new Date(deadline);
                    ddl.setHours(23, 59, 59, 999);
                    onTime = endDate <= ddl;
                  }
                }
                const fmtDate = (d) => d.toLocaleDateString('es-PR', { day: 'numeric', month: 'long', year: 'numeric' });
                return (
                  <div className="col gap-10 mt-8">
                    {/* Frecuencia con sub-hint */}
                    <div className="col gap-4">
                      <span className="tiny" style={{ fontWeight: 600 }}>{s.scheduleFrequency}</span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {[
                          { k: 'weekly', label: s.freqWeekly, hint: '7 días' },
                          { k: 'biweekly', label: s.freqBiweekly, hint: s.freqBiweeklyHint },
                          { k: 'semimonthly', label: s.freqSemimonthly, hint: s.freqSemimonthlyHint },
                          { k: 'monthly', label: s.freqMonthly, hint: '30 días' }
                        ].map(opt => (
                          <button
                            key={opt.k}
                            onClick={() => setScheduleFreq(opt.k)}
                            style={{
                              flex: 1, padding: '10px 4px',
                              borderRadius: 10,
                              background: scheduleFreq === opt.k ? 'var(--pill-grad)' : 'var(--bg-elev)',
                              color: scheduleFreq === opt.k ? '#fff' : 'var(--text)',
                              border: 'none',
                              fontSize: 12, fontWeight: 700,
                              display: 'flex', flexDirection: 'column', gap: 1, lineHeight: 1.1
                            }}
                          >
                            <span>{opt.label}</span>
                            <span style={{ fontSize: 9, fontWeight: 500, opacity: scheduleFreq === opt.k ? 0.85 : 0.55 }}>
                              {opt.hint}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Empezando desde */}
                    <div className="col gap-4">
                      <span className="tiny" style={{ fontWeight: 600 }}>{s.startingFrom}</span>
                      <input
                        type="date"
                        className="input-field"
                        value={scheduleNext}
                        onChange={e => setScheduleNext(e.target.value)}
                        style={{ colorScheme: 'dark' }}
                      />
                    </div>

                    {/* Cantidad manual con auto-format */}
                    <div className="col gap-4">
                      <span className="tiny" style={{ fontWeight: 600 }}>{s.customAmount}</span>
                      <div className="row" style={{ background: 'var(--bg-input)', borderRadius: 12, border: '1px solid var(--border)', padding: '0 14px', height: 46 }}>
                        <span style={{ fontSize: 16, color: 'var(--text-mute)' }}>$</span>
                        <input
                          style={{ background: 'transparent', border: 'none', height: 46, fontSize: 16, fontWeight: 600, padding: '0 6px', flex: 1, outline: 'none', color: 'inherit' }}
                          value={scheduleAmount}
                          onChange={e => setScheduleAmount(e.target.value.replace(/[^0-9.,]/g, ''))}
                          onBlur={e => {
                            const formatted = formatMoneyInput(e.target.value);
                            if (formatted) setScheduleAmount(formatted);
                          }}
                          inputMode="decimal"
                          placeholder="50.00"
                        />
                      </div>
                    </div>

                    {/* Preview de fecha de término */}
                    {endDate && (
                      <div className="card" style={{
                        padding: 12, borderRadius: 12,
                        background: onTime ? 'rgba(0, 229, 176, 0.1)' : 'rgba(255, 149, 0, 0.1)',
                        border: `1px solid ${onTime ? 'rgba(0, 229, 176, 0.3)' : 'rgba(255, 149, 0, 0.3)'}`
                      }}>
                        <span style={{
                          fontSize: 13, fontWeight: 700,
                          color: onTime ? 'var(--green)' : 'var(--orange)',
                          lineHeight: 1.4
                        }}>
                          {(onTime ? s.willReachOn : s.wontReachOn).replace('{date}', fmtDate(endDate))}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            <div className="col gap-6">
              <span className="label">{s.notesOptional}</span>
              <input className="input-field" value={notes} onChange={e => setNotes(e.target.value)} placeholder={s.notesPlaceholder} />
            </div>

            {/* Notificaciones */}
            <div className="col gap-8">
              <div className="spread">
                <span className="label">🔔 {s.notifsTitle}</span>
                <button
                  onClick={() => setCustomNotifs(!customNotifs)}
                  className="tiny"
                  style={{ color: 'var(--blue)', fontWeight: 700 }}
                >
                  {customNotifs ? '◂ ' + s.recommended : s.customizeNotifs + ' ▸'}
                </button>
              </div>
              <span className="tiny" style={{ marginTop: -4, lineHeight: 1.4 }}>{s.notifsHint}</span>

              {!customNotifs ? (
                <div className="card" style={{
                  padding: 12, borderRadius: 12,
                  background: 'rgba(0, 229, 176, 0.08)',
                  border: '1px solid rgba(0, 229, 176, 0.25)'
                }}>
                  <div className="row gap-10" style={{ alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 18 }}>✨</span>
                    <div className="col gap-2" style={{ flex: 1 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)' }}>
                        {s.recommended}
                      </span>
                      <span className="tiny" style={{ fontSize: 11, lineHeight: 1.4 }}>
                        Recordatorios + Resumen semanal + Logros (todo activado)
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="col gap-8">
                  {[
                    { k: 'reminder', title: s.notifReminder, desc: s.notifReminderDesc },
                    { k: 'progress', title: s.notifProgress, desc: s.notifProgressDesc },
                    { k: 'milestones', title: s.notifMilestones, desc: s.notifMilestonesDesc }
                  ].map(opt => (
                    <div key={opt.k} className="row gap-10 spread" style={{
                      background: 'var(--bg-elev)',
                      padding: 12,
                      borderRadius: 10,
                      alignItems: 'flex-start'
                    }}>
                      <div className="col gap-2" style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: 13, fontWeight: 700 }}>{opt.title}</span>
                        <span className="tiny" style={{ fontSize: 11, lineHeight: 1.4 }}>{opt.desc}</span>
                      </div>
                      <button
                        onClick={() => setNotifications(prev => ({ ...prev, [opt.k]: !prev[opt.k] }))}
                        style={{
                          width: 44, height: 26, borderRadius: 999,
                          background: notifications[opt.k] ? 'var(--green)' : 'var(--bg-card)',
                          border: notifications[opt.k] ? 'none' : '1px solid var(--border)',
                          position: 'relative', flexShrink: 0,
                          transition: 'background .2s'
                        }}
                      >
                        <div style={{
                          position: 'absolute', top: 2, left: notifications[opt.k] ? 20 : 2,
                          width: 20, height: 20, borderRadius: '50%', background: '#fff',
                          transition: 'left .2s'
                        }}></div>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button
            className="btn-primary mt-24"
            disabled={!name || !target || !deadline}
            onClick={submit}
          >
            {isEdit ? s.saveChanges : s.createGoal}
          </button>
        </>
      )}
    </div>
  );
}
