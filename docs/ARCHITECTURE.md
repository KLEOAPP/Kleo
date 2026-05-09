# Kleo · Arquitectura

## Stack

| Capa | Tech |
|---|---|
| Frontend | React 18 + Vite, sin TypeScript (JSX) |
| Estado | useState/useMemo/useEffect (sin Redux, sin Zustand) |
| Hosting | Vercel (build + serverless functions en `/api/`) |
| Dominio | `kleopr.com` |
| Base de datos | Supabase (Postgres + Row Level Security) |
| Auth | Supabase Auth (Google + Apple OAuth) |
| Bancos | Plaid (Production · 6 meses de historial) |
| IA | Anthropic API (`claude-sonnet-4-6`) |
| Push | VAPID + service worker |
| i18n | Custom context (`src/i18n/`) — ES/EN |

## Layout del repo

```
/api/                      Serverless functions (Vercel)
  ai/insights.js           Endpoint del asesor IA
  plaid/create-link-token.js
  plaid/exchange-token.js  6 meses + auto-detección de recurring
  plaid/sync-transactions.js
  push/check-payments.js   Cron diario
  push/ai-tips.js          Cron 13:00 y 22:00 UTC
/docs/                     SPECS — leer antes de codear
/src/
  App.jsx                  Routing + auth + state global
  components/              Cada vista
    Dashboard.jsx          Hero + Resumen + Secciones
    KleoAi.jsx             Pantalla del asesor
    BudgetSetup.jsx        Wizard de presupuesto (4 pasos)
    Calendar.jsx           Calendario inteligente
    Goals.jsx              Metas + auto-tracking
    Credit.jsx             Plan por tarjeta + calculadora
    Accounts.jsx           Cuentas conectadas
    Transactions.jsx       Lista filtrable
    Reports.jsx            Mensual + trimestral
    Analysis.jsx           Categorías + tendencias
    Budget.jsx             Hogar compartido
    ConnectBank.jsx        Plaid Link wrapper
    AiInsights.jsx         Tarjeta con tips diarios
    BankLogo.jsx           Multi-source con fallback
    MerchantIcon.jsx       Logo del comercio
    BottomNav.jsx          Dashboard | + | Más
    MoreMenu.jsx           Sheet con todas las secciones
    TopBar.jsx             Header reutilizable
    icons.jsx              Pack de SVGs inline
  lib/
    supabase.js            Cliente
    db.js                  Funciones de fetch/upsert/delete
    push.js                Suscripción a Web Push
    budget.js              Frecuencias + cálculo del disponible
  utils/
    storage.js             localStorage helpers + fmt
    bankLogos.js           Mapa banco→dominio (Clearbit + favicons)
    calendarEvents.js      Construcción de eventos del mes + recurring
    creditAdvisor.js       Plan de acción por tarjeta + payoff
  data/
    sampleData.js          CATEGORIES + GOAL_TYPES + CREDIT_FACTORS
                           (defaults vacíos — NO seed de demo)
  i18n/
    index.jsx              Provider + hook
    es.js                  Español
    en.js                  English
```

## Convenciones

### Naming
- Componentes: `PascalCase.jsx`
- Helpers: `camelCase.js`
- CSS classes globales: `kebab-case` (`btn-primary`, `card`, `tiny`)
- Variables CSS: `--kebab-case` (`--brand-grad`, `--bg-card`)

### Colores y gradientes
- Centralizados en `src/index.css` como CSS vars
- `--brand-grad`: rosa → morado → verde (firma de Kleo)
- Severity: `--green` `#00E5B0`, `--orange` `#FF9500`, `--danger` `#FF4D6D`
- NO usar colores hex sueltos en componentes — usa vars

### Empty states
- Nunca renderices número falso. Si `accounts.length === 0` → `—`
- Mensajes específicos: "Sin tarjetas", "Sin cuentas", "Sin movimientos"

### Errores de la IA y de Plaid
- Backend devuelve `{ error, error_code, error_type, stage, env, hint }`
- Frontend renderiza una caja monoespaciada con todos los campos
- Usuario nunca ve un genérico "Error" sin detalles

### Autenticación e idle window
- 30 minutos de idle desde el último unlock
- `kleo_last_unlock` en localStorage
- Si dentro de la ventana, el usuario salta directo a `STAGE.AUTHENTICATED`
- Crítico para que OAuth de Plaid no rompa la sesión

## Flujo de datos típico

```
Plaid Link → public_token
  → /api/plaid/exchange-token (intercambia, baja 180d, detecta recurring)
  → Supabase (accounts, transactions, fixed_expenses)

App load → Supabase (fetchAccounts/Tx/Goals/FixedExpenses)
  → Estado en App.jsx
  → Pasa a cada componente vía props

Kleo AI → /api/ai/insights
  → buildFinancialProfile(transactions, accounts, ...)
  → Anthropic con system prompt + (sin few-shot por ahora)
  → Reparación de JSON truncado
  → JSON estructurado
  → KleoAi.jsx renderiza secciones
```

## Tablas Supabase

- `accounts` — uuid, user_id, name, type, label, institution, last4,
  balance, credit_limit, plaid_account_id (UNIQUE), plaid_access_token,
  apr, min_payment, payment_due_day, cycle_close_day, color, is_active
- `transactions` — uuid, user_id, account_id, amount, merchant, category,
  date, method, shared, plaid_transaction_id (UNIQUE)
- `fixed_expenses` — uuid, user_id, name, amount, due_day, category, icon,
  shared, is_active, plaid_signature (UNIQUE con user_id)
- `goals` — uuid, user_id, name, type, target, current, deadline, icon,
  color, notes, account_id, schedule (jsonb), notifications (jsonb),
  started_at, is_active
- `push_subscriptions` — uuid, user_id, endpoint, p256dh, auth
- (futuro) `user_budgets` — uuid, user_id, pay_frequency, paycheck_amount,
  next_paycheck_date, allocation (jsonb)

Todas con RLS. Backend usa `SUPABASE_SERVICE_ROLE_KEY` para escribir.

## Rutas internas

- BottomNav: `dashboard | + (acción rápida) | más`
- Tabs: `dashboard | accounts | goals | kleoai`
- Sections: `credit | budget | calendar | analysis | transactions | reports | feedback | kleoai`
- MoreMenu enruta `accounts/goals` a tabs y el resto a sections
