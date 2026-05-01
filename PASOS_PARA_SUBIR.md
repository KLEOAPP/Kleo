# Pasos para Subir Kleo a Producción

Estado actual: **prototipo visual completo** corriendo localmente con datos de demo.
Objetivo: app real, accesible desde cualquier teléfono, con tus 10 clientes usándola.

---

## 🗂️ Las 8 áreas ya organizadas

**En el bottom nav (4 + botón add):**
1. **Inicio** — dashboard con resumen de todo
2. **Cuentas** — checking + ahorros + metas (no incluye crédito)
3. **+** — agregar gasto (4 métodos)
4. **Metas** — fondos de emergencia, viaje, ahorro, etc.
5. **Más** — abre menú con las 6 secciones restantes

**En el menú "Más":**
- 💳 **Tarjetas de Crédito** — plan de pago personalizado por tarjeta
- 📈 **Rendimiento** — análisis de cómo te está yendo
- 💰 **Presupuesto Mensual** — compartido con tu hogar
- 📅 **Calendario** — pagos, cierres, recordatorios
- 🧾 **Transacciones** — lista completa con filtros
- 📊 **Reportes** — mensual y trimestral con comparativas

---

## ✅ Pasos pendientes para producción

### FASE 1 — Backend real (Supabase) · ~2-4 horas
> Hoy: localStorage. Mañana: cada usuario ve solo sus datos en la nube.

- [ ] Crear cuenta Supabase (ya tienes el proyecto creado)
- [ ] Correr el `supabase/schema.sql` (✅ ya lo hiciste)
- [ ] Configurar Google OAuth en Supabase
- [ ] Cambiar `PROTOTYPE_MODE = false` en `App.jsx`
- [ ] Probar que cada usuario ve solo sus datos (Row Level Security)
- [ ] Migrar PIN a Supabase profile (ya está como hash en device)

**Costo:** $0 (free tier aguanta hasta 50,000 usuarios mensuales)

---

### FASE 2 — Conexión bancaria real (Plaid) · ~1 día
> Las tarjetas y cuentas se sincronizan automáticamente.

- [ ] Crear cuenta en https://dashboard.plaid.com (gratis)
- [ ] Activar Sandbox primero (cuentas de prueba)
- [ ] Crear API endpoints (Supabase Edge Functions o Vercel API):
  - `/api/plaid/create-link-token` — para abrir Plaid Link
  - `/api/plaid/exchange-token` — guardar el access token
  - `/api/plaid/sync-transactions` — bajar transacciones nuevas
- [ ] Reemplazar el flow "Conectar cuenta" con Plaid Link real
- [ ] Cron job (Supabase scheduled function) que sincroniza cada 6 horas
- [ ] Activar **Plaid Development** (cuentas reales, gratis hasta 100 Items)

**Costo:** $0 hasta 100 cuentas reales conectadas

---

### FASE 3 — Despliegue · ~30 minutos
> URL pública que se abre como app en iPhone/Android.

- [ ] Crear cuenta Vercel (https://vercel.com)
- [ ] Conectar a tu repo (subir el código a GitHub primero)
- [ ] Agregar las env vars en Vercel:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `PLAID_SECRET`, `PLAID_CLIENT_ID` (server-side)
- [ ] Deploy automático con cada `git push`
- [ ] Te da una URL tipo `kleo.vercel.app`

**Costo:** $0 (Hobby plan aguanta de sobra)

---

### FASE 4 — App instalable (PWA) · ~1 hora
> Tus clientes la "instalan" en su iPhone como una app más.

- [ ] Crear `manifest.json` con iconos
- [ ] Agregar service worker básico (vite-plugin-pwa)
- [ ] Splash screens para iOS
- [ ] Probar instalación: Safari → Compartir → Añadir a pantalla de inicio
- [ ] Iconos 180×180, 192×192, 512×512

**Costo:** $0

---

### FASE 5 — Dominio propio · 1-2 días (espera DNS)
> En vez de `kleo.vercel.app`, usa `kleo.app` o `kleopr.com`.

- [ ] Comprar dominio en Namecheap, Porkbun o Cloudflare (~$10-15/año)
- [ ] Apuntar DNS a Vercel
- [ ] Vercel se encarga del HTTPS automáticamente

**Costo:** ~$12/año

---

### FASE 6 — IA real (Anthropic API) · ~2-3 horas (OPCIONAL)
> Las alertas y recomendaciones dejan de ser reglas if/else y pasan a ser Claude.

- [ ] Crear API key en https://console.anthropic.com
- [ ] Endpoint serverless `/api/ai/insights` que recibe transacciones y genera alertas
- [ ] Endpoint `/api/ai/scan-receipt` para OCR de recibos con Claude Vision
- [ ] Reemplazar las alertas hardcoded de Dashboard con llamadas a la API

**Costo:** ~$3-10/mes para 10 usuarios

---

### FASE 7 — Notificaciones push reales · ~3-4 horas (OPCIONAL)
> Los recordatorios de "paga 2 días antes" llegan al teléfono real.

- [ ] Pedir permiso de notificaciones en el browser
- [ ] Suscripción a Push API
- [ ] Cron en Supabase que dispara notificaciones según calendario

**Costo:** $0

---

## ⏱️ Plan más rápido (lo mínimo para tener app real)

Si quieres ir lo más directo posible al MVP funcional:

1. **Hoy:** Activar Supabase real (FASE 1) — la app ya tiene el código listo, solo hay que cambiar `PROTOTYPE_MODE = false`
2. **Mañana:** Deploy a Vercel (FASE 3) — sin Plaid, sin IA, solo localStorage en la nube
3. **Esta semana:** Dominio (FASE 5) y PWA (FASE 4)
4. **Semana siguiente:** Plaid Sandbox (FASE 2)
5. **Cuando tengas usuarios:** IA y Push (FASE 6 y 7)

**Tiempo total al MVP:** 2-3 días de trabajo enfocado.
**Costo total mensual:** $0-15.

---

## 🚦 Estado del código

| Componente | Estado |
|---|---|
| Diseño UI | ✅ Completo |
| Modo claro/oscuro | ✅ Completo |
| Login (Google/Apple mock) | ✅ Visual |
| Login real (Supabase) | 🟡 Código listo, falta activar |
| PIN + Face ID | ✅ Completo |
| Dashboard | ✅ Completo |
| 8 secciones (Inicio, Cuentas, Tarjetas, Metas, Rendimiento, Presupuesto, Calendario, Transacciones) | ✅ Completo |
| Logos de comercios | ✅ Completo (Google Favicons) |
| Plan de acción de tarjetas | ✅ Completo |
| Calculadora de pago de deuda | ✅ Completo |
| Plaid (real) | ❌ Pendiente |
| Schema SQL | ✅ Listo |
| Deploy | ❌ Pendiente |

---

## 🎯 Mi recomendación

Para impresionar a tus 10 primeros clientes:
1. Subir el prototipo actual a Vercel (1 hora) — ya pueden tocarla en su teléfono
2. Activar Supabase la siguiente semana — ya guarda sus datos reales
3. Plaid solo cuando 3+ clientes pidan conexión bancaria automática

No conectes Plaid al inicio — es complejo, requiere KYC, y para 10 personas el data entry manual + foto de recibo funciona perfecto.

¿Por cuál fase quieres arrancar?
