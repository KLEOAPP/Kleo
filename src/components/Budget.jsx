import { useMemo, useState } from 'react';
import { Icon } from './icons.jsx';
import TopBar from './TopBar.jsx';
import { CATEGORIES } from '../data/sampleData.js';
import { fmtMoney, fmtDate, fmtTime } from '../utils/storage.js';
import { useI18n } from '../i18n/index.jsx';

export default function Budget({ household, fixedExpenses, transactions, onBack, onHome, onUpdateHousehold, onConfirmShared }) {
  const { strings: s } = useI18n();
  const [tab, setTab] = useState('mes');
  const [editingMember, setEditingMember] = useState(false);

  const me = household.members.find(m => m.isMe) || household.members[0];
  const partner = household.members.find(m => !m.isMe);

  const monthStart = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }, []);

  const monthExpenses = useMemo(() => {
    return transactions
      .filter(t => new Date(t.date) >= monthStart && t.amount < 0 && t.category !== 'transferencia');
  }, [transactions, monthStart]);

  const totalMonth = useMemo(() => {
    const fixed = fixedExpenses.reduce((sum, f) => sum + f.amount, 0);
    const variable = monthExpenses.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    return fixed + variable;
  }, [fixedExpenses, monthExpenses]);

  const sharedExpenses = useMemo(() => {
    const fixed = fixedExpenses.filter(f => f.shared);
    const variable = monthExpenses.filter(t => t.shared);
    const fixedTotal = fixed.reduce((sum, f) => sum + f.amount, 0);
    const variableTotal = variable.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    return {
      total: fixedTotal + variableTotal,
      fixed,
      variable,
      myShare: (fixedTotal + variableTotal) * me.incomeRatio,
      partnerShare: (fixedTotal + variableTotal) * (partner?.incomeRatio || 0)
    };
  }, [fixedExpenses, monthExpenses, me, partner]);

  const myExpenses = useMemo(() => {
    const fixed = fixedExpenses.filter(f => !f.shared).reduce((sum, f) => sum + f.amount, 0);
    const variable = monthExpenses.filter(t => !t.shared).reduce((sum, t) => sum + Math.abs(t.amount), 0);
    return fixed + variable;
  }, [fixedExpenses, monthExpenses]);

  const tableData = useMemo(() => {
    const byCat = {};
    [...fixedExpenses.map(f => ({ ...f, isFixed: true })), ...monthExpenses.map(t => ({
      name: t.merchant, amount: t.amount < 0 ? Math.abs(t.amount) : t.amount,
      category: t.category, shared: t.shared, isFixed: false
    }))].forEach(item => {
      if (!byCat[item.category]) byCat[item.category] = { total: 0, shared: 0, mine: 0, items: [] };
      byCat[item.category].total += item.amount;
      if (item.shared) byCat[item.category].shared += item.amount;
      else byCat[item.category].mine += item.amount;
      byCat[item.category].items.push(item);
    });
    return Object.entries(byCat)
      .map(([cat, data]) => ({ cat, ...data, ...CATEGORIES[cat] }))
      .sort((a, b) => b.total - a.total);
  }, [fixedExpenses, monthExpenses]);

  return (
    <div className="screen" style={{ paddingTop: 0 }}>
      <TopBar onHome={onHome} onBack={onBack} title={s.budget} />
      <div className="spread" style={{ padding: '12px 0' }}>
        <span style={{ fontSize: 13, color: 'var(--text-mute)' }}>{s.sharedWithHome}</span>
        <button
          onClick={() => setEditingMember(true)}
          style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-elev)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="edit" size={16} />
        </button>
      </div>

      {/* Hogar Card */}
      {household.enabled && partner && (
        <div className="card mb-16" style={{ background: 'linear-gradient(135deg, rgba(0,229,176,0.08), rgba(0,132,255,0.08))', borderColor: 'rgba(0,229,176,0.2)' }}>
          <div className="spread mb-12">
            <span className="label">{s.sharedHome}</span>
            <span className="tiny" style={{ color: 'var(--green)' }}>{s.active}</span>
          </div>
          <div className="row gap-16" style={{ alignItems: 'center' }}>
            <div className="col" style={{ alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 52, height: 52, borderRadius: '50%',
                background: 'var(--gradient)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#0D0D14', fontWeight: 700, fontSize: 18
              }}>{me.avatar}</div>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{me.name}</span>
              <span className="tiny">{(me.incomeRatio * 100).toFixed(0)}%</span>
            </div>
            <div style={{ flex: 1, height: 8, background: 'var(--bg-elev)', borderRadius: 4, overflow: 'hidden', display: 'flex' }}>
              <div style={{ width: `${me.incomeRatio * 100}%`, background: 'var(--green)' }}></div>
              <div style={{ width: `${(partner.incomeRatio) * 100}%`, background: 'var(--blue)' }}></div>
            </div>
            <div className="col" style={{ alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 52, height: 52, borderRadius: '50%',
                background: 'linear-gradient(135deg, #FF6B9D, #A78BFA)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 700, fontSize: 18
              }}>{partner.avatar}</div>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{partner.name}</span>
              <span className="tiny">{(partner.incomeRatio * 100).toFixed(0)}%</span>
            </div>
          </div>
          <div className="tiny mt-12" style={{ textAlign: 'center', lineHeight: 1.5 }}>
            {s.splitDesc.replace('{method}', household.splitMethod === 'income' ? s.splitProportional : s.splitEqual)}
          </div>
        </div>
      )}

      {/* IA Pendientes de confirmar */}
      {household.pendingConfirmations?.length > 0 && (
        <div className="mb-16">
          <div className="row gap-8 mb-12">
            <Icon name="sparkle" size={18} color="var(--green)" />
            <h3 className="h3">{s.aiNeedConfirm}</h3>
          </div>
          <div className="col gap-12">
            {household.pendingConfirmations.map(p => (
              <div key={p.id} className="card">
                <div className="spread mb-8">
                  <div className="col gap-4">
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{p.merchant}</span>
                    <span className="tiny">{p.date} · {fmtMoney(p.amount)}</span>
                  </div>
                  <span className="tiny" style={{ background: 'rgba(0,229,176,0.15)', color: 'var(--green)', padding: '4px 8px', borderRadius: 6, fontWeight: 600 }}>
                    {p.suggestedShared ? s.suggestedShared : s.suggestedPersonal}
                  </span>
                </div>
                <p className="tiny" style={{ marginBottom: 12, lineHeight: 1.4 }}>💭 {p.reason}</p>
                <div className="row gap-8">
                  <button
                    className="btn-secondary"
                    style={{ height: 40, fontSize: 13, flex: 1 }}
                    onClick={() => onConfirmShared(p.id, !p.suggestedShared)}
                  >
                    {p.suggestedShared ? s.isPersonal : s.shareIt}
                  </button>
                  <button
                    className="btn-primary"
                    style={{ height: 40, fontSize: 13, flex: 1 }}
                    onClick={() => onConfirmShared(p.id, p.suggestedShared)}
                  >
                    <Icon name="check" size={14} color="#0D0D14" />
                    <span>{s.confirm}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs mb-16">
        <button className={`tab ${tab === 'mes' ? 'active' : ''}`} onClick={() => setTab('mes')}>{s.summary}</button>
        <button className={`tab ${tab === 'tabla' ? 'active' : ''}`} onClick={() => setTab('tabla')}>{s.table}</button>
        <button className={`tab ${tab === 'split' ? 'active' : ''}`} onClick={() => setTab('split')}>{s.settlement}</button>
      </div>

      {tab === 'mes' && (
        <div className="col gap-16">
          <div className="card">
            <span className="label">{s.totalMonth}</span>
            <h1 className="h1 mt-4" style={{ fontSize: 36 }}>{fmtMoney(totalMonth)}</h1>
            <div className="divider mt-12 mb-12"></div>
            <div className="col gap-12">
              <div className="spread">
                <div className="row gap-8">
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--green)' }}></span>
                  <span style={{ fontSize: 14 }}>{s.shared}</span>
                </div>
                <span style={{ fontWeight: 600 }}>{fmtMoney(sharedExpenses.total)}</span>
              </div>
              <div className="spread">
                <div className="row gap-8">
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--blue)' }}></span>
                  <span style={{ fontSize: 14 }}>{s.onlyMine}</span>
                </div>
                <span style={{ fontWeight: 600 }}>{fmtMoney(myExpenses)}</span>
              </div>
            </div>
            <div className="bar-track mt-12" style={{ height: 12, display: 'flex' }}>
              <div style={{
                width: `${(sharedExpenses.total / totalMonth) * 100}%`,
                background: 'var(--green)',
                height: '100%'
              }}></div>
              <div style={{
                width: `${(myExpenses / totalMonth) * 100}%`,
                background: 'var(--blue)',
                height: '100%'
              }}></div>
            </div>
          </div>

          <div className="ai-alert">
            <div className="ai-icon">
              <Icon name="sparkle" size={14} color="#0D0D14" />
            </div>
            <div className="col gap-4" style={{ flex: 1 }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>{s.autoDetection}</span>
              <span style={{ fontSize: 13, color: 'var(--text-mute)', lineHeight: 1.5 }}>{s.autoDetectionDesc}</span>
            </div>
          </div>
        </div>
      )}

      {tab === 'tabla' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1.5fr 1fr 1fr',
            padding: '14px 16px',
            background: 'var(--bg-elev)',
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--text-mute)',
            textTransform: 'uppercase'
          }}>
            <span>{s.categoryLabel}</span>
            <span style={{ textAlign: 'right' }}>{s.sharedLabel}</span>
            <span style={{ textAlign: 'right' }}>{s.personalLabel}</span>
          </div>
          {tableData.map((row, i) => (
            <div key={row.cat} style={{
              display: 'grid',
              gridTemplateColumns: '1.5fr 1fr 1fr',
              padding: '14px 16px',
              borderTop: i > 0 ? '1px solid var(--border)' : 'none',
              alignItems: 'center'
            }}>
              <div className="row gap-10">
                <span style={{ fontSize: 18 }}>{row.icon}</span>
                <div className="col gap-2">
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{row.label}</span>
                  <span className="tiny">{row.items.length} {s.items}</span>
                </div>
              </div>
              <span style={{ textAlign: 'right', fontWeight: 600, fontSize: 14, color: row.shared > 0 ? 'var(--green)' : 'var(--text-dim)' }}>
                {row.shared > 0 ? fmtMoney(row.shared) : '—'}
              </span>
              <span style={{ textAlign: 'right', fontWeight: 600, fontSize: 14, color: row.mine > 0 ? 'var(--blue)' : 'var(--text-dim)' }}>
                {row.mine > 0 ? fmtMoney(row.mine) : '—'}
              </span>
            </div>
          ))}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1.5fr 1fr 1fr',
            padding: '14px 16px',
            background: 'var(--bg-elev)',
            borderTop: '1px solid var(--border)',
            fontWeight: 700
          }}>
            <span>{s.total}</span>
            <span style={{ textAlign: 'right', color: 'var(--green)' }}>{fmtMoney(sharedExpenses.total)}</span>
            <span style={{ textAlign: 'right', color: 'var(--blue)' }}>{fmtMoney(myExpenses)}</span>
          </div>
        </div>
      )}

      {tab === 'split' && partner && (
        <div className="col gap-16">
          <div className="card">
            <h3 className="h3 mb-16">{s.monthDivision}</h3>
            <div className="col gap-16">
              <div className="spread">
                <div className="row gap-12">
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%',
                    background: 'var(--gradient)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#0D0D14', fontWeight: 700
                  }}>{me.avatar}</div>
                  <div className="col gap-4">
                    <span style={{ fontWeight: 600 }}>{me.name}</span>
                    <span className="tiny">{s.yourPart.replace('{pct}', (me.incomeRatio * 100).toFixed(0))}</span>
                  </div>
                </div>
                <span style={{ fontWeight: 700, fontSize: 18 }}>{fmtMoney(sharedExpenses.myShare)}</span>
              </div>
              <div className="divider"></div>
              <div className="spread">
                <div className="row gap-12">
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #FF6B9D, #A78BFA)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontWeight: 700
                  }}>{partner.avatar}</div>
                  <div className="col gap-4">
                    <span style={{ fontWeight: 600 }}>{partner.name}</span>
                    <span className="tiny">{s.theirPart.replace('{pct}', (partner.incomeRatio * 100).toFixed(0))}</span>
                  </div>
                </div>
                <span style={{ fontWeight: 700, fontSize: 18 }}>{fmtMoney(sharedExpenses.partnerShare)}</span>
              </div>
            </div>
          </div>

          <button className="btn-primary">
            <Icon name="phone" size={18} color="#0D0D14" />
            <span>{s.collectAth.replace('{amount}', fmtMoney(sharedExpenses.partnerShare))}</span>
          </button>

          <div className="ai-alert">
            <div className="ai-icon">
              <Icon name="sparkle" size={14} color="#0D0D14" />
            </div>
            <div className="col gap-4" style={{ flex: 1 }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>{s.proportionalSplit}</span>
              <span style={{ fontSize: 13, color: 'var(--text-mute)', lineHeight: 1.5 }}>
                {s.proportionalDesc
                  .replace('{myPct}', (me.incomeRatio * 100).toFixed(0))
                  .replace('{name}', partner.name)
                  .replace('{theirPct}', (partner.incomeRatio * 100).toFixed(0))}
              </span>
            </div>
          </div>
        </div>
      )}

      {!household.enabled && (
        <div className="card col" style={{ alignItems: 'center', padding: 32, gap: 12 }}>
          <span style={{ fontSize: 40 }}>👥</span>
          <span style={{ fontWeight: 600 }}>{s.shareExpenses}</span>
          <span className="tiny" style={{ textAlign: 'center' }}>{s.shareExpensesDesc}</span>
          <button className="btn-primary mt-16" onClick={() => onUpdateHousehold({ ...household, enabled: true })}>
            {s.activateShared}
          </button>
        </div>
      )}

      {editingMember && (
        <EditHousehold
          s={s}
          household={household}
          onSave={(h) => {
            onUpdateHousehold(h);
            setEditingMember(false);
          }}
          onClose={() => setEditingMember(false)}
        />
      )}
    </div>
  );
}

function EditHousehold({ s, household, onSave, onClose }) {
  const [members, setMembers] = useState(household.members);
  const [splitMethod, setSplitMethod] = useState(household.splitMethod);
  const [enabled, setEnabled] = useState(household.enabled);

  const updateRatio = (id, ratio) => {
    const r = parseFloat(ratio);
    if (isNaN(r)) return;
    setMembers(prev => {
      const me = prev.find(m => m.isMe);
      const partner = prev.find(m => !m.isMe);
      if (id === me.id) {
        return [{ ...me, incomeRatio: r }, { ...partner, incomeRatio: 1 - r }];
      }
      return [{ ...me, incomeRatio: 1 - r }, { ...partner, incomeRatio: r }];
    });
  };

  const splitOptions = [
    { id: 'income', label: s.proportionalToIncome, desc: s.proportionalToIncomeDesc },
    { id: 'equal', label: s.halfAndHalf, desc: s.halfAndHalfDesc },
    { id: 'custom', label: s.custom, desc: s.customDesc }
  ];

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center'
    }} onClick={onClose}>
      <div className="app-shell" style={{
        background: 'var(--bg)', maxHeight: '90vh', overflowY: 'auto',
        borderRadius: '24px 24px 0 0', padding: 20,
        animation: 'fadeUp .3s ease'
      }} onClick={e => e.stopPropagation()}>
        <div style={{ width: 40, height: 4, background: 'var(--border)', borderRadius: 2, margin: '0 auto 16px' }}></div>
        <h2 className="h2 mb-16">{s.configureHome}</h2>

        <div className="card mb-16">
          <div className="spread">
            <div className="col gap-4">
              <span style={{ fontWeight: 600 }}>{s.shareExpensesToggle}</span>
              <span className="tiny">{s.shareExpensesToggleDesc}</span>
            </div>
            <button
              onClick={() => setEnabled(!enabled)}
              style={{
                width: 50, height: 30, borderRadius: 15,
                background: enabled ? 'var(--green)' : 'var(--bg-elev)',
                position: 'relative', transition: 'background .2s'
              }}
            >
              <div style={{
                position: 'absolute', top: 3, left: enabled ? 23 : 3,
                width: 24, height: 24, borderRadius: '50%', background: '#fff',
                transition: 'left .2s'
              }}></div>
            </button>
          </div>
        </div>

        {enabled && (
          <>
            <h3 className="h3 mb-12">{s.members}</h3>
            {members.map(m => (
              <div key={m.id} className="card mb-12">
                <div className="row gap-12 mb-12">
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%',
                    background: m.isMe ? 'var(--gradient)' : 'linear-gradient(135deg, #FF6B9D, #A78BFA)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: m.isMe ? '#0D0D14' : '#fff', fontWeight: 700
                  }}>{m.avatar}</div>
                  <input
                    className="input-field"
                    style={{ flex: 1, height: 44 }}
                    value={m.name}
                    onChange={e => setMembers(prev => prev.map(x => x.id === m.id ? { ...x, name: e.target.value } : x))}
                  />
                </div>
                <span className="label" style={{ display: 'block', marginBottom: 6 }}>
                  {s.incomeRatio.replace('{pct}', (m.incomeRatio * 100).toFixed(0))}
                </span>
                <input
                  type="range"
                  min="0" max="1" step="0.01"
                  value={m.incomeRatio}
                  onChange={e => updateRatio(m.id, e.target.value)}
                  style={{ width: '100%', accentColor: 'var(--green)' }}
                />
              </div>
            ))}

            <h3 className="h3 mb-12 mt-16">{s.splitMethod}</h3>
            <div className="col gap-8">
              {splitOptions.map(opt => (
                <button
                  key={opt.id}
                  className="row gap-12 spread"
                  style={{
                    padding: '14px 16px', borderRadius: 14,
                    background: 'var(--bg-card)',
                    border: `1px solid ${splitMethod === opt.id ? 'var(--green)' : 'var(--border)'}`,
                    textAlign: 'left'
                  }}
                  onClick={() => setSplitMethod(opt.id)}
                >
                  <div className="col gap-4">
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{opt.label}</span>
                    <span className="tiny">{opt.desc}</span>
                  </div>
                  {splitMethod === opt.id && <Icon name="check" size={20} color="var(--green)" />}
                </button>
              ))}
            </div>
          </>
        )}

        <button
          className="btn-primary mt-24"
          onClick={() => onSave({ ...household, enabled, members, splitMethod })}
        >
          {s.save}
        </button>
      </div>
    </div>
  );
}
