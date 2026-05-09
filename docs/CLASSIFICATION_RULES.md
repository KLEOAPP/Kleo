# Kleo · Reglas de clasificación de transacciones

> Implementadas en `api/plaid/exchange-token.js` y reflejadas con SQL de
> migración cuando aplique. Mantener sincronizado.

## Categorías

| Categoría | Cuándo aplica |
|---|---|
| `ingreso` | Nómina, depósitos directos, transfers de IRS/SSA |
| `transferencia` | Movimiento entre cuentas propias (incluye pagos a tarjeta) |
| `comida` | Restaurantes, fast food, comida fuera |
| `supermercado` | Walmart, Costco, Pueblo, Econo, etc. |
| `transporte` | Gasolina, Uber, ATH transfer auto |
| `entretenimiento` | Netflix, Spotify, cine, eventos |
| `compras` | General merchandise |
| `salud` | Farmacias, copays |
| `servicios` | Luz, agua, internet, telco |
| `hogar` | Renta, hipoteca, mantenimiento |
| `educacion` | Tuition, libros, cursos |
| `personal` | Cuidado personal, gym (si no es subscription) |
| `deuda` | Pagos a préstamos identificados como tales |
| `otros` | Default cuando Plaid no reconoce |

## Reglas (en orden de prioridad)

### 1. Nómina / depósitos → `ingreso`

Si el merchant contiene cualquiera de estos patrones Y `amount < 0` en Plaid
(= entrada de dinero):
- `payroll`
- `eft deposit`
- `direct dep` / `direct deposit`
- `nomina`
- `salary`
- `ssa treas` (Social Security)
- `irs treas` (IRS refund)

→ `category = 'ingreso'`

### 2. Pagos a tarjeta → `transferencia`

Si el merchant contiene cualquiera de:
- `payment thank you`
- `payment - thank` / `- thank you`
- `mobile payment`
- `online payment`
- `internet payment`
- `autopay`
- `\bpymt\b` (whole word, no substring de "payroll")
- `credit card payment` / `cc payment`
- `eft pmt`
- `e-payment`

→ `category = 'transferencia'`

### 3. Categorías Plaid oficiales → `transferencia`

Si `personal_finance_category.detailed` o `primary` incluye:
- `CREDIT_CARD_PAYMENT`
- `TRANSFER_IN` / `TRANSFER_OUT`

→ `category = 'transferencia'`

### 4. Default → categoría natural

Mapeo de Plaid `personal_finance_category.primary` → nuestra categoría:

```
FOOD_AND_DRINK         → comida
GROCERIES              → supermercado
TRANSPORTATION         → transporte
ENTERTAINMENT          → entretenimiento
SHOPPING               → compras
HEALTH                 → salud
UTILITIES              → servicios
HOUSING                → hogar
EDUCATION              → educacion
PERSONAL_CARE          → personal
TRANSFER               → transferencia
INCOME                 → ingreso
LOAN_PAYMENTS          → deuda
BANK_FEES              → comisiones
default                → otros
```

## Lo que NO se hace (anti-reglas)

- ❌ "Cualquier entrada positiva en credit account = transferencia" — eso
  marcaba reembolsos (Amazon refund, Infusion refund) como transferencia.
- ❌ "Cualquier merchant con la palabra 'thank' = transferencia" —
  matcheaba `THANK YOU GIFT CARD` y similar.
- ❌ Confiar en `merchant.toLowerCase().includes('pymt')` sin word-boundary
  porque `payroll` lo matchea (el `p`+`a`+`y`+`m` no, pero
  `pymt` en `pymtABC` sí). Por eso usamos `/\bpymt\b/`.

## Display en la UI

Las transferencias se muestran:
- **Color:** `var(--text-mute)` (gris)
- **Sin signo:** ni `+` ni `−`
- **Chip morado** "↔ TRANSFERENCIA" al lado de la fecha

Los totales de ingresos/gastos en cualquier sección **excluyen** transacciones
con `category === 'transferencia'`.

## SQL para corregir clasificaciones existentes

Disponible en `docs/SQL_PATCHES.md` — cuando cambien las reglas, generar un
UPDATE retrospectivo y pegarlo en ese archivo con fecha.
