import { useMemo, useState } from 'react';
import { Icon } from './icons.jsx';
import TopBar from './TopBar.jsx';
import { CATEGORIES } from '../data/sampleData.js';
import { fmtMoney, fmtDate, fmtTime } from '../utils/storage.js';

export default function Budget({ household, fixedExpenses, transactions, onBack, onHome, onUpdateHousehold, onConfirmShared }) {
  const [tab, setTab] = useState('mes');
  const [editingMember, setEditingMember] = useState(false);

  const me = household.members.find(m => m.isMe) || household.members[0];
  const partner = household.members.find(m => !m.isMe);

  const monthStart = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  }, []);

  // Suma todos los gastos del mes (fijos + variables)
  const monthExpenses = useMemo(() => {
    return transactions
      .filter(t => new Date(t.date) >= monthStart && t.amount < 0 && t.category !== 'transferencia');
  }, [transactions, monthStart]);

  const totalMonth = useMemo(() => {
    const fixed = fixedExpenses.reduce((s, f) => s + f.amount, 0);
    const variable = monthExpenses.reduce((s, t) => s + Math.abs(t.amount), 0);
    return fixed + variable;
  }, [fixedExpenses, monthExpenses]);

  const sharedExpenses = useMemo(() => {
    const fixed = fixedExpenses.filter(f => f.shared);
    const variable = monthExpenses.filter(t => t.shared);
    const fixedTotal = fixed.reduce((s, f) => s + f.amount, 0);
    const variableTotal = variable.reduce((s, t) => s + Math.abs(t.amount), 0);
    return {
      total: fixedTotal + variableTotal,
      fixed,
      variable,
      myShare: (fixedTotal + variableTotal) * me.incomeRatio,
      partnerShare: (fixedTotal + variableTotal) * (partner?.incomeRatio || 0)
    };
  }, [fixedExpenses, monthExpenses, me, partner]);

  const myExpenses = useMemo(() => {
    const fixed = fixedExpenses.filter(f => !f.shared).reduce((s, f) => s + f.amount, 0);
    const variable = monthExpenses.filter(t => !t.shared).reduce((s, t) => s + Math.abs(t.amount), 0);
    return fixed + variable;
  }, [fixedExpenses, monthExpenses]);

  // Tabla por categoría con gastos compartidos vs propios
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
      <TopBar onHome={onHome} onBack={onBack} title="Presupuesto" />
      <div className="spread" style={{ padding: '12px 0' }}>
        <span style={{ fontSize: 13, color: 'var(--text-mute)' }}>Compartido con tu hogar</span>
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
            <span className="label">Hogar Compartido</span>
            <span className="tiny" style={{ color: 'var(--green)' }}>● Activo</span>
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
            División {household.splitMethod === 'income' ? 'proporcional al ingreso' : 'igual'} · Toca el lápiz para cambiar
          </div>
        </div>
      )}

      {/* IA Pendientes de confirmar */}
      {household.pendingConfirmations?.length > 0 && (
        <div className="mb-16">
          <div className="row gap-8 mb-12">
            <Icon name="sparkle" size={18} color="var(--green)" />
            <h3 className="h3">IA: Necesito que confirmes</h3>
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
                    Sugerido: {p.suggestedShared ? 'Compartido' : 'Personal'}
                  </span>
                </div>
                <p className="tiny" style={{ marginBottom: 12, lineHeight: 1.4 }}>💭 {p.reason}</p>
                <div className="row gap-8">
                  <button
                    className="btn-secondary"
                    style={{ height: 40, fontSize: 13, flex: 1 }}
                    onClick={() => onConfirmShared(p.id, !p.suggestedShared)}
                  >
                    {p.suggestedShared ? 'Es Personal' : 'Compartirlo'}
                  </button>
                  <button
                    className="btn-primary"
                    style={{ height: 40, fontSize: 13, flex: 1 }}
                    onClick={() => onConfirmShared(p.id, p.suggestedShared)}
                  >
                    <Icon name="check" size={14} color="#0D0D14" />
                    <span>Confirmar</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs mb-16">
        <button className={`tab ${tab === 'mes' ? 'active' : ''}`} onClick={() => setTab('mes')}>Resumen</button>
        <button className={`tab ${tab === 'tabla' ? 'active' : ''}`} onClick={() => setTab('tabla')}>Tabla</button>
        <button className={`tab ${tab === 'split' ? 'active' : ''}`} onClick={() => setTab('split')}>Liquidación</button>
      </div>

      {tab === 'mes' && (
        <div className="col gap-16">
          <div className="card">
            <span className="label">Total del mes</span>
            <h1 className="h1 mt-4" style={{ fontSize: 36 }}>{fmtMoney(totalMonth)}</h1>
            <div className="divider mt-12 mb-12"></div>
            <div className="col gap-12">
              <div className="spread">
                <div className="row gap-8">
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--green)' }}></span>
                  <span style={{ fontSize: 14 }}>Compartidos</span>
                </div>
                <span style={{ fontWeight: 600 }}>{fmtMoney(sharedExpenses.total)}</span>
              </div>
              <div className="spread">
                <div className="row gap-8">
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--blue)' }}></span>
                  <span style={{ fontSize: 14 }}>Solo míos</span>
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
              <span style={{ fontWeight: 600, fontSize: 14 }}>Detección automática activa</span>
              <span style={{ fontSize: 13, color: 'var(--text-mute)', lineHeight: 1.5 }}>
                La IA aprendió tus patrones: hipoteca y servicios = compartidos, gasolina y café = personales. Te avisa solo cuando duda.
              </span>
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
            <span>Categoría</span>
            <span style={{ textAlign: 'right' }}>Compartido</span>
            <span style={{ textAlign: 'right' }}>Personal</span>
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
                  <span className="tiny">{row.items.length} items</span>
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
            <span>Total</span>
            <span style={{ textAlign: 'right', color: 'var(--green)' }}>{fmtMoney(sharedExpenses.total)}</span>
            <span style={{ textAlign: 'right', color: 'var(--blue)' }}>{fmtMoney(myExpenses)}</span>
          </div>
        </div>
      )}

      {tab === 'split' && partner && (
        <div className="col gap-16">
          <div className="card">
            <h3 className="h3 mb-16">División del mes</h3>
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
                    <span className="tiny">Tu parte ({(me.incomeRatio * 100).toFixed(0)}%)</span>
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
                    <span className="tiny">Su parte ({(partner.incomeRatio * 100).toFixed(0)}%)</span>
                  </div>
                </div>
                <span style={{ fontWeight: 700, fontSize: 18 }}>{fmtMoney(sharedExpenses.partnerShare)}</span>
              </div>
            </div>
          </div>

          <button className="btn-primary">
            <Icon name="phone" size={18} color="#0D0D14" />
            <span>Cobrar {fmtMoney(sharedExpenses.partnerShare)} por ATH</span>
          </button>

          <div className="ai-alert">
            <div className="ai-icon">
              <Icon name="sparkle" size={14} color="#0D0D14" />
            </div>
            <div className="col gap-4" style={{ flex: 1 }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>División proporcional al ingreso</span>
              <span style={{ fontSize: 13, color: 'var(--text-mute)', lineHeight: 1.5 }}>
                Como tú aportas el {(me.incomeRatio * 100).toFixed(0)}% del ingreso del hogar y {partner.name} el {(partner.incomeRatio * 100).toFixed(0)}%, los gastos compartidos se dividen igual. Justo y proporcional.
              </span>
            </div>
          </div>
        </div>
      )}

      {!household.enabled && (
        <div className="card col" style={{ alignItems: 'center', padding: 32, gap: 12 }}>
          <span style={{ fontSize: 40 }}>👥</span>
          <span style={{ fontWeight: 600 }}>Compartir gastos con alguien</span>
          <span className="tiny" style={{ textAlign: 'center' }}>
            Si vives con tu pareja, familia o roommate, activa hogar compartido. La IA divide automáticamente.
          </span>
          <button className="btn-primary mt-16" onClick={() => onUpdateHousehold({ ...household, enabled: true })}>
            Activar Hogar Compartido
          </button>
        </div>
      )}

      {/* Modal edición miembro */}
      {editingMember && (
        <EditHousehold
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

function EditHousehold({ household, onSave, onClose }) {
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
        <h2 className="h2 mb-16">Configurar Hogar</h2>

        <div className="card mb-16">
          <div className="spread">
            <div className="col gap-4">
              <span style={{ fontWeight: 600 }}>Compartir gastos</span>
              <span className="tiny">Activa cuando vives con alguien</span>
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
            <h3 className="h3 mb-12">Miembros</h3>
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
                  Ratio de ingreso: {(m.incomeRatio * 100).toFixed(0)}%
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

            <h3 className="h3 mb-12 mt-16">Método de división</h3>
            <div className="col gap-8">
              {[
                { id: 'income', label: 'Proporcional al ingreso', desc: 'Quien gana más, paga más (recomendado)' },
                { id: 'equal', label: 'Mitad y mitad', desc: 'Dividir 50/50 sin importar ingreso' },
                { id: 'custom', label: 'Personalizado', desc: 'Tú decides el % de cada uno' }
              ].map(opt => (
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
          Guardar
        </button>
      </div>
    </div>
  );
}
