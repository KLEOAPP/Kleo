import { useMemo, useState } from 'react';
import { Icon } from './icons.jsx';
import TopBar from './TopBar.jsx';
import MerchantIcon from './MerchantIcon.jsx';
import { fmtMoney, daysInMonth, daysUntil, monthName, fmtTime, fmtDate, nextPaymentDate } from '../utils/storage.js';

export default function Calendar({ accounts, fixedExpenses, transactions, onBack, onHome }) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { month: d.getMonth(), year: d.getFullYear() };
  });

  const today = new Date();
  const isCurrentMonth = today.getMonth() === cursor.month && today.getFullYear() === cursor.year;

  // Eventos del mes en cursor
  const monthEvents = useMemo(() => {
    const evts = [];
    const { month, year } = cursor;

    fixedExpenses.forEach(f => {
      const d = Math.min(f.dueDay, daysInMonth(year, month));
      evts.push({
        type: 'fixed',
        day: d,
        name: f.name,
        amount: f.amount,
        icon: f.icon,
        color: 'var(--blue)',
        meta: 'Pago fijo · mensual'
      });
    });

    accounts.filter(a => a.type === 'credit').forEach(a => {
      if (a.cycleCloseDay) {
        evts.push({
          type: 'cycle',
          day: Math.min(a.cycleCloseDay, daysInMonth(year, month)),
          name: `Cierre ${a.name}`,
          amount: Math.abs(a.balance),
          icon: '🔒',
          color: 'var(--orange)',
          meta: 'Cierre de ciclo · mensual'
        });
      }
      if (a.paymentDueDay) {
        evts.push({
          type: 'payment',
          day: Math.min(a.paymentDueDay, daysInMonth(year, month)),
          name: `Pago ${a.name}`,
          amount: Math.abs(a.balance),
          icon: '💳',
          color: 'var(--danger)',
          meta: 'Vence pago tarjeta · mensual'
        });
      }
    });

    return evts;
  }, [cursor, fixedExpenses, accounts]);

  const eventsByDay = useMemo(() => {
    const map = {};
    monthEvents.forEach(e => {
      if (!map[e.day]) map[e.day] = [];
      map[e.day].push(e);
    });
    return map;
  }, [monthEvents]);

  // 3 próximos pagos
  const upcoming = useMemo(() => {
    if (!isCurrentMonth) return [];
    const day = today.getDate();
    return monthEvents
      .filter(e => e.day >= day)
      .sort((a, b) => a.day - b.day)
      .slice(0, 3);
  }, [monthEvents, isCurrentMonth, today]);

  // Pagos recientes (de transacciones tipo bills)
  const recentPaid = useMemo(() => {
    return [...transactions]
      .filter(t => t.amount < 0 && (t.category === 'servicios' || t.category === 'hogar'))
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 3);
  }, [transactions]);

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
  };

  return (
    <div className="screen" style={{ paddingTop: 0 }}>
      <TopBar onHome={onHome} onBack={onBack} title="Calendario" />

      <div style={{ padding: '12px 0' }}>
        {/* Calendario visual */}
        <div className="card mb-20">
          <div className="spread mb-16">
            <button onClick={() => move(-1)} style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--bg-elev)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="back" size={14} />
            </button>
            <span style={{ fontWeight: 600, fontSize: 16, textTransform: 'capitalize' }}>
              {monthName(cursor.month, cursor.year)}
            </span>
            <button onClick={() => move(1)} style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--bg-elev)', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: 'rotate(180deg)' }}>
              <Icon name="back" size={14} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 8 }}>
            {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((d, i) => (
              <div key={i} className="tiny" style={{ textAlign: 'center', fontWeight: 600 }}>{d}</div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={'pad' + i}></div>
            ))}
            {Array.from({ length: dim }).map((_, i) => {
              const day = i + 1;
              const dayEvts = eventsByDay[day] || [];
              const isToday = isCurrentMonth && day === today.getDate();
              const hasPayment = dayEvts.some(e => e.type === 'payment');
              const hasCycle = dayEvts.some(e => e.type === 'cycle');
              const hasFixed = dayEvts.some(e => e.type === 'fixed');

              return (
                <div
                  key={day}
                  style={{
                    aspectRatio: '1',
                    borderRadius: 8,
                    background: isToday ? 'var(--blue)' : 'transparent',
                    color: isToday ? '#fff' : 'var(--text)',
                    fontSize: 14,
                    fontWeight: isToday ? 700 : 500,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    padding: 4
                  }}
                >
                  <span>{day}</span>
                  {dayEvts.length > 0 && (
                    <div style={{ display: 'flex', gap: 2, marginTop: 2 }}>
                      {hasPayment && <span style={{ width: 4, height: 4, borderRadius: '50%', background: isToday ? '#fff' : 'var(--danger)' }}></span>}
                      {hasCycle && <span style={{ width: 4, height: 4, borderRadius: '50%', background: isToday ? '#fff' : 'var(--orange)' }}></span>}
                      {hasFixed && <span style={{ width: 4, height: 4, borderRadius: '50%', background: isToday ? '#fff' : 'var(--blue)' }}></span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="row gap-12 mt-16" style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
            <div className="row gap-4"><span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--danger)' }}></span><span className="tiny">Pago tarjeta</span></div>
            <div className="row gap-4"><span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--orange)' }}></span><span className="tiny">Cierre ciclo</span></div>
            <div className="row gap-4"><span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--blue)' }}></span><span className="tiny">Pago fijo</span></div>
          </div>
        </div>

        {/* 3 próximos pagos */}
        <div className="section-header">
          <span>3 Próximos Pagos</span>
        </div>
        <div className="ios-list mb-20">
          {upcoming.length === 0 && (
            <div style={{ padding: 20, textAlign: 'center' }}>
              <span className="tiny">Sin pagos próximos este mes</span>
            </div>
          )}
          {upcoming.map((e, i) => {
            const days = e.day - today.getDate();
            return (
              <div key={i} className="ios-list-item">
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: e.color + '22',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18
                }}>{e.icon}</div>
                <div className="col gap-2" style={{ flex: 1 }}>
                  <span style={{ fontWeight: 500, fontSize: 15 }}>{e.name}</span>
                  <span className="tiny">
                    {days === 0 ? 'Vence hoy' : days === 1 ? 'Mañana' : `En ${days} días`} · {e.meta}
                  </span>
                </div>
                <span style={{ fontWeight: 600, fontSize: 15, color: days <= 3 ? e.color : 'var(--text)' }}>
                  {fmtMoney(e.amount)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Recientes (pagos ya hechos) */}
        <div className="section-header">
          <span>Pagos Recientes</span>
        </div>
        <div className="ios-list">
          {recentPaid.length === 0 && (
            <div style={{ padding: 20, textAlign: 'center' }}>
              <span className="tiny">Aún no se ha registrado ningún pago</span>
            </div>
          )}
          {recentPaid.map(t => (
            <div key={t.id} className="ios-list-item">
              <MerchantIcon merchant={t.merchant} category={t.category} size={40} />
              <div className="col gap-2" style={{ flex: 1 }}>
                <span style={{ fontWeight: 500, fontSize: 15 }}>{t.merchant}</span>
                <span className="tiny">Pagado · {fmtDate(t.date)} · {fmtTime(t.date)}</span>
              </div>
              <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--green)' }}>
                ✓ {fmtMoney(Math.abs(t.amount))}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
