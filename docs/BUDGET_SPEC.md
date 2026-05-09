# Kleo · Sistema de presupuesto

## Idea

El presupuesto NO es un agregado pasivo de gastos. Es una **declaración del
usuario** de cómo quiere distribuir cada cheque. El asesor IA usa este
presupuesto como input para todo: cálculo de disponible, riesgos,
recomendaciones, plan puente con tarjeta.

## Modelo de datos

```js
// localStorage 'kleo_budget' (luego sync a Supabase user_budgets)
{
  pay_frequency: 'weekly' | 'biweekly' | 'semimonthly' | 'monthly',
  paycheck_amount: 1320,
  next_paycheck_date: '2026-05-22',
  allocation: {
    essentials: 50,  // %
    savings:    20,
    plans:      10,
    personal:   20
  },
  created_at: '2026-05-09T...',
  updated_at: '2026-05-09T...'
}
```

Constraint: `allocation` debe sumar 100%. Validado en el wizard.

## Categorías de alocación

| Key | Label | Emoji | Color | Qué incluye |
|---|---|---|---|---|
| `essentials` | Esenciales | 🏠 | `#FF4D6D` | Renta, luz, agua, comida, transporte, salud |
| `savings` | Ahorro | 💰 | `#00E5B0` | Fondo de emergencia, retiro, savings account |
| `plans` | Planes | ✈️ | `#A855F7` | Metas específicas (viaje, casa, carro) |
| `personal` | Personal | 🎯 | `#FF9500` | Entretenimiento, ropa, comer fuera, hobbies |

**Disponible para gastar libremente** = `personal + plans` escalado al periodo.

`essentials` y `savings` están **comprometidos** — no se restan al disponible
porque el usuario ya decidió qué hacer con ellos.

## Cálculo del "disponible" por periodo

`cycleDays = days(pay_frequency)` → 7 / 14 / 15 / 30

| Periodo | Fórmula |
|---|---|
| Día | `(personal + plans) ÷ cycleDays` |
| Semana | `(personal + plans) × (7 / cycleDays)` |
| Ciclo | `personal + plans` |
| Mes | `(personal + plans) × (30 / cycleDays)` |

Implementado en `lib/budget.js → disponibleByPeriod(budget, period)`.

## Wizard de configuración (4 pasos)

`BudgetSetup.jsx` — bottom-sheet modal con barra de progreso de 4 pasos.

### Paso 1 · Frecuencia
- 4 opciones (semanal / bisemanal / quincenal / mensual)
- Auto-detecta de transacciones de `payroll/deposit` y muestra hint:
  "Detecté que cobras bisemanalmente ~$X"

### Paso 2 · Monto + fecha
- Input de monto (USD, después de impuestos)
- Date picker para próximo cheque

### Paso 3 · Distribución (3 modos)

**Modo Sugerencia** — 3 presets:
- **Balanceado** 50/20/10/20 (default)
- **Regla 50/30/20** (Senator Warren) — 50 esenciales / 30 personal / 20 ahorro
- **Agresivo de ahorro** 50/30/10/10

**Modo Manual** — 4 sliders 0-100% step 5. Validación: deben sumar 100%.

**Modo 🤖 Kleo me ayuda** — pregunta:
1. ¿Cuánto pagas de renta o hipoteca al mes?
2. ¿Tienes una meta importante? (sí/no)
3. ¿Quieres ahorrar agresivo este periodo? (sí/no)

Calcula:
- `essentials = min(60, rentPct + 15)` (renta como % del monthly + 15% para
  utilities + comida)
- `savings = 20% si "sí" else 10%`
- `plans = 15% si meta else 5%`
- `personal = 100 - los anteriores`

### Paso 4 · Resumen

Muestra:
- "Cobras $X bisemanalmente"
- "Próximo cheque: 22 de mayo"
- 4 cards con monto absoluto por categoría según %

Botón "Guardar" persiste a `localStorage`.

## Integración con el Dashboard

El hero del dashboard (`Dashboard.jsx`) tiene dos estados:

**Sin presupuesto:**
- Card morado-naranja: "Configura tu presupuesto"
- Botón gradient brand: "Empezar mi presupuesto" → abre wizard

**Con presupuesto:**
- Monto enorme con gradient verde→morado
- Selector segmentado: `Día | Semana | <ciclo> | Mes`
- Pills: "🛡 Para gastar libremente" + "📅 Cheque en Nd"
- Links: "¿Cómo se calcula?" + "✏ Editar presupuesto"

## Integración con el asesor IA

Cuando exista budget guardado, `buildFinancialProfile` debe inyectarlo como:

```js
profile.user_budget = {
  frequency, amount_per_paycheck, next_paycheck_date,
  allocation_pct, allocation_amounts
}
```

Esto cambia el `weekly_available` calculado por la AI: en vez de heurística,
usa el presupuesto real. La AI debe respetar la distribución del usuario y
sugerir ajustes si detecta que no le alcanza.

> **TODO:** integrar `getBudget()` en el endpoint `/api/ai/insights` —
> actualmente la AI no lo recibe.

## Roadmap de la feature

- [x] Wizard de 4 pasos
- [x] Storage local
- [x] Selector de periodo en hero
- [x] Modo "Kleo me ayuda" (heurístico)
- [ ] Sync a Supabase (`user_budgets` table)
- [ ] Inyectar budget al asesor IA
- [ ] "Cuánto te queda este periodo" — descontar gastos personales reales
      vs el budget de personal
- [ ] Alertas: "vas 78% de tu personal y faltan 10 días del ciclo"
- [ ] Roll-over: si sobra, se acumula al siguiente ciclo
- [ ] Histórico de presupuestos por mes
