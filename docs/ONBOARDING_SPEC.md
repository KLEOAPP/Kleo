# Kleo · Spec del Onboarding completo

> **Lee este archivo antes de tocar `App.jsx`, `OnboardingTutorial.jsx`,
> `AdvisorOnboarding.jsx` o cualquier flujo de bienvenida.**

## El flujo end-to-end

El usuario nuevo pasa por **3 fases** secuenciales antes de poder usar la app
en su día a día:

```
┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────┐
│ FASE 1               │→ │ FASE 2               │→ │ FASE 3               │
│ Tutorial obligatorio │  │ Conectar cuentas     │  │ Asesor confirma todo │
│ con data de ejemplo  │  │ (Plaid)              │  │ + presupuesto + metas│
└──────────────────────┘  └──────────────────────┘  └──────────────────────┘
```

Solo después de la Fase 3 el usuario aterriza en el dashboard real con su
data y puede empezar a usar Kleo normalmente.

---

## FASE 1 · Tutorial obligatorio (~2-3 minutos)

**Cuándo se dispara:** justo después del primer setup de PIN (`STAGE.AUTHENTICATED`),
cuando `localStorage.kleo_tutorial_completed !== 'true'`.

**No se puede saltar.** Hay un botón "Atrás" pero no "Saltar".

**Componente:** `src/components/OnboardingTutorial.jsx` — modal full-screen
con slides en swipe horizontal o paginación.

### Slides (16)

Cada slide muestra una sección de la app con **datos de ejemplo** para que el
usuario entienda qué va a ver una vez conecte su banco real.

| # | Título | Qué enseña |
|---|---|---|
| 1 | Hola, soy Kleo | Bienvenida, qué es Kleo, qué espera del usuario |
| 2 | Disponible esta semana | El número grande del dashboard. Explica que se basa en cobro. Selector de periodo. |
| 3 | Acción recomendada hoy | El bloque morado del dashboard. Es lo más importante a hacer hoy. |
| 4 | Esta semana | El bloque azul. 6 pagos, 0 subs, 0 cierres. |
| 5 | Riesgo de la semana | Clima financiero ☀️/⛅/⛈. Ver riesgos abre Kleo AI. |
| 6 | Kleo Score | Score 750. Explicar fórmula: Pago 35% · Util 30% · Edad 15% · Mix 10% · Nuevo 10%. Botón a Crédito. |
| 7 | Tus cuentas | Lista de cuentas. Cómo entrar al detalle, cambiar nombre, eliminar. |
| 8 | Tarjetas de crédito | Cómo pagar, qué es APR, qué es utilización. Calculadora paso a paso. |
| 9 | Calendario inteligente | Eventos auto-detectados. NO hay que marcar pagado — Kleo lo detecta solo. |
| 10 | Metas | Cómo crear, vincular cuenta, depósitos automáticos, recordatorios. |
| 11 | Presupuesto | Configurar frecuencia de cobro, distribución por categorías, modo "Kleo me ayuda", gastos compartidos. |
| 12 | Transacciones | Filtros, búsqueda, transferencias en gris, totales que excluyen transferencias. |
| 13 | Rendimiento y Reportes | Análisis mensual, comparativa, tendencia. |
| 14 | Kleo AI · tu asesor 24/7 | Botón "Analizar mis finanzas". Genera plan completo: disponible, riesgos, acciones, plan puente. |
| 15 | Notificaciones | 12 tipos de aviso. Recordatorios 2 días antes del cierre, día del pago, ya cerró el ciclo. |
| 16 | Conectar tu primer banco | CTA grande. Plaid + 6 meses + auto-detección. |

### Estado guardado

```js
localStorage.kleo_tutorial_completed = 'true'
```

Si el usuario quiere volver a verlo: opción en `MoreMenu → Ver tutorial`.

---

## FASE 2 · Conectar cuentas (Plaid)

**Cuándo:** después del slide 16 del tutorial → CTA grande lleva a `ConnectBank`.

**Comportamiento ya existente:** Plaid Link → exchange-token baja 6 meses,
auto-detecta recurring, identifica institución.

**Importante:** el usuario puede conectar **múltiples bancos** uno tras otro
(Banco Popular + Chase + Discover, etc.). Cada nuevo `Add` re-llama Plaid Link
con un link_token nuevo. Después de cada conexión exitosa vuelve al
dashboard transitorio que muestra "1 banco conectado · Conectar otro".

---

## FASE 3 · Asesor confirma todo (Wizard largo)

**Cuándo:** después de cerrar la pantalla de "¡Conectado!" Y haber conectado
al menos 1 banco. Se abre `AdvisorOnboarding.jsx` (extendido del actual).

### Sub-pasos

#### 3.1 — Confirmar cuentas y tarjetas
"Detecté estas cuentas, ¿están todas? ¿Falta algo?"
- Lista visual de cuentas + tarjetas
- Botón "Sí, todo bien" → siguiente
- Botón "Falta algo" → regresa a ConnectBank

#### 3.2 — APRs faltantes
Solo si Plaid no devolvió APR de alguna tarjeta (común en PR).
Modal con input por tarjeta + hint.

#### 3.3 — Utilización meta
Las 6 opciones (5/10/15/20/25/30%) con pros/cons (ya existe).

#### 3.4 — Confirmar gastos fijos detectados
La AI lista lo que detectó del historial:
- Renta · $850 (día 1)
- Luz AAA · $120 (día 5)
- Internet Liberty · $74 (día 12)
- Netflix · $15.99 (día 19)
- Gym · $35 (día 25)
- ...

Por cada uno: ✅ "Es correcto" / ❌ "No es mío" / ✏️ "Editar".
Botón al final: "Agregar otro que falte".

#### 3.5 — Crear tabla de gastos
Pregunta: "¿Tienes otros gastos que pagas regularmente que no estén aquí?"
- Sí → input para agregar manual (nombre, monto, día, categoría)
- No → siguiente

#### 3.6 — Gastos en pareja (opt-in)
Toggle: "🏠 ¿Compartes gastos con alguien?"
- Si activo → pregunta nombre del partner + ratio de ingreso 50/50, 60/40, etc.
- Si no → continúa

#### 3.7 — Plan financiero existente
"¿Tienes un plan de finanzas hoy?" Sí/No (ya existe en wizard actual).

#### 3.8 — Metas y ahorros activos
La AI pregunta:
- "¿Tienes ahorros activos? ¿Para qué los estás guardando?"
- "¿Cuál cuenta tienes los ahorros?" (lista cuentas conectadas)
- "¿Tienes metas específicas (viaje, casa, carro)?"

Si la AI detectó depósitos recurrentes a una cuenta de ahorros, los muestra:
"Veo que mueves ~$200 cada quincena a tu Popular Savings. ¿Es para un meta?"
- Sí → preguntar nombre, target, fecha → crear meta auto-vinculada
- No → solo registrar como ahorro general

Si no tiene cuenta de ahorros separada:
"Te recomiendo abrir una cuenta de ahorros separada — Banco Popular, Oriental
y FirstBank ofrecen **cuentas virtuales gratis** que puedes abrir desde tu app
del banco en 5 minutos. Eso te ayuda a no tocar el dinero de las metas por
error."

#### 3.9 — Resumen + activar
Pantalla final con todo lo configurado:
- N cuentas, M tarjetas
- Utilización meta X%
- Y gastos fijos confirmados
- Z metas configuradas
- Plan: respetar / crear

Botón gigante: "Activar Kleo" → setea
`localStorage.kleo_advisor_profile.onboarding_completed = true` y aterriza
en el dashboard real.

---

## Detección continua después del onboarding

> "Si agrega algo después no importa cuánto tiempo haya pasado, el asistente lo
> reconocerá y actualizará todo."

**Cómo:** cada vez que el cron `/api/plaid/sync-transactions` corre (diario),
re-ejecuta `detectRecurring()` sobre los últimos 6 meses. Cualquier nueva
suscripción / membresía / pago recurrente se inserta en `fixed_expenses`
con un toast en la app: *"📋 Detecté un nuevo pago recurrente: [Netflix
$15.99 día 19]. Confírmalo en Calendario."*

Eventos de calendario nuevos también disparan notificación si están dentro
de los 7 días siguientes (regla de notificaciones aplica).

---

## Componentes y archivos

| Archivo | Estado |
|---|---|
| `src/components/OnboardingTutorial.jsx` | **Nuevo (esta sesión)** |
| `src/components/AdvisorOnboarding.jsx` | Existente, **extender en próxima sesión** |
| `src/lib/advisorProfile.js` | Existente, agregar `tutorialCompleted` |
| `App.jsx` | Wire del tutorial después de PIN setup |
| `MoreMenu.jsx` | Agregar opción "Ver tutorial otra vez" |

## Storage

```js
localStorage.kleo_tutorial_completed       = 'true'
localStorage.kleo_advisor_profile           // ya existe
localStorage.kleo_budget                    // ya existe
```

## Roadmap de implementación

- [x] Documentación del flujo (este archivo)
- [ ] OnboardingTutorial.jsx con 16 slides — esta sesión
- [ ] Wire en App.jsx — esta sesión
- [ ] AdvisorOnboarding extendido (3.4-3.8) — próxima sesión
- [ ] Detección continua de recurring con toast — próxima sesión
- [ ] Recomendación de cuenta virtual (BPPR/Oriental) — próxima sesión
