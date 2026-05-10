import { useState, useMemo } from 'react';
import { Icon } from './icons.jsx';
import BankLogo from './BankLogo.jsx';
import {
  saveAdvisorProfile, setManualApr, UTILIZATION_OPTIONS, cardsWithoutApr
} from '../lib/advisorProfile.js';
import { CATEGORIES } from '../data/sampleData.js';
import { fmtMoney } from '../utils/storage.js';

/**
 * Wizard del asesor — se abre después de conectar el primer banco.
 * Fase 3 del onboarding (ver docs/ONBOARDING_SPEC.md).
 *
 * Pasos:
 *   1. Confirmar cuentas y tarjetas detectadas
 *   2. APRs faltantes (manual input)
 *   3. Utilización meta (5/10/15/20/25/30%)
 *   4. Confirmar gastos fijos auto-detectados
 *   5. Agregar gastos que falten
 *   6. Modo en pareja (toggle + ratio)
 *   7. Plan financiero existente
 *   8. Metas y ahorros activos
 *   9. Resumen + activar
 */
export default function AdvisorOnboarding({
  accounts = [], fixedExpenses = [], goals = [], transactions = [],
  profile, onSave, onClose,
  onAddFixedExpense, onRemoveFixedExpense,
  onUpdateHousehold, onAddGoal,
  onConnectMoreBanks
}) {
  const cards = (accounts || []).filter(a => a.type === 'credit');
  const checkingAccounts = accounts.filter(a => a.type === 'checking');
  const savingsAccounts = accounts.filter(a => a.type === 'savings');
  const missingAprCards = cardsWithoutApr(cards, profile);

  const [step, setStep] = useState(1);

  // Estado de cada paso
  const [manualAprs, setManualAprsState] = useState(profile?.manual_aprs || {});
  const [targetUtil, setTargetUtil] = useState(profile?.target_utilization || 5);
  const [hasPlan, setHasPlan] = useState(profile?.has_existing_plan ?? null);
  const [planDesc, setPlanDesc] = useState(profile?.existing_plan_description || '');

  // Step 4: confirmaciones de gastos detectados (id → 'confirmed' | 'dismissed')
  const [expenseStatus, setExpenseStatus] = useState({});

  // Step 5: agregar gastos manuales (acumulados antes de guardar)
  const [newExpense, setNewExpense] = useState({ name: '', amount: '', dueDay: '', category: 'servicios' });
  const [addedExpenses, setAddedExpenses] = useState([]);

  // Step 6: pareja
  const [coupleEnabled, setCoupleEnabled] = useState(false);
  const [partnerName, setPartnerName] = useState('');
  const [myRatio, setMyRatio] = useState(0.5);

  // Step 8: metas
  const [savingsAccountId, setSavingsAccountId] = useState('');
  const [hasGoals, setHasGoals] = useState(null);
  const [newGoal, setNewGoal] = useState({ name: '', target: '', current: '', deadline: '', accountId: '' });
  const [addedGoals, setAddedGoals] = useState([]);

  const totalSteps = 9;

  // Detección heurística de transferencias recurrentes a savings (posibles aportes a meta)
  const detectedSavings = useMemo(() => {
    if (!savingsAccounts.length || !transactions.length) return [];
    const sixMonthsAgo = Date.now() - 180 * 86400000;
    const incoming = transactions.filter(t =>
      savingsAccounts.some(s => s.id === t.account_id) &&
      t.amount > 0 &&
      new Date(t.date).getTime() >= sixMonthsAgo
    );
    if (incoming.length < 3) return [];
    const total = incoming.reduce((s, t) => s + t.amount, 0);
    const monthlyAvg = total / 6;
    return [{
      account: savingsAccounts[0],
      monthlyAvg: Math.round(monthlyAvg),
      count: incoming.length
    }];
  }, [savingsAccounts, transactions]);

  // ────────────────────────────────────────────────────
  // Acciones
  // ────────────────────────────────────────────────────
  const goNext = () => setStep(s => Math.min(totalSteps, s + 1));
  const goBack = () => setStep(s => Math.max(1, s - 1));

  const finish = () => {
    // Persist APRs
    Object.entries(manualAprs).forEach(([cardId, apr]) => {
      if (apr && parseFloat(apr) > 0) setManualApr(cardId, apr);
    });

    // Persist gastos confirmados/eliminados
    Object.entries(expenseStatus).forEach(([id, status]) => {
      if (status === 'dismissed' && onRemoveFixedExpense) onRemoveFixedExpense(id);
    });
    addedExpenses.forEach(e => onAddFixedExpense?.(e));

    // Persist hogar/pareja
    if (onUpdateHousehold) {
      onUpdateHousehold({
        enabled: coupleEnabled,
        members: coupleEnabled
          ? [
              { id: 'me', name: 'Yo', avatar: 'YO', incomeRatio: myRatio, isMe: true },
              { id: 'partner', name: partnerName || 'Pareja',
                avatar: (partnerName || 'PA').slice(0, 2).toUpperCase(),
                incomeRatio: 1 - myRatio, isMe: false }
            ]
          : [{ id: 'me', name: 'Yo', avatar: 'YO', incomeRatio: 1, isMe: true }],
        splitMethod: 'income',
        pendingConfirmations: []
      });
    }

    // Persist metas
    addedGoals.forEach(g => onAddGoal?.(g));

    // Persist perfil del asesor
    const saved = saveAdvisorProfile({
      onboarding_completed: true,
      target_utilization: targetUtil,
      has_existing_plan: hasPlan,
      existing_plan_description: hasPlan ? planDesc : null,
      savings_account_id: savingsAccountId || null
    });
    onSave?.(saved);
  };

  const visibleExpenses = (fixedExpenses || []).filter(f => expenseStatus[f.id] !== 'dismissed');

  // ────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────
  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.78)',
        zIndex: 110, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        backdropFilter: 'blur(8px)'
      }}
      onClick={onClose}
    >
      <div
        className="app-shell"
        style={{
          background: 'var(--bg)', maxHeight: '92vh', overflowY: 'auto',
          borderRadius: '24px 24px 0 0', padding: 20, paddingBottom: 28,
          animation: 'fadeUp .3s ease', border: '1px solid var(--border)'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ width: 36, height: 5, background: 'var(--border)', borderRadius: 3, margin: '0 auto 16px' }} />

        {/* Hero */}
        <div className="row gap-12 mb-16" style={{ alignItems: 'center' }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'var(--brand-grad)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 4px 16px rgba(168, 85, 247, 0.4)'
          }}>
            <Icon name="sparkle" size={22} color="#fff" />
          </div>
          <div className="col gap-2" style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-mute)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Configurar asesor · Paso {step} / {totalSteps}
            </span>
            <span style={{ fontSize: 17, fontWeight: 800 }}>
              {STEP_TITLES[step - 1]}
            </span>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--bg-elev)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="x" size={14} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="row gap-3 mb-20">
          {Array.from({ length: totalSteps }).map((_, n) => (
            <div key={n} style={{
              flex: 1, height: 3, borderRadius: 999,
              background: n + 1 <= step ? 'var(--brand-grad)' : 'var(--bg-elev)'
            }} />
          ))}
        </div>

        {/* ════ PASO 1 — Confirmar cuentas ════ */}
        {step === 1 && (
          <>
            <p className="tiny mb-12" style={{ fontSize: 12, lineHeight: 1.5 }}>
              Estas son las cuentas que detecté de tu banco. Confirma que estén todas o conecta otro banco si falta alguna.
            </p>

            {accounts.length === 0 ? (
              <div className="card col" style={{ padding: 20, alignItems: 'center', gap: 8, background: 'var(--bg-elev)' }}>
                <span style={{ fontSize: 28 }}>🏦</span>
                <span style={{ fontWeight: 700, fontSize: 13 }}>No hay cuentas conectadas</span>
              </div>
            ) : (
              <div className="col gap-8">
                {accounts.map(a => {
                  const typeLabel = a.type === 'credit' ? 'Tarjeta' : a.type === 'savings' ? 'Ahorros' : 'Corriente';
                  return (
                    <div key={a.id} className="card row gap-12" style={{
                      padding: 12, borderRadius: 12, alignItems: 'center'
                    }}>
                      <BankLogo institution={a.institution || a.name} size={36} radius={10} />
                      <div className="col gap-2" style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: 13, fontWeight: 700,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                        }}>{a.institution || a.name}</span>
                        <span className="tiny" style={{ fontSize: 11 }}>
                          {typeLabel} ••{a.last4} · {fmtMoney(Math.abs(a.balance || 0))}
                        </span>
                      </div>
                      <span style={{ fontSize: 18 }}>✅</span>
                    </div>
                  );
                })}
              </div>
            )}

            {onConnectMoreBanks && (
              <button
                onClick={onConnectMoreBanks}
                className="row gap-8 mt-12"
                style={{
                  width: '100%', padding: 12, borderRadius: 12,
                  background: 'var(--bg-elev)', border: '1px dashed var(--border)',
                  fontWeight: 700, fontSize: 13, justifyContent: 'center'
                }}
              >
                <Icon name="plus" size={14} />
                <span>Falta una cuenta — conectar otro banco</span>
              </button>
            )}

            <Footer onNext={goNext} canNext={true} step={step} onBack={goBack} />
          </>
        )}

        {/* ════ PASO 2 — APRs faltantes ════ */}
        {step === 2 && (
          <>
            {missingAprCards.length === 0 ? (
              <div className="card col" style={{ padding: 20, alignItems: 'center', gap: 8, background: 'rgba(0, 229, 176, 0.10)', border: '1px solid rgba(0, 229, 176, 0.3)' }}>
                <span style={{ fontSize: 28 }}>✅</span>
                <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--green)' }}>Tengo todos los APRs</span>
                <span className="tiny" style={{ textAlign: 'center', fontSize: 11 }}>
                  Tu banco me dio el APR de cada tarjeta. Puedo calcular intereses con precisión.
                </span>
              </div>
            ) : (
              <>
                <p className="tiny mb-12" style={{ fontSize: 12, lineHeight: 1.5 }}>
                  Tu banco no me devolvió el APR de algunas tarjetas. Sin esto no puedo calcular intereses ni recomendarte pagos óptimos.
                </p>
                <div className="col gap-10">
                  {missingAprCards.map(c => (
                    <div key={c.id} className="card" style={{ padding: 12, borderRadius: 12 }}>
                      <div className="row gap-10 mb-8" style={{ alignItems: 'center' }}>
                        <BankLogo institution={c.institution || c.name} size={28} radius={6} />
                        <div className="col gap-1" style={{ flex: 1 }}>
                          <span style={{ fontSize: 12, fontWeight: 700 }}>{c.institution || c.name}</span>
                          <span className="tiny" style={{ fontSize: 10 }}>••{c.last4}</span>
                        </div>
                      </div>
                      <div className="row" style={{ background: 'var(--bg-input)', borderRadius: 10, border: '1px solid var(--border)', padding: '0 12px', height: 40 }}>
                        <input
                          type="number" step="0.01" min="0" max="100"
                          value={manualAprs[c.id] || ''}
                          onChange={e => setManualAprsState(p => ({ ...p, [c.id]: e.target.value }))}
                          placeholder="22.99"
                          style={{ background: 'transparent', border: 'none', height: 40, fontSize: 14, fontWeight: 600, padding: '0 6px', flex: 1, outline: 'none', color: 'inherit' }}
                        />
                        <span style={{ fontSize: 13, color: 'var(--text-mute)', fontWeight: 600 }}>%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
            <Footer onNext={goNext} canNext={true} step={step} onBack={goBack} />
          </>
        )}

        {/* ════ PASO 3 — Utilización meta ════ */}
        {step === 3 && (
          <>
            <p className="tiny mb-12" style={{ fontSize: 12, lineHeight: 1.5 }}>
              La utilización es cuánto debes en tarjetas vs tu límite. Es 30% de tu score FICO.
            </p>
            <div className="col gap-8">
              {UTILIZATION_OPTIONS.map(opt => {
                const active = targetUtil === opt.pct;
                return (
                  <button
                    key={opt.pct}
                    onClick={() => setTargetUtil(opt.pct)}
                    className="row gap-10"
                    style={{
                      width: '100%', padding: 12, borderRadius: 12,
                      background: active ? `${opt.badgeColor}15` : 'var(--bg-elev)',
                      border: `1.5px solid ${active ? opt.badgeColor : 'var(--border)'}`,
                      textAlign: 'left', alignItems: 'center'
                    }}
                  >
                    <div style={{
                      width: 40, height: 40, borderRadius: 10,
                      background: active ? opt.badgeColor : opt.badgeColor + '33',
                      color: active ? '#fff' : opt.badgeColor,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 800, fontSize: 14, flexShrink: 0
                    }}>{opt.pct}%</div>
                    <div className="col gap-1" style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: opt.badgeColor }}>
                        {opt.badge}{opt.recommended ? ' · ⭐ RECOMENDADO' : ''}
                      </span>
                      <span className="tiny" style={{ fontSize: 11 }}>{opt.bestFor}</span>
                    </div>
                    {active && <Icon name="check" size={16} color={opt.badgeColor} stroke={3} />}
                  </button>
                );
              })}
            </div>
            <Footer onNext={goNext} canNext={true} step={step} onBack={goBack} />
          </>
        )}

        {/* ════ PASO 4 — Confirmar gastos detectados ════ */}
        {step === 4 && (
          <>
            <p className="tiny mb-12" style={{ fontSize: 12, lineHeight: 1.5 }}>
              Detecté estos pagos recurrentes de tus últimos 6 meses. Confirma cuáles son tuyos o quita los que no.
            </p>

            {visibleExpenses.length === 0 ? (
              <div className="card col" style={{ padding: 20, alignItems: 'center', gap: 8, background: 'var(--bg-elev)' }}>
                <span style={{ fontSize: 28 }}>🔍</span>
                <span style={{ fontWeight: 700, fontSize: 13 }}>No detecté pagos recurrentes</span>
                <span className="tiny" style={{ textAlign: 'center', fontSize: 11 }}>
                  En el siguiente paso puedes agregar manualmente los pagos que tienes.
                </span>
              </div>
            ) : (
              <div className="col gap-8">
                {visibleExpenses.map(f => {
                  const cat = CATEGORIES[f.category] || CATEGORIES.otros;
                  const status = expenseStatus[f.id];
                  return (
                    <div key={f.id} className="card row gap-10" style={{
                      padding: 12, borderRadius: 12, alignItems: 'center',
                      background: status === 'confirmed' ? 'rgba(0, 229, 176, 0.08)' : 'var(--bg-elev)',
                      border: status === 'confirmed' ? '1px solid rgba(0, 229, 176, 0.3)' : '1px solid var(--border)'
                    }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: (cat?.color || '#5856D6') + '22',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 14, flexShrink: 0
                      }}>{f.icon || cat?.icon || '🏠'}</div>
                      <div className="col gap-2" style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: 13, fontWeight: 700,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                        }}>{f.name}</span>
                        <span className="tiny" style={{ fontSize: 10 }}>
                          Día {f.dueDay || '—'} · {fmtMoney(f.amount || 0)}
                        </span>
                      </div>
                      <button
                        onClick={() => setExpenseStatus(p => ({ ...p, [f.id]: 'confirmed' }))}
                        style={{
                          width: 32, height: 32, borderRadius: 8,
                          background: status === 'confirmed' ? 'var(--green)' : 'var(--bg-card)',
                          color: status === 'confirmed' ? '#0D0D14' : 'var(--text-mute)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 800, fontSize: 14, flexShrink: 0
                        }}
                        aria-label="Confirmar"
                      >✓</button>
                      <button
                        onClick={() => setExpenseStatus(p => ({ ...p, [f.id]: 'dismissed' }))}
                        style={{
                          width: 32, height: 32, borderRadius: 8,
                          background: 'var(--bg-card)',
                          color: 'var(--danger)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 800, fontSize: 14, flexShrink: 0
                        }}
                        aria-label="No es mío"
                      >✕</button>
                    </div>
                  );
                })}
              </div>
            )}
            <Footer onNext={goNext} canNext={true} step={step} onBack={goBack} />
          </>
        )}

        {/* ════ PASO 5 — Agregar gastos manualmente ════ */}
        {step === 5 && (
          <>
            <p className="tiny mb-12" style={{ fontSize: 12, lineHeight: 1.5 }}>
              ¿Tienes algún pago mensual que no detecté? Agrégalo aquí.
            </p>

            <div className="card mb-12" style={{ padding: 12, borderRadius: 12, background: 'var(--bg-elev)' }}>
              <div className="col gap-8">
                <div className="col gap-4">
                  <span className="label" style={{ fontSize: 11 }}>Nombre del pago</span>
                  <input
                    className="input-field"
                    value={newExpense.name}
                    onChange={e => setNewExpense(p => ({ ...p, name: e.target.value }))}
                    placeholder="Ej: Hipoteca, Gym, Seguro"
                    style={{ height: 40, fontSize: 13 }}
                  />
                </div>
                <div className="row gap-8">
                  <div className="col gap-4" style={{ flex: 1 }}>
                    <span className="label" style={{ fontSize: 11 }}>Monto</span>
                    <div className="row" style={{ background: 'var(--bg-input)', borderRadius: 10, border: '1px solid var(--border)', padding: '0 10px', height: 40 }}>
                      <span style={{ fontSize: 13, color: 'var(--text-mute)' }}>$</span>
                      <input
                        type="number" min="0" step="0.01"
                        value={newExpense.amount}
                        onChange={e => setNewExpense(p => ({ ...p, amount: e.target.value }))}
                        placeholder="0"
                        style={{ background: 'transparent', border: 'none', height: 40, fontSize: 13, fontWeight: 600, padding: '0 6px', flex: 1, outline: 'none', color: 'inherit' }}
                      />
                    </div>
                  </div>
                  <div className="col gap-4" style={{ flex: 1 }}>
                    <span className="label" style={{ fontSize: 11 }}>Día del mes</span>
                    <input
                      type="number" min="1" max="31"
                      value={newExpense.dueDay}
                      onChange={e => setNewExpense(p => ({ ...p, dueDay: e.target.value }))}
                      placeholder="1-31"
                      className="input-field"
                      style={{ height: 40, fontSize: 13 }}
                    />
                  </div>
                </div>
                <div className="col gap-4">
                  <span className="label" style={{ fontSize: 11 }}>Categoría</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {Object.entries(CATEGORIES).slice(0, 9).map(([key, cat]) => {
                      const sel = newExpense.category === key;
                      return (
                        <button
                          key={key}
                          onClick={() => setNewExpense(p => ({ ...p, category: key }))}
                          style={{
                            padding: '6px 10px', borderRadius: 999,
                            background: sel ? cat.color + '33' : 'var(--bg-card)',
                            border: `1px solid ${sel ? cat.color : 'var(--border)'}`,
                            fontSize: 11, fontWeight: 600,
                            display: 'flex', alignItems: 'center', gap: 4
                          }}
                        >
                          <span>{cat.icon}</span>
                          <span>{cat.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (!newExpense.name || !newExpense.amount || !newExpense.dueDay) return;
                    const cat = CATEGORIES[newExpense.category] || CATEGORIES.otros;
                    const item = {
                      id: 'manual-' + Date.now(),
                      name: newExpense.name,
                      amount: parseFloat(newExpense.amount),
                      dueDay: parseInt(newExpense.dueDay),
                      category: newExpense.category,
                      icon: cat.icon
                    };
                    setAddedExpenses(p => [...p, item]);
                    setNewExpense({ name: '', amount: '', dueDay: '', category: 'servicios' });
                  }}
                  disabled={!newExpense.name || !newExpense.amount || !newExpense.dueDay}
                  className="row gap-6"
                  style={{
                    padding: 10, borderRadius: 10,
                    background: 'var(--brand-grad)', color: '#fff',
                    fontWeight: 800, fontSize: 13,
                    justifyContent: 'center'
                  }}
                >
                  <Icon name="plus" size={14} color="#fff" stroke={3} />
                  <span>Agregar pago</span>
                </button>
              </div>
            </div>

            {addedExpenses.length > 0 && (
              <div className="col gap-6 mb-12">
                <span className="label" style={{ fontSize: 11 }}>Agregados</span>
                {addedExpenses.map(e => {
                  const cat = CATEGORIES[e.category] || CATEGORIES.otros;
                  return (
                    <div key={e.id} className="card row gap-10" style={{
                      padding: 10, borderRadius: 10, alignItems: 'center',
                      background: 'rgba(0, 229, 176, 0.08)', border: '1px solid rgba(0, 229, 176, 0.3)'
                    }}>
                      <span style={{ fontSize: 16 }}>{e.icon}</span>
                      <div className="col gap-1" style={{ flex: 1 }}>
                        <span style={{ fontSize: 12, fontWeight: 700 }}>{e.name}</span>
                        <span className="tiny" style={{ fontSize: 10 }}>Día {e.dueDay} · {cat.label}</span>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--green)' }}>
                        {fmtMoney(e.amount)}
                      </span>
                      <button
                        onClick={() => setAddedExpenses(p => p.filter(x => x.id !== e.id))}
                        style={{ width: 26, height: 26, borderRadius: 6, background: 'var(--bg-card)' }}
                      >
                        <Icon name="x" size={12} color="var(--danger)" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <Footer onNext={goNext} canNext={true} step={step} onBack={goBack} nextLabel={addedExpenses.length === 0 ? 'No tengo más' : 'Siguiente'} />
          </>
        )}

        {/* ════ PASO 6 — Modo en pareja ════ */}
        {step === 6 && (
          <>
            <p className="tiny mb-12" style={{ fontSize: 12, lineHeight: 1.5 }}>
              ¿Compartes gastos con alguien (pareja, roommate, familia)? Si sí, los podemos dividir automáticamente.
            </p>

            <div className="row gap-8 mb-16">
              {[
                { v: false, label: 'Solo yo', emoji: '🧍', desc: 'Todos los gastos son míos' },
                { v: true,  label: 'En pareja', emoji: '👥', desc: 'Compartir con alguien' }
              ].map(opt => {
                const active = coupleEnabled === opt.v;
                return (
                  <button
                    key={String(opt.v)}
                    onClick={() => setCoupleEnabled(opt.v)}
                    className="col gap-4"
                    style={{
                      flex: 1, padding: 14, borderRadius: 12,
                      background: active ? 'rgba(168, 85, 247, 0.12)' : 'var(--bg-elev)',
                      border: `1.5px solid ${active ? 'var(--purple)' : 'var(--border)'}`,
                      alignItems: 'center'
                    }}
                  >
                    <span style={{ fontSize: 28 }}>{opt.emoji}</span>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{opt.label}</span>
                    <span className="tiny" style={{ fontSize: 10, textAlign: 'center', lineHeight: 1.4 }}>{opt.desc}</span>
                  </button>
                );
              })}
            </div>

            {coupleEnabled && (
              <div className="card col gap-12 mb-12" style={{ padding: 14, borderRadius: 12 }}>
                <div className="col gap-4">
                  <span className="label" style={{ fontSize: 11 }}>Nombre de la persona</span>
                  <input
                    className="input-field"
                    value={partnerName}
                    onChange={e => setPartnerName(e.target.value)}
                    placeholder="Ej: María, Juan, Pedro"
                    style={{ height: 40, fontSize: 13 }}
                  />
                </div>
                <div className="col gap-4">
                  <span className="label" style={{ fontSize: 11 }}>
                    Tu parte del ingreso del hogar: {(myRatio * 100).toFixed(0)}%
                  </span>
                  <input
                    type="range" min="0" max="1" step="0.05"
                    value={myRatio}
                    onChange={e => setMyRatio(parseFloat(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--purple)' }}
                  />
                  <span className="tiny" style={{ fontSize: 10 }}>
                    Si ganas más, debes cubrir más de los gastos compartidos. Esto hace la división justa.
                  </span>
                </div>
              </div>
            )}

            <Footer onNext={goNext} canNext={!coupleEnabled || partnerName.trim().length > 0} step={step} onBack={goBack} />
          </>
        )}

        {/* ════ PASO 7 — Plan financiero existente ════ */}
        {step === 7 && (
          <>
            <p className="tiny mb-12" style={{ fontSize: 12, lineHeight: 1.5 }}>
              Quiero entender cómo manejas tus finanzas hoy.
            </p>
            <div className="row gap-8 mb-12">
              {[
                { v: true,  label: 'Sí, tengo un plan', emoji: '✅' },
                { v: false, label: 'No, ayúdame',         emoji: '🤝' }
              ].map(opt => {
                const active = hasPlan === opt.v;
                return (
                  <button
                    key={String(opt.v)}
                    onClick={() => setHasPlan(opt.v)}
                    className="col gap-4"
                    style={{
                      flex: 1, padding: 14, borderRadius: 12,
                      background: active ? 'rgba(168, 85, 247, 0.12)' : 'var(--bg-elev)',
                      border: `1.5px solid ${active ? 'var(--purple)' : 'var(--border)'}`,
                      alignItems: 'center'
                    }}
                  >
                    <span style={{ fontSize: 26 }}>{opt.emoji}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, textAlign: 'center' }}>{opt.label}</span>
                  </button>
                );
              })}
            </div>

            {hasPlan === true && (
              <div className="col gap-4 mb-12">
                <span className="label" style={{ fontSize: 11 }}>Cuéntame en una oración</span>
                <textarea
                  value={planDesc}
                  onChange={e => setPlanDesc(e.target.value)}
                  placeholder="Ej: Pago renta los 1, ahorro $200 cada cheque, mínimo a tarjetas"
                  rows={3}
                  style={{
                    width: '100%', padding: 12, borderRadius: 10,
                    background: 'var(--bg-elev)', border: 'none',
                    fontSize: 13, fontFamily: 'inherit', color: 'var(--text)',
                    resize: 'none', outline: 'none', lineHeight: 1.4
                  }}
                />
              </div>
            )}
            <Footer onNext={goNext}
              canNext={hasPlan !== null && (hasPlan === false || planDesc.trim().length >= 10)}
              step={step} onBack={goBack} />
          </>
        )}

        {/* ════ PASO 8 — Metas y ahorros ════ */}
        {step === 8 && (
          <>
            <p className="tiny mb-12" style={{ fontSize: 12, lineHeight: 1.5 }}>
              ¿Tienes metas o ahorros activos? Vamos a registrarlos para que pueda seguir tu progreso.
            </p>

            {/* Detección automática de aportes a savings */}
            {detectedSavings.length > 0 && detectedSavings.map((d, i) => (
              <div key={i} className="card mb-12" style={{
                padding: 12, borderRadius: 12,
                background: 'linear-gradient(135deg, rgba(0, 229, 176, 0.10), rgba(168, 85, 247, 0.08))',
                border: '1px solid rgba(0, 229, 176, 0.3)'
              }}>
                <div className="row gap-10" style={{ alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 22 }}>🔍</span>
                  <div className="col gap-2" style={{ flex: 1 }}>
                    <span style={{ fontSize: 12, fontWeight: 800 }}>Detecté ahorros activos</span>
                    <span className="tiny" style={{ fontSize: 11, lineHeight: 1.4 }}>
                      Mueves ~{fmtMoney(d.monthlyAvg)}/mes a tu {d.account.institution || d.account.name} ••{d.account.last4}.
                      ¿Es para una meta específica?
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {/* Toggle: ¿tiene metas? */}
            <div className="row gap-8 mb-12">
              {[
                { v: true,  label: 'Sí, tengo metas', emoji: '🎯' },
                { v: false, label: 'Aún no',           emoji: '🌱' }
              ].map(opt => {
                const active = hasGoals === opt.v;
                return (
                  <button
                    key={String(opt.v)}
                    onClick={() => setHasGoals(opt.v)}
                    className="col gap-4"
                    style={{
                      flex: 1, padding: 12, borderRadius: 12,
                      background: active ? 'rgba(255, 149, 0, 0.12)' : 'var(--bg-elev)',
                      border: `1.5px solid ${active ? 'var(--orange)' : 'var(--border)'}`,
                      alignItems: 'center'
                    }}
                  >
                    <span style={{ fontSize: 22 }}>{opt.emoji}</span>
                    <span style={{ fontSize: 12, fontWeight: 700 }}>{opt.label}</span>
                  </button>
                );
              })}
            </div>

            {hasGoals === true && (
              <>
                <div className="card mb-12" style={{ padding: 12, borderRadius: 12, background: 'var(--bg-elev)' }}>
                  <div className="col gap-8">
                    <div className="col gap-4">
                      <span className="label" style={{ fontSize: 11 }}>Nombre de la meta</span>
                      <input
                        className="input-field"
                        value={newGoal.name}
                        onChange={e => setNewGoal(p => ({ ...p, name: e.target.value }))}
                        placeholder="Ej: Viaje a Madrid, Down payment casa"
                        style={{ height: 38, fontSize: 13 }}
                      />
                    </div>
                    <div className="row gap-8">
                      <div className="col gap-4" style={{ flex: 1 }}>
                        <span className="label" style={{ fontSize: 11 }}>Meta total</span>
                        <div className="row" style={{ background: 'var(--bg-input)', borderRadius: 10, border: '1px solid var(--border)', padding: '0 10px', height: 38 }}>
                          <span style={{ fontSize: 13, color: 'var(--text-mute)' }}>$</span>
                          <input
                            type="number" min="0"
                            value={newGoal.target}
                            onChange={e => setNewGoal(p => ({ ...p, target: e.target.value }))}
                            placeholder="5000"
                            style={{ background: 'transparent', border: 'none', height: 38, fontSize: 13, fontWeight: 600, padding: '0 6px', flex: 1, outline: 'none', color: 'inherit' }}
                          />
                        </div>
                      </div>
                      <div className="col gap-4" style={{ flex: 1 }}>
                        <span className="label" style={{ fontSize: 11 }}>Llevas</span>
                        <div className="row" style={{ background: 'var(--bg-input)', borderRadius: 10, border: '1px solid var(--border)', padding: '0 10px', height: 38 }}>
                          <span style={{ fontSize: 13, color: 'var(--text-mute)' }}>$</span>
                          <input
                            type="number" min="0"
                            value={newGoal.current}
                            onChange={e => setNewGoal(p => ({ ...p, current: e.target.value }))}
                            placeholder="0"
                            style={{ background: 'transparent', border: 'none', height: 38, fontSize: 13, fontWeight: 600, padding: '0 6px', flex: 1, outline: 'none', color: 'inherit' }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="col gap-4">
                      <span className="label" style={{ fontSize: 11 }}>Fecha límite</span>
                      <input
                        type="date"
                        className="input-field"
                        value={newGoal.deadline}
                        onChange={e => setNewGoal(p => ({ ...p, deadline: e.target.value }))}
                        style={{ height: 38, fontSize: 13, colorScheme: 'dark' }}
                      />
                    </div>
                    {(checkingAccounts.length + savingsAccounts.length) > 0 && (
                      <div className="col gap-4">
                        <span className="label" style={{ fontSize: 11 }}>¿En qué cuenta guardas el dinero?</span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {[...savingsAccounts, ...checkingAccounts].map(a => {
                            const sel = newGoal.accountId === a.id;
                            return (
                              <button
                                key={a.id}
                                onClick={() => setNewGoal(p => ({ ...p, accountId: a.id }))}
                                className="row gap-6"
                                style={{
                                  padding: '6px 10px 6px 6px', borderRadius: 999,
                                  background: sel ? 'rgba(255, 149, 0, 0.15)' : 'var(--bg-card)',
                                  border: `1px solid ${sel ? 'var(--orange)' : 'var(--border)'}`,
                                  fontSize: 11, fontWeight: 600,
                                  alignItems: 'center'
                                }}
                              >
                                <BankLogo institution={a.institution || a.name} size={20} radius={4} />
                                <span>{a.institution || a.name} ••{a.last4}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    <button
                      onClick={() => {
                        if (!newGoal.name || !newGoal.target || !newGoal.deadline) return;
                        const goal = {
                          id: 'goal-' + Date.now(),
                          name: newGoal.name,
                          target: parseFloat(newGoal.target),
                          current: parseFloat(newGoal.current || 0),
                          deadline: newGoal.deadline,
                          accountId: newGoal.accountId || null,
                          icon: '🎯', color: '#FF9500'
                        };
                        setAddedGoals(p => [...p, goal]);
                        setNewGoal({ name: '', target: '', current: '', deadline: '', accountId: '' });
                      }}
                      disabled={!newGoal.name || !newGoal.target || !newGoal.deadline}
                      className="row gap-6"
                      style={{
                        padding: 10, borderRadius: 10,
                        background: 'var(--brand-grad)', color: '#fff',
                        fontWeight: 800, fontSize: 13,
                        justifyContent: 'center'
                      }}
                    >
                      <Icon name="plus" size={14} color="#fff" stroke={3} />
                      <span>Agregar meta</span>
                    </button>
                  </div>
                </div>

                {addedGoals.length > 0 && (
                  <div className="col gap-6 mb-12">
                    {addedGoals.map(g => (
                      <div key={g.id} className="card row gap-10" style={{
                        padding: 10, borderRadius: 10, alignItems: 'center',
                        background: 'rgba(255, 149, 0, 0.08)', border: '1px solid rgba(255, 149, 0, 0.3)'
                      }}>
                        <span style={{ fontSize: 18 }}>🎯</span>
                        <div className="col gap-1" style={{ flex: 1 }}>
                          <span style={{ fontSize: 12, fontWeight: 700 }}>{g.name}</span>
                          <span className="tiny" style={{ fontSize: 10 }}>
                            {fmtMoney(g.current)} de {fmtMoney(g.target)} · {g.deadline}
                          </span>
                        </div>
                        <button
                          onClick={() => setAddedGoals(p => p.filter(x => x.id !== g.id))}
                          style={{ width: 26, height: 26, borderRadius: 6, background: 'var(--bg-card)' }}
                        >
                          <Icon name="x" size={12} color="var(--danger)" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Recomendación de cuenta virtual si solo tiene checking */}
            {savingsAccounts.length === 0 && checkingAccounts.length > 0 && (
              <div className="card" style={{
                padding: 12, borderRadius: 12,
                background: 'rgba(0, 132, 255, 0.08)',
                border: '1px solid rgba(0, 132, 255, 0.3)'
              }}>
                <div className="row gap-10" style={{ alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 20 }}>💡</span>
                  <div className="col gap-2" style={{ flex: 1 }}>
                    <span style={{ fontSize: 12, fontWeight: 800 }}>Recomendación</span>
                    <span className="tiny" style={{ fontSize: 11, lineHeight: 1.5 }}>
                      Te recomiendo abrir una cuenta separada para cada meta. Tu banco
                      ({checkingAccounts[0].institution || 'local'}) probablemente ofrece
                      cuentas virtuales gratis que puedes abrir desde su app en 5 minutos.
                      Así no tocas el dinero de las metas por error.
                    </span>
                  </div>
                </div>
              </div>
            )}

            <Footer onNext={goNext} canNext={hasGoals !== null} step={step} onBack={goBack} />
          </>
        )}

        {/* ════ PASO 9 — Resumen + activar ════ */}
        {step === 9 && (
          <>
            <div className="card mb-12" style={{ padding: 14, borderRadius: 14, background: 'var(--bg-elev)' }}>
              <span className="tiny" style={{ fontWeight: 800, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Resumen
              </span>
              <div className="col gap-10 mt-8">
                <SummaryRow icon="🏦" label="Cuentas conectadas" value={accounts.length} />
                <SummaryRow icon="💳" label="Tarjetas de crédito" value={cards.length} />
                {Object.values(manualAprs).filter(v => v).length > 0 && (
                  <SummaryRow icon="🔢" label="APRs ingresados" value={Object.values(manualAprs).filter(v => v).length} />
                )}
                <SummaryRow icon="🎯" label="Utilización meta"
                  value={`${targetUtil}%`}
                  valueColor={UTILIZATION_OPTIONS.find(o => o.pct === targetUtil)?.badgeColor} />
                <SummaryRow icon="📋"
                  label="Gastos fijos"
                  value={visibleExpenses.length + addedExpenses.length} />
                <SummaryRow icon={coupleEnabled ? '👥' : '🧍'}
                  label={coupleEnabled ? `En pareja con ${partnerName || 'tu pareja'}` : 'Solo tú'}
                  value={coupleEnabled ? `${(myRatio * 100).toFixed(0)}/${((1 - myRatio) * 100).toFixed(0)}` : ''} />
                <SummaryRow icon="🎯" label="Metas registradas" value={addedGoals.length} />
                <SummaryRow icon="📋" label={hasPlan ? 'Optimizo tu plan' : 'Te creo un plan'} value="" />
              </div>
            </div>

            <div className="card mb-16" style={{
              padding: 14, borderRadius: 14,
              background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.10), rgba(0, 229, 176, 0.08))',
              border: '1px solid rgba(168, 85, 247, 0.25)'
            }}>
              <div className="row gap-10" style={{ alignItems: 'flex-start' }}>
                <Icon name="sparkle" size={20} color="#A855F7" />
                <div className="col gap-3" style={{ flex: 1 }}>
                  <span style={{ fontSize: 13, fontWeight: 800 }}>Lo que voy a hacer ahora</span>
                  <ul className="col gap-3" style={{ paddingLeft: 14, fontSize: 12, lineHeight: 1.5, margin: 0 }}>
                    <li>Calcular tu disponible real esta semana</li>
                    <li>Detectar riesgos antes de que ocurran</li>
                    <li>Avisarte 2 días antes de cada cierre de ciclo</li>
                    <li>Si conectas otro banco después, lo agrego sin problema</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="row gap-8">
              <button onClick={goBack} style={{ flex: 1, padding: 14, borderRadius: 12, background: 'var(--bg-elev)', fontWeight: 700 }}>
                Atrás
              </button>
              <button
                className="btn-primary"
                style={{ flex: 1, background: 'var(--brand-grad)', boxShadow: '0 6px 18px rgba(168, 85, 247, 0.4)' }}
                onClick={finish}
              >
                <Icon name="sparkle" size={16} color="#fff" />
                <span>Activar Kleo</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const STEP_TITLES = [
  '¿Están todas tus cuentas?',
  'APRs faltantes',
  '¿Qué utilización meta?',
  'Confirma tus pagos',
  '¿Falta algún pago?',
  '¿Compartes gastos?',
  '¿Tienes un plan?',
  'Tus metas y ahorros',
  'Listo para activar'
];

function Footer({ onNext, canNext, step, onBack, nextLabel = 'Siguiente' }) {
  return (
    <div className="row gap-8 mt-20">
      {step > 1 && (
        <button onClick={onBack} style={{ flex: '0 0 auto', padding: '14px 16px', borderRadius: 12, background: 'var(--bg-elev)', fontWeight: 700 }}>
          <Icon name="back" size={14} />
        </button>
      )}
      <button
        className="btn-primary"
        style={{ flex: 1, background: 'var(--brand-grad)' }}
        onClick={onNext}
        disabled={!canNext}
      >
        <span>{nextLabel}</span>
        <span style={{ display: 'inline-flex', transform: 'rotate(180deg)' }}>
          <Icon name="back" size={12} color="#fff" stroke={2.5} />
        </span>
      </button>
    </div>
  );
}

function SummaryRow({ icon, label, value, valueColor }) {
  return (
    <div className="row gap-8" style={{ alignItems: 'center' }}>
      <span style={{ fontSize: 16 }}>{icon}</span>
      <span style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>{label}</span>
      {value !== '' && (
        <span style={{ fontSize: 13, fontWeight: 800, color: valueColor || 'var(--text)' }}>{value}</span>
      )}
    </div>
  );
}
