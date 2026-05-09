import { useState } from 'react';
import { Icon } from './icons.jsx';
import TopBar from './TopBar.jsx';
import { fmtMoney } from '../utils/storage.js';
import { useI18n } from '../i18n/index.jsx';
import { getAdvisorProfile } from '../lib/advisorProfile.js';
import { getBudget } from '../lib/budget.js';

export default function KleoAi({ transactions, accounts, goals, fixedExpenses, onHome, onMenu }) {
  const { strings: s, lang } = useI18n();
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [errorDetail, setErrorDetail] = useState(null);

  const fetchAnalysis = async () => {
    setLoading(true);
    setError(false);
    setErrorDetail(null);

    // Timeout de 60 segundos para no quedarse colgado para siempre
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    try {
      const res = await fetch('/api/ai/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactions, accounts, goals, fixedExpenses,
          advisorProfile: getAdvisorProfile(),
          budget: getBudget(),
          type: 'advisor'
        }),
        signal: controller.signal
      });
      clearTimeout(timeout);

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrorDetail({ ...data, status: res.status });
        setError(true);
      } else {
        const data = await res.json();
        if (data.result && typeof data.result === 'object') {
          setAnalysis(data.result);
        } else {
          setErrorDetail(data);
          setError(true);
        }
      }
    } catch (err) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') {
        setErrorDetail({ error: 'El análisis tardó más de 60 segundos. Intenta de nuevo.' });
      } else {
        setErrorDetail({ error: err.message });
      }
      setError(true);
    }
    setLoading(false);
  };

  const fmtDate = (iso) => {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleDateString(lang === 'en' ? 'en-US' : 'es-PR', { day: 'numeric', month: 'short' });
    } catch { return iso; }
  };

  return (
    <div className="screen" style={{ paddingTop: 0 }}>
      <TopBar onHome={onHome} onMenu={onMenu} title={s.kleoAiHeader} />

      <div style={{ padding: '16px 0 24px' }}>
        {/* Hero del asesor */}
        <div className="card mb-16" style={{
          background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15), rgba(0, 229, 176, 0.10))',
          border: '1px solid rgba(168, 85, 247, 0.3)',
          padding: 18,
          borderRadius: 22,
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute', top: -40, right: -40,
            width: 140, height: 140, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(168, 85, 247, 0.35), transparent 70%)',
            pointerEvents: 'none'
          }} />
          <div className="row gap-12" style={{ alignItems: 'center', position: 'relative' }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              background: 'linear-gradient(135deg, #FF2D6F, #A855F7, #00E5B0)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 4px 20px rgba(168, 85, 247, 0.45)'
            }}>
              <Icon name="sparkle" size={28} color="#fff" />
            </div>
            <div className="col gap-2" style={{ flex: 1 }}>
              <span style={{ fontWeight: 800, fontSize: 18 }}>Asesor financiero Kleo</span>
              <span className="tiny" style={{ fontSize: 12, lineHeight: 1.4 }}>
                Analizo tus cuentas, detecto riesgos y te doy un plan estratégico paso a paso.
              </span>
            </div>
          </div>
        </div>

        {/* Botón generar/actualizar */}
        <button
          onClick={fetchAnalysis}
          disabled={loading}
          className="btn-primary mb-20"
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, #A855F7, #00E5B0)',
            color: '#fff',
            fontWeight: 800,
            opacity: loading ? 0.6 : 1,
            boxShadow: '0 8px 24px rgba(168, 85, 247, 0.35)'
          }}
        >
          <Icon name="sparkle" size={18} color="#fff" />
          <span>{loading ? s.aiAnalyzing : (analysis ? s.refreshAdvice : s.generateAdvice)}</span>
        </button>

        {/* Loading skeleton */}
        {loading && !analysis && <LoadingSkeleton />}

        {/* Error */}
        {error && !loading && (
          <div className="card" style={{ background: 'var(--bg-elev)', border: 'none', padding: 18 }}>
            <p style={{ fontSize: 14, color: 'var(--text-mute)', marginBottom: 12, textAlign: 'center', fontWeight: 600 }}>
              {s.aiCouldNotLoad}
            </p>
            {errorDetail && (
              <div style={{
                background: 'rgba(255, 77, 109, 0.10)',
                border: '1px solid rgba(255, 77, 109, 0.3)',
                padding: 12,
                borderRadius: 10,
                fontSize: 11,
                lineHeight: 1.5,
                color: 'var(--text-mute)',
                fontFamily: 'monospace',
                wordBreak: 'break-word',
                marginBottom: 12
              }}>
                {errorDetail.status && <div><strong>Status:</strong> {errorDetail.status}</div>}
                {errorDetail.error_type && <div><strong>Type:</strong> {errorDetail.error_type}</div>}
                <div><strong>Error:</strong> {errorDetail.error || JSON.stringify(errorDetail).slice(0, 200) || 'Sin detalles'}</div>
                {errorDetail.detail && <div style={{ marginTop: 4 }}><strong>Detalle:</strong> {errorDetail.detail}</div>}
                {errorDetail.hint && <div style={{ marginTop: 4 }}>💡 {errorDetail.hint}</div>}
              </div>
            )}
            <button onClick={fetchAnalysis} style={{
              width: '100%', fontSize: 13, color: '#fff', fontWeight: 700,
              padding: 10, borderRadius: 10, background: 'var(--brand-grad)'
            }}>
              {s.retry}
            </button>
          </div>
        )}

        {/* Empty */}
        {!loading && !analysis && !error && (
          <div className="card col" style={{
            alignItems: 'center', padding: 40, gap: 12, textAlign: 'center',
            background: 'var(--bg-card)', border: '1px dashed var(--border)'
          }}>
            <span style={{ fontSize: 48 }}>🤖</span>
            <span style={{ fontWeight: 700, fontSize: 16 }}>Listo para analizar</span>
            <span className="tiny" style={{ maxWidth: 280, fontSize: 12, lineHeight: 1.5 }}>
              Toca "Analizar mis finanzas" y te daré un plan completo basado en tus cuentas, tus
              pagos próximos y tus patrones de gasto.
            </span>
          </div>
        )}

        {/* ============ ANÁLISIS ============ */}
        {analysis && (
          <div className="col gap-16">
            {/* Disponible esta semana */}
            <SectionCard
              title={s.aiSectionAvailable}
              icon="💰"
              color="#00E5B0"
            >
              <div style={{
                fontSize: 38,
                fontWeight: 800,
                letterSpacing: '-0.03em',
                background: 'linear-gradient(135deg, #00E5B0, #A855F7)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                lineHeight: 1
              }}>
                {fmtMoney(analysis.weekly_available || 0)}
              </div>
              <p className="tiny mt-8" style={{ fontSize: 12, lineHeight: 1.5 }}>
                {analysis.weekly_available_explanation}
              </p>
              {analysis.next_paycheck_estimate?.date && (
                <div className="row gap-6 mt-12" style={{
                  background: 'rgba(168, 85, 247, 0.12)',
                  padding: '6px 12px', borderRadius: 999,
                  display: 'inline-flex', alignItems: 'center'
                }}>
                  <span style={{ fontSize: 11 }}>💵</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#A855F7' }}>
                    {s.aiNextPaycheck
                      .replace('{date}', fmtDate(analysis.next_paycheck_estimate.date))
                      .replace('{amount}', fmtMoney(analysis.next_paycheck_estimate.amount || 0))}
                  </span>
                </div>
              )}
            </SectionCard>

            {/* Riesgos detectados */}
            {analysis.risks_detected?.length > 0 && (
              <SectionCard title={s.aiSectionRisks} icon="⚠️" color="#FF9500">
                <div className="col gap-10">
                  {analysis.risks_detected.map((r, i) => (
                    <RiskCard key={i} risk={r} s={s} />
                  ))}
                </div>
              </SectionCard>
            )}

            {/* Acciones recomendadas */}
            {analysis.recommended_actions?.length > 0 && (
              <SectionCard title={s.aiSectionActions} icon="🎯" color="#A855F7">
                <div className="col gap-12">
                  {analysis.recommended_actions.map((a, i) => (
                    <ActionCard key={i} action={a} s={s} />
                  ))}
                </div>
              </SectionCard>
            )}

            {/* Plan puente con tarjeta */}
            {analysis.credit_card_bridge_plan && (
              <SectionCard title={s.aiSectionBridge} icon="💳" color="#0A84FF">
                <BridgePlan plan={analysis.credit_card_bridge_plan} s={s} fmtDate={fmtDate} />
              </SectionCard>
            )}

            {/* Proyección flujo de efectivo */}
            {analysis.cash_flow_projection?.length > 0 && (
              <SectionCard title={s.aiSectionProjection} icon="📈" color="#00E5B0">
                <div className="col gap-8">
                  {analysis.cash_flow_projection.map((w, i) => (
                    <ProjectionRow key={i} week={w} s={s} />
                  ))}
                </div>
              </SectionCard>
            )}

            {/* Patrones */}
            {analysis.spending_patterns?.length > 0 && (
              <SectionCard title={s.aiSectionPatterns} icon="🔍" color="#FF2D6F">
                <div className="col gap-10">
                  {analysis.spending_patterns.map((p, i) => (
                    <div key={i} className="row gap-12" style={{ alignItems: 'flex-start' }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 10,
                        background: 'rgba(255, 45, 111, 0.12)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 18, flexShrink: 0
                      }}>{p.icon || '💡'}</div>
                      <div className="col gap-2" style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontWeight: 700, fontSize: 13 }}>{p.title}</span>
                        <span style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--text-mute)' }}>{p.text}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================ Sub-componentes ============================ */

function SectionCard({ title, icon, color, children }) {
  return (
    <div className="card" style={{
      padding: 16,
      borderRadius: 18,
      background: 'var(--bg-card)',
      border: '1px solid var(--border-soft)'
    }}>
      <div className="row gap-8 mb-12" style={{ alignItems: 'center' }}>
        <div style={{
          width: 32, height: 32, borderRadius: 10,
          background: color + '22',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, flexShrink: 0
        }}>{icon}</div>
        <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-mute)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}

function RiskCard({ risk, s }) {
  const colors = {
    low: '#00E5B0',
    medium: '#FF9500',
    high: '#FF4D6D'
  };
  const labels = {
    low: s.aiSeverityLow,
    medium: s.aiSeverityMedium,
    high: s.aiSeverityHigh
  };
  const c = colors[risk.severity] || '#A855F7';
  return (
    <div style={{
      padding: 12, borderRadius: 12,
      background: c + '12',
      border: `1px solid ${c}40`
    }}>
      <div className="spread mb-6" style={{ alignItems: 'center' }}>
        <div className="row gap-8" style={{ alignItems: 'center' }}>
          <span style={{ fontSize: 18 }}>{risk.icon || '⚠️'}</span>
          <span style={{ fontWeight: 700, fontSize: 13 }}>{risk.title}</span>
        </div>
        <span style={{
          fontSize: 9, fontWeight: 800,
          color: c, background: c + '22',
          padding: '3px 8px', borderRadius: 999,
          letterSpacing: '0.05em'
        }}>{labels[risk.severity] || risk.severity}</span>
      </div>
      {risk.description && (
        <p className="tiny" style={{ fontSize: 12, lineHeight: 1.5, marginBottom: 6 }}>
          {risk.description}
        </p>
      )}
      {risk.recommendation && (
        <div className="row gap-6" style={{ alignItems: 'flex-start', marginTop: 6 }}>
          <span style={{ fontSize: 12, color: c, fontWeight: 700 }}>→</span>
          <span style={{ fontSize: 12, lineHeight: 1.5, fontWeight: 600, flex: 1 }}>
            {risk.recommendation}
          </span>
        </div>
      )}
    </div>
  );
}

function ActionCard({ action, s }) {
  return (
    <div style={{
      padding: 14, borderRadius: 12,
      background: 'var(--bg-elev)',
      border: '1px solid var(--border-soft)'
    }}>
      <div className="row gap-10 mb-8" style={{ alignItems: 'flex-start' }}>
        <div style={{
          width: 32, height: 32, borderRadius: 10,
          background: 'var(--pill-grad)',
          color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 800, fontSize: 13, flexShrink: 0
        }}>
          {action.priority || '★'}
        </div>
        <div className="col gap-2" style={{ flex: 1 }}>
          <div className="row gap-6" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 16 }}>{action.icon || '🎯'}</span>
            <span style={{ fontWeight: 800, fontSize: 14 }}>{action.title}</span>
          </div>
          {action.reasoning && (
            <span style={{ fontSize: 12, lineHeight: 1.4, color: 'var(--text-mute)' }}>
              {action.reasoning}
            </span>
          )}
        </div>
      </div>
      {action.steps?.length > 0 && (
        <div className="col gap-6" style={{ marginTop: 10 }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-mute)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {s.aiRecommendedSteps}
          </span>
          {action.steps.map((step, i) => (
            <div key={i} className="row gap-8" style={{ alignItems: 'flex-start' }}>
              <span style={{
                width: 18, height: 18, borderRadius: '50%',
                background: 'var(--bg-card)',
                color: 'var(--purple)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: 11, flexShrink: 0
              }}>{i + 1}</span>
              <span style={{ fontSize: 12, lineHeight: 1.5, flex: 1 }}>{step}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BridgePlan({ plan, s, fmtDate }) {
  if (!plan.needed) {
    return (
      <div className="row gap-10" style={{ alignItems: 'center' }}>
        <span style={{ fontSize: 24 }}>✅</span>
        <span style={{ fontSize: 13, fontWeight: 700, flex: 1 }}>{s.aiBridgeNotNeeded}</span>
      </div>
    );
  }
  return (
    <>
      {plan.plan_summary && (
        <p style={{ fontSize: 13, lineHeight: 1.5, fontWeight: 600, marginBottom: 12 }}>
          {plan.plan_summary}
        </p>
      )}
      <div className="col gap-8">
        {(plan.moves || []).map((m, i) => (
          <div key={i} style={{
            padding: 12, borderRadius: 10,
            background: 'rgba(10, 132, 255, 0.10)',
            border: '1px solid rgba(10, 132, 255, 0.25)'
          }}>
            <div className="row gap-8 mb-4" style={{ alignItems: 'center' }}>
              <span style={{ fontSize: 16 }}>💳</span>
              <span style={{ fontSize: 13, fontWeight: 800, flex: 1 }}>
                {s.aiBridgeMove.replace('{bill}', m.bill).replace('{card}', m.card)}
              </span>
              <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--blue)' }}>
                {fmtMoney(m.amount)}
              </span>
            </div>
            {m.repay_date && (
              <span className="tiny" style={{ fontSize: 11, lineHeight: 1.4 }}>
                {s.aiBridgeRepay
                  .replace('{amount}', fmtMoney(m.amount))
                  .replace('{date}', fmtDate(m.repay_date))}
              </span>
            )}
            {m.reason && (
              <p className="tiny" style={{ fontSize: 11, lineHeight: 1.4, marginTop: 4, color: 'var(--text-mute)' }}>
                {m.reason}
              </p>
            )}
          </div>
        ))}
      </div>
      {plan.future_paycheck_deduction > 0 && (
        <div className="card mt-12" style={{
          padding: 10, borderRadius: 10,
          background: 'rgba(255, 149, 0, 0.10)',
          border: '1px solid rgba(255, 149, 0, 0.25)'
        }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--orange)' }}>
            ⚠️ {fmtMoney(plan.future_paycheck_deduction)} de tu próximo cheque ya están comprometidos para repagar la tarjeta.
          </span>
        </div>
      )}
    </>
  );
}

function ProjectionRow({ week, s }) {
  return (
    <div style={{
      padding: 10, borderRadius: 10,
      background: 'var(--bg-elev)'
    }}>
      <span style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, display: 'block' }}>
        {week.week_label}
      </span>
      <div className="row gap-8" style={{ flexWrap: 'wrap' }}>
        <div className="col gap-1" style={{ flex: 1, minWidth: 80 }}>
          <span style={{ fontSize: 9, color: 'var(--text-mute)', fontWeight: 700, textTransform: 'uppercase' }}>
            {s.aiInWeek}
          </span>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)' }}>
            +{fmtMoney(week.income || 0)}
          </span>
        </div>
        <div className="col gap-1" style={{ flex: 1, minWidth: 80 }}>
          <span style={{ fontSize: 9, color: 'var(--text-mute)', fontWeight: 700, textTransform: 'uppercase' }}>
            {s.aiOutWeek}
          </span>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--danger)' }}>
            −{fmtMoney(week.expenses || 0)}
          </span>
        </div>
        <div className="col gap-1" style={{ flex: 1, minWidth: 90 }}>
          <span style={{ fontSize: 9, color: 'var(--text-mute)', fontWeight: 700, textTransform: 'uppercase' }}>
            {s.aiEndBal}
          </span>
          <span style={{ fontSize: 13, fontWeight: 800 }}>
            {fmtMoney(week.end_balance || 0)}
          </span>
        </div>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="col gap-12">
      {[0, 1, 2].map(i => (
        <div key={i} className="card" style={{
          background: 'var(--bg-elev)',
          border: 'none',
          padding: 16,
          borderRadius: 18,
          animation: `pulse 1.4s ease-in-out ${i * 0.15}s infinite`
        }}>
          <div style={{ height: 14, width: '50%', background: 'var(--border)', borderRadius: 4, marginBottom: 10 }} />
          <div style={{ height: 22, width: '70%', background: 'var(--border)', borderRadius: 4, marginBottom: 8 }} />
          <div style={{ height: 11, width: '90%', background: 'var(--border)', borderRadius: 4, marginBottom: 4 }} />
          <div style={{ height: 11, width: '80%', background: 'var(--border)', borderRadius: 4 }} />
        </div>
      ))}
      <style>{`@keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.7; } }`}</style>
    </div>
  );
}
