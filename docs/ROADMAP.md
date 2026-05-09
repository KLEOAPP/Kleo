# Kleo · Roadmap

> Estado del producto. Actualizar cuando se complete o cambie de prioridad.

## ✅ Hecho

### Asesor IA
- [x] Endpoint `/api/ai/insights` con perfil financiero estructurado
- [x] System prompt completo (9 secciones del spec)
- [x] Output JSON: weekly_available, risks, actions, bridge plan,
      cash flow projection, spending patterns
- [x] Reparación de truncamiento
- [x] Pantalla `KleoAi.jsx` con secciones renderizadas

### Plaid
- [x] Production funcionando en `kleopr.com`
- [x] OAuth resume (vuelve de Chase/Capital One/etc sin romper)
- [x] 6 meses de historial con paginación
- [x] Reintentos PRODUCT_NOT_READY
- [x] Auto-detección de recurring (estricta, no caza fast food)
- [x] Logos oficiales de banco (multi-source con fallback)
- [x] Re-clasificación quirúrgica (payroll, transferencias, refunds)

### Presupuesto
- [x] Wizard de 4 pasos (`BudgetSetup.jsx`)
- [x] 4 frecuencias de cobro
- [x] 3 modos de alocación (Sugerencia / Manual / Kleo me ayuda)
- [x] Selector de periodo en hero (Día / Semana / Ciclo / Mes)
- [x] Storage local

### UX general
- [x] Idle session 30 min (no rompe OAuth)
- [x] Empty states honestos (`—` cuando no hay data)
- [x] Logos oficiales en cuentas, transacciones, calendario
- [x] Calendario inteligente con eventos auto-detectados
- [x] Metas con vinculación a cuenta + auto-tracking de depósitos
- [x] Crédito: plan por tarjeta + calculadora paso a paso
- [x] i18n ES/EN
- [x] PWA + push notifications básicas

## 🟡 En progreso / próximos

### Asesor IA
- [ ] Inyectar `user_budget` al perfil que recibe la AI
- [ ] Function calling: que la AI pueda crear/actualizar metas, recordatorios
- [ ] Histórico de análisis (comparar plan de ayer vs hoy)
- [ ] Push proactivo: la AI te avisa cuando detecta riesgo

### Presupuesto
- [ ] Sync a Supabase `user_budgets` (tabla nueva)
- [ ] Onboarding: forzar wizard de presupuesto después de conectar 1er banco
- [ ] "Cuánto te queda" — descontar gastos personales reales vs budget
- [ ] Alertas cuando se va el 75% / 90% de Personal antes de fin de ciclo
- [ ] Roll-over: lo que sobra se acumula

### Notificaciones
- [ ] Pegar el spec original del usuario en `KLEO_NOTIFICATIONS_SPEC.md`
- [ ] Reglas de cuándo enviar (X días antes, quiet hours, frecuencia max)
- [ ] Copy en español
- [ ] Cron rules + filtros por tipo

### Clasificación
- [ ] Endpoint para que el usuario corrija manualmente la categoría de una
      transacción (y aprenda)
- [ ] Modelo de "merchant overrides" por usuario
- [ ] Botón "Esto no es transferencia" en la lista

### Calidad de vida
- [ ] Webhook de Plaid para nuevas transacciones (no solo cron sync)
- [ ] Manejo de re-link cuando el item de Plaid expira
- [ ] Soporte para múltiples Items de Plaid (varios banks)
- [ ] Modo offline / cache de la última respuesta de la AI

## 🔵 Backlog (cuando haya tracción)

- [ ] Apple Card support (manual import porque no es Plaid)
- [ ] Crypto / inversiones (read-only)
- [ ] Reportes para impuestos (categorías deducibles)
- [ ] Compartir cuenta con cónyuge / familia
- [ ] Modo "advisor pro" con consultas en chat
- [ ] Export de datos a CSV / PDF

## ❌ Descartado

- ~~Demo data automático~~ — confunde al usuario, lo eliminamos
- ~~Few-shot user/assistant en el AI~~ — desviaba el schema
- ~~claude-haiku-4-5 como modelo~~ — inestable para este account
- ~~Datos hardcoded de Carlos/María~~ — defaultHousehold ahora vacío
