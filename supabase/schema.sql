-- =========================================================
-- KLEO — Schema de base de datos
-- Pega esto entero en Supabase: SQL Editor → New query → Run
-- =========================================================

-- Perfil del usuario (extiende auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  pin_hash text,           -- SHA-256 hash del PIN, opcional (puede ir solo en device)
  created_at timestamptz default now()
);

-- Cuentas bancarias / tarjetas
create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('checking', 'savings', 'credit')),
  label text,
  institution text,
  last4 text,
  balance numeric(12, 2) default 0,
  credit_limit numeric(12, 2),
  color text,
  plaid_account_id text,
  plaid_access_token text,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Transacciones
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid references public.accounts(id) on delete set null,
  amount numeric(12, 2) not null,
  merchant text not null,
  category text not null,
  date date not null,
  method text default 'manual', -- 'auto', 'ath', 'photo', 'manual'
  notes text,
  plaid_transaction_id text unique,
  created_at timestamptz default now()
);

-- Gastos fijos recurrentes
create table if not exists public.fixed_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid references public.accounts(id) on delete set null,
  name text not null,
  amount numeric(12, 2) not null,
  due_day int not null check (due_day between 1 and 31),
  category text not null,
  icon text,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Metas de ahorro
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  target_amount numeric(12, 2) not null,
  current_amount numeric(12, 2) default 0,
  deadline date,
  icon text,
  color text,
  is_completed boolean default false,
  created_at timestamptz default now()
);

-- Índices
create index if not exists idx_accounts_user on public.accounts(user_id);
create index if not exists idx_transactions_user on public.transactions(user_id, date desc);
create index if not exists idx_transactions_account on public.transactions(account_id);
create index if not exists idx_fixed_user on public.fixed_expenses(user_id);
create index if not exists idx_goals_user on public.goals(user_id);

-- =========================================================
-- ROW LEVEL SECURITY: cada usuario solo ve sus propios datos
-- =========================================================

alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.transactions enable row level security;
alter table public.fixed_expenses enable row level security;
alter table public.goals enable row level security;

-- Profiles
drop policy if exists "users_own_profile" on public.profiles;
create policy "users_own_profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- Accounts
drop policy if exists "users_own_accounts" on public.accounts;
create policy "users_own_accounts" on public.accounts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Transactions
drop policy if exists "users_own_transactions" on public.transactions;
create policy "users_own_transactions" on public.transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Fixed expenses
drop policy if exists "users_own_fixed" on public.fixed_expenses;
create policy "users_own_fixed" on public.fixed_expenses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Goals
drop policy if exists "users_own_goals" on public.goals;
create policy "users_own_goals" on public.goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =========================================================
-- Auto-crear profile cuando se registra un usuario nuevo
-- =========================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================================================
-- Función helper: poblar datos de demo para usuario nuevo
-- (llamar solo la primera vez desde el cliente)
-- =========================================================
create or replace function public.seed_demo_data(p_user_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  popular_id uuid;
  chase_id uuid;
  discover_id uuid;
begin
  -- Solo si el usuario no tiene cuentas todavía
  if exists (select 1 from public.accounts where user_id = p_user_id) then
    return;
  end if;

  insert into public.accounts (user_id, name, type, label, institution, last4, balance, color)
  values (p_user_id, 'Banco Popular', 'checking', 'Cuenta Corriente', 'Popular', '4821', 4287.42,
          'linear-gradient(135deg, #DC143C 0%, #8B0000 100%)')
  returning id into popular_id;

  insert into public.accounts (user_id, name, type, label, institution, last4, balance, credit_limit, color)
  values (p_user_id, 'Chase', 'credit', 'Sapphire Preferred', 'Chase', '7392', -1245.30, 8000,
          'linear-gradient(135deg, #117ACA 0%, #003F7D 100%)')
  returning id into chase_id;

  insert into public.accounts (user_id, name, type, label, institution, last4, balance, credit_limit, color)
  values (p_user_id, 'Discover', 'credit', 'Discover it Cash Back', 'Discover', '5104', -842.15, 5500,
          'linear-gradient(135deg, #FF6000 0%, #B84500 100%)')
  returning id into discover_id;

  insert into public.fixed_expenses (user_id, account_id, name, amount, due_day, category, icon) values
    (p_user_id, popular_id, 'Hipoteca', 1450.00, 1, 'hogar', '🏠'),
    (p_user_id, popular_id, 'Pago del Carro', 385.50, 5, 'transporte', '🚗'),
    (p_user_id, chase_id, 'Claro Móvil', 95.00, 12, 'servicios', '📱'),
    (p_user_id, popular_id, 'LUMA Energy', 187.45, 18, 'servicios', '💡'),
    (p_user_id, popular_id, 'AAA Acueductos', 48.30, 22, 'servicios', '💧'),
    (p_user_id, chase_id, 'Seguro Mapfre', 135.00, 28, 'servicios', '🛡️');

  insert into public.goals (user_id, name, target_amount, current_amount, deadline, icon, color) values
    (p_user_id, 'Viaje a Madrid', 4500, 1850, '2026-12-15', '✈️', '#0084FF'),
    (p_user_id, 'Fondo de Emergencia', 6000, 3200, '2026-09-30', '🛡️', '#00E5B0'),
    (p_user_id, 'Pronto del Carro Nuevo', 5000, 950, '2027-03-01', '🚗', '#FFB02E');

  insert into public.transactions (user_id, account_id, amount, merchant, category, date, method) values
    (p_user_id, chase_id,    -42.18,  'Walmart Caguas',         'supermercado',   current_date,           'auto'),
    (p_user_id, popular_id,  -25.00,  'ATH Móvil — María',      'transferencia',  current_date,           'ath'),
    (p_user_id, chase_id,    -8.75,   'Starbucks Plaza',        'cafe',           current_date - 1,       'auto'),
    (p_user_id, discover_id, -67.40,  'Texaco Bayamón',         'transporte',     current_date - 1,       'auto'),
    (p_user_id, chase_id,    -156.32, 'Costco Carolina',        'supermercado',   current_date - 2,       'auto'),
    (p_user_id, popular_id,  2850.00, 'Depósito Nómina',        'ingreso',        current_date - 2,       'auto'),
    (p_user_id, chase_id,    -34.99,  'El Mesón Sándwiches',    'comida',         current_date - 3,       'auto'),
    (p_user_id, discover_id, -89.50,  'Walgreens Hato Rey',     'salud',          current_date - 3,       'auto'),
    (p_user_id, chase_id,    -52.80,  'Chili''s Plaza',          'comida',         current_date - 4,       'auto'),
    (p_user_id, popular_id,  -15.00,  'ATH Móvil — Pedro',      'transferencia',  current_date - 4,       'ath'),
    (p_user_id, discover_id, -120.00, 'Marshalls',              'compras',        current_date - 5,       'auto'),
    (p_user_id, chase_id,    -18.25,  'Subway Río Piedras',     'comida',         current_date - 6,       'auto'),
    (p_user_id, chase_id,    -45.60,  'Total Petroleum',        'transporte',     current_date - 7,       'auto'),
    (p_user_id, discover_id, -78.90,  'Pueblo Supermercados',   'supermercado',   current_date - 8,       'auto'),
    (p_user_id, chase_id,    -12.99,  'Netflix',                'entretenimiento',current_date - 9,       'auto'),
    (p_user_id, chase_id,    -32.45,  'Amazon.com',             'compras',        current_date - 10,      'auto'),
    (p_user_id, popular_id,  -50.00,  'ATH Móvil — Luis',       'transferencia',  current_date - 11,      'ath'),
    (p_user_id, discover_id, -28.50,  'Cinépolis Plaza',        'entretenimiento',current_date - 12,      'auto'),
    (p_user_id, chase_id,    -64.20,  'Econo Supermercados',    'supermercado',   current_date - 13,      'auto'),
    (p_user_id, popular_id,  2850.00, 'Depósito Nómina',        'ingreso',        current_date - 16,      'auto');
end;
$$;

grant execute on function public.seed_demo_data(uuid) to authenticated;
