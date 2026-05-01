import { useMemo, useState } from 'react';
import { Icon } from './icons.jsx';
import TopBar from './TopBar.jsx';
import { GOAL_TYPES } from '../data/sampleData.js';
import { fmtMoney, fmtMoneyShort } from '../utils/storage.js';

export default function Goals({ goals, fixedExpenses, onAddSavings, onCreate, onHome, onMenu }) {
  const [showCreate, setShowCreate] = useState(false);

  const totalSaved = useMemo(() => goals.reduce((s, g) => s + g.current, 0), [goals]);
  const totalTarget = useMemo(() => goals.reduce((s, g) => s + g.target, 0), [goals]);

  // Sugerencia inteligente: 6 meses de gastos fijos
  const monthlyFixed = fixedExpenses?.reduce((s, f) => s + f.amount, 0) || 0;
  const recommendedEmergency = monthlyFixed * 6;

  const calcSuggestion = (g) => {
    const today = new Date();
    const deadline = new Date(g.deadline);
    const weeks = Math.max(1, Math.ceil((deadline - today) / (1000 * 60 * 60 * 24 * 7)));
    const remaining = Math.max(0, g.target - g.current);
    return { weekly: remaining / weeks, weeks };
  };

  if (showCreate) {
    return (
      <CreateGoal
        onCancel={() => setShowCreate(false)}
        onCreate={(g) => {
          onCreate(g);
          setShowCreate(false);
        }}
        recommendedEmergency={recommendedEmergency}
      />
    );
  }

  return (
    <div className="screen" style={{ paddingTop: 0 }}>
      <TopBar onHome={onHome} onMenu={onMenu} title="Metas" />
      <div className="spread" style={{ padding: '12px 0' }}>
        <span style={{ fontSize: 13, color: 'var(--text-mute)' }}>Tus objetivos de ahorro</span>
        <button
          style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-elev)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setShowCreate(true)}
        >
          <Icon name="plus" size={18} />
        </button>
      </div>

      <div className="card mb-20" style={{ background: 'linear-gradient(135deg, rgba(0,229,176,0.08), rgba(0,132,255,0.08))', borderColor: 'rgba(0,229,176,0.2)' }}>
        <span className="label">Total Ahorrado</span>
        <h1 className="h1 mt-8" style={{ fontSize: 36 }}>{fmtMoney(totalSaved)}</h1>
        <span className="tiny">de {fmtMoney(totalTarget)} en metas</span>
        <div className="progress-track mt-12">
          <div className="progress-fill" style={{ width: `${(totalSaved / totalTarget) * 100}%` }}></div>
        </div>
      </div>

      <div className="col gap-16">
        {goals.map(g => {
          const pct = (g.current / g.target) * 100;
          const sug = calcSuggestion(g);
          const remaining = g.target - g.current;
          const goalType = GOAL_TYPES[g.type] || GOAL_TYPES.custom;
          return (
            <div key={g.id} className="card">
              <div className="spread">
                <div className="row gap-12">
                  <div className="cat-icon" style={{ background: g.color + '22', fontSize: 22 }}>
                    {g.icon}
                  </div>
                  <div className="col gap-4">
                    <span style={{ fontWeight: 600, fontSize: 16 }}>{g.name}</span>
                    <span className="tiny" style={{ background: g.color + '22', color: g.color, padding: '2px 8px', borderRadius: 6, alignSelf: 'flex-start', fontWeight: 600 }}>
                      {goalType.label}
                    </span>
                  </div>
                </div>
                <span style={{ fontWeight: 700, fontSize: 18 }}>{pct.toFixed(0)}%</span>
              </div>

              {g.notes && (
                <p className="tiny mt-8" style={{ lineHeight: 1.5 }}>📝 {g.notes}</p>
              )}

              <div className="progress-track mt-16">
                <div className="progress-fill" style={{ width: `${pct}%`, background: `linear-gradient(135deg, ${g.color}, var(--blue))` }}></div>
              </div>

              <div className="spread mt-12">
                <span style={{ fontSize: 14 }}>
                  <span style={{ fontWeight: 600 }}>{fmtMoney(g.current)}</span>
                  <span className="tiny"> / {fmtMoney(g.target)}</span>
                </span>
                <span className="tiny">Faltan {fmtMoney(remaining)}</span>
              </div>

              {remaining > 0 && (
                <div className="ai-alert mt-16">
                  <div className="ai-icon">
                    <Icon name="sparkle" size={14} color="#0D0D14" />
                  </div>
                  <div className="col gap-4" style={{ flex: 1 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>
                      Ahorra {fmtMoney(sug.weekly)} por semana
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text-mute)' }}>
                      Lograrás tu meta en {sug.weeks} semana{sug.weeks > 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              )}

              <button
                className="btn-secondary mt-12"
                style={{ height: 44, fontSize: 14 }}
                onClick={() => onAddSavings(g.id, sug.weekly)}
              >
                + Aportar {fmtMoneyShort(sug.weekly)}
              </button>
            </div>
          );
        })}
      </div>

      {goals.length === 0 && (
        <div className="card col" style={{ alignItems: 'center', padding: 40, gap: 12 }}>
          <Icon name="target" size={48} color="var(--text-dim)" />
          <span style={{ fontWeight: 600 }}>Sin metas todavía</span>
          <span className="tiny" style={{ textAlign: 'center' }}>Crea tu primera meta y la IA te ayudará a alcanzarla</span>
          <button className="btn-primary mt-16" onClick={() => setShowCreate(true)}>
            Crear Meta
          </button>
        </div>
      )}
    </div>
  );
}

function CreateGoal({ onCancel, onCreate, recommendedEmergency }) {
  const [step, setStep] = useState(1); // 1=tipo, 2=detalles
  const [type, setType] = useState(null);
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [deadline, setDeadline] = useState('');
  const [notes, setNotes] = useState('');

  const selectType = (t) => {
    setType(t);
    const tpl = GOAL_TYPES[t];
    setName(tpl.label);
    if (t === 'emergency') {
      setTarget(String(recommendedEmergency.toFixed(0)));
    }
    setStep(2);
  };

  return (
    <div className="screen">
      <button className="back-btn" onClick={step === 1 ? onCancel : () => setStep(1)}>
        <Icon name="back" size={20} />
      </button>

      {step === 1 && (
        <>
          <h2 className="h2 mb-8">¿Qué tipo de meta?</h2>
          <p className="label mb-20">Elige el tipo y la IA te ayuda a configurarla</p>

          <div className="col gap-12">
            {Object.entries(GOAL_TYPES).map(([key, t]) => (
              <button
                key={key}
                className="card row gap-12"
                style={{ textAlign: 'left', padding: 16 }}
                onClick={() => selectType(key)}
              >
                <div className="cat-icon" style={{ background: t.color + '22', fontSize: 22 }}>
                  {t.icon}
                </div>
                <div className="col gap-4" style={{ flex: 1 }}>
                  <span style={{ fontWeight: 600, fontSize: 15 }}>{t.label}</span>
                  <span className="tiny">
                    {key === 'emergency' && `Recomendado: ${fmtMoney(recommendedEmergency)} (6 meses de gastos)`}
                    {key === 'savings' && 'Ahorra el 20% de tu ingreso mensual'}
                    {key === 'travel' && 'Vuelos, hotel, comidas, actividades'}
                    {key === 'car' && 'Pronto pago, seguro, registro'}
                    {key === 'home' && 'Down payment, closing costs, mudanza'}
                    {key === 'education' && 'Colegio, certificaciones, libros'}
                    {key === 'custom' && 'Define tu propia meta'}
                  </span>
                </div>
                <Icon name="back" size={18} color="var(--text-mute)" stroke={2} />
              </button>
            ))}
          </div>
        </>
      )}

      {step === 2 && type && (
        <>
          <h2 className="h2 mb-8">Detalles de tu meta</h2>
          <p className="label mb-20">{GOAL_TYPES[type].label}</p>

          {type === 'emergency' && (
            <div className="ai-alert mb-16">
              <div className="ai-icon">
                <Icon name="sparkle" size={14} color="#0D0D14" />
              </div>
              <div className="col gap-4" style={{ flex: 1 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Recomendación de Kleo</span>
                <span style={{ fontSize: 12, color: 'var(--text-mute)', lineHeight: 1.5 }}>
                  Tu meta sugerida es <strong>{fmtMoney(recommendedEmergency)}</strong> = 6 meses de gastos fijos. Es el estándar de oro para emergencias (pérdida de empleo, salud, etc).
                </span>
              </div>
            </div>
          )}

          <div className="col gap-16">
            <div className="col gap-6">
              <span className="label">Nombre</span>
              <input
                className="input-field"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>

            <div className="col gap-6">
              <span className="label">Cantidad Objetivo</span>
              <div className="row" style={{ background: 'var(--bg-input)', borderRadius: 14, border: '1px solid var(--border)', padding: '0 16px', height: 54 }}>
                <span style={{ fontSize: 18, color: 'var(--text-mute)' }}>$</span>
                <input
                  style={{ background: 'transparent', border: 'none', height: 54, fontSize: 18, fontWeight: 600, padding: '0 8px', flex: 1, outline: 'none', color: 'inherit' }}
                  value={target}
                  onChange={e => setTarget(e.target.value.replace(/[^0-9.]/g, ''))}
                  inputMode="decimal"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="col gap-6">
              <span className="label">Fecha Límite</span>
              <input
                type="date"
                className="input-field"
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
                style={{ colorScheme: 'dark' }}
              />
            </div>

            <div className="col gap-6">
              <span className="label">Notas (opcional)</span>
              <input
                className="input-field"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Ej. Vuelo + hotel + comidas"
              />
            </div>
          </div>

          <button
            className="btn-primary mt-24"
            disabled={!name || !target || !deadline}
            onClick={() => {
              const t = GOAL_TYPES[type];
              onCreate({
                name,
                type,
                target: parseFloat(target),
                current: 0,
                deadline,
                icon: t.icon,
                color: t.color,
                notes
              });
            }}
          >
            Crear Meta
          </button>
        </>
      )}
    </div>
  );
}
