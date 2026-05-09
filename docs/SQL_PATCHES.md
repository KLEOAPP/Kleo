# Kleo · SQL patches aplicados

> Historial de migraciones manuales en Supabase. Cuando la spec cambie y
> haya que arreglar data existente, agregar la migración aquí con fecha.

## 2026-05-09 · Plaid integration migrations

```sql
-- Columnas que Plaid necesita
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS plaid_account_id text;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS plaid_access_token text;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS credit_limit numeric;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS institution text;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS color text;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS plaid_transaction_id text;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS method text;

-- UNIQUE constraints reales (no índices parciales)
ALTER TABLE accounts ADD CONSTRAINT accounts_plaid_account_id_key UNIQUE (plaid_account_id);
ALTER TABLE transactions ADD CONSTRAINT transactions_plaid_transaction_id_key UNIQUE (plaid_transaction_id);

-- Recurring detection
ALTER TABLE fixed_expenses ADD COLUMN IF NOT EXISTS plaid_signature text;
ALTER TABLE fixed_expenses
  ADD CONSTRAINT fixed_expenses_user_signature_key UNIQUE (user_id, plaid_signature);

-- RLS
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see their own accounts" ON accounts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users see their own transactions" ON transactions FOR ALL USING (auth.uid() = user_id);
```

## 2026-05-09 · Re-clasificación de transacciones

```sql
-- Nóminas mal marcadas como transferencia → ingreso
UPDATE transactions
SET category = 'ingreso'
WHERE category = 'transferencia'
  AND amount > 0
  AND (
    LOWER(merchant) LIKE '%payroll%'
    OR LOWER(merchant) LIKE '%eft deposit%'
    OR LOWER(merchant) LIKE '%direct dep%'
    OR LOWER(merchant) LIKE '%direct deposit%'
    OR LOWER(merchant) LIKE '%nomina%'
    OR LOWER(merchant) LIKE '%salary%'
    OR LOWER(merchant) LIKE '%ssa treas%'
    OR LOWER(merchant) LIKE '%irs treas%'
  );

-- Reembolsos en credit cards mal marcados como transferencia → otros
UPDATE transactions t
SET category = 'otros'
FROM accounts a
WHERE t.account_id = a.id
  AND a.type = 'credit'
  AND t.amount > 0
  AND t.category = 'transferencia'
  AND LOWER(t.merchant) NOT LIKE '%payment%'
  AND LOWER(t.merchant) NOT LIKE '%thank you%'
  AND LOWER(t.merchant) NOT LIKE '%autopay%'
  AND LOWER(t.merchant) NOT LIKE '%pymt%'
  AND LOWER(t.merchant) NOT LIKE '%eft pmt%'
  AND LOWER(t.merchant) NOT LIKE '%e-payment%';

-- Pagos reales a tarjeta → transferencia (idempotente)
UPDATE transactions
SET category = 'transferencia'
WHERE LOWER(merchant) LIKE '%payment thank you%'
   OR LOWER(merchant) LIKE '%internet payment%'
   OR LOWER(merchant) LIKE '%mobile payment%'
   OR LOWER(merchant) LIKE '%online payment%'
   OR LOWER(merchant) LIKE '%eft pmt%'
   OR LOWER(merchant) LIKE '%e-payment%';
```

## Wipe completo (para testing)

```sql
DO $$
DECLARE uid uuid;
BEGIN
  SELECT id INTO uid FROM auth.users WHERE email = 'EMAIL@AQUI.com' LIMIT 1;
  DELETE FROM transactions WHERE user_id = uid;
  DELETE FROM accounts WHERE user_id = uid;
  DELETE FROM goals WHERE user_id = uid;
  DELETE FROM fixed_expenses WHERE user_id = uid;
END $$;
```

## Plantilla para nuevos patches

```
## YYYY-MM-DD · Título

[explicación de qué cambia y por qué]

```sql
-- ...
```
```
