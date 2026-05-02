import { useState } from 'react';
import { useI18n } from '../i18n/index.jsx';

export default function AiInsights({ transactions, accounts, goals, fixedExpenses }) {
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
        body: JSON.stringify({
          transactions,
          accounts,
          goals,
          fixedExpenses,
          type: 'dashboard'
        })
      });
      const data = await res.json();
      if (data.result) {
        setInsights(data.result);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    }
    setLoading(false);
  };

  if (error) {
    return (
      <div className="card" style={{ background: 'var(--bg-elev)', border: 'none', textAlign: 'center', padding: 20 }}>
        <p style={{ fontSize: 14, color: 'var(--text-mute)' }}>{s.aiCouldNotLoad}</p>
        <button
          onClick={fetchInsights}
          style={{ marginTop: 8, fontSize: 13, color: 'var(--blue)', fontWeight: 600 }}
        >
          {s.retry}
        </button>
      </div>
    );
  }

  if (!insights) {
    return (
      <button
        onClick={fetchInsights}
        disabled={loading}
        className="card pressable"
        style={{
          width: '100%',
          padding: '16px',
          background: 'linear-gradient(135deg, rgba(0,229,176,0.08) 0%, rgba(0,132,255,0.08) 100%)',
          border: '1px solid rgba(0,229,176,0.2)',
          textAlign: 'left',
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }}
      >
        <span style={{ fontSize: 24 }}>{loading ? '⏳' : '🤖'}</span>
        <div className="col gap-2" style={{ flex: 1 }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>
            {loading ? s.aiAnalyzing : s.aiTitle}
          </span>
          <span className="tiny">
            {loading ? s.aiTakesSeconds : s.aiTapForTips}
          </span>
        </div>
      </button>
    );
  }

  return (
    <div className="col gap-10">
      <div className="row gap-8" style={{ alignItems: 'center' }}>
        <span style={{ fontSize: 18 }}>🤖</span>
        <span style={{ fontWeight: 600, fontSize: 14 }}>{s.aiTitle}</span>
        <button
          onClick={fetchInsights}
          className="tiny"
          style={{ marginLeft: 'auto', color: 'var(--blue)', fontWeight: 600 }}
        >
          {s.aiUpdate}
        </button>
      </div>
      {(() => {
        // Asegurar que siempre tengamos un array de tips
        let tips = insights;
        if (typeof tips === 'string') {
          try {
            let clean = tips.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
            tips = JSON.parse(clean);
          } catch { tips = null; }
        }
        if (!Array.isArray(tips)) {
          return (
            <div className="card" style={{ background: 'var(--bg-elev)', border: 'none', padding: 14 }}>
              <p style={{ fontSize: 14, lineHeight: 1.5 }}>{String(insights).replace(/```json|```/g, '').trim()}</p>
            </div>
          );
        }
        return tips.map((tip, i) => (
          <div
            key={i}
            className="card"
            style={{
              background: 'var(--bg-elev)',
              border: 'none',
              padding: '12px 14px'
            }}
          >
            <div className="row gap-10">
              <span style={{ fontSize: 20 }}>{tip.emoji || '💡'}</span>
              <div className="col gap-2" style={{ flex: 1 }}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{tip.title}</span>
                <span style={{ fontSize: 13, color: 'var(--text-mute)', lineHeight: 1.4 }}>{tip.text}</span>
              </div>
            </div>
          </div>
        ));
      })()}
    </div>
  );
}
