import { useMemo, useState } from 'react';
import { Icon } from './icons.jsx';
import TopBar from './TopBar.jsx';
import { CATEGORIES } from '../data/sampleData.js';
import { fmtMoney } from '../utils/storage.js';
import { useI18n } from '../i18n/index.jsx';

/**
 * Sección Presupuesto · tabla simple de gastos mensuales fijos.
 * Modo individual o en pareja (toggle).
 *
 * Cada fila muestra: icono de categoría, nombre, día del mes, monto,
 * checkbox de "compartido" (solo en modo pareja).
 *
 * Los datos vienen de fixed_expenses (auto-detectados por Plaid +
 * agregados por el usuario en el wizard de onboarding).
 */
export default function Budget({ household, fixedExpenses = [], onBack, onHome, onUpdateHousehold }) {
  const { strings: s } = useI18n();
  const [coupleMode, setCoupleMode] = useState(!!household?.enabled);

  const total = fixedExpenses.reduce((sum, f) => sum + (f.amount || 0), 0);
  const shared = fixedExpenses.filter(f => f.shared).reduce((sum, f) => sum + (f.amount || 0), 0);
  const personal = total - shared;

  const me = household?.members?.find(m => m.isMe);
  const partner = household?.members?.find(m => !m.isMe);
  const myRatio = me?.incomeRatio || 1;
  const partnerRatio = partner?.incomeRatio || 0;

  // Mi parte de los gastos compartidos según ratio de ingreso
  const myShareOfShared = shared * myRatio;
  const partnerShareOfShared = shared * partnerRatio;
  // Mi total real = personales + mi parte de los compartidos
  const myTotal = personal + myShareOfShared;

  // Agrupar por categoría
  const byCategory = useMemo(() => {
    const map = {};
    fixedExpenses.forEach(f => {
      const cat = f.category || 'otros';
      if (!map[cat]) map[cat] = { items: [], total: 0 };
      map[cat].items.push(f);
      map[cat].total += f.amount || 0;
    });
    return Object.entries(map)
      .map(([cat, data]) => ({ cat, ...data, ...CATEGORIES[cat] }))
      .sort((a, b) => b.total - a.total);
  }, [fixedExpenses]);

  const sortedExpenses = useMemo(() =>
    [...fixedExpenses].sort((a, b) => (a.dueDay || 0) - (b.dueDay || 0))
  , [fixedExpenses]);

  const toggleCouple = () => {
    const newEnabled = !coupleMode;
    setCoupleMode(newEnabled);
    if (onUpdateHousehold) {
      onUpdateHousehold({
        ...household,
        enabled: newEnabled,
        members: newEnabled && (!household?.members || household.members.length < 2)
          ? [
              { id: 'me', name: 'Yo', avatar: 'YO', incomeRatio: 0.5, isMe: true },
              { id: 'partner', name: 'Pareja', avatar: 'PA', incomeRatio: 0.5, isMe: false }
            ]
          : household?.members || []
      });
    }
  };

  return (
    <div className="screen" style={{ paddingTop: 0 }}>
      <TopBar onHome={onHome} onBack={onBack} title={s.budget} />

      <div style={{ padding: '12px 0 24px' }}>
        {/* ===== Hero · Total mensual ===== */}
        <div className="card mb-16" style={{
          padding: 18,
          borderRadius: 22,
          background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.10), rgba(255, 149, 0, 0.06))',
          border: '1px solid rgba(168, 85, 247, 0.25)'
        }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-mute)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            💰 Gastos mensuales fijos
          </span>
          <h1 style={{
            fontSize: 36, fontWeight: 800, letterSpacing: '-0.03em',
            marginTop: 6, marginBottom: 6,
            background: 'linear-gradient(135deg, #A855F7, #FF9500)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text'
          }}>
            {fmtMoney(coupleMode ? myTotal : total)}
          </h1>
          <span className="tiny" style={{ fontSize: 12 }}>
            {coupleMode
              ? `Tu parte (${(myRatio * 100).toFixed(0)}% del total compartido + tus gastos personales)`
              : `${fixedExpenses.length} ${fixedExpenses.length === 1 ? 'pago fijo' : 'pagos fijos'} detectados`}
          </span>
        </div>

        {/* ===== Toggle de gastos en pareja ===== */}
        <div className="card mb-16" style={{ padding: 14, borderRadius: 14 }}>
          <div className="row gap-12" style={{ alignItems: 'center' }}>
            <span style={{ fontSize: 22 }}>👥</span>
            <div className="col gap-2" style={{ flex: 1 }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>Modo en pareja</span>
              <span className="tiny" style={{ fontSize: 11 }}>
                {coupleMode
                  ? 'Marca cada gasto como compartido o personal'
                  : 'Activa para dividir gastos con tu pareja'}
              </span>
            </div>
            <button
              onClick={toggleCouple}
              style={{
                width: 48, height: 28, borderRadius: 999,
                background: coupleMode ? 'var(--green)' : 'var(--bg-elev)',
                border: coupleMode ? 'none' : '1px solid var(--border)',
                position: 'relative', flexShrink: 0,
                transition: 'background .2s'
              }}
            >
              <div style={{
                position: 'absolute', top: 2, left: coupleMode ? 22 : 2,
                width: 24, height: 24, borderRadius: '50%', background: '#fff',
                transition: 'left .2s'
              }}></div>
            </button>
          </div>

          {coupleMode && partner && (
            <div className="row gap-8 mt-12" style={{ alignItems: 'center' }}>
              <div className="row gap-6" style={{
                background: 'rgba(0, 229, 176, 0.12)',
                padding: '4px 10px', borderRadius: 999, alignItems: 'center', flex: 1, justifyContent: 'center'
              }}>
                <span style={{ fontSize: 11, fontWeight: 700 }}>{me?.name || 'Yo'}</span>
                <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--green)' }}>{(myRatio * 100).toFixed(0)}%</span>
              </div>
              <div className="row gap-6" style={{
                background: 'rgba(168, 85, 247, 0.12)',
                padding: '4px 10px', borderRadius: 999, alignItems: 'center', flex: 1, justifyContent: 'center'
              }}>
                <span style={{ fontSize: 11, fontWeight: 700 }}>{partner.name || 'Pareja'}</span>
                <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--purple)' }}>{(partnerRatio * 100).toFixed(0)}%</span>
              </div>
            </div>
          )}
        </div>

        {/* ===== Tabla de gastos ===== */}
        {fixedExpenses.length === 0 ? (
          <div className="card col" style={{
            alignItems: 'center', padding: 40, gap: 12,
            background: 'var(--bg-card)', border: '1px dashed var(--border)'
          }}>
            <span style={{ fontSize: 40, opacity: 0.5 }}>📭</span>
            <span style={{ fontWeight: 700, fontSize: 15 }}>Sin gastos fijos</span>
            <span className="tiny" style={{ textAlign: 'center', maxWidth: 280 }}>
              Cuando conectes tu banco voy a detectar automáticamente tus pagos fijos: renta, luz, agua, suscripciones, etc.
            </span>
          </div>
        ) : (
          <>
            <div className="section-header">
              <span>Tabla de gastos</span>
              <span className="tiny">{fixedExpenses.length} pagos · {fmtMoney(total)}/mes</span>
            </div>
            <div className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: 16 }}>
              {/* Header de tabla */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: coupleMode ? '1.6fr 0.6fr 1fr 0.7fr' : '1.8fr 0.6fr 1fr',
                padding: '10px 14px',
                background: 'var(--bg-elev)',
                fontSize: 10, fontWeight: 800,
                color: 'var(--text-mute)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                gap: 8
              }}>
                <span>Pago</span>
                <span style={{ textAlign: 'center' }}>Día</span>
                <span style={{ textAlign: 'right' }}>Monto</span>
                {coupleMode && <span style={{ textAlign: 'center' }}>Comp.</span>}
              </div>

              {/* Filas */}
              {sortedExpenses.map((f, i) => {
                const cat = CATEGORIES[f.category] || CATEGORIES.otros;
                return (
                  <div
                    key={f.id || i}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: coupleMode ? '1.6fr 0.6fr 1fr 0.7fr' : '1.8fr 0.6fr 1fr',
                      padding: '12px 14px',
                      borderTop: i > 0 ? '1px solid var(--border-soft)' : 'none',
                      alignItems: 'center', gap: 8
                    }}
                  >
                    <div className="row gap-8" style={{ alignItems: 'center', minWidth: 0 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: (cat?.color || '#5856D6') + '22',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 16, flexShrink: 0
                      }}>{f.icon || cat?.icon || '🏠'}</div>
                      <div className="col gap-1" style={{ minWidth: 0 }}>
                        <span style={{
                          fontSize: 13, fontWeight: 700,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                        }}>{f.name}</span>
                        <span className="tiny" style={{ fontSize: 10, color: cat?.color }}>
                          {cat?.label || 'Otros'}
                        </span>
                      </div>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-mute)', textAlign: 'center' }}>
                      {f.dueDay || '—'}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 800, textAlign: 'right' }}>
                      {fmtMoney(f.amount || 0)}
                    </span>
                    {coupleMode && (
                      <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <span style={{
                          fontSize: 10, fontWeight: 800,
                          color: f.shared ? 'var(--green)' : 'var(--text-mute)',
                          background: f.shared ? 'rgba(0, 229, 176, 0.15)' : 'var(--bg-elev)',
                          padding: '3px 8px', borderRadius: 999
                        }}>
                          {f.shared ? '✓ SÍ' : 'NO'}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Total */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: coupleMode ? '2.2fr 1fr 0.7fr' : '2.4fr 1fr',
                padding: '14px 14px',
                background: 'var(--bg-elev)',
                borderTop: '1px solid var(--border)',
                fontWeight: 800, gap: 8
              }}>
                <span style={{ fontSize: 13 }}>Total mensual</span>
                <span style={{ fontSize: 14, textAlign: 'right' }}>{fmtMoney(total)}</span>
                {coupleMode && (
                  <span style={{ fontSize: 11, textAlign: 'center', color: 'var(--text-mute)' }}>
                    {fmtMoney(shared)}
                  </span>
                )}
              </div>
            </div>

            {/* Resumen por categoría */}
            <div className="section-header" style={{ marginTop: 20 }}>
              <span>Por categoría</span>
            </div>
            <div className="col gap-8">
              {byCategory.map(c => (
                <div key={c.cat} className="card" style={{ padding: 12, borderRadius: 12 }}>
                  <div className="row gap-10" style={{ alignItems: 'center' }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8,
                      background: (c.color || '#5856D6') + '22',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 16
                    }}>{c.icon || '📦'}</div>
                    <div className="col gap-2" style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 13, fontWeight: 700 }}>{c.label || c.cat}</span>
                      <span className="tiny" style={{ fontSize: 10 }}>{c.items.length} {c.items.length === 1 ? 'pago' : 'pagos'}</span>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 800, color: c.color }}>{fmtMoney(c.total)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Resumen pareja al fondo */}
            {coupleMode && partner && (
              <div className="card mt-16" style={{
                padding: 14, borderRadius: 14,
                background: 'linear-gradient(135deg, rgba(0, 229, 176, 0.10), rgba(168, 85, 247, 0.08))',
                border: '1px solid rgba(0, 229, 176, 0.25)'
              }}>
                <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-mute)' }}>
                  Liquidación del mes
                </span>
                <div className="col gap-8 mt-8">
                  <div className="row gap-8" style={{ alignItems: 'center' }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: 'var(--green)', color: '#0D0D14',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 800, fontSize: 12
                    }}>{me?.avatar || 'YO'}</div>
                    <div className="col gap-2" style={{ flex: 1 }}>
                      <span style={{ fontSize: 12, fontWeight: 700 }}>{me?.name || 'Yo'}</span>
                      <span className="tiny" style={{ fontSize: 10 }}>Tu parte de los compartidos</span>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--green)' }}>
                      {fmtMoney(myShareOfShared)}
                    </span>
                  </div>
                  <div className="row gap-8" style={{ alignItems: 'center' }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: 'var(--purple)', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 800, fontSize: 12
                    }}>{partner.avatar || 'PA'}</div>
                    <div className="col gap-2" style={{ flex: 1 }}>
                      <span style={{ fontSize: 12, fontWeight: 700 }}>{partner.name || 'Pareja'}</span>
                      <span className="tiny" style={{ fontSize: 10 }}>Su parte de los compartidos</span>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--purple)' }}>
                      {fmtMoney(partnerShareOfShared)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
