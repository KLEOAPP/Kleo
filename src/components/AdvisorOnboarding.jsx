import { useState } from 'react';
import { Icon } from './icons.jsx';
import BankLogo from './BankLogo.jsx';
import {
  saveAdvisorProfile, setManualApr, UTILIZATION_OPTIONS, cardsWithoutApr
} from '../lib/advisorProfile.js';

/**
 * Wizard que se abre después de conectar el primer banco. Configura el asesor:
 *   1) APRs faltantes (statement upload o manual)
 *   2) Utilización meta (5/10/15/20/25/30%)
 *   3) ¿Tienes un plan financiero? Sí/No → si sí, descríbelo
 *   4) Resumen + activar
 */
export default function AdvisorOnboarding({ accounts, profile, onSave, onClose }) {
  const cards = (accounts || []).filter(a => a.type === 'credit');
  const missingAprCards = cardsWithoutApr(cards, profile);

  // Paso 1 saltarse si todas las tarjetas tienen APR
  const startStep = missingAprCards.length > 0 ? 1 : 2;
  const [step, setStep] = useState(startStep);

  const [manualAprs, setManualAprsState] = useState(profile?.manual_aprs || {});
  const [targetUtil, setTargetUtil] = useState(profile?.target_utilization || 5);
  const [hasPlan, setHasPlan] = useState(profile?.has_existing_plan ?? null);
  const [planDesc, setPlanDesc] = useState(profile?.existing_plan_description || '');

  const totalSteps = 4;

  const finish = () => {
    // Guarda APRs manuales
    Object.entries(manualAprs).forEach(([cardId, apr]) => {
      if (apr && parseFloat(apr) > 0) setManualApr(cardId, apr);
    });
    // Guarda preferencias
    const saved = saveAdvisorProfile({
      onboarding_completed: true,
      target_utilization: targetUtil,
      has_existing_plan: hasPlan,
      existing_plan_description: hasPlan ? planDesc : null
    });
    onSave?.(saved);
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
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
            width: 48, height: 48, borderRadius: 14,
            background: 'var(--brand-grad)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 4px 18px rgba(168, 85, 247, 0.4)'
          }}>
            <Icon name="sparkle" size={26} color="#fff" />
          </div>
          <div className="col gap-2" style={{ flex: 1 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-mute)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Configurar asesor · Paso {step} / {totalSteps}
            </span>
            <span style={{ fontSize: 18, fontWeight: 800 }}>
              {step === 1 && 'Necesito el APR de tus tarjetas'}
              {step === 2 && '¿Qué utilización meta quieres?'}
              {step === 3 && '¿Cómo manejas tus finanzas?'}
              {step === 4 && 'Listo para activar'}
            </span>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--bg-elev)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="x" size={16} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="row gap-4 mb-20">
          {[1, 2, 3, 4].map(n => (
            <div key={n} style={{
              flex: 1, height: 4, borderRadius: 999,
              background: n <= step ? 'var(--brand-grad)' : 'var(--bg-elev)'
            }} />
          ))}
        </div>

        {/* PASO 1 — APRs faltantes */}
        {step === 1 && (
          <>
            <p className="tiny mb-16" style={{ fontSize: 12, lineHeight: 1.5 }}>
              Tu banco no me devolvió el APR (interés) de algunas tarjetas. Sin
              esto no puedo calcular cuánto te cuestan los intereses ni
              recomendarte pagos óptimos. Súbelo o escríbelo a mano.
            </p>

            <div className="col gap-10">
              {missingAprCards.map(c => (
                <div key={c.id} className="card" style={{ padding: 14, borderRadius: 14 }}>
                  <div className="row gap-10 mb-10" style={{ alignItems: 'center' }}>
                    <BankLogo institution={c.institution || c.name} size={32} radius={8} />
                    <div className="col gap-1" style={{ flex: 1 }}>
                      <span style={{ fontSize: 13, fontWeight: 700 }}>{c.institution || c.name}</span>
                      <span className="tiny" style={{ fontSize: 11 }}>••{c.last4}</span>
                    </div>
                  </div>
                  <div className="col gap-6">
                    <span className="label" style={{ fontSize: 11 }}>APR (% anual)</span>
                    <div className="row" style={{ background: 'var(--bg-input)', borderRadius: 10, border: '1px solid var(--border)', padding: '0 12px', height: 44 }}>
                      <input
                        type="number" step="0.01" min="0" max="100"
                        value={manualAprs[c.id] || ''}
                        onChange={e => setManualAprsState(p => ({ ...p, [c.id]: e.target.value }))}
                        placeholder="22.99"
                        style={{ background: 'transparent', border: 'none', height: 44, fontSize: 16, fontWeight: 600, padding: '0 6px', flex: 1, outline: 'none', color: 'inherit' }}
                      />
                      <span style={{ fontSize: 14, color: 'var(--text-mute)', fontWeight: 600 }}>%</span>
                    </div>
                    <span className="tiny" style={{ fontSize: 10, lineHeight: 1.4 }}>
                      Lo encuentras en tu estado de cuenta más reciente bajo
                      "Annual Percentage Rate" o "APR".
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setStep(2)}
              className="btn-primary mt-20"
              style={{ background: 'var(--brand-grad)' }}
            >
              Siguiente
            </button>
            <button
              onClick={() => setStep(2)}
              className="tiny mt-12"
              style={{ width: '100%', textAlign: 'center', color: 'var(--text-mute)', fontWeight: 600 }}
            >
              Lo hago después
            </button>
          </>
        )}

        {/* PASO 2 — Utilización meta */}
        {step === 2 && (
          <>
            <p className="tiny mb-16" style={{ fontSize: 12, lineHeight: 1.5 }}>
              La <strong>utilización</strong> es cuánto debes en tarjetas vs tu
              límite total. Es 30% de tu score FICO. Mientras más bajo, mejor
              tu crédito.
            </p>

            <div className="col gap-8">
              {UTILIZATION_OPTIONS.map(opt => {
                const active = targetUtil === opt.pct;
                return (
                  <button
                    key={opt.pct}
                    onClick={() => setTargetUtil(opt.pct)}
                    className="row gap-12"
                    style={{
                      width: '100%', padding: 14, borderRadius: 14,
                      background: active ? `${opt.badgeColor}15` : 'var(--bg-elev)',
                      border: `1.5px solid ${active ? opt.badgeColor : 'var(--border)'}`,
                      textAlign: 'left', alignItems: 'flex-start'
                    }}
                  >
                    <div style={{
                      width: 44, height: 44, borderRadius: 12,
                      background: active ? opt.badgeColor : opt.badgeColor + '33',
                      color: active ? '#fff' : opt.badgeColor,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 800, fontSize: 16,
                      flexShrink: 0
                    }}>
                      {opt.pct}%
                    </div>
                    <div className="col gap-2" style={{ flex: 1, minWidth: 0 }}>
                      <div className="row gap-6" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 14, fontWeight: 800, color: opt.badgeColor }}>{opt.badge}</span>
                        {opt.recommended && (
                          <span style={{
                            fontSize: 9, fontWeight: 800, padding: '2px 6px',
                            background: 'var(--brand-grad)', color: '#fff',
                            borderRadius: 999, letterSpacing: '0.05em'
                          }}>RECOMENDADO</span>
                        )}
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{opt.impact}</span>
                      <span className="tiny" style={{ fontSize: 11 }}>{opt.bestFor}</span>
                      {active && (
                        <div className="col gap-3" style={{ marginTop: 6 }}>
                          <span className="tiny" style={{ fontSize: 11 }}>
                            <strong style={{ color: '#00E5B0' }}>+ Pro:</strong> {opt.pros}
                          </span>
                          <span className="tiny" style={{ fontSize: 11 }}>
                            <strong style={{ color: '#FF9500' }}>− Contra:</strong> {opt.cons}
                          </span>
                        </div>
                      )}
                    </div>
                    {active && <Icon name="check" size={18} color={opt.badgeColor} stroke={3} />}
                  </button>
                );
              })}
            </div>

            <div className="row gap-8 mt-20">
              <button onClick={() => setStep(missingAprCards.length > 0 ? 1 : 2)}
                style={{ flex: 1, padding: 14, borderRadius: 12, background: 'var(--bg-elev)', fontWeight: 700 }}
                disabled={missingAprCards.length === 0}>
                Atrás
              </button>
              <button className="btn-primary" style={{ flex: 1, background: 'var(--brand-grad)' }} onClick={() => setStep(3)}>
                Siguiente
              </button>
            </div>
          </>
        )}

        {/* PASO 3 — Plan financiero */}
        {step === 3 && (
          <>
            <p className="tiny mb-16" style={{ fontSize: 12, lineHeight: 1.5 }}>
              Quiero entender cómo manejas tus finanzas hoy para optimizar lo
              que ya haces o crearte un plan si no tienes uno.
            </p>

            <span className="label" style={{ display: 'block', marginBottom: 8 }}>
              ¿Tienes un plan financiero actual?
            </span>
            <div className="row gap-8 mb-16">
              {[
                { v: true,  label: 'Sí, tengo un plan', emoji: '✅' },
                { v: false, label: 'No, ayúdame',         emoji: '🤝' }
              ].map(opt => {
                const active = hasPlan === opt.v;
                return (
                  <button
                    key={String(opt.v)}
                    onClick={() => setHasPlan(opt.v)}
                    className="col gap-6"
                    style={{
                      flex: 1, padding: 16, borderRadius: 14,
                      background: active ? 'rgba(168, 85, 247, 0.12)' : 'var(--bg-elev)',
                      border: `1.5px solid ${active ? 'var(--purple)' : 'var(--border)'}`,
                      alignItems: 'center'
                    }}
                  >
                    <span style={{ fontSize: 28 }}>{opt.emoji}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, textAlign: 'center' }}>{opt.label}</span>
                  </button>
                );
              })}
            </div>

            {hasPlan === true && (
              <div className="col gap-6 mb-16">
                <span className="label">Cuéntame en una oración cómo es tu plan</span>
                <textarea
                  value={planDesc}
                  onChange={e => setPlanDesc(e.target.value)}
                  placeholder="Ej: Pago renta los días 1, ahorro $200 cada cheque, y pago tarjetas mínimo cada mes."
                  rows={4}
                  style={{
                    width: '100%', padding: 14, borderRadius: 12,
                    background: 'var(--bg-elev)', border: 'none',
                    fontSize: 14, fontFamily: 'inherit', color: 'var(--text)',
                    resize: 'none', outline: 'none', lineHeight: 1.5
                  }}
                />
                <span className="tiny" style={{ fontSize: 11 }}>
                  Voy a respetar lo que haces y solo proponerte mejoras.
                </span>
              </div>
            )}
            {hasPlan === false && (
              <div className="card mb-16" style={{
                padding: 14, borderRadius: 14,
                background: 'rgba(0, 229, 176, 0.08)',
                border: '1px solid rgba(0, 229, 176, 0.3)'
              }}>
                <div className="row gap-10" style={{ alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 22 }}>🎯</span>
                  <div className="col gap-2" style={{ flex: 1 }}>
                    <span style={{ fontSize: 13, fontWeight: 800 }}>Te creo un plan</span>
                    <span className="tiny" style={{ fontSize: 11, lineHeight: 1.5 }}>
                      Voy a analizar tus últimos 6 meses y proponerte un plan completo:
                      cuándo pagar cada tarjeta, cuánto ahorrar, qué pagos vienen, y
                      cómo evitar atrasos. Lo verás en la sección Kleo AI.
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="row gap-8 mt-12">
              <button onClick={() => setStep(2)} style={{ flex: 1, padding: 14, borderRadius: 12, background: 'var(--bg-elev)', fontWeight: 700 }}>
                Atrás
              </button>
              <button
                className="btn-primary" style={{ flex: 1, background: 'var(--brand-grad)' }}
                onClick={() => setStep(4)}
                disabled={hasPlan === null || (hasPlan === true && planDesc.trim().length < 10)}
              >
                Siguiente
              </button>
            </div>
          </>
        )}

        {/* PASO 4 — Resumen */}
        {step === 4 && (
          <>
            <div className="card mb-12" style={{ padding: 14, borderRadius: 14, background: 'var(--bg-elev)' }}>
              <span className="tiny" style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: 10 }}>
                Configuración del asesor
              </span>
              <div className="col gap-10 mt-8">
                <div className="row gap-8" style={{ alignItems: 'center' }}>
                  <span style={{ fontSize: 18 }}>🎯</span>
                  <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>Utilización meta</span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: UTILIZATION_OPTIONS.find(o => o.pct === targetUtil)?.badgeColor }}>
                    {targetUtil}%
                  </span>
                </div>
                <div className="row gap-8" style={{ alignItems: 'center' }}>
                  <span style={{ fontSize: 18 }}>📋</span>
                  <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>
                    {hasPlan ? 'Optimizo tu plan' : 'Te creo un plan'}
                  </span>
                </div>
                {Object.values(manualAprs).filter(v => v).length > 0 && (
                  <div className="row gap-8" style={{ alignItems: 'center' }}>
                    <span style={{ fontSize: 18 }}>💳</span>
                    <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>
                      {Object.values(manualAprs).filter(v => v).length} APRs ingresados
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="card mb-16" style={{
              padding: 14, borderRadius: 14,
              background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.10), rgba(0, 229, 176, 0.08))',
              border: '1px solid rgba(168, 85, 247, 0.25)'
            }}>
              <div className="row gap-10" style={{ alignItems: 'flex-start' }}>
                <Icon name="sparkle" size={22} color="#A855F7" />
                <div className="col gap-3" style={{ flex: 1 }}>
                  <span style={{ fontSize: 13, fontWeight: 800 }}>Lo que voy a hacer ahora</span>
                  <ul className="col gap-3" style={{ paddingLeft: 14, fontSize: 12, lineHeight: 1.5, margin: 0 }}>
                    <li>Analizar 6 meses de transacciones</li>
                    <li>Auto-poblar tu calendario con pagos fijos y suscripciones</li>
                    <li>Calcular tu disponible real esta semana</li>
                    <li>Detectar riesgos antes de que ocurran</li>
                    <li>Avisarte 2 días antes de cada cierre de ciclo cuánto pagar</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="row gap-8">
              <button onClick={() => setStep(3)} style={{ flex: 1, padding: 14, borderRadius: 12, background: 'var(--bg-elev)', fontWeight: 700 }}>
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
