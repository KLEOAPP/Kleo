import { useMemo, useState } from 'react';
import { Icon } from './icons.jsx';
import TopBar from './TopBar.jsx';
import { CATEGORIES } from '../data/sampleData.js';
import { fmtMoney, fmtMoneyShort, monthName } from '../utils/storage.js';

export default function Reports({ transactions, fixedExpenses, onBack, onHome }) {
  const [period, setPeriod] = useState('month'); // month | quarter

  const reports = useMemo(() => {
    const now = new Date();
    const fixedSum = fixedExpenses.reduce((s, f) => s + f.amount, 0);

    const periodReports = [];

    if (period === 'month') {
      // Últimos 6 meses
      for (let i = 0; i < 6; i++) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59);
        const monthTxs = transactions.filter(t => {
          const d = new Date(t.date);
          return d >= monthDate && d <= monthEnd;
        });
        const spending = monthTxs.filter(t => t.amount < 0 && t.category !== 'transferencia')
          .reduce((s, t) => s + Math.abs(t.amount), 0);
        const income = monthTxs.filter(t => t.amount > 0)
          .reduce((s, t) => s + t.amount, 0);

        // Categorías
        const catTotals = {};
        monthTxs.filter(t => t.amount < 0 && t.category !== 'transferencia').forEach(t => {
          catTotals[t.category] = (catTotals[t.category] || 0) + Math.abs(t.amount);
        });

        // Para meses pasados, simulamos data si está vacío (con base en datos actuales)
        const total = i === 0 ? spending + fixedSum : (spending || 1850 + Math.random() * 600) + fixedSum;
        const finalIncome = income || (i > 0 ? 2850 * 2 : income);

        periodReports.push({
          label: monthName(monthDate.getMonth(), monthDate.getFullYear()),
          shortLabel: monthDate.toLocaleDateString('es-PR', { month: 'short' }),
          spending: total,
          income: finalIncome,
          savings: finalIncome - total,
          categories: catTotals,
          isCurrent: i === 0
        });
      }
    } else {
      // Últimos 4 trimestres
      const currentQuarter = Math.floor(now.getMonth() / 3);
      for (let i = 0; i < 4; i++) {
        let q = currentQuarter - i;
        let y = now.getFullYear();
        while (q < 0) { q += 4; y -= 1; }

        const qStart = new Date(y, q * 3, 1);
        const qEnd = new Date(y, q * 3 + 3, 0, 23, 59);
        const qTxs = transactions.filter(t => {
          const d = new Date(t.date);
          return d >= qStart && d <= qEnd;
        });
        const spending = qTxs.filter(t => t.amount < 0 && t.category !== 'transferencia')
          .reduce((s, t) => s + Math.abs(t.amount), 0);
        const income = qTxs.filter(t => t.amount > 0)
          .reduce((s, t) => s + t.amount, 0);

        const catTotals = {};
        qTxs.filter(t => t.amount < 0 && t.category !== 'transferencia').forEach(t => {
          catTotals[t.category] = (catTotals[t.category] || 0) + Math.abs(t.amount);
        });

        const total = i === 0 ? spending + (fixedSum * 3) : (spending || 5500 + Math.random() * 1500) + (fixedSum * 3);
        const finalIncome = income || (i > 0 ? 2850 * 6 : income);

        periodReports.push({
          label: `Q${q + 1} ${y}`,
          shortLabel: `Q${q + 1}`,
          spending: total,
          income: finalIncome,
          savings: finalIncome - total,
          categories: catTotals,
          isCurrent: i === 0
        });
      }
    }
    return periodReports;
  }, [transactions, fixedExpenses, period]);

  const current = reports[0];
  const previous = reports[1];
  const change = previous ? ((current.spending - previous.spending) / previous.spending) * 100 : 0;

  const maxSpending = Math.max(...reports.map(r => r.spending));

  // Top category insights
  const topCategoryChange = useMemo(() => {
    if (!current || !previous) return null;
    const changes = [];
    const allCats = new Set([...Object.keys(current.categories), ...Object.keys(previous.categories)]);
    allCats.forEach(cat => {
      const cur = current.categories[cat] || 0;
      const prev = previous.categories[cat] || 0;
      if (prev > 0) {
        const pct = ((cur - prev) / prev) * 100;
        changes.push({ cat, cur, prev, pct, diff: cur - prev });
      }
    });
    return changes.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff)).slice(0, 3);
  }, [current, previous]);

  return (
    <div className="screen" style={{ paddingTop: 0 }}>
      <TopBar onHome={onHome} onBack={onBack} title="Reportes" />
      <div style={{ padding: '12px 0 4px' }}>
        <span style={{ fontSize: 13, color: 'var(--text-mute)' }}>Mensual y trimestral con comparativas</span>
      </div>

      {/* Tabs */}
      <div className="tabs mb-20">
        <button className={`tab ${period === 'month' ? 'active' : ''}`} onClick={() => setPeriod('month')}>Mensual</button>
        <button className={`tab ${period === 'quarter' ? 'active' : ''}`} onClick={() => setPeriod('quarter')}>Trimestral</button>
      </div>

      {/* Comparativo principal */}
      <div className="card mb-20" style={{
        background: 'linear-gradient(135deg, rgba(0,229,176,0.06), rgba(0,132,255,0.06))',
        borderColor: 'rgba(0,229,176,0.15)'
      }}>
        <div className="spread mb-8">
          <span className="label">{period === 'month' ? 'Este mes' : 'Este trimestre'}</span>
          <span className="tiny" style={{ textTransform: 'capitalize' }}>{current.label}</span>
        </div>
        <h1 className="h1" style={{ fontSize: 38 }}>{fmtMoney(current.spending)}</h1>

        <div className="row gap-16 mt-12">
          <div className="col gap-2">
            <span className="tiny">Ingresos</span>
            <span style={{ fontWeight: 600, color: 'var(--green)' }}>+{fmtMoney(current.income)}</span>
          </div>
          <div className="col gap-2">
            <span className="tiny">Ahorrado</span>
            <span style={{
              fontWeight: 600,
              color: current.savings > 0 ? 'var(--green)' : 'var(--danger)'
            }}>
              {current.savings > 0 ? '+' : ''}{fmtMoney(current.savings)}
            </span>
          </div>
        </div>

        {previous && (
          <div className="row gap-8 mt-16" style={{ alignItems: 'center' }}>
            <div className="row gap-4" style={{
              background: change > 0 ? 'rgba(255, 77, 109, 0.15)' : 'rgba(0, 229, 176, 0.15)',
              color: change > 0 ? 'var(--danger)' : 'var(--green)',
              padding: '4px 10px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600
            }}>
              <Icon name={change > 0 ? 'trending-up' : 'trending-down'} size={14} />
              <span>{Math.abs(change).toFixed(1)}%</span>
            </div>
            <span className="tiny">vs {previous.label.split(' ')[0]} ({fmtMoney(previous.spending)})</span>
          </div>
        )}
      </div>

      {/* Bar chart histórico */}
      <div className="card mb-20">
        <div className="spread mb-16">
          <h3 className="h3">Tendencia</h3>
          <span className="tiny">{period === 'month' ? '6 meses' : '4 trimestres'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', height: 180, gap: 10, padding: '8px 0' }}>
          {[...reports].reverse().map((r, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <span className="tiny" style={{ fontWeight: 600, color: r.isCurrent ? 'var(--text)' : 'var(--text-mute)' }}>
                {fmtMoneyShort(r.spending)}
              </span>
              <div style={{
                width: '100%',
                height: `${(r.spending / maxSpending) * 130}px`,
                background: r.isCurrent ? 'var(--gradient)' : 'var(--bg-elev)',
                borderRadius: 8,
                minHeight: 8
              }}></div>
              <span className="tiny" style={{ textTransform: 'capitalize' }}>{r.shortLabel}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Cambios por categoría */}
      {topCategoryChange && topCategoryChange.length > 0 && (
        <div className="mb-20">
          <h3 className="h3 mb-12">Mayores Cambios vs {previous?.shortLabel}</h3>
          <div className="col gap-8">
            {topCategoryChange.map(c => {
              const cat = CATEGORIES[c.cat] || CATEGORIES.otro;
              const isUp = c.diff > 0;
              return (
                <div key={c.cat} className="card row gap-12 spread" style={{ padding: 14 }}>
                  <div className="row gap-12">
                    <div className="cat-icon" style={{ background: cat.color + '22' }}>{cat.icon}</div>
                    <div className="col gap-4">
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{cat.label}</span>
                      <span className="tiny">{fmtMoney(c.prev)} → {fmtMoney(c.cur)}</span>
                    </div>
                  </div>
                  <div className="col" style={{ alignItems: 'flex-end', gap: 4 }}>
                    <span style={{ fontWeight: 700, color: isUp ? 'var(--danger)' : 'var(--green)' }}>
                      {isUp ? '+' : ''}{fmtMoney(c.diff)}
                    </span>
                    <span className="tiny" style={{ color: isUp ? 'var(--danger)' : 'var(--green)' }}>
                      {isUp ? '+' : ''}{c.pct.toFixed(0)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tabla histórica */}
      <div className="card mb-20" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr 1fr',
          padding: '14px 16px',
          background: 'var(--bg-elev)',
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--text-mute)',
          textTransform: 'uppercase'
        }}>
          <span>Período</span>
          <span style={{ textAlign: 'right' }}>Ingreso</span>
          <span style={{ textAlign: 'right' }}>Gasto</span>
          <span style={{ textAlign: 'right' }}>Ahorro</span>
        </div>
        {reports.map((r, i) => (
          <div key={i} style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr 1fr',
            padding: '14px 16px',
            borderTop: i > 0 ? '1px solid var(--border)' : 'none',
            background: r.isCurrent ? 'rgba(0,229,176,0.05)' : 'transparent',
            fontSize: 13
          }}>
            <span style={{ fontWeight: r.isCurrent ? 700 : 500, textTransform: 'capitalize' }}>
              {r.shortLabel}
            </span>
            <span style={{ textAlign: 'right', color: 'var(--green)' }}>{fmtMoneyShort(r.income)}</span>
            <span style={{ textAlign: 'right' }}>{fmtMoneyShort(r.spending)}</span>
            <span style={{
              textAlign: 'right',
              fontWeight: 600,
              color: r.savings > 0 ? 'var(--green)' : 'var(--danger)'
            }}>
              {r.savings > 0 ? '+' : ''}{fmtMoneyShort(r.savings)}
            </span>
          </div>
        ))}
      </div>

      {/* Insight IA */}
      <div className="ai-alert mb-12">
        <div className="ai-icon">
          <Icon name="sparkle" size={14} color="#0D0D14" />
        </div>
        <div className="col gap-4" style={{ flex: 1 }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>Resumen del período</span>
          <span style={{ fontSize: 13, color: 'var(--text-mute)', lineHeight: 1.5 }}>
            {change > 5
              ? `Gastaste ${Math.abs(change).toFixed(1)}% más que ${previous?.shortLabel}. Revisa tus categorías para identificar dónde se fue.`
              : change < -5
              ? `¡Gastaste ${Math.abs(change).toFixed(1)}% menos que ${previous?.shortLabel}! Considera mover esa diferencia (${fmtMoney(previous.spending - current.spending)}) a tus metas.`
              : `Gasto similar al período anterior. Estable es bueno, pero revisa si puedes reducir alguna categoría.`}
          </span>
        </div>
      </div>

      {/* Botón de descarga (mock) */}
      <button className="btn-secondary mt-8">
        <Icon name="edit" size={18} />
        <span>Exportar PDF</span>
      </button>
    </div>
  );
}
