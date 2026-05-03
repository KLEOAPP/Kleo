import { useState } from 'react';
import { Icon } from './icons.jsx';
import TopBar from './TopBar.jsx';
import { useI18n } from '../i18n/index.jsx';

export default function KleoAi({ transactions, accounts, goals, fixedExpenses, onHome, onMenu }) {
  const { strings: s } = useI18n();
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const fetchInsights = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch('/api/ai/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions, accounts, goals, fixedExpenses, type: 'dashboard' })
      });
      const data = await res.json();
      if (data.result) setInsights(data.result);
      else setError(true);
    } catch {
      setError(true);
    }
    setLoading(false);
  };

  let tips = insights;
  if (typeof tips === 'string') {
    try {
      const clean = tips.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      tips = JSON.parse(clean);
    } catch { tips = null; }
  }

  return (
    <div className="screen" style={{ paddingTop: 0 }}>
      <TopBar onHome={onHome} onMenu={onMenu} title={s.kleoAiHeader} />

      <div style={{ padding: '16px 0 24px' }}>
        {/* Hero */}
        <div className="card mb-20" style={{
          background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15), rgba(0, 229, 176, 0.1))',
          border: '1px solid rgba(168, 85, 247, 0.25)',
          padding: 18,
          borderRadius: 22
        }}>
          <div className="row gap-12" style={{ alignItems: 'center' }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14,
              background: 'linear-gradient(135deg, #FF2D6F, #A855F7, #00E5B0)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0
            }}>
              <Icon name="sparkle" size={26} color="#fff" />
            </div>
            <div className="col gap-2" style={{ flex: 1 }}>
              <span style={{ fontWeight: 700, fontSize: 18 }}>{s.kleoAiHeader}</span>
              <span className="tiny">{s.kleoAiSubtitle}</span>
            </div>
          </div>
        </div>

        {/* Generate / refresh button */}
        <button
          onClick={fetchInsights}
          disabled={loading}
          className="btn-primary mb-20"
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, #A855F7, #00E5B0)',
            color: '#fff',
            fontWeight: 700,
            opacity: loading ? 0.6 : 1
          }}
        >
          <Icon name="sparkle" size={18} color="#fff" />
          <span>{loading ? s.aiAnalyzing : (insights ? s.refreshAdvice : s.generateAdvice)}</span>
        </button>

        {/* Loading state */}
        {loading && !insights && (
          <div className="col gap-12">
            {[0, 1, 2].map(i => (
              <div key={i} className="card" style={{
                background: 'var(--bg-elev)',
                border: 'none',
                padding: 16,
                opacity: 0.5,
                animation: `pulse 1.4s ease-in-out ${i * 0.15}s infinite`
              }}>
                <div style={{ height: 14, width: '60%', background: 'var(--border)', borderRadius: 4, marginBottom: 8 }} />
                <div style={{ height: 11, width: '90%', background: 'var(--border)', borderRadius: 4, marginBottom: 4 }} />
                <div style={{ height: 11, width: '75%', background: 'var(--border)', borderRadius: 4 }} />
              </div>
            ))}
            <style>{`@keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.7; } }`}</style>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="card" style={{ background: 'var(--bg-elev)', border: 'none', textAlign: 'center', padding: 24 }}>
            <p style={{ fontSize: 14, color: 'var(--text-mute)', marginBottom: 8 }}>{s.aiCouldNotLoad}</p>
            <button onClick={fetchInsights} style={{ fontSize: 13, color: 'var(--blue)', fontWeight: 600 }}>
              {s.retry}
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !insights && !error && (
          <div className="card col" style={{
            alignItems: 'center', padding: 40, gap: 12, textAlign: 'center',
            background: 'var(--bg-card)', border: '1px dashed var(--border)'
          }}>
            <span style={{ fontSize: 48 }}>🤖</span>
            <span style={{ fontWeight: 600, fontSize: 16 }}>{s.aiTapForTips}</span>
            <span className="tiny" style={{ maxWidth: 260 }}>{s.aiTakesSeconds}</span>
          </div>
        )}

        {/* Tips */}
        {Array.isArray(tips) && (
          <div className="col gap-12">
            {tips.map((tip, i) => (
              <div key={i} className="card" style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-soft)',
                padding: 16,
                borderRadius: 16
              }}>
                <div className="row gap-12" style={{ alignItems: 'flex-start' }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 12,
                    background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(0, 229, 176, 0.15))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 22, flexShrink: 0
                  }}>
                    {tip.emoji || '💡'}
                  </div>
                  <div className="col gap-4" style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{tip.title}</span>
                    <span style={{ fontSize: 13, color: 'var(--text-mute)', lineHeight: 1.5 }}>{tip.text}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Plain string fallback */}
        {insights && !Array.isArray(tips) && (
          <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-soft)', padding: 16 }}>
            <p style={{ fontSize: 14, lineHeight: 1.5 }}>
              {String(insights).replace(/```json|```/g, '').trim()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
