import { supabase } from './supabase.js';

// =========================================================
// CUENTAS
// =========================================================
export async function fetchAccounts() {
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map(rowToAccount);
}

function rowToAccount(r) {
  return {
    id: r.id,
    name: r.name,
    type: r.type,
    label: r.label,
    institution: r.institution,
    last4: r.last4,
    balance: Number(r.balance),
    limit: r.credit_limit ? Number(r.credit_limit) : null,
    color: r.color,
    apr: r.apr ? Number(r.apr) : null,
    cycleCloseDay: r.cycle_close_day,
    paymentDueDay: r.payment_due_day,
    minPayment: r.min_payment ? Number(r.min_payment) : null
  };
}

export async function updateAccountBalance(accountId, newBalance) {
  const { error } = await supabase
    .from('accounts')
    .update({ balance: newBalance })
    .eq('id', accountId);
  if (error) throw error;
}

// =========================================================
// TRANSACCIONES
// =========================================================
export async function fetchTransactions(limit = 200) {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .order('date', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []).map(rowToTransaction);
}

function rowToTransaction(r) {
  return {
    id: r.id,
    accountId: r.account_id,
    amount: Number(r.amount),
    merchant: r.merchant,
    category: r.category,
    date: r.date,
    method: r.method,
    shared: r.shared || false
  };
}

export async function createTransaction(userId, tx) {
  const { data, error } = await supabase
    .from('transactions')
    .insert({
      user_id: userId,
      account_id: tx.accountId,
      amount: tx.amount,
      merchant: tx.merchant,
      category: tx.category,
      date: tx.date,
      method: tx.method || 'manual'
    })
    .select()
    .single();
  if (error) throw error;
  return rowToTransaction(data);
}

// =========================================================
// GASTOS FIJOS
// =========================================================
export async function fetchFixedExpenses() {
  const { data, error } = await supabase
    .from('fixed_expenses')
    .select('*')
    .eq('is_active', true)
    .order('due_day', { ascending: true });
  if (error) throw error;
  return (data || []).map(r => ({
    id: r.id,
    name: r.name,
    amount: Number(r.amount),
    dueDay: r.due_day,
    category: r.category,
    accountId: r.account_id,
    icon: r.icon,
    shared: r.shared || false
  }));
}

// =========================================================
// METAS
// =========================================================
export async function fetchGoals() {
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map(rowToGoal);
}

function rowToGoal(r) {
  return {
    id: r.id,
    name: r.name,
    target: Number(r.target_amount),
    current: Number(r.current_amount),
    deadline: r.deadline,
    icon: r.icon,
    color: r.color
  };
}

export async function createGoal(userId, goal) {
  const { data, error } = await supabase
    .from('goals')
    .insert({
      user_id: userId,
      name: goal.name,
      target_amount: goal.target,
      current_amount: goal.current || 0,
      deadline: goal.deadline,
      icon: goal.icon,
      color: goal.color
    })
    .select()
    .single();
  if (error) throw error;
  return rowToGoal(data);
}

export async function updateGoalAmount(goalId, newAmount) {
  const { error } = await supabase
    .from('goals')
    .update({ current_amount: newAmount })
    .eq('id', goalId);
  if (error) throw error;
}

// =========================================================
// PERFIL Y SEEDING
// =========================================================
export async function fetchProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function setPinHash(userId, pinHash) {
  const { error } = await supabase
    .from('profiles')
    .update({ pin_hash: pinHash })
    .eq('id', userId);
  if (error) throw error;
}

export async function seedDemoData(userId) {
  const { error } = await supabase.rpc('seed_demo_data', { p_user_id: userId });
  if (error) throw error;
}

// =========================================================
// AUTH
// =========================================================
export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin
    }
  });
  if (error) throw error;
}

export async function signInWithApple() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'apple',
    options: {
      redirectTo: window.location.origin
    }
  });
  if (error) throw error;
}

export async function signOut() {
  await supabase.auth.signOut();
}

export function onAuthChange(callback) {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(session?.user || null);
  });
}

export async function getCurrentUser() {
  const { data } = await supabase.auth.getUser();
  return data.user;
}
