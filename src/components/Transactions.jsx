import { useMemo, useState } from 'react';
import { Icon } from './icons.jsx';
import TopBar from './TopBar.jsx';
import MerchantIcon from './MerchantIcon.jsx';
import { CATEGORIES } from '../data/sampleData.js';
import { fmtMoney, relativeDate, fmtTime } from '../utils/storage.js';

export default function Transactions({ transactions, accounts, onBack, onHome }) {
  const [filterAccount, setFilterAccount] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [search, setSearch] = useState('');

  const accountById = useMemo(() => {
    const m = {};
    accounts.forEach(a => { m[a.id] = a; });
    return m;
  }, [accounts]);

  const filtered = useMemo(() => {
    return transactions
      .filter(t => filterAccount === 'all' || t.accountId === filterAccount)
      .filter(t => filterCategory === 'all' || t.category === filterCategory)
      .filter(t => !search || t.merchant.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [transactions, filterAccount, filterCategory, search]);

  const totalSpent = filtered.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  const totalIncome = filtered.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);

  // Agrupar por fecha
  const grouped = useMemo(() => {
    const groups = {};
    filtered.forEach(t => {
      const dateKey = new Date(t.date).toISOString().slice(0, 10);
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(t);
    });
    return Object.entries(groups);
  }, [filtered]);

  const usedCategories = useMemo(() => {
    return [...new Set(transactions.map(t => t.category))].filter(c => CATEGORIES[c]);
  }, [transactions]);

  return (
    <div className="screen" style={{ paddingTop: 0 }}>
      <TopBar onHome={onHome} onBack={onBack} title="Transacciones" />

      <div style={{ padding: '12px 0' }}>
        {/* Resumen */}
        <div className="card mb-16" style={{ background: 'var(--bg-elev)', border: 'none' }}>
          <div className="row" style={{ justifyContent: 'space-around' }}>
            <div className="col gap-2" style={{ alignItems: 'center' }}>
              <span className="tiny">Movimientos</span>
              <span style={{ fontWeight: 700, fontSize: 18 }}>{filtered.length}</span>
            </div>
            <div style={{ width: 1, background: 'var(--border)' }}></div>
            <div className="col gap-2" style={{ alignItems: 'center' }}>
              <span className="tiny">Ingresos</span>
              <span style={{ fontWeight: 700, fontSize: 18, color: 'var(--green)' }}>+{fmtMoney(totalIncome)}</span>
            </div>
            <div style={{ width: 1, background: 'var(--border)' }}></div>
            <div className="col gap-2" style={{ alignItems: 'center' }}>
              <span className="tiny">Gastos</span>
              <span style={{ fontWeight: 700, fontSize: 18, color: 'var(--danger)' }}>−{fmtMoney(totalSpent)}</span>
            </div>
          </div>
        </div>

        {/* Búsqueda */}
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <input
            className="input-field"
            placeholder="Buscar comercio…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 36 }}
          />
          <span style={{
            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--text-mute)', fontSize: 16
          }}>🔍</span>
        </div>

        {/* Filtros: Cuentas */}
        <div style={{
          display: 'flex',
          gap: 8,
          overflowX: 'auto',
          marginBottom: 8,
          paddingBottom: 4
        }}>
          <FilterChip
            active={filterAccount === 'all'}
            onClick={() => setFilterAccount('all')}
            label="Todas las cuentas"
          />
          {accounts.map(a => (
            <FilterChip
              key={a.id}
              active={filterAccount === a.id}
              onClick={() => setFilterAccount(a.id)}
              label={`${a.name} ••${a.last4}`}
            />
          ))}
        </div>

        {/* Filtros: Categorías */}
        <div style={{
          display: 'flex',
          gap: 8,
          overflowX: 'auto',
          marginBottom: 16,
          paddingBottom: 4
        }}>
          <FilterChip
            active={filterCategory === 'all'}
            onClick={() => setFilterCategory('all')}
            label="Todas"
          />
          {usedCategories.map(c => (
            <FilterChip
              key={c}
              active={filterCategory === c}
              onClick={() => setFilterCategory(c)}
              label={`${CATEGORIES[c].icon} ${CATEGORIES[c].label}`}
            />
          ))}
        </div>

        {/* Lista por fecha */}
        {grouped.length === 0 ? (
          <div className="card col" style={{ alignItems: 'center', padding: 40, gap: 8 }}>
            <span style={{ fontSize: 32, opacity: 0.4 }}>📭</span>
            <span className="tiny">Sin transacciones que coincidan</span>
          </div>
        ) : (
          grouped.map(([date, txs]) => (
            <div key={date} style={{ marginBottom: 16 }}>
              <div className="section-header">
                <span>{relativeDate(date)}</span>
                <span className="tiny">
                  {fmtMoney(Math.abs(txs.reduce((s, t) => s + Math.min(0, t.amount), 0)))}
                </span>
              </div>
              <div className="ios-list">
                {txs.map(t => {
                  const acc = accountById[t.accountId];
                  const isIncome = t.amount > 0;
                  return (
                    <div key={t.id} className="ios-list-item">
                      <MerchantIcon merchant={t.merchant} category={t.category} size={40} />
                      <div className="col gap-2" style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontWeight: 500, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.merchant}</span>
                        <div className="row gap-6" style={{ flexWrap: 'wrap' }}>
                          {acc && (
                            <span style={{
                              fontSize: 11,
                              background: 'var(--bg-elev)',
                              padding: '2px 6px',
                              borderRadius: 4,
                              fontWeight: 500
                            }}>
                              {acc.name} ••{acc.last4}
                            </span>
                          )}
                          <span className="tiny">{fmtTime(t.date)}</span>
                        </div>
                      </div>
                      <span style={{ fontWeight: 600, fontSize: 15, color: isIncome ? 'var(--green)' : 'var(--text)' }}>
                        {isIncome ? '+' : '−'}{fmtMoney(Math.abs(t.amount))}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function FilterChip({ active, onClick, label }) {
  return (
    <button
      onClick={onClick}
      style={{
        flexShrink: 0,
        padding: '8px 14px',
        borderRadius: 20,
        background: active ? 'var(--blue)' : 'var(--bg-elev)',
        color: active ? '#fff' : 'var(--text)',
        fontSize: 13,
        fontWeight: 500,
        border: 'none',
        whiteSpace: 'nowrap',
        transition: 'all .15s'
      }}
    >
      {label}
    </button>
  );
}
