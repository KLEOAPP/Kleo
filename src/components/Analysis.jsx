import { useMemo, useState } from 'react';
import { Icon } from './icons.jsx';
import TopBar from './TopBar.jsx';
import { CATEGORIES } from '../data/sampleData.js';
import { fmtMoney, fmtMoneyShort } from '../utils/storage.js';

export default function Analysis({ transactions, onHome, onMenu }) {
  const [view, setView] = useState('week');

  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const thisMonth = transactions
      .filter(t => new Date(t.date) >= monthStart && t.amount < 0 && t.category !== 'transferencia')
      .reduce((s, t) => s + Math.abs(t.amount), 0);

    const lastMonth = transactions
      .filter(t => {
        const d = new Date(t.date);
        return d >= lastMonthStart && d <= lastMonthEnd && t.amount < 0 && t.category !== 'transferencia';
      })
      .reduce((s, t) => s + Math.abs(t.amount), 0);

    // approx last month from limited sample data
    const approxLast = lastMonth || thisMonth * 1.18;
    const diff = thisMonth - approxLast;
    const pctChange = approxLast > 0 ? (diff / approxLast) * 100 : 0;

    return { thisMonth, lastMonth: approxLast, diff, pctChange };
  }, [transactions]);

  const weeklyData = useMemo(() => {
    const weeks = [0, 0, 0, 0];
    const now = new Date();
    transactions
      .filter(t => t.amount < 0 && t.category !== 'transferencia')
      .forEach(t => {
        const d = new Date(t.date);
        const daysAgo = Math.floor((now - d) / (1000 * 60 * 60 * 24));
        const weekIdx = Math.floor(daysAgo / 7);
        if (weekIdx >= 0 && weekIdx < 4) {
          weeks[3 - weekIdx] += Math.abs(t.amount);
        }
      });
    return weeks;
  }, [transactions]);

  const categoryData = useMemo(() => {
    const totals = {};
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    transactions
      .filter(t => new Date(t.date) >= monthStart && t.amount < 0 && t.category !== 'transferencia')
      .forEach(t => {
        totals[t.category] = (totals[t.category] || 0) + Math.abs(t.amount);
      });
    const sum = Object.values(totals).reduce((s, v) => s + v, 0);
    return Object.entries(totals)
      .map(([cat, amount]) => ({
        cat,
        amount,
        pct: (amount / sum) * 100,
        ...CATEGORIES[cat]
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [transactions]);

  const maxWeek = Math.max(...weeklyData, 1);

  const recommendations = useMemo(() => {
    const recs = [];
    const top = categoryData[0];
    if (top) {
      recs.push({
        icon: '✨',
        title: `Tu mayor gasto es en ${top.label}`,
        body: `${fmtMoney(top.amount)} este mes (${top.pct.toFixed(0)}%). Si lo reduces 15%, ahorrarías ${fmtMoney(top.amount * 0.15)}/mes.`
      });
    }
    if (stats.pctChange > 0) {
      recs.push({
        icon: '⚠️',
        title: 'Estás gastando más que el mes pasado',
        body: `${stats.pctChange.toFixed(1)}% más. Revisa tus categorías para identificar dónde ajustar.`
      });
    } else {
      recs.push({
        icon: '🎯',
        title: '¡Vas mejor que el mes pasado!',
        body: `Has gastado ${fmtMoney(Math.abs(stats.diff))} menos. Considera mover esa diferencia a tus ahorros.`
      });
    }
    const cafe = categoryData.find(c => c.cat === 'cafe');
    if (cafe && cafe.amount > 25) {
      recs.push({
        icon: '☕',
        title: 'Hábito identificado: Café',
        body: `Llevas ${fmtMoney(cafe.amount)} en café. Una cafetera en casa se paga sola en 2 meses.`
      });
    }
    return recs;
  }, [categoryData, stats]);

  return (
    <div className="screen" style={{ paddingTop: 0 }}>
      <TopBar onHome={onHome} onMenu={onMenu} title="Análisis" />
      <div style={{ padding: '12px 0' }}></div>

      {/* Comparativa mes vs mes */}
      <div className="card mb-20" style={{ background: 'linear-gradient(135deg, rgba(0,229,176,0.06) 0%, rgba(0,132,255,0.06) 100%)', borderColor: 'rgba(0,229,176,0.15)' }}>
        <span className="label">Gasto este mes</span>
        <h1 className="h1 mt-8" style={{ fontSize: 38 }}>{fmtMoney(stats.thisMonth)}</h1>
        <div className="row gap-8 mt-12">
          <div className="row gap-4" style={{
            background: stats.pctChange > 0 ? 'rgba(255, 77, 109, 0.15)' : 'rgba(0, 229, 176, 0.15)',
            color: stats.pctChange > 0 ? 'var(--danger)' : 'var(--green)',
            padding: '4px 10px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600
          }}>
            <Icon name={stats.pctChange > 0 ? 'trending-up' : 'trending-down'} size={14} />
            <span>{Math.abs(stats.pctChange).toFixed(1)}%</span>
          </div>
          <span className="tiny">vs mes pasado ({fmtMoney(stats.lastMonth)})</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs mb-16">
        <button className={`tab ${view === 'week' ? 'active' : ''}`} onClick={() => setView('week')}>Semanas</button>
        <button className={`tab ${view === 'category' ? 'active' : ''}`} onClick={() => setView('category')}>Categorías</button>
      </div>

      {view === 'week' && (
        <div className="card">
          <div className="spread mb-16">
            <h3 className="h3">Por Semana</h3>
            <span className="tiny">Últimas 4 semanas</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', height: 180, gap: 12, padding: '8px 0' }}>
            {weeklyData.map((val, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <span className="tiny" style={{ fontWeight: 600, color: 'var(--text)' }}>{fmtMoneyShort(val)}</span>
                <div style={{
                  width: '100%',
                  height: `${(val / maxWeek) * 130}px`,
                  background: i === 3 ? 'var(--gradient)' : 'var(--bg-elev)',
                  borderRadius: 8,
                  minHeight: 8
                }}></div>
                <span className="tiny">S{i + 1}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === 'category' && (
        <div className="card">
          <h3 className="h3 mb-16">Por Categoría</h3>

          {/* Donut visual */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
            <DonutChart data={categoryData} />
          </div>

          <div className="col gap-12">
            {categoryData.map(c => (
              <div key={c.cat} className="spread">
                <div className="row gap-12">
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: c.color, flexShrink: 0 }}></span>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{c.icon} {c.label}</span>
                </div>
                <div className="col" style={{ alignItems: 'flex-end' }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{fmtMoney(c.amount)}</span>
                  <span className="tiny">{c.pct.toFixed(1)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recomendaciones IA */}
      <div className="mt-24">
        <div className="row gap-8 mb-12">
          <Icon name="sparkle" size={18} color="var(--green)" />
          <h3 className="h3">Recomendaciones de Kleo IA</h3>
        </div>
        <div className="col gap-12">
          {recommendations.map((r, i) => (
            <div key={i} className="ai-alert">
              <div className="ai-icon">
                <span style={{ fontSize: 16 }}>{r.icon}</span>
              </div>
              <div className="col gap-4" style={{ flex: 1 }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{r.title}</span>
                <span style={{ fontSize: 13, color: 'var(--text-mute)', lineHeight: 1.5 }}>{r.body}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DonutChart({ data }) {
  const size = 160;
  const r = 64;
  const cx = size / 2;
  const cy = size / 2;
  const C = 2 * Math.PI * r;
  const total = data.reduce((s, d) => s + d.amount, 0);

  let offset = 0;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--bg-elev)" strokeWidth={18} />
      {data.map((d, i) => {
        const len = (d.amount / total) * C;
        const dasharray = `${len} ${C - len}`;
        const dashoffset = -offset;
        offset += len;
        return (
          <circle
            key={d.cat}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={d.color}
            strokeWidth={18}
            strokeDasharray={dasharray}
            strokeDashoffset={dashoffset}
            strokeLinecap="butt"
          />
        );
      })}
      <text
        x={cx} y={cy}
        textAnchor="middle"
        dominantBaseline="central"
        fill="white"
        fontSize="14"
        fontWeight="600"
        style={{ transform: 'rotate(90deg)', transformOrigin: 'center' }}
      >
        {fmtMoneyShort(total)}
      </text>
    </svg>
  );
}
