import { useState, useMemo } from 'react';
import { Icon } from './icons.jsx';
import {
  FREQUENCIES, DEFAULT_ALLOCATION, ALLOCATION_LABELS,
  detectFrequencyFromTransactions
} from '../lib/budget.js';
import { fmtMoney } from '../utils/storage.js';

/**
 * Wizard de configuración del presupuesto en 4 pasos:
 *  1. Frecuencia de cobro
 *  2. Monto + próximo cheque
 *  3. Distribución (auto / manual / con ayuda de Kleo)
 *  4. Resumen y guardar
 */
export default function BudgetSetup({ transactions = [], existing = null, onSave, onClose }) {
  const detected = useMemo(() => detectFrequencyFromTransactions(transactions), [transactions]);

  const [step, setStep] = useState(1);
  const [frequency, setFrequency] = useState(existing?.pay_frequency || detected?.frequency || 'biweekly');
  const [amount, setAmount] = useState(existing?.paycheck_amount?.toString() || detected?.avgAmount?.toString() || '');
  const [nextDate, setNextDate] = useState(existing?.next_paycheck_date || detected?.nextPaycheckDate || '');
  const [allocation, setAllocation] = useState(existing?.allocation || DEFAULT_ALLOCATION);
  const [allocMode, setAllocMode] = useState('auto'); // auto | manual | ai
  const [aiThinking, setAiThinking] = useState(false);
  const [aiHelpAnswers, setAiHelpAnswers] = useState({ rent: '', goal: '', save: '' });

  const totalPct = allocation.essentials + allocation.savings + allocation.plans + allocation.personal;
  const valid = frequency && parseFloat(amount) > 0 && nextDate && totalPct === 100;

  // Sugerencia 50/30/20 estilo Senator Warren
  const apply503020 = () => setAllocation({ essentials: 50, savings: 20, plans: 0, personal: 30 });
  const applyAggressive = () => setAllocation({ essentials: 50, savings: 30, plans: 10, personal: 10 });
  const applyDefault = () => setAllocation(DEFAULT_ALLOCATION);

  const askKleoHelp = async () => {
    setAiThinking(true);
    // Calculamos en base a las respuestas del usuario
    setTimeout(() => {
      const monthly = parseFloat(amount) * (FREQUENCIES.find(f => f.id === frequency)?.days || 14) / 30;
      const rentPct = aiHelpAnswers.rent ? Math.min(45, (parseFloat(aiHelpAnswers.rent) / monthly) * 100) : 30;
      const goalPct = aiHelpAnswers.goal === 'sí' ? 15 : 5;
      const savePct = aiHelpAnswers.save === 'sí' ? 20 : 10;
      const essentials = Math.round(rentPct + 15); // rent + utilities + food
      const personal = Math.max(10, 100 - essentials - savePct - goalPct);
      setAllocation({
        essentials: Math.min(60, essentials),
        savings: savePct,
        plans: goalPct,
        personal
      });
      setAllocMode('manual');
      setAiThinking(false);
    }, 800);
  };

  const handleSubmit = () => {
    onSave({
      pay_frequency: frequency,
      paycheck_amount: parseFloat(amount),
      next_paycheck_date: nextDate,
      allocation,
      created_at: existing?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
        zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
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
        <div style={{ width: 36, height: 5, background: 'var(--border)', borderRadius: 3, margin: '0 auto 12px' }} />

        {/* Header */}
        <div className="spread mb-12">
          <div className="col gap-2">
            <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-mute)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Paso {step} de 4
            </span>
            <span style={{ fontSize: 18, fontWeight: 800 }}>
              {step === 1 && '¿Cada cuánto cobras?'}
              {step === 2 && '¿Cuánto y cuándo?'}
              {step === 3 && '¿Cómo distribuirlo?'}
              {step === 4 && 'Confirma tu presupuesto'}
            </span>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--bg-elev)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="x" size={16} />
          </button>
        </div>

        {/* Progress */}
        <div className="row gap-4 mb-20" style={{ alignItems: 'center' }}>
          {[1, 2, 3, 4].map(n => (
            <div key={n} style={{
              flex: 1, height: 4, borderRadius: 999,
              background: n <= step ? 'var(--brand-grad)' : 'var(--bg-elev)'
            }} />
          ))}
        </div>

        {/* Step 1 — Frecuencia */}
        {step === 1 && (
          <>
            {detected && (
              <div style={{
                background: 'rgba(0, 229, 176, 0.10)',
                border: '1px solid rgba(0, 229, 176, 0.3)',
                padding: 12, borderRadius: 12, marginBottom: 14
              }}>
                <div className="row gap-8">
                  <span style={{ fontSize: 16 }}>🔍</span>
                  <span style={{ fontSize: 12, lineHeight: 1.5 }}>
                    Detecté que cobras <strong>{FREQUENCIES.find(f => f.id === detected.frequency)?.label.toLowerCase()}</strong> ~{fmtMoney(detected.avgAmount)} desde tus depósitos. Confírmalo o cámbialo.
                  </span>
                </div>
              </div>
            )}
            <div className="col gap-8">
              {FREQUENCIES.map(f => {
                const active = frequency === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => setFrequency(f.id)}
                    className="row gap-12"
                    style={{
                      width: '100%', padding: 14, borderRadius: 12,
                      background: active ? 'rgba(168, 85, 247, 0.12)' : 'var(--bg-elev)',
                      border: `1.5px solid ${active ? 'var(--purple)' : 'var(--border)'}`,
                      textAlign: 'left', alignItems: 'center'
                    }}
                  >
                    <div style={{
                      width: 32, height: 32, borderRadius: 10,
                      background: active ? 'var(--brand-grad)' : 'var(--bg-card)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: active ? '#fff' : 'var(--text-mute)', fontWeight: 800
                    }}>
                      {f.days}
                    </div>
                    <div className="col gap-2" style={{ flex: 1 }}>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{f.label}</span>
                      <span className="tiny" style={{ fontSize: 11 }}>{f.hint}</span>
                    </div>
                    {active && <Icon name="check" size={18} color="var(--purple)" stroke={3} />}
                  </button>
                );
              })}
            </div>
            <button className="btn-primary mt-20" onClick={() => setStep(2)} disabled={!frequency}>Siguiente</button>
          </>
        )}

        {/* Step 2 — Monto + fecha */}
        {step === 2 && (
          <>
            <div className="col gap-16">
              <div className="col gap-6">
                <span className="label">Monto por cheque (después de impuestos)</span>
                <div className="row" style={{ background: 'var(--bg-input)', borderRadius: 14, border: '1px solid var(--border)', padding: '0 16px', height: 54 }}>
                  <span style={{ fontSize: 22, color: 'var(--text-mute)' }}>$</span>
                  <input
                    style={{ background: 'transparent', border: 'none', height: 54, fontSize: 22, fontWeight: 700, padding: '0 8px', flex: 1, outline: 'none', color: 'inherit' }}
                    value={amount}
                    onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                    inputMode="decimal"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="col gap-6">
                <span className="label">¿Cuándo es tu próximo cheque?</span>
                <input
                  type="date"
                  className="input-field"
                  value={nextDate}
                  onChange={e => setNextDate(e.target.value)}
                  style={{ colorScheme: 'dark' }}
                />
              </div>
            </div>
            <div className="row gap-8 mt-20">
              <button onClick={() => setStep(1)} style={{ flex: 1, padding: 14, borderRadius: 12, background: 'var(--bg-elev)', fontWeight: 700 }}>Atrás</button>
              <button className="btn-primary" style={{ flex: 1 }} onClick={() => setStep(3)} disabled={!parseFloat(amount) || !nextDate}>Siguiente</button>
            </div>
          </>
        )}

        {/* Step 3 — Distribución */}
        {step === 3 && (
          <>
            {/* Modos */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
              <button
                onClick={() => { setAllocMode('auto'); applyDefault(); }}
                style={{
                  flex: 1, padding: '10px 6px', borderRadius: 10, fontSize: 12, fontWeight: 700,
                  background: allocMode === 'auto' ? 'var(--pill-grad)' : 'var(--bg-elev)',
                  color: allocMode === 'auto' ? '#fff' : 'var(--text)'
                }}
              >Sugerencia</button>
              <button
                onClick={() => setAllocMode('manual')}
                style={{
                  flex: 1, padding: '10px 6px', borderRadius: 10, fontSize: 12, fontWeight: 700,
                  background: allocMode === 'manual' ? 'var(--pill-grad)' : 'var(--bg-elev)',
                  color: allocMode === 'manual' ? '#fff' : 'var(--text)'
                }}
              >Manual</button>
              <button
                onClick={() => setAllocMode('ai')}
                style={{
                  flex: 1, padding: '10px 6px', borderRadius: 10, fontSize: 12, fontWeight: 700,
                  background: allocMode === 'ai' ? 'var(--pill-grad)' : 'var(--bg-elev)',
                  color: allocMode === 'ai' ? '#fff' : 'var(--text)'
                }}
              >🤖 Kleo me ayuda</button>
            </div>

            {/* Modo auto: presets */}
            {allocMode === 'auto' && (
              <div className="col gap-8 mb-16">
                <button onClick={applyDefault} className="row gap-12" style={{ padding: 12, borderRadius: 10, background: 'var(--bg-elev)', textAlign: 'left' }}>
                  <span style={{ fontSize: 22 }}>⚖️</span>
                  <div className="col gap-2" style={{ flex: 1 }}>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>Balanceado · 50/20/10/20</span>
                    <span className="tiny" style={{ fontSize: 11 }}>Esenciales 50% · Ahorro 20% · Planes 10% · Personal 20%</span>
                  </div>
                </button>
                <button onClick={apply503020} className="row gap-12" style={{ padding: 12, borderRadius: 10, background: 'var(--bg-elev)', textAlign: 'left' }}>
                  <span style={{ fontSize: 22 }}>🎓</span>
                  <div className="col gap-2" style={{ flex: 1 }}>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>Regla 50/30/20</span>
                    <span className="tiny" style={{ fontSize: 11 }}>Esenciales 50% · Personal 30% · Ahorro 20%</span>
                  </div>
                </button>
                <button onClick={applyAggressive} className="row gap-12" style={{ padding: 12, borderRadius: 10, background: 'var(--bg-elev)', textAlign: 'left' }}>
                  <span style={{ fontSize: 22 }}>🚀</span>
                  <div className="col gap-2" style={{ flex: 1 }}>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>Agresivo de ahorro</span>
                    <span className="tiny" style={{ fontSize: 11 }}>Esenciales 50% · Ahorro 30% · Planes 10% · Personal 10%</span>
                  </div>
                </button>
              </div>
            )}

            {/* Modo AI ayuda */}
            {allocMode === 'ai' && (
              <div className="col gap-12 mb-16">
                <p className="tiny" style={{ fontSize: 12, lineHeight: 1.5 }}>
                  Cuéntame un poco y te genero un presupuesto que tenga sentido para ti.
                </p>
                <div className="col gap-6">
                  <span className="label">¿Cuánto pagas de renta o hipoteca al mes?</span>
                  <input className="input-field" value={aiHelpAnswers.rent} onChange={e => setAiHelpAnswers(a => ({ ...a, rent: e.target.value.replace(/[^0-9.]/g, '') }))} placeholder="$0" inputMode="decimal" />
                </div>
                <div className="col gap-6">
                  <span className="label">¿Tienes una meta importante (viaje, casa, carro)?</span>
                  <div className="row gap-6">
                    {['sí', 'no'].map(v => (
                      <button key={v} onClick={() => setAiHelpAnswers(a => ({ ...a, goal: v }))} style={{
                        flex: 1, padding: 10, borderRadius: 10, fontWeight: 700, fontSize: 13,
                        background: aiHelpAnswers.goal === v ? 'var(--pill-grad)' : 'var(--bg-elev)',
                        color: aiHelpAnswers.goal === v ? '#fff' : 'var(--text)'
                      }}>{v.toUpperCase()}</button>
                    ))}
                  </div>
                </div>
                <div className="col gap-6">
                  <span className="label">¿Quieres ahorrar agresivo este periodo?</span>
                  <div className="row gap-6">
                    {['sí', 'no'].map(v => (
                      <button key={v} onClick={() => setAiHelpAnswers(a => ({ ...a, save: v }))} style={{
                        flex: 1, padding: 10, borderRadius: 10, fontWeight: 700, fontSize: 13,
                        background: aiHelpAnswers.save === v ? 'var(--pill-grad)' : 'var(--bg-elev)',
                        color: aiHelpAnswers.save === v ? '#fff' : 'var(--text)'
                      }}>{v.toUpperCase()}</button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={askKleoHelp}
                  disabled={aiThinking || !aiHelpAnswers.rent || !aiHelpAnswers.goal || !aiHelpAnswers.save}
                  className="btn-primary"
                  style={{ background: 'var(--brand-grad)' }}
                >
                  <Icon name="sparkle" size={16} color="#fff" />
                  <span>{aiThinking ? 'Pensando...' : 'Generar mi presupuesto'}</span>
                </button>
              </div>
            )}

            {/* Sliders manuales (siempre visibles para ajustar fino) */}
            <div className="col gap-14">
              {Object.keys(ALLOCATION_LABELS).map(key => {
                const meta = ALLOCATION_LABELS[key];
                return (
                  <div key={key} className="col gap-4">
                    <div className="row gap-8" style={{ alignItems: 'center' }}>
                      <span style={{ fontSize: 18 }}>{meta.emoji}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, flex: 1 }}>{meta.label}</span>
                      <span style={{ fontSize: 14, fontWeight: 800, color: meta.color }}>{allocation[key]}%</span>
                    </div>
                    <input
                      type="range" min="0" max="100" step="5"
                      value={allocation[key]}
                      onChange={e => setAllocation(a => ({ ...a, [key]: parseInt(e.target.value) }))}
                      style={{ width: '100%', accentColor: meta.color }}
                    />
                    <span className="tiny" style={{ fontSize: 10 }}>{meta.desc}</span>
                  </div>
                );
              })}
            </div>

            <div className="row gap-8 mt-12" style={{
              padding: 10, borderRadius: 10,
              background: totalPct === 100 ? 'rgba(0,229,176,0.10)' : 'rgba(255,77,109,0.10)',
              border: `1px solid ${totalPct === 100 ? 'rgba(0,229,176,0.3)' : 'rgba(255,77,109,0.3)'}`,
              alignItems: 'center'
            }}>
              <span style={{ fontSize: 14 }}>{totalPct === 100 ? '✓' : '⚠️'}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: totalPct === 100 ? 'var(--green)' : 'var(--danger)' }}>
                Total: {totalPct}% — {totalPct === 100 ? 'perfecto' : `ajusta para sumar 100%`}
              </span>
            </div>

            <div className="row gap-8 mt-16">
              <button onClick={() => setStep(2)} style={{ flex: 1, padding: 14, borderRadius: 12, background: 'var(--bg-elev)', fontWeight: 700 }}>Atrás</button>
              <button className="btn-primary" style={{ flex: 1 }} onClick={() => setStep(4)} disabled={totalPct !== 100}>Siguiente</button>
            </div>
          </>
        )}

        {/* Step 4 — Resumen */}
        {step === 4 && (() => {
          const fmtPct = pct => Math.round((parseFloat(amount) * pct) / 100);
          return (
            <>
              <div className="card mb-12" style={{ background: 'var(--bg-elev)', padding: 14, borderRadius: 14 }}>
                <span className="tiny" style={{ fontWeight: 700, textTransform: 'uppercase' }}>Cobras</span>
                <div className="row gap-8" style={{ alignItems: 'baseline', marginTop: 4 }}>
                  <span style={{ fontSize: 24, fontWeight: 800 }}>{fmtMoney(parseFloat(amount))}</span>
                  <span style={{ fontSize: 13, color: 'var(--text-mute)' }}>{FREQUENCIES.find(f => f.id === frequency)?.label.toLowerCase()}</span>
                </div>
                <span className="tiny" style={{ fontSize: 11, marginTop: 4, display: 'block' }}>
                  Próximo cheque: {new Date(nextDate).toLocaleDateString('es-PR', { day: 'numeric', month: 'long' })}
                </span>
              </div>

              <span className="label" style={{ display: 'block', marginBottom: 8 }}>Distribución por cheque</span>
              <div className="col gap-8">
                {Object.keys(ALLOCATION_LABELS).map(key => {
                  const meta = ALLOCATION_LABELS[key];
                  return (
                    <div key={key} className="row gap-10" style={{
                      padding: 12, borderRadius: 10,
                      background: meta.color + '12',
                      border: `1px solid ${meta.color}33`,
                      alignItems: 'center'
                    }}>
                      <span style={{ fontSize: 20 }}>{meta.emoji}</span>
                      <div className="col gap-1" style={{ flex: 1 }}>
                        <span style={{ fontSize: 13, fontWeight: 700 }}>{meta.label}</span>
                        <span className="tiny" style={{ fontSize: 10 }}>{allocation[key]}%</span>
                      </div>
                      <span style={{ fontWeight: 800, fontSize: 15, color: meta.color }}>
                        ${fmtPct(allocation[key])}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="row gap-8 mt-20">
                <button onClick={() => setStep(3)} style={{ flex: 1, padding: 14, borderRadius: 12, background: 'var(--bg-elev)', fontWeight: 700 }}>Ajustar</button>
                <button className="btn-primary" style={{ flex: 1, background: 'var(--brand-grad)' }} onClick={handleSubmit} disabled={!valid}>Guardar</button>
              </div>
            </>
          );
        })()}
      </div>
    </div>
  );
}
