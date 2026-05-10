import { useMemo, useState } from 'react';
import { Icon } from './icons.jsx';
import MerchantIcon from './MerchantIcon.jsx';
import BankLogo from './BankLogo.jsx';
import TopBar from './TopBar.jsx';
import { CATEGORIES } from '../data/sampleData.js';
import { fmtMoney, relativeDate, fmtTime } from '../utils/storage.js';
import { useI18n } from '../i18n/index.jsx';

export default function Accounts({ accounts, transactions, onHome, onMenu, onConnectBank, onRenameAccount, onDeleteAccount }) {
  const { strings: s } = useI18n();
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null); // { id, currentName }
  const [editName, setEditName] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(null); // account object

  // Solo cuentas personales — sin crédito (las tarjetas tienen su propia sección)
  const personalAccounts = useMemo(() => accounts.filter(a => a.type !== 'credit'), [accounts]);

  const startRename = (acct) => {
    setEditing({ id: acct.id, currentName: acct.name });
    setEditName(acct.name || '');
  };
  const saveRename = async () => {
    if (!editing || !editName.trim()) return;
    await onRenameAccount?.(editing.id, editName.trim());
    setEditing(null);
    setEditName('');
  };
  const cancelRename = () => { setEditing(null); setEditName(''); };

  const askDelete = (acct) => setConfirmingDelete(acct);
  const confirmDelete = async () => {
    if (!confirmingDelete) return;
    await onDeleteAccount?.(confirmingDelete.id);
    if (selected === confirmingDelete.id) setSelected(null);
    setConfirmingDelete(null);
  };

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

          {/* Acciones de la cuenta */}
          <div className="row gap-8 mb-16">
            <button
              onClick={() => startRename(acc)}
              className="row gap-6"
              style={{
                flex: 1, padding: '12px 14px', borderRadius: 12,
                background: 'var(--bg-elev)', border: '1px solid var(--border)',
                fontWeight: 700, fontSize: 13, justifyContent: 'center'
              }}
            >
              <Icon name="edit" size={14} />
              <span>Editar nombre</span>
            </button>
            <button
              onClick={() => askDelete(acc)}
              className="row gap-6"
              style={{
                flex: 1, padding: '12px 14px', borderRadius: 12,
                background: 'rgba(255, 77, 109, 0.10)', border: '1px solid rgba(255, 77, 109, 0.3)',
                color: 'var(--danger)',
                fontWeight: 700, fontSize: 13, justifyContent: 'center'
              }}
            >
              <Icon name="x" size={14} color="var(--danger)" stroke={2.5} />
              <span>Desconectar</span>
            </button>
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

        {editing && (
          <RenameModal
            currentName={editing.currentName}
            value={editName}
            onChange={setEditName}
            onSave={saveRename}
            onCancel={cancelRename}
          />
        )}
        {confirmingDelete && (
          <DeleteConfirmModal
            account={confirmingDelete}
            onConfirm={confirmDelete}
            onCancel={() => setConfirmingDelete(null)}
          />
        )}
      </div>
    );
  }

  // Vista principal — grupos
  return (
    <div className="screen" style={{ paddingTop: 0 }}>
      <TopBar onHome={onHome} onMenu={onMenu} title={s.personalAccounts} />

      <div style={{ padding: '12px 0' }}>
        <div data-tour="accountsHero" className="card mb-20" style={{
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

        <button
          className="btn-secondary mt-12"
          onClick={onConnectBank}
          disabled={!onConnectBank}
        >
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

// ════════════════════════════════════════════════════════════
// Modal: Renombrar cuenta
// ════════════════════════════════════════════════════════════
function RenameModal({ currentName, value, onChange, onSave, onCancel }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
        zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        backdropFilter: 'blur(6px)'
      }}
      onClick={onCancel}
    >
      <div
        className="app-shell"
        style={{
          background: 'var(--bg)', borderRadius: '24px 24px 0 0',
          padding: 20, paddingBottom: 28, animation: 'fadeUp .25s ease',
          border: '1px solid var(--border)'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ width: 36, height: 5, background: 'var(--border)', borderRadius: 3, margin: '0 auto 16px' }} />
        <h2 className="h2 mb-12">Editar nombre</h2>
        <p className="tiny mb-16">Ponle el nombre que prefieras a tu cuenta.</p>

        <div className="col gap-6 mb-16">
          <span className="label" style={{ fontSize: 11 }}>Nombre</span>
          <input
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={currentName}
            autoFocus
            className="input-field"
            style={{ height: 48, fontSize: 15 }}
          />
        </div>

        <div className="row gap-8">
          <button
            onClick={onCancel}
            style={{ flex: 1, padding: 14, borderRadius: 12, background: 'var(--bg-elev)', fontWeight: 700 }}
          >
            Cancelar
          </button>
          <button
            onClick={onSave}
            disabled={!value.trim()}
            className="btn-primary"
            style={{ flex: 1, background: 'var(--brand-grad)', fontWeight: 800 }}
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// Modal: Confirmar eliminar / desconectar cuenta
// ════════════════════════════════════════════════════════════
function DeleteConfirmModal({ account, onConfirm, onCancel }) {
  const [busy, setBusy] = useState(false);
  const handleConfirm = async () => {
    setBusy(true);
    try { await onConfirm(); } finally { setBusy(false); }
  };
  const isPlaid = !!account?.plaid_access_token;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
        zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        backdropFilter: 'blur(6px)'
      }}
      onClick={busy ? undefined : onCancel}
    >
      <div
        className="app-shell"
        style={{
          background: 'var(--bg)', borderRadius: '24px 24px 0 0',
          padding: 20, paddingBottom: 28, animation: 'fadeUp .25s ease',
          border: '1px solid var(--border)'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ width: 36, height: 5, background: 'var(--border)', borderRadius: 3, margin: '0 auto 16px' }} />

        <div className="row gap-12 mb-12" style={{ alignItems: 'center' }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'rgba(255, 77, 109, 0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Icon name="x" size={22} color="var(--danger)" stroke={3} />
          </div>
          <div className="col gap-2" style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontSize: 17, fontWeight: 800 }}>¿Desconectar cuenta?</h2>
            <span className="tiny">{account.name} ••{account.last4}</span>
          </div>
        </div>

        <div className="card mb-16" style={{
          padding: 12, borderRadius: 12,
          background: 'rgba(255, 77, 109, 0.08)',
          border: '1px solid rgba(255, 77, 109, 0.25)'
        }}>
          <p style={{ fontSize: 12, lineHeight: 1.5 }}>
            Se borrarán todas las transacciones de esta cuenta de Kleo
            {isPlaid ? ' y se revocará el acceso de Plaid' : ''}. Esta acción no se puede deshacer.
          </p>
          {isPlaid && (
            <p className="tiny mt-8" style={{ fontSize: 11 }}>
              💡 Puedes volver a conectar la cuenta cuando quieras.
            </p>
          )}
        </div>

        <div className="row gap-8">
          <button
            onClick={onCancel}
            disabled={busy}
            style={{ flex: 1, padding: 14, borderRadius: 12, background: 'var(--bg-elev)', fontWeight: 700 }}
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={busy}
            style={{
              flex: 1, padding: 14, borderRadius: 12,
              background: 'var(--danger)', color: '#fff', fontWeight: 800,
              opacity: busy ? 0.6 : 1
            }}
          >
            {busy ? 'Desconectando...' : 'Sí, desconectar'}
          </button>
        </div>
      </div>
    </div>
  );
}
