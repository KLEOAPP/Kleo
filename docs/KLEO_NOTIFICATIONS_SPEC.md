# Kleo · Spec de Notificaciones

> **Lee este archivo antes de tocar `api/push/*` o el sistema de notificaciones.**

## Filosofía

Las notificaciones de Kleo son **órdenes de qué hacer**, no resúmenes pasivos.
Cada push debe responder: qué hacer / cuándo / por qué / cuánto.

Tono: directo, profesional, empático. Sin jerga.

## Tipos de notificación

### 1. Recordatorio de pago de tarjeta — 2 días antes del cycle close

**Trigger:** 2 días antes del `cycle_close_day` de cada tarjeta con balance > 0.

**Copy ejemplo:**
> 💳 Paga $X de Chase para llegar a 5%
>
> Tu Chase ••8971 cierra ciclo en 2 días. Si pagas $345 ahora, reportas
> utilización del 5% y tu score sube. Después no uses la tarjeta hasta
> que cierre el ciclo el 15.

**Cálculo del monto:**
```
target_balance = limit × (target_utilization / 100)
amount_to_pay = max(0, current_balance - target_balance)
```

`target_utilization` viene del perfil del usuario (5/10/15/20/25/30%).

**CTA:** abre la sección Crédito → la tarjeta.

### 2. Recordatorio del día del pago — payment due day

**Trigger:** mañana del `payment_due_day` si NO se ha detectado pago en las
últimas 72h.

**Copy:**
> ⚠️ Vence hoy: pago mínimo de $X — Discover
>
> Hoy es el día. Paga al menos $25 para evitar cargo por atraso ($35) y
> proteger tu historial de pagos (35% de tu score FICO).

### 3. Aviso "no uses la tarjeta hasta que cierre el ciclo"

**Trigger:** justo después de detectar un pago a tarjeta que dejó balance bajo
(ej: usuario pagó para llegar a 5%) Y aún faltan días para que cierre.

**Copy:**
> 🔒 No uses tu Chase hasta el 15
>
> Pagaste $345 — tu balance ahora es $50 (5% util). Si usas la tarjeta
> antes del cierre del ciclo (15), el balance reportado va a subir y
> pierdes el efecto. Espera al 15.

### 4. Aviso "ciclo cerrado, ya puedes usarla"

**Trigger:** día del `cycle_close_day` + 1 (ya cerró ayer).

**Copy:**
> ✅ Tu Chase ya reportó — puedes usarla otra vez
>
> El ciclo cerró ayer. Tu Chase reportó 5% al buró. Ya puedes usarla
> normal hasta 2 días antes del próximo cierre (12 del mes que viene).

### 5. Recordatorio de pagos fijos (renta, luz, agua, etc.) — 3 días antes

**Trigger:** 3 días antes del `due_day` del fixed_expense.

**Copy:**
> 🏠 Renta vence en 3 días — $850
>
> Tu disponible esta semana es $1,200, alcanza. Te recordaré el día.

### 6. Recordatorio del día del pago fijo

**Trigger:** mañana del `due_day` si no se ha detectado el pago.

### 7. Alerta de riesgo de sobregiro

**Trigger:** `disponible_calculado < pagos_próximos_7d` Y aún no llega el cheque.

**Copy:**
> ⚠️ Vas a quedar corto $50 esta semana
>
> Te entran $0 antes del 17. Te quedan $80 cash y debes $130 en pagos.
> Toca para ver cómo cubrirlo con tu Discover (puente).

**CTA:** abre Kleo AI con la solución pre-cargada.

### 8. Detección de gasto inusual

**Trigger:** transacción > 2× el promedio de su categoría en últimos 30d
Y > $50.

**Copy:**
> 👀 Gasto inusual: $185 en Costco
>
> Sueles gastar ~$60 en supermercado por compra. ¿Fue compra grande
> compartida o algo distinto?

**CTA:** opciones rápidas: "Es normal" / "Compartir con hogar" / "Ver detalle".

### 9. Llegada del cheque (próximo paycheck date detectado)

**Trigger:** mañana del `next_paycheck_estimate` o cuando se detecta un
deposit de payroll.

**Copy:**
> 💵 Te entró tu cheque · $1,360
>
> Recomiendo: $90 a Discover (puente que usaste), $200 a tu meta de viaje,
> $1,070 disponible esta quincena. Toca para confirmar el plan.

### 10. Logro de meta — 25 / 50 / 75 / 100%

**Trigger:** cuando una meta cruza esos hitos.

### 11. Resumen semanal de progreso — lunes 9am

**Trigger:** cron lunes 9:00 AM hora local.

**Copy:**
> 📊 Semana pasada: $410 gastados, $80 sobre tu personal
>
> Ahorraste $240. Te quedan 8 días del ciclo. Te recomiendo bajar
> $20/día en Personal hasta el cheque.

### 12. Tip diario de Kleo AI

**Trigger:** cron 1pm diario, solo si la AI tiene una recomendación que
mover el aguja (riesgo detectado, oportunidad clara).

NO enviar tips genéricos. Si no hay nada accionable, no enviar nada.

## Reglas de envío

### Quiet hours
- **NO enviar push entre 9:00 PM y 7:00 AM** hora local del usuario.
- Excepción: alertas críticas (riesgo de sobregiro hoy mismo).

### Frecuencia máxima
- **Máximo 3 push por día** por usuario.
- Si hay más eventos, agrupar en una sola: "Tienes 3 cosas urgentes hoy".

### Anti-spam
- No enviar el mismo tipo de notificación dos veces en 24h para el mismo
  evento.
- Tracking via tabla `notifications_sent (user_id, type, ref_id, sent_at)`.

### Confirmación de pago
- Si el usuario marca el pago como hecho (en la app o por detección de tx),
  cancelar las notificaciones pendientes para ese evento.

## Preferencias del usuario

En `MoreMenu → Notificaciones` el usuario puede toggle por categoría:

- ✅ Recordatorios de pago de tarjetas
- ✅ Recordatorios de pagos fijos
- ✅ Alertas de riesgo
- ✅ Llegada del cheque
- ✅ Logros de meta
- ✅ Resumen semanal
- ❌ Detección de gasto inusual (default off, requiere opt-in)
- ❌ Tips diarios de Kleo (default off, requiere opt-in)

Almacenado en `localStorage.kleo_notif_prefs` y sync a Supabase
`user_notification_prefs`.

## Implementación actual

Hoy existen estas piezas:
- `api/push/check-payments.js` — cron diario 12:00 UTC
- `api/push/ai-tips.js` — cron 13:00 y 22:00 UTC
- `src/lib/push.js` — subscribe / unsubscribe lado cliente
- Tabla `push_subscriptions` en Supabase
- VAPID keys en variables de entorno

**TODO** según este spec:
- [ ] Implementar lógica de cycle-close-2d-before
- [ ] Implementar "no uses la tarjeta" después de pago
- [ ] Implementar aviso de "ciclo cerrado, ya puedes usar"
- [ ] Quiet hours por timezone del usuario
- [ ] Tabla `notifications_sent` para anti-spam
- [ ] UI de preferencias por tipo en MoreMenu
- [ ] Detección de gasto inusual con threshold 2× categoría
- [ ] Resumen semanal lunes 9am
