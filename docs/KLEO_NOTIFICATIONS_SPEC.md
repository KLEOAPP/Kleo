# Kleo · Spec de Notificaciones

> **Lee este archivo antes de tocar `api/push/*` o el sistema de
> notificaciones.** Toda nueva notificación debe respetarlo.

> **TODO:** Esta spec falta. Pega aquí el documento original que tenías
> sobre cuándo enviar notificaciones (tipos, condiciones, copy, frecuencia,
> horarios). Una vez pegado, este archivo se queda con el repo y no se
> pierde aunque se compacte la conversación.

## Estructura sugerida (para cuando lo pegues)

### Tipos de notificación

- **Recordatorios de pago** — días antes del vencimiento de bills/cards
- **Alertas de riesgo** — sobregiro, utilización alta antes del cierre
- **Logros de meta** — 25%, 50%, 75%, 100%
- **Resumen semanal de progreso** — cada lunes
- **Detección de gasto inusual** — transacción fuera de patrón
- **Llegada de cheque** — confirmación + sugerencia de distribución

### Condiciones de envío

Por cada tipo, definir:
- Trigger (qué evento lo dispara)
- Ventana de tiempo (cuándo: días antes, hora del día)
- Frecuencia máxima (cuántas por día / semana)
- Quiet hours (no enviar entre X y Y)

### Copy

Por cada tipo, plantillas en español:
- Título corto
- Cuerpo accionable
- CTA / sección de la app a la que dirige

### Implementación actual

Hoy existen estas piezas (verificadas en el repo):
- `api/push/check-payments.js` — cron diario 12:00 UTC
- `api/push/ai-tips.js` — cron 13:00 y 22:00 UTC
- `src/lib/push.js` — subscribe / unsubscribe lado cliente
- Tabla `push_subscriptions` en Supabase
- VAPID keys en variables de entorno

Cuando tengas la spec, dime y la implemento exactamente como la quieres.
