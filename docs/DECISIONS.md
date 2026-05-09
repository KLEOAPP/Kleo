# Kleo · Bitácora de decisiones

> Cada vez que tomamos una decisión importante, agregar una entrada aquí.
> Formato: `## YYYY-MM-DD · Título corto` + qué + por qué.

## 2026-05-09 · Tour interactivo (popover + spotlight) reemplaza el tutorial de slides

**Qué:** Reemplazado `OnboardingTutorial.jsx` (slides full-screen) por
`OnboardingTour.jsx` — un tour con spotlight que ilumina UN elemento real
de la app a la vez y muestra un popover flotante explicándolo. El resto de
la pantalla queda bloqueado: el usuario solo puede avanzar con los botones
del popover.

**Por qué:** El usuario pidió formato popover que diga "dónde tocar" cada
sección y que no permita interactuar con otros lados. Un slide-deck no
cumple eso — un coachmark sí.

**Implementación:**
- Overlay fullscreen con `pointer-events: auto` que captura todos los clicks
- SVG `<mask>` con un rectángulo negro recortado en el bounding rect del
  target → spotlight transparente
- Anillo morado pulsante alrededor del target (`box-shadow` + `keyframes`)
- Popover flotante posicionado encima/debajo del target según haya espacio,
  con flecha apuntando
- Auto-scroll del target al centro de pantalla al cambiar de paso
- Re-medición en `resize` y `scroll` para mantener el spotlight alineado
- `document.body.style.overflow = 'hidden'` mientras el tour está activo

**Targets marcados con `data-tour`:**
- `hero` — card "Disponible esta semana"
- `action` `week` `risk` — los 3 cards de Resumen (fila 1)
- `score` `aiTips` — Kleo Score y Consejos de IA (fila 2)
- `sections` — grid de 8 tiles abajo
- `navHome` `fab` `menu` — los 3 botones del bottom nav

**11 pasos:** Bienvenida (centrado) → Hero → Acción → Esta semana → Riesgo →
Score → AI Tips → Secciones → FAB → Menú → "Listo para conectar banco"
(centrado). Al final abre Plaid Link automáticamente.

`OnboardingTutorial.jsx` queda en el repo pero ya no se usa — se puede
remover en una pasada de cleanup.

## 2026-05-09 · Tutorial obligatorio + spec del onboarding completo

**Qué:** Construido `OnboardingTutorial.jsx` con 16 slides que cubren toda la
app con datos de ejemplo. Se dispara automáticamente la primera vez que el
usuario llega a `STAGE.AUTHENTICATED` cuando
`localStorage.kleo_tutorial_completed !== 'true'`. Después del último slide,
abre directamente `ConnectBank` para que conecte sus cuentas reales.

Slides cubren: Bienvenida · Disponible esta semana · Acción del día · Esta
semana · Riesgo · Kleo Score con fórmula FICO · Cuentas · Crédito (APR,
utilización, calculadora) · Calendario inteligente · Metas · Presupuesto ·
Transacciones · Análisis y Reportes · Kleo AI · Notificaciones · Conectar banco.

**Por qué:** El usuario pidió un "tutorial obligatorio con datos de ejemplo"
que cubra cada aspecto de la app antes de conectar cuentas reales, para que
entienda qué va a ver y cómo interactuar con todo. Sin esto el usuario llega
al dashboard frío sin saber qué significa cada bloque.

**Re-ver:** opción "📖 Ver tutorial otra vez" en MoreMenu que limpia el flag
y vuelve a disparar el tutorial.

**Spec completo en `docs/ONBOARDING_SPEC.md`** que documenta las 3 fases del
flujo completo:
1. Tutorial obligatorio (esta sesión, ✅ implementado)
2. Conectar cuentas Plaid (ya existía)
3. AdvisorOnboarding extendido (próxima sesión): confirmar cuentas detectadas,
   APRs faltantes (existe), utilización meta (existe), confirmar gastos fijos
   detectados, crear tabla de gastos, gastos en pareja toggle, plan financiero
   existente (existe), metas y ahorros activos con vinculación a cuenta y
   recomendación de cuenta virtual de banco local, resumen y activar.

## 2026-05-09 · Onboarding del asesor (4 pasos) tras conectar primer banco

**Qué:** Cuando el usuario conecta su primer banco, después de cerrar la
pantalla de "¡Conectado!" se abre automáticamente `AdvisorOnboarding.jsx`
con 4 pasos:
1. **APRs faltantes** — pide el APR de cada tarjeta que Plaid no devolvió
   (ej: muchas instituciones de PR no exponen APR vía Plaid). Input manual
   con explicación de dónde encontrarlo. Opción "lo hago después".
2. **Utilización meta** — usuario escoge entre 5/10/15/20/25/30% con tarjeta
   de pros/cons por cada uno. 5% marcado como recomendado.
3. **Plan financiero existente** — "¿Tienes un plan?" Sí/No.
   - Sí: textarea para describirlo (mínimo 10 chars). Kleo lo respeta y optimiza.
   - No: Kleo le crea uno desde el backtest de 6 meses.
4. **Resumen + activar** — confirma config y activa el asesor.

**Por qué:** El usuario pidió que el asesor se sienta como un wealth advisor
que conoce al cliente desde el día 1. El onboarding captura las 3 cosas
clave (APR, utilización meta, plan existente) que la AI necesita para dar
recomendaciones específicas en vez de genéricas.

**Detalles:**
- Storage: `localStorage.kleo_advisor_profile` con `{ target_utilization,
  has_existing_plan, existing_plan_description, manual_aprs }`
- `getAdvisorProfile()` y `setManualApr()` en `lib/advisorProfile.js`
- El endpoint `/api/ai/insights` ahora recibe `advisorProfile` + `budget` y
  los inyecta al perfil. La AI puede leer `advisor_preferences.target_utilization_pct`
  y respetarlo en sus recomendaciones de pago.
- `cards_missing_apr` en el perfil le permite a la AI emitir
  `missing_data_requests` para que el usuario complete los datos faltantes.

## 2026-05-09 · Spec de notificaciones completo

**Qué:** Documentado en `KLEO_NOTIFICATIONS_SPEC.md` el sistema de 12 tipos
de notificación con triggers exactos, copy en español PR, quiet hours
(21:00 - 7:00), máximo 3 push por día, anti-spam (no repetir mismo tipo
en 24h por evento), y preferencias por tipo.

**Por qué:** El usuario describió el comportamiento esperado: recordatorios
2 días antes del cycle close, día del pago, "no uses la tarjeta", "ya cerró
el ciclo", llegada del cheque, gasto inusual, etc.

**Pendiente de implementación:** la lógica del cron job tiene que leer las
nuevas reglas; tabla `notifications_sent` para tracking; UI de prefs en
MoreMenu.

## 2026-05-09 · Sistema de presupuesto basado en frecuencia de cobro

**Qué:** Implementado wizard de 4 pasos (`BudgetSetup.jsx`) que pregunta
frecuencia de cobro (weekly/biweekly/semimonthly/monthly), monto por cheque,
fecha del próximo cheque, y distribución por categorías (Esenciales / Ahorro /
Planes / Personal).

**Por qué:** Los usuarios reales en PR cobran en ciclos distintos. Calcular
"disponible esta semana" sin saber su ciclo daba números falsos. Ahora se
calcula desde el presupuesto real y se puede ver por día / semana / ciclo / mes.

**Detalles:**
- Storage: `localStorage` por ahora (key `kleo_budget`). Migración a Supabase
  pendiente cuando se requiera sync entre dispositivos.
- "Disponible" = (Personal + Planes) escalado al periodo. Esenciales y Ahorro
  no se restan al disponible — son dinero comprometido.
- Modo "🤖 Kleo me ayuda": pregunta renta, si tiene meta, si quiere ahorrar
  agresivo → genera distribución a medida.
- Auto-detección de frecuencia desde transacciones de payroll.

## 2026-05-09 · Reglas de clasificación quirúrgicas

**Qué:** Reescrita la lógica en `api/plaid/exchange-token.js` para clasificar
transacciones de forma precisa.

**Por qué:** La heurística previa (cualquier entrada en credit account =
transferencia) marcaba nóminas y reembolsos como transferencias.

**Reglas actuales** (ver `CLASSIFICATION_RULES.md`):
1. Patrones PAYROLL/EFT DEPOSIT/SALARY/SSA TREAS + amount<0 en Plaid =
   `ingreso`
2. Patrones de pago a tarjeta (Payment Thank You, Mobile Payment, Online
   Payment, AutoPay, EFT PMT, e-payment) = `transferencia`
3. Plaid categorías oficiales CREDIT_CARD_PAYMENT/TRANSFER_IN/TRANSFER_OUT
   = `transferencia`
4. Lo demás = categoría natural según `mapPlaidCategory(primary)`

## 2026-05-09 · Detección de recurring estricta

**Qué:** `detectRecurring()` en exchange-token excluye categorías de comida,
gasolina, supermercado, y bloquea merchants tipo McDonald's, Walmart, Costco,
gas stations.

**Por qué:** Antes McDonald's salía como "membresía mensual" si el usuario
iba 3 veces en distintos meses cerca de la misma fecha.

**Reglas:** solo cadencia mensual (28-32d) o bisemanal (14-16d con keyword);
consistencia de monto ±5% sin keyword o ±15% con keyword; monto mínimo $5;
mínimo 2 ocurrencias con keyword (Netflix/Spotify/etc) o 3 sin keyword.

## 2026-05-09 · Asesor IA con system prompt completo

**Qué:** `api/ai/insights.js` tiene un system prompt de 9 secciones que cubre
las reglas del producto: conocimiento profundo, detección de problemas,
cálculo del disponible por frecuencia, lógica de puente con tarjeta,
soluciones óptimas, comunicación, acciones automáticas, límites, formato JSON.

**Modelo:** `claude-sonnet-4-6` (Haiku probaba inestable). `max_tokens: 4096`.

**Reparación de truncamiento:** `repairTruncatedJson()` cierra strings/arrays/
braces abiertos cuando la respuesta llega cortada.

**Few-shot:** removido por ahora — confundía el schema lock. Si se quiere
volver a meter, hacerlo dentro del system prompt como ejemplos en texto, no
como mensajes user/assistant separados.

## 2026-05-09 · Idle session de 30 minutos

**Qué:** Tras desbloquear (PIN o FaceID), se guarda `kleo_last_unlock` en
localStorage. Si el usuario vuelve dentro de 30 min, salta el lock y va
directo a `STAGE.AUTHENTICATED`.

**Por qué:** El redirect de OAuth de Plaid (Chase, Capital One, BPPR) recarga
la app. Si re-pedíamos FaceID en el redirect, se rompía el flujo de
conexión del banco. Esto lo salva.

## 2026-05-09 · Eliminado seed de demo data

**Qué:** Removido `await seedDemoData(userId)` cuando un usuario nuevo entra.
`defaultHousehold` ahora arranca con `enabled: false` y un solo miembro "Yo".

**Por qué:** El usuario reportó que veía "Carlos / María 55-45" y
transacciones falsas (Texaco / Costco) que no le pertenecían.

## 2026-05-09 · Logos de banco multi-source

**Qué:** `BankLogo.jsx` prueba 3 fuentes en cadena: Clearbit Logo API → Google
Favicons (s2) → DuckDuckGo Icons. Si todo falla, cae a iniciales.

**Por qué:** Clearbit fallaba silenciosamente; el componente quedaba en blanco.

## 2026-05-09 · Plaid Production + 6 meses + reintentos

**Qué:** `exchange-token.js` baja 180 días con paginación (`count=500`,
`offset`). Reintenta `PRODUCT_NOT_READY` con backoff 5/10/15/20s.

**Por qué:** Plaid Production no tiene transacciones listas inmediatamente
después de linkear; el backoff espera a que el item esté ready.

## Plantilla para próximas decisiones

```
## YYYY-MM-DD · Título corto

**Qué:** [una oración]
**Por qué:** [razón]
**Detalles:** [opcional, bullets]
```
