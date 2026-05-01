import { useState, useEffect, useCallback } from 'react';
import StatusBar from './components/StatusBar.jsx';
import Welcome from './components/Welcome.jsx';
import PinScreen from './components/PinScreen.jsx';
import FaceIdScreen from './components/FaceIdScreen.jsx';
import Dashboard from './components/Dashboard.jsx';
import Accounts from './components/Accounts.jsx';
import AddExpense from './components/AddExpense.jsx';
import Analysis from './components/Analysis.jsx';
import Goals from './components/Goals.jsx';
import Budget from './components/Budget.jsx';
import Calendar from './components/Calendar.jsx';
import Credit from './components/Credit.jsx';
import Reports from './components/Reports.jsx';
import Transactions from './components/Transactions.jsx';
import Feedback from './components/Feedback.jsx';
import MoreMenu from './components/MoreMenu.jsx';
import BottomNav from './components/BottomNav.jsx';
import ConnectBank from './components/ConnectBank.jsx';
import { storage } from './utils/storage.js';
import {
  defaultAccounts,
  defaultTransactions,
  defaultFixedExpenses,
  defaultGoals,
  defaultHousehold
} from './data/sampleData.js';

// Importar Supabase (puede fallar si no está configurado)
import { isConfigured } from './lib/supabase.js';
import {
  fetchAccounts,
  fetchTransactions,
  fetchFixedExpenses,
  fetchGoals,
  createTransaction as dbCreateTransaction,
  updateAccountBalance as dbUpdateAccountBalance,
  createGoal as dbCreateGoal,
  updateGoalAmount as dbUpdateGoalAmount,
  seedDemoData,
  signInWithGoogle,
  signInWithApple,
  signOut as dbSignOut,
  onAuthChange,
  getCurrentUser,
  fetchProfile
} from './lib/db.js';
import { setPin, hasPin, verifyPin } from './lib/pin.js';

// Si Supabase no está configurado o OAuth no está listo, usar modo prototipo
const USE_SUPABASE = isConfigured;

const STAGE = {
  WELCOME: 'welcome',
  PIN_SETUP: 'pin_setup',
  FACE_ID: 'face_id',
  PIN_VERIFY: 'pin_verify',
  AUTHENTICATED: 'authenticated'
};

export default function App() {
  const [stage, setStage] = useState(null);
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('dashboard');
  const [section, setSection] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [useSupabase, setUseSupabase] = useState(USE_SUPABASE);
  const [showConnectBank, setShowConnectBank] = useState(false);

  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [fixedExpenses, setFixedExpenses] = useState([]);
  const [goals, setGoals] = useState([]);
  const [household, setHousehold] = useState(defaultHousehold);

  // ===== MODO PROTOTIPO (localStorage) =====
  const loadLocalData = (email) => {
    const key = `user_${email}`;
    const data = storage.get(key);
    if (data && data.accounts && data.accounts.length >= 6) {
      setAccounts(data.accounts);
      setTransactions(data.transactions || defaultTransactions);
      setFixedExpenses(data.fixedExpenses || defaultFixedExpenses);
      setGoals(data.goals || defaultGoals);
      setHousehold(data.household || defaultHousehold);
    } else {
      const seeded = {
        accounts: defaultAccounts,
        transactions: defaultTransactions,
        fixedExpenses: defaultFixedExpenses,
        goals: defaultGoals,
        household: defaultHousehold
      };
      const existing = storage.get(key) || {};
      storage.set(key, { ...existing, ...seeded });
      setAccounts(seeded.accounts);
      setTransactions(seeded.transactions);
      setFixedExpenses(seeded.fixedExpenses);
      setGoals(seeded.goals);
      setHousehold(seeded.household);
    }
  };

  // ===== MODO SUPABASE =====
  const loadSupabaseData = useCallback(async (userId) => {
    try {
      const [accts, txs, fixed, gls] = await Promise.all([
        fetchAccounts(),
        fetchTransactions(),
        fetchFixedExpenses(),
        fetchGoals()
      ]);

      if (accts.length === 0) {
        await seedDemoData(userId);
        const [a2, t2, f2, g2] = await Promise.all([
          fetchAccounts(), fetchTransactions(), fetchFixedExpenses(), fetchGoals()
        ]);
        setAccounts(a2); setTransactions(t2); setFixedExpenses(f2); setGoals(g2);
      } else {
        setAccounts(accts); setTransactions(txs); setFixedExpenses(fixed); setGoals(gls);
      }
    } catch (err) {
      console.error('Supabase load error:', err);
      showToast('Error cargando datos');
    }
  }, []);

  // ===== INIT =====
  useEffect(() => {
    // Escuchar si vuelve de OAuth redirect
    const { data: { subscription } } = onAuthChange(async (authUser) => {
      if (authUser) {
        const supaUser = {
          id: authUser.id,
          provider: authUser.app_metadata?.provider || 'google',
          name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email?.split('@')[0],
          email: authUser.email
        };
        setUser(supaUser);
        setUseSupabase(true);
        try {
          await loadSupabaseData(authUser.id);
        } catch (err) {
          console.error('Error loading supabase data:', err);
        }
        if (hasPin(authUser.id)) setStage(STAGE.FACE_ID);
        else setStage(STAGE.PIN_SETUP);
        setLoading(false);
        return;
      }
    });

    // Check si ya hay sesión Supabase activa
    getCurrentUser().then(async (authUser) => {
      if (authUser) {
        const supaUser = {
          id: authUser.id,
          provider: authUser.app_metadata?.provider || 'google',
          name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email?.split('@')[0],
          email: authUser.email
        };
        setUser(supaUser);
        setUseSupabase(true);
        try {
          await loadSupabaseData(authUser.id);
        } catch (err) {
          console.error('Error loading supabase data:', err);
        }
        if (hasPin(authUser.id)) setStage(STAGE.FACE_ID);
        else setStage(STAGE.PIN_SETUP);
        setLoading(false);
      } else {
        // No hay sesión Supabase — iniciar modo prototipo
        initPrototype();
      }
    }).catch(() => {
      initPrototype();
    });

    return () => subscription.unsubscribe();
  }, []);

  const initPrototype = () => {
    const saved = storage.get('user');
    if (saved) {
      setUser(saved);
      loadLocalData(saved.email);
      const userData = storage.get(`user_${saved.email}`);
      if (userData?.pin) setStage(STAGE.FACE_ID);
      else setStage(STAGE.PIN_SETUP);
    } else {
      setStage(STAGE.WELCOME);
    }
    setLoading(false);
  };

  // Guardar datos locales cuando cambian (modo prototipo)
  useEffect(() => {
    if (!useSupabase && user && accounts.length) {
      const key = `user_${user.email}`;
      const cur = storage.get(key) || {};
      storage.set(key, { ...cur, accounts, transactions, fixedExpenses, goals, household });
    }
  }, [accounts, transactions, fixedExpenses, goals, household]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  const handleLogin = async (provider) => {
    if (provider === 'google') {
      try {
        await signInWithGoogle();
        // OAuth redirect happens — onAuthChange picks up the session
      } catch (err) {
        console.error('OAuth error:', err);
        doPrototypeLogin(provider);
      }
    } else {
      // Apple no está configurado aún — usar demo
      doPrototypeLogin(provider);
    }
  };

  const doPrototypeLogin = (provider) => {
    const fakeUser = {
      provider,
      name: 'Carlos Rivera',
      email: provider === 'google' ? 'carlos.rivera@gmail.com' : 'carlos@icloud.com'
    };
    storage.set('user', fakeUser);
    setUser(fakeUser);
    loadLocalData(fakeUser.email);
    const data = storage.get(`user_${fakeUser.email}`);
    setStage(data?.pin ? STAGE.FACE_ID : STAGE.PIN_SETUP);
  };

  const handlePinCreated = async (pin) => {
    if (useSupabase && user?.id) {
      await setPin(user.id, pin);
    } else {
      const key = `user_${user.email}`;
      const data = storage.get(key) || {};
      storage.set(key, { ...data, pin });
    }
    setStage(STAGE.AUTHENTICATED);
  };

  const handleVerifyPin = async (pin) => {
    if (useSupabase && user?.id) {
      const ok = await verifyPin(user.id, pin);
      if (ok) { setStage(STAGE.AUTHENTICATED); return true; }
      return false;
    } else {
      const data = storage.get(`user_${user.email}`);
      if (data?.pin === pin) { setStage(STAGE.AUTHENTICATED); return true; }
      return false;
    }
  };

  const handleLogout = async () => {
    if (useSupabase) {
      try { await dbSignOut(); } catch {}
    }
    storage.remove('user');
    setUser(null);
    setAccounts([]);
    setTransactions([]);
    setFixedExpenses([]);
    setGoals([]);
    setHousehold(defaultHousehold);
    setTab('dashboard');
    setSection(null);
    setShowMenu(false);
    setStage(STAGE.WELCOME);
  };

  const handleAddTransaction = async (tx) => {
    if (useSupabase && user?.id) {
      try {
        const newTx = await dbCreateTransaction(user.id, {
          ...tx, date: tx.date || new Date().toISOString().split('T')[0]
        });
        setTransactions(prev => [newTx, ...prev]);
        const acct = accounts.find(a => a.id === tx.accountId);
        if (acct) {
          const newBal = acct.balance + tx.amount;
          await dbUpdateAccountBalance(tx.accountId, newBal);
          setAccounts(prev => prev.map(a => a.id === tx.accountId ? { ...a, balance: newBal } : a));
        }
      } catch (err) {
        console.error(err);
        showToast('Error al guardar');
        return;
      }
    } else {
      const newTx = { id: 't_' + Date.now(), ...tx, date: tx.date || new Date().toISOString() };
      setTransactions(prev => [newTx, ...prev]);
      setAccounts(prev => prev.map(a =>
        a.id === tx.accountId ? { ...a, balance: a.balance + tx.amount } : a
      ));
    }
    setShowAdd(false);
    setTab('dashboard');
    showToast('Gasto registrado');
  };

  const handleGoalContribute = async (goalId, amount) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;
    const newAmt = Math.min(goal.target, goal.current + amount);

    if (useSupabase) {
      try { await dbUpdateGoalAmount(goalId, newAmt); } catch (err) { console.error(err); }
    }
    setGoals(prev => prev.map(g => g.id === goalId ? { ...g, current: newAmt } : g));
    showToast('Aportado a tu meta');
  };

  const handleGoalCreate = async (goal) => {
    if (useSupabase && user?.id) {
      try {
        const newGoal = await dbCreateGoal(user.id, goal);
        setGoals(prev => [...prev, newGoal]);
      } catch (err) { console.error(err); return; }
    } else {
      setGoals(prev => [...prev, { id: 'g_' + Date.now(), ...goal }]);
    }
    showToast('Meta creada');
  };

  const handleBankConnected = async () => {
    if (useSupabase && user?.id) {
      try { await loadSupabaseData(user.id); } catch {}
    }
    setShowConnectBank(false);
    showToast('¡Banco conectado!');
  };

  const handleConfirmShared = (pendingId, isShared) => {
    setHousehold(prev => ({
      ...prev,
      pendingConfirmations: prev.pendingConfirmations.filter(p => p.id !== pendingId)
    }));
    showToast(isShared ? 'Marcado como compartido' : 'Marcado como personal');
  };

  const goHome = () => {
    setSection(null);
    setTab('dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading || stage === null) {
    return <div className="app-shell"><StatusBar /></div>;
  }

  if (stage === STAGE.WELCOME) {
    return (
      <div className="app-shell">
        <StatusBar />
        <Welcome onLogin={handleLogin} />
      </div>
    );
  }

  if (stage === STAGE.PIN_SETUP) {
    return (
      <div className="app-shell">
        <StatusBar />
        <PinScreen mode="create" onComplete={handlePinCreated} />
      </div>
    );
  }

  if (stage === STAGE.FACE_ID) {
    return (
      <div className="app-shell">
        <StatusBar />
        <FaceIdScreen
          userName={user?.name}
          onSuccess={() => setStage(STAGE.AUTHENTICATED)}
          onUsePin={() => setStage(STAGE.PIN_VERIFY)}
        />
      </div>
    );
  }

  if (stage === STAGE.PIN_VERIFY) {
    return (
      <div className="app-shell">
        <StatusBar />
        <PinScreen
          mode="verify"
          verifyAsync={handleVerifyPin}
          userName={user?.name}
          onComplete={() => setStage(STAGE.AUTHENTICATED)}
        />
      </div>
    );
  }

  if (section) {
    return (
      <div className="app-shell">
        <StatusBar />
        {section === 'budget' && (
          <Budget
            household={household}
            fixedExpenses={fixedExpenses}
            transactions={transactions}
            onBack={() => setSection(null)}
            onHome={goHome}
            onUpdateHousehold={setHousehold}
            onConfirmShared={handleConfirmShared}
          />
        )}
        {section === 'calendar' && (
          <Calendar
            accounts={accounts}
            fixedExpenses={fixedExpenses}
            transactions={transactions}
            onBack={() => setSection(null)}
            onHome={goHome}
          />
        )}
        {section === 'credit' && (
          <Credit
            accounts={accounts}
            fixedExpenses={fixedExpenses}
            onBack={() => setSection(null)}
            onHome={goHome}
          />
        )}
        {section === 'reports' && (
          <Reports
            transactions={transactions}
            fixedExpenses={fixedExpenses}
            onBack={() => setSection(null)}
            onHome={goHome}
          />
        )}
        {section === 'transactions' && (
          <Transactions
            transactions={transactions}
            accounts={accounts}
            onBack={() => setSection(null)}
            onHome={goHome}
          />
        )}
        {section === 'analysis' && (
          <Analysis
            transactions={transactions}
            onHome={goHome}
            onMenu={() => setShowMenu(true)}
          />
        )}
        {section === 'feedback' && (
          <Feedback
            user={user}
            onBack={() => setSection(null)}
            onHome={goHome}
            onSubmit={() => showToast('¡Gracias por tu sugerencia!')}
          />
        )}
        {toast && <div className="toast">{toast}</div>}
      </div>
    );
  }

  return (
    <div className="app-shell">
      <StatusBar />

      {showConnectBank ? (
        <ConnectBank
          userId={user?.id}
          onConnected={handleBankConnected}
          onClose={() => setShowConnectBank(false)}
        />
      ) : showAdd ? (
        <AddExpense
          accounts={accounts}
          onAdd={handleAddTransaction}
          onClose={() => setShowAdd(false)}
        />
      ) : (
        <>
          {tab === 'dashboard' && (
            <Dashboard
              user={user}
              accounts={accounts}
              transactions={transactions}
              fixedExpenses={fixedExpenses}
              goals={goals}
              household={household}
              onOpenMenu={() => setShowMenu(true)}
              onOpenSection={setSection}
              onSwitchTab={setTab}
              onConnectBank={() => setShowConnectBank(true)}
            />
          )}
          {tab === 'accounts' && (
            <Accounts
              accounts={accounts}
              transactions={transactions}
              onHome={goHome}
              onMenu={() => setShowMenu(true)}
            />
          )}
          {tab === 'goals' && (
            <Goals
              goals={goals}
              fixedExpenses={fixedExpenses}
              onAddSavings={handleGoalContribute}
              onCreate={handleGoalCreate}
              onHome={goHome}
              onMenu={() => setShowMenu(true)}
            />
          )}

          <BottomNav
            active={tab}
            onChange={setTab}
            onAdd={() => setShowAdd(true)}
            onMenu={() => setShowMenu(true)}
          />
        </>
      )}

      {showMenu && (
        <MoreMenu
          user={user}
          onClose={() => setShowMenu(false)}
          onNavigate={(s) => { setShowMenu(false); setSection(s); }}
          onLogout={handleLogout}
          onHome={goHome}
          onFeedback={() => setSection('feedback')}
        />
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
