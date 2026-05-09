# CLAUDE.md · Instrucciones para cualquier agente IA que trabaje en Kleo

> Este archivo se carga automáticamente al inicio de cada sesión.
> **Léelo antes de tocar cualquier cosa.** Después lee la carpeta `/docs/`.

## Misión de Kleo

Kleo es un **asesor financiero personal con IA** para consumidores de Puerto
Rico. No es una app de tracking — es un asistente que:

1. Conoce al usuario tan bien como un advisor que lleva años con él
2. Detecta riesgos antes de que ocurran
3. Da planes accionables paso a paso
4. Protege el crédito y la liquidez del usuario
5. Reduce el estrés financiero

El producto se llama "**Kleo · Asesor Financiero**". Todo gira en torno al
agente IA — el resto de la app (calendario, transacciones, metas, presupuesto)
le da contexto al asesor.

## Antes de hacer cualquier cambio

**Lee estos archivos en orden:**

1. `docs/PRODUCT_VISION.md` — qué hacemos y para quién
2. `docs/DECISIONS.md` — decisiones tomadas (no las re-debatas)
3. `docs/ARCHITECTURE.md` — stack, capas, convenciones
4. `docs/KLEO_AI_SPEC.md` — el contrato del asesor IA
5. `docs/CLASSIFICATION_RULES.md` — reglas para clasificar transacciones
6. `docs/BUDGET_SPEC.md` — sistema de presupuesto
7. `docs/KLEO_NOTIFICATIONS_SPEC.md` — sistema de notificaciones (WIP)
8. `docs/ROADMAP.md` — qué está hecho y qué sigue

## Después de hacer un cambio importante

**Actualiza `docs/DECISIONS.md`** con una línea: fecha + qué decidiste + por qué.
Si la decisión cambia un spec (AI, presupuesto, notificaciones, clasificación),
**actualiza el spec correspondiente también.**

## Reglas de oro

1. **Nunca inventes datos.** Si la lógica requiere datos del usuario, pídelos.
2. **Nunca clasifiques una transacción de forma que distorsione income/gasto reales.**
   Ver `docs/CLASSIFICATION_RULES.md`.
3. **Tono del producto:** profesional, empático, directo. Español de PR.
4. **Empty states:** muestra `—` o "Sin data" cuando falte info; nunca números falsos.
5. **El asesor IA siempre devuelve JSON válido.** Si el modelo falla, hay
   reparación de truncamiento + mensaje de error explícito.
6. **Notificaciones, presupuesto y AI son las 3 columnas del producto.**
   Cualquier feature nueva debe servir a una de las tres.

## Comandos útiles

```bash
npm run dev        # desarrollo local
npm run build      # build de producción
git push           # despliega a Vercel automáticamente (kleopr.com)
```

## Variables de entorno requeridas (Vercel)

- `PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_ENV` (production)
- `ANTHROPIC_API_KEY`
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`
- (opcional) `PLAID_REDIRECT_URI` para OAuth banks

## Cuando el usuario te pida algo nuevo

Si el cambio toca el sistema de la AI, presupuesto, clasificación o
notificaciones, escribe la decisión a su spec **antes** de codear, no después.
Así el siguiente agente lo encuentra documentado.
