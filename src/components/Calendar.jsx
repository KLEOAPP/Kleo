import { useMemo, useState, useEffect } from 'react';
import { Icon } from './icons.jsx';
import TopBar from './TopBar.jsx';
import BankLogo from './BankLogo.jsx';
import MerchantIcon from './MerchantIcon.jsx';
import { fmtMoney, fmtMoneyShort, daysInMonth } from '../utils/storage.js';
import { useI18n } from '../i18n/index.jsx';
import { buildMonthEvents, eventsByDay, detectSubscriptions } from '../utils/calendarEvents.js';

const TYPE_LABEL = (type, s) => ({
  fixed: s.calEventTypeFixed,
  cycle: s.calEventTypeCycle,
  payment: s.calEventTypePayment,
  subscription: s.calEventTypeSub,
  goal: s.calEventTypeGoal,
  manual: s.calEventTypeManual,
  alert: s.calEventTypeAlert
}[type] || s.calEventTypeManual);

export default function Calendar({ accounts, fixedExpenses, transactions, goals = [], onBack, onHome }) {
  const { strings: s, lang } = useI18n();
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { month: d.getMonth(), year: d.getFullYear() };
  });
  const [selectedDay, setSelectedDay] = useState(null);
  const [showAddManual, setShowAddManual] = useState(false);

  // Eventos manuales del usuario (persisten en localStorage)
  const [manualEvents, setManualEvents] = useState(() => {
    try { return JSON.parse(localStorage.getItem('kleo_manual_events') || '[]'); } catch { return []; }
  });
  useEffect(() => {
    localStorage.setItem('kleo_manual_events', JSON.stringify(manualEvents));
  }, [manualEvents]);

  const today = new Date();
  const isCurrentMonth = today.getMonth() === cursor.month && today.getFullYear() === cursor.year;

  const events = useMemo(
    () => buildMonthEvents({
      year: cursor.year, month: cursor.month,
      fixedExpenses, accounts, transactions, goals, manualEvents
    }),
    [cursor, fixedExpenses, accounts, transactions, goals, manualEvents]
  );
  const eventsMap = useMemo(() => eventsByDay(events), [events]);

  const dim = daysInMonth(cursor.year, cursor.month);
  const firstDayOfWeek = new Date(cursor.year, cursor.month, 1).getDay();

  const move = (delta) => {
    setCursor(prev => {
      let m = prev.month + delta;
      let y = prev.year;
      if (m > 11) { m = 0; y += 1; }
      if (m < 0) { m = 11; y -= 1; }
      return { month: m, year: y };
    });
    setSelectedDay(null);
  };

  // ===== Pagos de esta semana (solo mes actual) =====
  const weekPayments = useMemo(() => {
    if (!isCurrentMonth) return { events: [], total: 0, paidTotal: 0, pendingTotal: 0 };
    const start = today.getDate();
    const end = start + 7;
    const list = events
      .filter(e =>
        (e.type === 'fixed' || e.type === 'payment' || e.type === 'subscription' || e.type === 'goal') &&
        e.day >= start && e.day <= end
      )
      .sort((a, b) => a.day - b.day);
    const total = list.reduce((sum, e) => sum + (e.amount || 0), 0);
    const paidTotal = list.filter(e => e.paid).reduce((sum, e) => sum + (e.amount || 0), 0);
    const pendingTotal = total - paidTotal;
    return { events: list, total, paidTotal, pendingTotal };
  }, [events, isCurrentMonth]);

  const summary = useMemo(() => {
    const subsCount = detectSubscriptions(transactions).length;
    const goalsBehind = goals.filter(g => {
      if (!g.schedule?.nextDate) return false;
      const nd = new Date(g.schedule.nextDate);
      return nd < today && (g.current || 0) < g.target;
    }).length;
    const alerts = events.filter(e => e.type === 'alert').length;
    return { subsCount, goalsBehind, alerts };
  }, [events, transactions, goals]);

  return (
    <div className="screen" style={{ paddingTop: 0 }}>
      <TopBar onHome={onHome} onBack={onBack} title={s.calendar} />

      <div style={{ padding: '12px 0' }}>
        {/* ===== Resumen "Pagos esta semana" (arriba) ===== */}
        {isCurrentMonth && weekPayments.events.length > 0 && (
          <WeekSummary
            data={weekPayments}
            accounts={accounts}
            s={s}
            onPickEvent={(e) => setSelectedDay(e.day)}
          />
        )}

        {/* ===== Calendario principal ===== */}
        <div className="card mb-16" style={{ padding: 16, borderRadius: 22 }}>
          <div className="spread mb-16">
            <button onClick={() => move(-1)} style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--bg-elev)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="back" size={14} />
            </button>
            <span style={{ fontWeight: 700, fontSize: 16, textTransform: 'capitalize' }}>
              {new Date(cursor.year, cursor.month).toLocaleDateString(lang === 'en' ? 'en-US' : 'es-PR', { month: 'long', year: 'numeric' })}
            </span>
            <button onClick={() => move(1)} style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--bg-elev)', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: 'rotate(180deg)' }}>
              <Icon name="back" size={14} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 6 }}>
            {s.dayLetters.map((d, i) => (
              <div key={i} className="tiny" style={{ textAlign: 'center', fontWeight: 700, fontSize: 10, opacity: 0.6 }}>{d}</div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={'pad' + i}></div>)}
            {Array.from({ length: dim }).map((_, i) => {
              const day = i + 1;
              const dayEvts = eventsMap[day] || [];
              const isToday = isCurrentMonth && day === today.getDate();
              const dominant = dayEvts[0];
              const dominantColor = dominant?.color;
              const allPaid = dayEvts.length > 0 && dayEvts.every(e => e.paid || e.type === 'alert');

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  style={{
                    aspectRatio: '1',
                    borderRadius: 10,
                    background: isToday ? 'rgba(168, 85, 247, 0.15)'
                      : dayEvts.length === 0 ? 'transparent'
                      : 'var(--bg-elev)',
                    border: isToday ? '1.5px solid var(--purple)' : 'none',
                    color: 'var(--text)',
                    fontSize: 12,
                    fontWeight: isToday ? 700 : 500,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    padding: 4,
                    position: 'relative',
                    overflow: 'hidden',
                    minHeight: 56,
                    transition: 'background .15s',
                    opacity: allPaid ? 0.65 : 1
                  }}
                >
                  <span style={{ fontSize: 12, lineHeight: 1, opacity: dayEvts.length === 0 ? 0.5 : 1 }}>{day}</span>

                  {dominant && (
                    <div className="col" style={{ alignItems: 'center', gap: 1, marginTop: 3, position: 'relative' }}>
                      <DayEventGlyph event={dominant} small />
                      {dominant.paid && (
                        <span style={{
                          position: 'absolute', top: -3, right: -5,
                          width: 10, height: 10, borderRadius: '50%',
                          background: 'var(--green)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          border: '1.5px solid var(--bg-card)'
                        }}>
                          <Icon name="check" size={6} color="#0D0D14" stroke={4} />
                        </span>
                      )}
                      {dayEvts.length > 1 && (
                        <span style={{
                          fontSize: 8, fontWeight: 700,
                          padding: '0 3px',
                          borderRadius: 3,
                          background: 'var(--bg-card)',
                          color: 'var(--text-mute)',
                          marginTop: 1
                        }}>
                          +{dayEvts.length - 1}
                        </span>
                      )}
                    </div>
                  )}

                  {dominantColor && dayEvts.length > 0 && (
                    <div style={{
                      position: 'absolute', bottom: 0, left: 6, right: 6,
                      height: 2,
                      background: allPaid ? 'var(--green)' : dominantColor,
                      borderRadius: 1,
                      opacity: 0.9
                    }} />
                  )}
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 14, justifyContent: 'center' }}>
            <LegendDot color="#FF4D6D" label={s.calLegendUrgent} />
            <LegendDot color="#FFD60A" label={s.calLegendUpcoming} />
            <LegendDot color="#0A84FF" label={s.calLegendCycle} />
            <LegendDot color="#00E5B0" label={s.calLegendGoal} />
            <LegendDot color="#A855F7" label={s.calLegendSub} />
          </div>
        </div>

        {/* ===== Accesos rápidos restantes ===== */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 10,
          marginBottom: 16
        }}>
          <QuickModule
            icon="🔁"
            color="#A855F7"
            title={s.calQuickSubs}
            value={summary.subsCount}
            sub={s.calQuickSubsCount.replace('{n}', summary.subsCount)}
          />
          <QuickModule
            icon="🎯"
            color={summary.goalsBehind > 0 ? '#FF9500' : '#00E5B0'}
            title={s.calQuickGoals}
            value={summary.goalsBehind || '✓'}
            sub={summary.goalsBehind > 0
              ? s.calQuickGoalsCount.replace('{n}', summary.goalsBehind).replace('{s}', summary.goalsBehind === 1 ? '' : 's')
              : s.calQuickGoalsOk}
          />
          <QuickModule
            icon="⚠️"
            color={summary.alerts > 0 ? '#FF4D6D' : '#00E5B0'}
            title={s.calQuickAlerts}
            value={summary.alerts || '✓'}
            sub={summary.alerts > 0
              ? s.calQuickAlertsCount.replace('{n}', summary.alerts).replace('{s}', summary.alerts === 1 ? '' : 's')
              : s.calQuickAlertsOk}
          />
        </div>

        {/* Botón agregar recordatorio manual */}
        <button
          onClick={() => setShowAddManual(true)}
          className="row gap-8"
          style={{
            width: '100%',
            padding: 14,
            borderRadius: 14,
            background: 'var(--bg-elev)',
            border: '1px dashed var(--border)',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: 14
          }}
        >
          <Icon name="plus" size={16} />
          <span>{s.calAddManual}</span>
        </button>
      </div>

      {/* ===== Overlay del detalle del día ===== */}
      {selectedDay && (
        <DayDetailOverlay
          day={selectedDay}
          month={cursor.month}
          year={cursor.year}
          events={eventsMap[selectedDay] || []}
          accounts={accounts}
          s={s}
          lang={lang}
          onClose={() => setSelectedDay(null)}
          onDelete={(eventId) => {
            if (eventId.startsWith('manual')) {
              setManualEvents(prev => prev.filter(e => e.id !== eventId));
            }
          }}
        />
      )}

      {/* Modal: agregar manual */}
      {showAddManual && (
        <ManualEventModal
          s={s}
          year={cursor.year}
          month={cursor.month}
          dim={dim}
          onClose={() => setShowAddManual(false)}
          onSave={(ev) => {
            setManualEvents(prev => [...prev, { ...ev, id: 'manual-' + Date.now(), year: cursor.year, month: cursor.month }]);
            setShowAddManual(false);
          }}
        />
      )}
    </div>
  );
}

/* ============================ Sub-componentes ============================ */

function WeekSummary({ data, accounts, s, onPickEvent }) {
  const [expanded, setExpanded] = useState(false);
  const visibleEvents = expanded ? data.events : data.events.slice(0, 5);
  return (
    <div className="card mb-16" style={{
      padding: 16,
      borderRadius: 22,
      background: 'linear-gradient(135deg, rgba(255, 77, 109, 0.10), rgba(168, 85, 247, 0.10))',
      border: '1px solid rgba(255, 77, 109, 0.25)'
    }}>
      <div className="spread mb-12">
        <div className="col gap-2">
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-mute)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            💳 {s.calQuickPayments} · {s.calQuickPaymentsCount.replace('{n}', data.events.length)}
          </span>
          <span style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1 }}>
            {fmtMoney(data.total)}
          </span>
        </div>
        <div className="col" style={{ alignItems: 'flex-end', gap: 4 }}>
          {data.paidTotal > 0 && (
            <div className="row gap-4" style={{ alignItems: 'center' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)' }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--green)' }}>
                {fmtMoneyShort(data.paidTotal)} pagado
              </span>
            </div>
          )}
          {data.pendingTotal > 0 && (
            <div className="row gap-4" style={{ alignItems: 'center' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--orange)' }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--orange)' }}>
                {fmtMoneyShort(data.pendingTotal)} pendiente
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Barra dual paid / pending */}
      {data.total > 0 && (
        <div style={{
          height: 6, borderRadius: 999, overflow: 'hidden',
          background: 'rgba(255, 149, 0, 0.25)',
          position: 'relative', marginBottom: 12
        }}>
          <div style={{
            width: `${(data.paidTotal / data.total) * 100}%`,
            height: '100%', background: 'var(--green)',
            transition: 'width .3s'
          }} />
        </div>
      )}

      {/* Lista compacta de eventos */}
      <div className="col gap-6">
        {visibleEvents.map(e => (
          <button
            key={e.id}
            onClick={() => onPickEvent(e)}
            className="row gap-10 spread"
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: 10,
              background: 'var(--bg-card)',
              border: `1px solid ${e.color}33`,
              opacity: e.paid ? 0.6 : 1,
              alignItems: 'center'
            }}
          >
            <DayEventGlyph event={e} small />
            <div className="col gap-1" style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
              <span style={{
                fontSize: 13, fontWeight: 700,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                textDecoration: e.paid ? 'line-through' : 'none'
              }}>
                {e.name}
              </span>
              <span className="tiny" style={{ fontSize: 10 }}>
                Día {e.day} · {TYPE_LABEL(e.type, s)}
              </span>
            </div>
            <div className="col" style={{ alignItems: 'flex-end', gap: 1 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: e.paid ? 'var(--green)' : 'var(--text)' }}>
                {fmtMoney(e.amount)}
              </span>
              {e.paid && (
                <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--green)' }}>✓ pagado</span>
              )}
            </div>
          </button>
        ))}
        {data.events.length > 5 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="row gap-4"
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: 10,
              background: 'transparent',
              border: '1px solid var(--border)',
              fontSize: 12, fontWeight: 700,
              color: 'var(--blue)',
              justifyContent: 'center',
              alignItems: 'center',
              marginTop: 4
            }}
          >
            <span>{expanded ? '▴ Ver menos' : `▾ Ver ${data.events.length - 5} más`}</span>
          </button>
        )}
      </div>
    </div>
  );
}

function DayEventGlyph({ event, small }) {
  const size = small ? 22 : 36;
  const radius = small ? 5 : 10;
  if (event.type === 'cycle' || event.type === 'payment') {
    return <BankLogo institution={event.institution} size={size} radius={radius} />;
  }
  if (event.type === 'subscription') {
    return <MerchantIcon merchant={event.merchant} category={event.category} size={size} />;
  }
  if (event.icon) {
    return (
      <div style={{
        width: size, height: size, borderRadius: radius,
        background: event.color + '33',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.55,
        flexShrink: 0
      }}>
        {event.icon}
      </div>
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: radius,
      background: event.color, flexShrink: 0
    }} />
  );
}

function LegendDot({ color, label }) {
  return (
    <div className="row gap-4" style={{ alignItems: 'center' }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: color }} />
      <span className="tiny" style={{ fontSize: 10, fontWeight: 600 }}>{label}</span>
    </div>
  );
}

function QuickModule({ icon, color, title, value, sub }) {
  return (
    <div className="card" style={{
      padding: 12, borderRadius: 14,
      position: 'relative', overflow: 'hidden'
    }}>
      <div style={{
        position: 'absolute', top: -20, right: -20,
        width: 70, height: 70, borderRadius: '50%',
        background: color, opacity: 0.15, pointerEvents: 'none'
      }} />
      <div className="row gap-6" style={{ alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-mute)' }}>{title}</span>
      </div>
      <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', color }}>{value}</div>
      <span className="tiny" style={{ fontSize: 10 }}>{sub}</span>
    </div>
  );
}

function DayDetailOverlay({ day, month, year, events, accounts, s, lang, onClose, onDelete }) {
  const date = new Date(year, month, day);
  const dateStr = date.toLocaleDateString(lang === 'en' ? 'en-US' : 'es-PR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
        zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        backdropFilter: 'blur(6px)'
      }}
      onClick={onClose}
    >
      <div
        className="app-shell"
        style={{
          background: 'var(--bg)',
          maxHeight: '85vh',
          overflowY: 'auto',
          borderRadius: '24px 24px 0 0',
          padding: 20,
          paddingBottom: 32,
          animation: 'fadeUp .3s ease',
          border: '1px solid var(--border)'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div style={{ width: 36, height: 5, background: 'var(--border)', borderRadius: 3, margin: '0 auto 16px' }} />

        <div className="spread mb-16">
          <div className="col gap-2">
            <span style={{ fontSize: 11, color: 'var(--text-mute)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {s.calDayDetail}
            </span>
            <span style={{ fontWeight: 800, fontSize: 18, textTransform: 'capitalize' }}>{dateStr}</span>
          </div>
          <button
            onClick={onClose}
            style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--bg-elev)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Icon name="x" size={16} />
          </button>
        </div>

        {events.length === 0 ? (
          <div className="col" style={{ alignItems: 'center', padding: 40, gap: 12 }}>
            <span style={{ fontSize: 40, opacity: 0.4 }}>📭</span>
            <p className="tiny" style={{ textAlign: 'center' }}>{s.calNoEventsDay}</p>
          </div>
        ) : (
          <div className="col gap-12">
            {events.map(e => (
              <DayEventCard
                key={e.id}
                event={e}
                accounts={accounts}
                s={s}
                lang={lang}
                onDelete={() => onDelete(e.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DayEventCard({ event: e, accounts, s, lang, onDelete }) {
  const status = e.paid ? 'paid' : e.urgency === 'past' ? 'overdue' : e.urgency === 'today' ? 'today' : 'scheduled';
  const statusLabel =
    status === 'paid' ? s.calStatusPaid :
    status === 'overdue' ? s.calStatusOverdue :
    status === 'today' ? s.todayExcl :
    s.calStatusScheduled;
  const statusColor =
    status === 'paid' ? '#00E5B0' :
    status === 'overdue' ? '#FF4D6D' :
    status === 'today' ? '#FF9500' :
    '#A855F7';

  return (
    <div style={{
      padding: 14,
      borderRadius: 14,
      background: 'var(--bg-card)',
      border: `1px solid ${e.color}44`,
      opacity: e.paid ? 0.85 : 1
    }}>
      <div className="row gap-12" style={{ alignItems: 'flex-start' }}>
        <DayEventGlyph event={e} />
        <div className="col gap-2" style={{ flex: 1, minWidth: 0 }}>
          <div className="spread" style={{ alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: e.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {TYPE_LABEL(e.type, s)}
            </span>
            <div className="row gap-4" style={{
              padding: '3px 8px', borderRadius: 999,
              background: statusColor + '22',
              alignItems: 'center'
            }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: statusColor }} />
              <span style={{ fontSize: 10, fontWeight: 800, color: statusColor }}>{statusLabel}</span>
            </div>
          </div>
          <span style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.2 }}>{e.name}</span>
          {e.amount > 0 && (
            <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', marginTop: 2 }}>
              {fmtMoney(e.amount)}
            </span>
          )}
          {e.paid && e.paidDate && (
            <span className="tiny" style={{ fontSize: 11, color: 'var(--green)', fontWeight: 600 }}>
              ✓ Detectado el {new Date(e.paidDate).toLocaleDateString(lang === 'en' ? 'en-US' : 'es-PR', { day: 'numeric', month: 'short' })}
              {e.paidVia ? ` · ${e.paidVia}` : ''}
            </span>
          )}
          {e.message && (
            <span className="tiny" style={{ fontSize: 12, lineHeight: 1.5, marginTop: 4 }}>{e.message}</span>
          )}
        </div>
      </div>

      {e.locked && e.lockedReason === 'bank-set' && (
        <div className="tiny mt-8" style={{
          background: 'rgba(10, 132, 255, 0.1)',
          color: 'var(--blue)',
          padding: '8px 12px',
          borderRadius: 8,
          fontSize: 11,
          fontWeight: 600
        }}>
          🔒 {s.calLockedReason}
        </div>
      )}

      {!e.paid && e.manual && (
        <div className="row gap-6 mt-10">
          <button
            onClick={onDelete}
            className="row gap-4"
            style={{
              padding: '8px 12px', borderRadius: 8,
              background: 'var(--bg-elev)',
              color: 'var(--danger)',
              fontSize: 12, fontWeight: 700,
              border: '1px solid var(--border)'
            }}
          >
            <Icon name="x" size={12} color="var(--danger)" />
            <span>Eliminar</span>
          </button>
        </div>
      )}
    </div>
  );
}

function ManualEventModal({ s, year, month, dim, onClose, onSave }) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [day, setDay] = useState(1);
  const [type, setType] = useState('reminder');

  const types = [
    { k: 'reminder', label: s.calEventTypeManual, icon: '🔔', color: '#5856D6' },
    { k: 'bill', label: s.calEventTypeFixed, icon: '🏠', color: '#FF9500' },
    { k: 'subscription', label: s.calEventTypeSub, icon: '🔁', color: '#A855F7' }
  ];

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      backdropFilter: 'blur(4px)'
    }} onClick={onClose}>
      <div className="app-shell" style={{
        background: 'var(--bg)', maxHeight: '85vh', overflowY: 'auto',
        borderRadius: '24px 24px 0 0', padding: 20,
        animation: 'fadeUp .3s ease',
        border: '1px solid var(--border)'
      }} onClick={e => e.stopPropagation()}>
        <div style={{ width: 36, height: 5, background: 'var(--border)', borderRadius: 3, margin: '0 auto 16px' }}></div>
        <h2 className="h2 mb-16">{s.calAddManual}</h2>

        <div className="col gap-14">
          <div className="col gap-4">
            <span className="label">{s.calManualType}</span>
            <div style={{ display: 'flex', gap: 6 }}>
              {types.map(t => (
                <button
                  key={t.k}
                  onClick={() => setType(t.k)}
                  style={{
                    flex: 1, padding: '10px 6px',
                    borderRadius: 10,
                    background: type === t.k ? 'var(--pill-grad)' : 'var(--bg-elev)',
                    color: type === t.k ? '#fff' : 'var(--text)',
                    border: 'none',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2
                  }}
                >
                  <span style={{ fontSize: 18 }}>{t.icon}</span>
                  <span style={{ fontSize: 11, fontWeight: 600 }}>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="col gap-4">
            <span className="label">{s.calManualName}</span>
            <input className="input-field" value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Luz, AAA, Gym…" />
          </div>

          <div className="col gap-4">
            <span className="label">{s.calManualAmount}</span>
            <div className="row" style={{ background: 'var(--bg-input)', borderRadius: 12, border: '1px solid var(--border)', padding: '0 14px', height: 46 }}>
              <span style={{ fontSize: 16, color: 'var(--text-mute)' }}>$</span>
              <input
                style={{ background: 'transparent', border: 'none', height: 46, fontSize: 16, fontWeight: 600, padding: '0 6px', flex: 1, outline: 'none', color: 'inherit' }}
                value={amount}
                onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                inputMode="decimal"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="col gap-4">
            <span className="label">{s.calManualDay}</span>
            <input
              type="number"
              min="1"
              max={dim}
              className="input-field"
              value={day}
              onChange={e => setDay(Math.min(dim, Math.max(1, parseInt(e.target.value) || 1)))}
            />
          </div>
        </div>

        <button
          className="btn-primary mt-20"
          disabled={!name || !amount || !day}
          onClick={() => {
            const t = types.find(x => x.k === type);
            onSave({
              type: 'manual',
              name,
              amount: parseFloat(amount),
              day: parseInt(day),
              icon: t?.icon || '🔔',
              color: t?.color || '#5856D6'
            });
          }}
        >
          {s.save}
        </button>
      </div>
    </div>
  );
}
