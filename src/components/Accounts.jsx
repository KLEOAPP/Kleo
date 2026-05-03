import { useMemo, useState } from 'react';
import { Icon } from './icons.jsx';
import MerchantIcon from './MerchantIcon.jsx';
import BankLogo from './BankLogo.jsx';
import TopBar from './TopBar.jsx';
import { CATEGORIES } from '../data/sampleData.js';
import { fmtMoney, relativeDate, fmtTime } from '../utils/storage.js';
import { useI18n } from '../i18n/index.jsx';

export default function Accounts({ accounts, transactions, onHome, onMenu }) {
  const { strings: s } = useI18n();
  const [selected, setSelected] = useState(null);

  // Solo cuentas personales — sin crédito (las tarjetas tienen su propia sección)
  const personalAccounts = useMemo(() => accounts.filter(a => a.type !== 'credit'), [accounts]);

  const txByAccount = useMemo(() => {
    const map = {};
    transactions.forEach(t => {
      if (!map[t.accountId]) map[t.accountId] = [];
      map[t.accountId].push(t);
    });
    return map;
  }, [transactions]);

  const accountById = useMemo(() => {
    const m = {};
    accounts.forEach(a => { m[a.id] = a; });
    return m;
  }, [accounts]);

  const groups = useMemo(() => {
    const checking = personalAccounts.filter(a => a.type === 'checking');
    const savings = personalAccounts.filter(a => a.type === 'savings');

    const checkingTotal = checking.reduce((s, a) => s + a.balance, 0);
    const savingsTotal = savings.reduce((s, a) => s + a.balance, 0);
    const total = checkingTotal + savingsTotal;

    return { checking, savings, checkingTotal, savingsTotal, total };
  }, [personalAccounts]);

  // Detalle de cuenta individual
  if (selected) {
    const acc = accountById[selected];
    const txs = (txByAccount[selected] || []).sort((a, b) => new Date(b.date) - new Date(a.date));
    const isCard = acc.type === 'credit';
    const isSavings = acc.type === 'savings';
    const used = isCard ? Math.abs(acc.balance) : 0;
    const usedPct = isCard ? (used / acc.limit) * 100 : 0;
    const goalPct = isSavings && acc.targetAmount ? (acc.balance / acc.targetAmount) * 100 : null;

    return (
      <div className="screen" style={{ paddingTop: 0 }}>
        <TopBar onHome={onHome} onBack={() => setSelected(null)} title={acc.name} />

        <div style={{ padding: '12px 0' }}>
          <div className="account-card mb-20" style={{ background: acc.color, position: 'relative' }}>
            <BankLogo
              institution={acc.institution || acc.name}
              size={36}
              radius={8}
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                background: 'rgba(255,255,255,0.95)',
                boxShadow: '0 2px 10px rgba(0,0,0,0.25)'
              }}
            />
            <div className="spread" style={{ paddingRight: 48 }}>
              <div className="col gap-4">
                <span style={{ fontSize: 13, opacity: 0.85 }}>{acc.label}</span>
                {acc.apy && <span style={{ fontSize: 11, opacity: 0.75 }}>APY {acc.apy}%</span>}
                {acc.apr && <span style={{ fontSize: 11, opacity: 0.75 }}>APR {acc.apr}%</span>}
              </div>
              <span style={{ fontSize: 12, opacity: 0.85, fontFamily: 'monospace' }}>•••• {acc.last4}</span>
            </div>

            <div className="col gap-4">
              <span style={{ fontSize: 12, opacity: 0.85 }}>
                {isCard ? s.currentBalance : isSavings ? s.savedAmount : s.available}
              </span>
              <span style={{ fontSize: 30, fontWeight: 700 }}>{fmtMoney(Math.abs(acc.balance))}</span>

              {isCard && (
                <>
                  <div style={{ height: 4, background: 'rgba(255,255,255,0.2)', borderRadius: 2, marginTop: 6, overflow: 'hidden' }}>
                    <div style={{ width: `${usedPct}%`, height: '100%', background: 'rgba(255,255,255,0.85)' }}></div>
                  </div>
                  <div className="spread" style={{ marginTop: 4 }}>
                    <span style={{ fontSize: 11, opacity: 0.85 }}>{s.availableAmount.replace('{amount}', fmtMoney(acc.limit - used))}</span>
                    <span style={{ fontSize: 11, opacity: 0.85 }}>{s.limit.replace('{amount}', fmtMoney(acc.limit))}</span>
                  </div>
                </>
              )}

              {goalPct !== null && (
                <>
                  <div style={{ height: 4, background: 'rgba(255,255,255,0.2)', borderRadius: 2, marginTop: 6, overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(100, goalPct)}%`, height: '100%', background: 'rgba(255,255,255,0.85)' }}></div>
                  </div>
                  <div className="spread" style={{ marginTop: 4 }}>
                    <span style={{ fontSize: 11, opacity: 0.85 }}>{s.goalPercent.replace('{pct}', goalPct.toFixed(0))}</span>
                    <span style={{ fontSize: 11, opacity: 0.85 }}>{s.goalTarget.replace('{amount}', fmtMoney(acc.targetAmount))}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="section-header">
            <span>{s.transactions} · {txs.length}</span>
          </div>
          <div className="ios-list">
            {txs.length === 0 && (
              <div style={{ padding: 24, textAlign: 'center' }}>
                <span className="tiny">{s.noMovements}</span>
              </div>
            )}
            {txs.map(t => {
              const isIncome = t.amount > 0;
              return (
                <div key={t.id} className="ios-list-item">
                  <MerchantIcon merchant={t.merchant} category={t.category} size={40} />
                  <div className="col gap-2" style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontWeight: 500, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.merchant}</span>
                    <span className="tiny">{relativeDate(t.date)} · {fmtTime(t.date)}</span>
                  </div>
                  <span style={{ fontWeight: 600, fontSize: 15, color: isIncome ? 'var(--green)' : 'var(--text)' }}>
                    {isIncome ? '+' : '−'}{fmtMoney(Math.abs(t.amount))}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Vista principal — grupos
  return (
    <div className="screen" style={{ paddingTop: 0 }}>
      <TopBar onHome={onHome} onMenu={onMenu} title={s.personalAccounts} />

      <div style={{ padding: '12px 0' }}>
        <div className="card mb-20" style={{
          background: 'linear-gradient(135deg, rgba(0,181,137,0.06), rgba(0,122,255,0.06))',
          borderColor: 'transparent'
        }}>
          <span className="label">{s.totalInAccounts}</span>
          <h1 className="h1 mt-4" style={{ fontSize: 32 }}>{fmtMoney(groups.total)}</h1>
          <span className="tiny">{s.excludingCredit}</span>
          <div className="row gap-16 mt-12" style={{ flexWrap: 'wrap' }}>
            <div className="col gap-2">
              <span className="tiny">{s.checkingAccount}</span>
              <span style={{ fontWeight: 600, fontSize: 14 }}>{fmtMoney(groups.checkingTotal)}</span>
            </div>
            <div className="col gap-2">
              <span className="tiny">{s.savingsAndGoals}</span>
              <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--green)' }}>{fmtMoney(groups.savingsTotal)}</span>
            </div>
          </div>
        </div>

        {/* CUENTAS CORRIENTES */}
        {groups.checking.length > 0 && (
          <>
            <div className="section-header">
              <span>{s.checkingAccounts}</span>
              <span className="tiny">{fmtMoney(groups.checkingTotal)}</span>
            </div>
            <div className="ios-list mb-16">
              {groups.checking.map(a => (
                <button key={a.id} className="ios-list-item" onClick={() => setSelected(a.id)}>
                  <BankLogo institution={a.institution || a.name} size={40} radius={10} />
                  <div className="col gap-2" style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontWeight: 500, fontSize: 15 }}>{a.name}</span>
                    <span className="tiny">{a.label} · ••{a.last4}</span>
                  </div>
                  <span style={{ fontWeight: 600, fontSize: 16 }}>{fmtMoney(a.balance)}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* AHORROS Y METAS */}
        {groups.savings.length > 0 && (
          <>
            <div className="section-header">
              <span>{s.savingsAndGoals}</span>
              <span className="tiny">{fmtMoney(groups.savingsTotal)}</span>
            </div>
            <div className="ios-list mb-16">
              {groups.savings.map(a => {
                const goalPct = a.targetAmount ? (a.balance / a.targetAmount) * 100 : null;
                return (
                  <button key={a.id} className="ios-list-item" onClick={() => setSelected(a.id)} style={{ alignItems: 'flex-start', paddingTop: 14, paddingBottom: 14 }}>
                    <BankLogo institution={a.institution || a.name} size={40} radius={10} />
                    <div className="col gap-4" style={{ flex: 1, minWidth: 0 }}>
                      <div className="spread">
                        <span style={{ fontWeight: 500, fontSize: 15 }}>{a.label}</span>
                        <span style={{ fontWeight: 600, fontSize: 15 }}>{fmtMoney(a.balance)}</span>
                      </div>
                      <span className="tiny">{a.name} · APY {a.apy}%</span>
                      {goalPct !== null && (
                        <>
                          <div className="bar-track" style={{ height: 4, marginTop: 4 }}>
                            <div className="bar-fill" style={{
                              width: `${Math.min(100, goalPct)}%`,
                              background: 'var(--green)'
                            }}></div>
                          </div>
                          <span className="tiny">{goalPct.toFixed(0)}% {s.ofTarget.replace('{amount}', fmtMoney(a.targetAmount))}</span>
                        </>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}

        <button className="btn-secondary mt-12">
          <Icon name="plus" size={18} />
          <span>{s.connectAnotherAccount}</span>
        </button>

        <p className="tiny mt-16" style={{ textAlign: 'center', lineHeight: 1.5 }}>
          {s.lookingForCards}
        </p>
      </div>
    </div>
  );
}
