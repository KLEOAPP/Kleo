import { useState, useEffect, useCallback } from 'react';
import { I18nProvider, useI18n } from './i18n/index.jsx';
// StatusBar eliminado — el dispositivo real muestra su propia barra
import Welcome from './components/Welcome.jsx';
import PinScreen from './components/PinScreen.jsx';
import FaceIdScreen from './components/FaceIdScreen.jsx';
import Dashboard from './components/Dashboard.jsx';
import Accounts from './components/Accounts.jsx';
import AddExpense from './components/AddExpense.jsx';
import Analysis from './components/Analysis.jsx';
import Goals from './components/Goals.jsx';
import KleoAi from './components/KleoAi.jsx';
import AdvisorOnboarding from './components/AdvisorOnboarding.jsx';
import OnboardingTour from './components/OnboardingTour.jsx';
import { getAdvisorProfile } from './lib/advisorProfile.js';
import Budget from './components/Budget.jsx';
import Calendar from './components/Calendar.jsx';
import Credit from './components/Credit.jsx';
import Reports from './components/Reports.jsx';
import Transactions from './components/Transactions.jsx';
import Feedback from './components/Feedback.jsx';
import MoreMenu from './components/MoreMenu.jsx';
import BottomNav from './components/BottomNav.jsx';
import ConnectBank from './components/ConnectBank.jsx';
import Notifications, { getUnreadCount, saveNotification, getPendingNotification } from './components/Notifications.jsx';
import NotificationOverlay from './components/NotificationOverlay.jsx';
import { storage } from './utils/storage.js';
import {
  defaultAccounts,
  defaultTransactions,
  defaultFixedExpenses,
  defaultGoals,
  defaultHousehold
} from './data/sampleData.js';

// Importar Supabase (puede fallar si no está configurado)
import { isConfigured, supabase } from './lib/supabase.js';
import {
  fetchAccounts,
  fetchTransactions,
  fetchFixedExpenses,
  fetchGoals,
  createTransaction as dbCreateTransaction,
  updateAccountBalance as dbUpdateAccountBalance,
  updateAccount as dbUpdateAccount,
  unlinkAccount as dbUnlinkAccount,
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
import { registerBiometric, isBiometricEnabled, checkBiometricSupport } from './lib/biometric.js';

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
  return (
    <I18nProvider>
      <AppInner />
    </I18nProvider>
  );
}

function AppInner() {
  const [stage, setStage] = useState(null);
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('dashboard');
  const [section, setSection] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [useSupabase, setUseSupabase] = useState(USE_SUPABASE);
  const [showConnectBank, setShowConnectBank] = useState(() => {
    // Si volvemos de OAuth de Plaid, abrir la pantalla automáticamente
    return typeof window !== 'undefined' && window.location.href.includes('?oauth_state_id=');
  });
  const [showAdvisorOnboarding, setShowAdvisorOnboarding] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  // Tutorial obligatorio la primera vez que el usuario llega a AUTHENTICATED
  useEffect(() => {
    if (stage !== STAGE.AUTHENTICATED) return;
    let done = false;
    try { done = localStorage.getItem('kleo_tutorial_completed') === 'true'; } catch {}
    if (!done) {
      setShowTutorial(true);
    }
  }, [stage]);

  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingNotification, setPendingNotification] = useState(null);

  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [fixedExpenses, setFixedExpenses] = useState([]);
  const [goals, setGoals] = useState([]);
  const [household, setHousehold] = useState(defaultHousehold);

  // === Sesión con ventana de idle (30 min) ===
  // Mientras la app esté abierta no bloqueamos. Si el usuario sale y vuelve
  // dentro de 30 min, no le pedimos PIN/FaceID otra vez. Esto también deja
  // que el redirect de OAuth (Plaid) regrese sin romper la sesión.
  const IDLE_MS = 30 * 60 * 1000;
  const markUnlocked = () => {
    try { localStorage.setItem('kleo_last_unlock', String(Date.now())); } catch {}
  };
  const isWithinIdleWindow = () => {
    try {
      const last = parseInt(localStorage.getItem('kleo_last_unlock') || '0', 10);
      return last && (Date.now() - last) < IDLE_MS;
    } catch { return false; }
  };

  // Contar notificaciones no leídas + detectar apertura desde notificación
  useEffect(() => {
    setUnreadCount(getUnreadCount());
    // Si se abrió desde notificación (URL con ?notif=1 o ?section=)
    const params = new URLSearchParams(window.location.search);
    if (params.get('notif') || params.get('section')) {
      const notifTitle = decodeURIComponent(params.get('title') || 'Kleo');
      const notifBody = decodeURIComponent(params.get('body') || '');
      const notifSection = decodeURIComponent(params.get('section') || '');
      window.history.replaceState({}, '', '/');
      setTimeout(() => {
        setPendingNotification({
          title: notifTitle,
          body: notifBody,
          section: notifSection
        });
      }, 1000);
    }
    // Escuchar mensajes del service worker (push recibido)
    const handleMessage = (event) => {
      if (event.data?.type === 'PUSH_RECEIVED') {
        saveNotification(event.data.payload);
        setUnreadCount(prev => prev + 1);
      }
      if (event.data?.type === 'NAVIGATE_SECTION') {
        const s = event.data.section;
        const payload = event.data.payload || {};
        // Mostrar overlay con el mensaje
        setPendingNotification({
          title: payload.title || 'Kleo',
          body: payload.body || '',
          section: s
        });
      }
    };
    navigator.serviceWorker?.addEventListener('message', handleMessage);

    // Fallback para iOS: cuando la app vuelve al foco, checar si hay notificación pendiente
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        const pending = getPendingNotification();
        if (pending) {
          setPendingNotification({
            title: pending.title,
            body: pending.body,
            section: pending.section
          });
        }
        setUnreadCount(getUnreadCount());
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // Checar al inicio también
    const initialPending = getPendingNotification();
    if (initialPending) {
      setPendingNotification({
        title: initialPending.title,
        body: initialPending.body,
        section: initialPending.section
      });
    }

    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleMessage);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

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

      // Sin seed de demo: el usuario empieza limpio y conecta su banco real con Plaid
      setAccounts(accts);
      setTransactions(txs);
      setFixedExpenses(fixed);
      setGoals(gls);

      // Auto-sync de Plaid en background si hay cuentas conectadas
      if (accts.some(a => a.plaid_access_token || a.plaid_account_id)) {
        // 1ra vez en la sesión: sync profundo de 90 días para llenar huecos
        // de transacciones que no se registraron mientras la app estaba cerrada.
        // Después solo 14 días en cada sync incremental.
        const deepKey = `kleo_deep_sync_${userId}`;
        const needsDeep = !sessionStorage.getItem(deepKey);
        const days = needsDeep ? 90 : 14;
        syncPlaidInBackground(userId, days).then(() => {
          if (needsDeep) sessionStorage.setItem(deepKey, '1');
        });
        // Asegurar que el webhook URL esté seteado en los Items
        updateWebhooksOnce(userId);
      }
    } catch (err) {
      console.error('Supabase load error:', err);
      showToast('Error cargando datos');
    }
  }, []);

  // Sync automático en background. NO bloquea UI ni notifica al usuario;
  // solo actualiza accounts + transactions silenciosamente.
  const syncPlaidInBackground = useCallback(async (userId, days = 14) => {
    if (!userId) return;
    try {
      const res = await fetch('/api/plaid/sync-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, days })
      });
      const data = await res.json();
      if (data.synced > 0 || data.balanceUpdates > 0) {
        const [accts, txs] = await Promise.all([fetchAccounts(), fetchTransactions()]);
        setAccounts(accts);
        setTransactions(txs);
      }
    } catch (e) {
      console.warn('Background Plaid sync failed:', e.message);
    }
  }, []);

  // Bancos que necesitan reconexión (detectado por auto-recover)
  const [banksNeedingRelink, setBanksNeedingRelink] = useState([]);

  // Auto-recover: corre al abrir la app y silenciosamente sincroniza todo.
  // Detecta items expirados y los reporta al estado para mostrar banner.
  const autoRecover = useCallback(async (userId) => {
    if (!userId) return;
    try {
      const res = await fetch('/api/plaid/auto-recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      const data = await res.json();
      if (!res.ok) return;

      // Si insertó algo, refresca cuentas y transacciones
      if (data.totalInserted > 0) {
        const [a, t] = await Promise.all([fetchAccounts(), fetchTransactions()]);
        setAccounts(a); setTransactions(t);
      }

      // Items que necesitan reconexión
      const needsRelink = (data.items || []).filter(i => i.needs_relink);
      setBanksNeedingRelink(needsRelink);
    } catch (e) {
      console.warn('auto-recover failed:', e.message);
    }
  }, []);

  const handleDiagnose = useCallback(async () => {
    if (!user?.id) return;
    showToast('Diagnosticando Plaid...');
    try {
      const res = await fetch('/api/plaid/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });
      const data = await res.json();

      // Resumen legible
      const lines = [];
      if (!data.items?.length) {
        lines.push('No hay cuentas conectadas con Plaid.');
      } else {
        lines.push(`Supabase tiene ${data.totals.supabase_transactions} transacciones en total.`);
        lines.push('');
        for (const it of data.items) {
          lines.push(`=== ${it.institution} ===`);
          if (it.needs_relink) {
            lines.push(`⚠️ NECESITA RECONEXIÓN (${it.error_code})`);
            lines.push('   Solución: ve a Cuentas, desconecta y vuelve a conectar.');
          } else if (it.item_status?.error) {
            lines.push(`⚠️ Error: ${JSON.stringify(it.item_status.error)}`);
          } else {
            lines.push(`✓ Item OK`);
          }
          lines.push(`Webhook URL: ${it.item_status?.webhook || '(NO CONFIGURADA)'}`);
          lines.push(`Plaid tiene: ${it.plaid_transactions_30d ?? '?'} tx (últimos 30 días)`);
          lines.push(`Kleo guardó: ${it.supabase_transactions_30d ?? '?'} tx`);
          if (typeof it.gap === 'number') {
            if (it.gap > 0) lines.push(`⚠️ FALTAN ${it.gap} TRANSACCIONES en Kleo`);
            else if (it.gap < 0) lines.push(`📦 Tienes ${-it.gap} extra (probablemente más viejas)`);
            else lines.push(`✓ Todo sincronizado`);
          }
          if (it.recent_5?.length) {
            lines.push('Últimas 5 en Plaid:');
            it.recent_5.forEach(t => {
              lines.push(`  ${t.date} · $${t.amount} · ${t.merchant}`);
            });
          }
          lines.push('');
        }
      }
      alert(lines.join('\n'));
    } catch (e) {
      alert('Error al diagnosticar: ' + e.message);
    }
  }, [user]);

  // Auto-update webhooks una vez por sesión (silencioso).
  // Esto asegura que los Items conectados antes de que añadiéramos
  // webhooks empiecen a recibir pushes de Plaid.
  const updateWebhooksOnce = useCallback(async (userId) => {
    if (!userId) return;
    try {
      const flagKey = `kleo_webhooks_updated_${userId}`;
      if (sessionStorage.getItem(flagKey)) return;
      const res = await fetch('/api/plaid/update-webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      if (res.ok) sessionStorage.setItem(flagKey, '1');
    } catch (e) {
      console.warn('Auto webhook update failed:', e.message);
    }
  }, []);

  // ===== Supabase Realtime — push en vivo cuando hay cambios =====
  // El webhook de Plaid escribe a Supabase → Supabase notifica al cliente
  // por WebSocket. La transacción aparece en milisegundos sin polling.
  useEffect(() => {
    if (stage !== STAGE.AUTHENTICATED || !user?.id || !useSupabase) return;

    const channel = supabase
      .channel(`kleo-rt-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'transactions',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        const tx = payload.new;
        // Normalizar el shape al que usa el cliente (account_id → accountId, etc)
        const normalized = {
          id: tx.id,
          accountId: tx.account_id,
          amount: tx.amount,
          merchant: tx.merchant,
          category: tx.category,
          date: tx.date,
          method: tx.method,
          shared: tx.shared
        };
        setTransactions(prev => {
          if (prev.some(t => t.id === normalized.id)) return prev;
          return [normalized, ...prev];
        });
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'accounts',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        const acct = payload.new;
        setAccounts(prev => prev.map(a => a.id === acct.id ? {
          ...a,
          balance: acct.balance,
          credit_limit: acct.credit_limit,
          limit: acct.credit_limit,
          name: acct.name,
          institution: acct.institution
        } : a));
      })
      .on('postgres_changes', {
        event: 'DELETE', schema: 'public', table: 'transactions',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        setTransactions(prev => prev.filter(t => t.id !== payload.old.id));
      })
      .subscribe();

    return () => { try { supabase.removeChannel(channel); } catch {} };
  }, [stage, user?.id, useSupabase]);

  // ===== Sync automático de Plaid =====
  // Cada 30s mientras la app esté visible + al volver del background.
  // Silencioso, sin UI, sin botones — el sistema mantiene la data fresca.
  useEffect(() => {
    if (stage !== STAGE.AUTHENTICATED || !user?.id) return;
    const hasPlaidAccounts = accounts.some(a => a.plaid_access_token || a.plaid_account_id);
    if (!hasPlaidAccounts) return;

    let lastSync = Date.now();
    const openedAt = Date.now();
    // Polling agresivo los primeros 5 min (cada 15s), después cada 30s
    const FAST_INTERVAL = 15 * 1000;
    const SLOW_INTERVAL = 30 * 1000;
    const FAST_WINDOW = 5 * 60 * 1000;

    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      // Si la app volvió del background, fuerza un sync inmediato
      if (Date.now() - lastSync > 60 * 1000) {
        syncPlaidInBackground(user.id, 14);
        lastSync = Date.now();
      }
    };

    const tick = () => {
      if (document.visibilityState !== 'visible') return;
      syncPlaidInBackground(user.id, 7);
      lastSync = Date.now();
    };

    // Primer sync inmediato al montar — auto-recover es más completo
    // (verifica items, balances, transacciones, todo en un solo call)
    autoRecover(user.id);
    lastSync = Date.now();

    let intervalId = setInterval(() => {
      const inFastWindow = Date.now() - openedAt < FAST_WINDOW;
      tick();
      // Si pasamos de fast a slow window, recreamos el interval
      if (!inFastWindow && intervalId._isFast) {
        clearInterval(intervalId);
        intervalId = setInterval(tick, SLOW_INTERVAL);
        intervalId._isFast = false;
      }
    }, FAST_INTERVAL);
    intervalId._isFast = true;

    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [stage, user?.id, accounts.length, syncPlaidInBackground, autoRecover]);

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
        if (isWithinIdleWindow()) setStage(STAGE.AUTHENTICATED);
        else if (hasPin(authUser.id)) setStage(STAGE.FACE_ID);
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
        if (isWithinIdleWindow()) setStage(STAGE.AUTHENTICATED);
        else if (hasPin(authUser.id)) setStage(STAGE.FACE_ID);
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
      if (isWithinIdleWindow()) setStage(STAGE.AUTHENTICATED);
      else if (userData?.pin) setStage(STAGE.FACE_ID);
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
    try {
      if (provider === 'google') {
        await signInWithGoogle();
      } else if (provider === 'apple') {
        await signInWithApple();
      }
      // OAuth redirect happens — onAuthChange picks up the session
    } catch (err) {
      console.error('OAuth error:', err);
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
    // Intentar registrar biometría
    const bioId = user?.id || user?.email || 'default';
    const bioSupported = await checkBiometricSupport();
    if (bioSupported) {
      await registerBiometric(bioId);
    }
    markUnlocked();
    setStage(STAGE.AUTHENTICATED);
  };

  const handleVerifyPin = async (pin) => {
    if (useSupabase && user?.id) {
      const ok = await verifyPin(user.id, pin);
      if (ok) { markUnlocked(); setStage(STAGE.AUTHENTICATED); return true; }
      return false;
    } else {
      const data = storage.get(`user_${user.email}`);
      if (data?.pin === pin) { markUnlocked(); setStage(STAGE.AUTHENTICATED); return true; }
      return false;
    }
  };

  const handleLogout = async () => {
    if (useSupabase) {
      try { await dbSignOut(); } catch {}
    }
    storage.remove('user');
    try { localStorage.removeItem('kleo_last_unlock'); } catch {}
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
    const withMeta = { startedAt: new Date().toISOString(), ...goal };
    if (useSupabase && user?.id) {
      try {
        const newGoal = await dbCreateGoal(user.id, withMeta);
        setGoals(prev => [...prev, newGoal]);
      } catch (err) { console.error(err); return; }
    } else {
      setGoals(prev => [...prev, { id: 'g_' + Date.now(), ...withMeta }]);
    }
    showToast('Meta creada');
  };

  const handleGoalUpdate = (goalId, updates) => {
    setGoals(prev => prev.map(g => g.id === goalId ? { ...g, ...updates } : g));
    showToast('Meta actualizada');
  };

  const handleGoalDelete = (goalId) => {
    setGoals(prev => prev.filter(g => g.id !== goalId));
    showToast('Meta eliminada');
  };

  const handleBankConnected = async () => {
    if (useSupabase && user?.id) {
      try { await loadSupabaseData(user.id); } catch {}
    }
    setShowConnectBank(false);
    showToast('¡Banco conectado!');

    // Si es la primera vez que conecta y aún no completó el onboarding del
    // asesor, lanzarlo automáticamente
    const advisorProfile = getAdvisorProfile();
    if (!advisorProfile?.onboarding_completed) {
      setTimeout(() => setShowAdvisorOnboarding(true), 800);
    }
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
    return <div className="app-shell"></div>;
  }

  if (stage === STAGE.WELCOME) {
    return (
      <div className="app-shell">

        <Welcome onLogin={handleLogin} />
      </div>
    );
  }

  if (stage === STAGE.PIN_SETUP) {
    return (
      <div className="app-shell">

        <PinScreen mode="create" onComplete={handlePinCreated} />
      </div>
    );
  }

  if (stage === STAGE.FACE_ID) {
    return (
      <div className="app-shell">

        <FaceIdScreen
          userName={user?.name}
          userId={user?.id || user?.email || 'default'}
          onSuccess={() => { markUnlocked(); setStage(STAGE.AUTHENTICATED); }}
          onUsePin={() => setStage(STAGE.PIN_VERIFY)}
        />
      </div>
    );
  }

  if (stage === STAGE.PIN_VERIFY) {
    return (
      <div className="app-shell">

        <PinScreen
          mode="verify"
          verifyAsync={handleVerifyPin}
          userName={user?.name}
          onComplete={() => { markUnlocked(); setStage(STAGE.AUTHENTICATED); }}
        />
      </div>
    );
  }

  // Función para renderizar sección
  const renderSection = () => {
    if (!section) return null;
    return (
      <>
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
            goals={goals}
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
        {section === 'kleoai' && (
          <KleoAi
            transactions={transactions}
            accounts={accounts}
            goals={goals}
            fixedExpenses={fixedExpenses}
            onHome={goHome}
            onMenu={() => setShowMenu(true)}
          />
        )}
      </>
    );
  };

  return (
    <div className="app-shell">

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
          {section ? renderSection() : (
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
                  onNotifications={() => { setShowNotifications(true); setUnreadCount(0); }}
                  unreadCount={unreadCount}
                  onAddExpense={() => setShowAdd(true)}
                  onOpenKleoAi={() => setSection('kleoai')}
                  banksNeedingRelink={banksNeedingRelink}
                  onReconnectBank={() => setShowConnectBank(true)}
                />
              )}
              {tab === 'accounts' && (
                <Accounts
                  accounts={accounts}
                  transactions={transactions}
                  onHome={goHome}
                  onMenu={() => setShowMenu(true)}
                  onConnectBank={() => setShowConnectBank(true)}
                  onRenameAccount={async (id, newName) => {
                    if (useSupabase) {
                      try {
                        await dbUpdateAccount(id, { name: newName, label: newName });
                        const a = await fetchAccounts();
                        setAccounts(a);
                      } catch (e) {
                        console.error('Rename error:', e);
                        showToast('Error al renombrar');
                      }
                    } else {
                      setAccounts(prev => prev.map(x => x.id === id ? { ...x, name: newName, label: newName } : x));
                    }
                    showToast('Nombre actualizado');
                  }}
                  onDeleteAccount={async (id) => {
                    if (useSupabase) {
                      try {
                        await dbUnlinkAccount(id, user.id);
                        const [a, t] = await Promise.all([fetchAccounts(), fetchTransactions()]);
                        setAccounts(a); setTransactions(t);
                      } catch (e) {
                        console.error('Delete error:', e);
                        showToast('Error al desconectar');
                        return;
                      }
                    } else {
                      setAccounts(prev => prev.filter(x => x.id !== id));
                      setTransactions(prev => prev.filter(t => t.accountId !== id));
                    }
                    showToast('Cuenta desconectada');
                  }}
                />
              )}
              {tab === 'goals' && (
                <Goals
                  goals={goals}
                  accounts={accounts}
                  transactions={transactions}
                  fixedExpenses={fixedExpenses}
                  onAddSavings={handleGoalContribute}
                  onCreate={handleGoalCreate}
                  onUpdate={handleGoalUpdate}
                  onDelete={handleGoalDelete}
                  onHome={goHome}
                  onMenu={() => setShowMenu(true)}
                />
              )}
            </>
          )}

          <BottomNav
            active={tab}
            onChange={(t) => { setTab(t); setSection(null); }}
            onAdd={() => setShowAdd(true)}
            onMenu={() => setShowMenu(true)}
          />
        </>
      )}

      {showTutorial && (
        <OnboardingTour
          steps={TOUR_STEPS}
          navigate={(target) => {
            // target = null -> dashboard, 'credit'/'calendar'/etc -> sección,
            // 'tab:goals'/'tab:accounts' -> tab
            if (target === null || target === undefined) {
              setSection(null);
              setTab('dashboard');
            } else if (typeof target === 'string' && target.startsWith('tab:')) {
              setSection(null);
              setTab(target.slice(4));
            } else {
              setSection(target);
            }
          }}
          onComplete={() => {
            setSection(null);
            setTab('dashboard');
            setShowTutorial(false);
            // Después del tour, abrir directamente Plaid Link
            setTimeout(() => setShowConnectBank(true), 400);
          }}
        />
      )}

      {showAdvisorOnboarding && (
        <AdvisorOnboarding
          accounts={accounts}
          fixedExpenses={fixedExpenses}
          goals={goals}
          transactions={transactions}
          profile={getAdvisorProfile()}
          onSave={() => {
            setShowAdvisorOnboarding(false);
            showToast('Asesor activado · 6 meses analizándose');
          }}
          onClose={() => setShowAdvisorOnboarding(false)}
          onAddFixedExpense={(e) => {
            setFixedExpenses(prev => [...prev, e]);
          }}
          onRemoveFixedExpense={(id) => {
            setFixedExpenses(prev => prev.filter(f => f.id !== id));
          }}
          onUpdateHousehold={(h) => setHousehold(h)}
          onAddGoal={(g) => setGoals(prev => [...prev, g])}
          onConnectMoreBanks={() => {
            setShowAdvisorOnboarding(false);
            setShowConnectBank(true);
          }}
        />
      )}

      {showMenu && (
        <MoreMenu
          user={user}
          onShowTutorial={() => {
            try { localStorage.removeItem('kleo_tutorial_completed'); } catch {}
            setShowTutorial(true);
          }}
          onDiagnose={() => { setShowMenu(false); handleDiagnose(); }}
          onClose={() => setShowMenu(false)}
          onNavigate={(id) => {
            setShowMenu(false);
            // 'accounts' y 'goals' son tabs; el resto son secciones
            if (id === 'accounts' || id === 'goals') {
              setSection(null);
              setTab(id);
            } else {
              setSection(id);
            }
          }}
          onLogout={handleLogout}
          onHome={goHome}
          onFeedback={() => setSection('feedback')}
        />
      )}

      {showNotifications && (
        <Notifications onClose={() => setShowNotifications(false)} />
      )}

      {pendingNotification && (
        <NotificationOverlay
          notification={pendingNotification}
          onDismiss={() => setPendingNotification(null)}
          onAction={() => {
            const s = pendingNotification.section;
            setPendingNotification(null);
            if (s === 'ai-insights') {
              setTab('dashboard');
              setSection(null);
            } else if (s) {
              setSection(s);
            }
          }}
        />
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// Pasos del tour interactivo (popover + spotlight)
// Orden: dashboard completo → cada tile (highlight + entra y explica) →
// bottom nav (Dashboard / + / Más) → outro
// ════════════════════════════════════════════════════════════
const TOUR_STEPS = [
  // ─── INTRO ───
  { navigateTo: null, target: null, tag: 'Bienvenido', emoji: '👋',
    title: 'Hola, soy Kleo',
    body: 'Tu asesor financiero personal. Te voy a mostrar cada parte de la app. Solo puedes avanzar con los botones del popover.',
    tip: 'El recorrido toma ~1 minuto. Vas a entrar a cada sección para que veas qué hay adentro.' },

  // ─── DASHBOARD ───
  { navigateTo: null, target: 'hero', tag: 'Disponible', emoji: '💰',
    title: 'Disponible esta semana',
    body: 'El número más importante de tu día. Cuánto puedes gastar libremente.' },

  { navigateTo: null, target: 'connectBank', tag: 'Conectar', emoji: '🏦',
    title: 'Conectar banco',
    body: 'Aquí conectas tus cuentas con Plaid. Por esto analizamos los últimos 6 meses de historial automático para que el análisis sea preciso.' },

  { navigateTo: null, target: 'resumenHeader', tag: 'Tu Resumen', emoji: '📌',
    title: 'Tu Resumen',
    body: 'Las 5 cosas más importantes de tu salud financiera condensadas en cards: acción del día, semana, riesgo, score y consejos.' },

  { navigateTo: null, target: 'action', tag: 'Acción', emoji: '✨',
    title: 'Acción recomendada hoy',
    body: 'Cada día te muestro UNA cosa que debes hacer. Toca "Seguir plan" para ver qué hacer y cómo hacerlo.' },

  { navigateTo: null, target: 'week', tag: 'Semana', emoji: '📅',
    title: 'Esta semana',
    body: 'Resumen de los próximos 7 días: pagos, suscripciones, cierres de ciclo. Toca "Ver calendario" para el detalle.' },

  { navigateTo: null, target: 'risk', tag: 'Riesgo', emoji: '⛅',
    title: 'Riesgo de la semana',
    body: 'Tu clima financiero — Bajo ☀️, Medio ⛅ o Alto ⛈. "Ver riesgos" abre Kleo AI con la solución específica.' },

  { navigateTo: null, target: 'score', tag: 'Score', emoji: '🤖',
    title: 'Tu Kleo Score',
    body: 'Estimación de tu FICO. Fórmula: Pago 35% · Util 30% · Edad 15% · Mezcla 10% · Nuevo 10%. Toca para ver el plan por tarjeta.' },

  { navigateTo: null, target: 'aiTips', tag: 'Asesor IA', emoji: '💡',
    title: 'Consejos de Kleo IA',
    body: 'Toca aquí para abrir tu asesor 24/7. Genera plan completo: disponible, riesgos, acciones, plan puente con tarjeta.' },

  { navigateTo: null, target: 'sectionsHeader', tag: 'Secciones', emoji: '📂',
    title: 'Secciones',
    body: 'Aquí abajo están todas las secciones. Vamos a entrar a cada una para que veas qué hace.' },

  // ─── TILE CRÉDITO + ENTRA ───
  { navigateTo: null, target: 'tile-credit', tag: 'Crédito', emoji: '💳',
    title: 'Sección Crédito',
    body: 'Plan de pago detallado por cada tarjeta + calculadora de pago extra + factores que afectan tu score.' },
  { navigateTo: 'credit', target: 'creditPlan', tag: 'Crédito · Plan', emoji: '💳',
    title: 'Plan por tarjeta',
    body: 'Por cada tarjeta te calculo: cuánto pagar, cuándo, y cuándo NO usarla.',
    tip: 'El banco reporta al buró el balance al CIERRE del ciclo, no al due date. Por eso el timing importa.' },

  // ─── TILE CUENTAS + ENTRA ───
  { navigateTo: null, target: 'tile-accounts', tag: 'Cuentas', emoji: '🏦',
    title: 'Sección Cuentas',
    body: 'Tus cuentas corrientes y de ahorros. Sin tarjetas — esas viven en Crédito.' },
  { navigateTo: 'tab:accounts', target: 'accountsHero', tag: 'Cuentas', emoji: '🏦',
    title: 'Total y desglose',
    body: 'Ves tu balance total, separado entre Corriente y Ahorros. Toca cualquier cuenta para detalle, editar nombre o eliminar.' },

  // ─── TILE METAS + ENTRA ───
  { navigateTo: null, target: 'tile-goals', tag: 'Metas', emoji: '🎯',
    title: 'Sección Metas',
    body: 'Crear metas (viaje, casa, fondo de emergencia), vincularlas a una cuenta, y dejar que se actualicen solas.' },
  { navigateTo: 'tab:goals', target: 'goalsCreate', tag: 'Crear meta', emoji: '➕',
    title: 'Crea tu primera meta',
    body: 'Toca el + para escoger tipo (emergencia / viaje / casa / etc.), monto, fecha límite y cuenta vinculada.',
    tip: 'Se recomienda tener 1 cuenta por cada meta para tener mejor visibilidad del progreso.' },

  // ─── TILE PRESUPUESTO + ENTRA ───
  { navigateTo: null, target: 'tile-budget', tag: 'Presupuesto', emoji: '💰',
    title: 'Sección Presupuesto',
    body: 'Aquí ves la tabla de tus gastos mensuales. Puede ser individual o en pareja.' },
  { navigateTo: 'budget', target: 'budgetTabs', tag: 'Presupuesto', emoji: '🏠',
    title: 'Resumen / Tabla / Liquidación',
    body: '3 vistas: resumen del mes, tabla por categoría, y liquidación (cuánto te debe tu pareja al final del mes).' },

  // ─── TILE CALENDARIO + ENTRA ───
  { navigateTo: null, target: 'tile-calendar', tag: 'Calendario', emoji: '📅',
    title: 'Sección Calendario',
    body: 'Mapa visual de todos tus pagos, cierres de ciclo y aportes a metas del mes.' },
  { navigateTo: 'calendar', target: 'calMonth', tag: 'Calendario', emoji: '🗓',
    title: 'Calendario inteligente',
    body: 'Cada día tiene logo del evento dominante. Auto-detecta suscripciones, cierres y aportes.',
    tip: 'NO tienes que marcar nada como pagado — yo lo detecto cuando llega tu transacción.' },

  // ─── TILE RENDIMIENTO + ENTRA ───
  { navigateTo: null, target: 'tile-analysis', tag: 'Rendimiento', emoji: '📈',
    title: 'Sección Rendimiento',
    body: 'Cómo te está yendo este mes vs el pasado, donde gastas más, y recomendaciones específicas.' },
  { navigateTo: 'analysis', target: 'analysisTabs', tag: 'Rendimiento', emoji: '📊',
    title: 'Por semana / Por categoría',
    body: '2 vistas: barra semanal de los últimos 30 días o donut chart con tus categorías top.' },

  // ─── TILE TRANSACCIONES + ENTRA ───
  { navigateTo: null, target: 'tile-transactions', tag: 'Transacciones', emoji: '🧾',
    title: 'Sección Transacciones',
    body: 'Lista completa filtrable de todo lo que pasa en tus cuentas, agrupado por día.' },
  { navigateTo: 'transactions', target: 'txSearch', tag: 'Buscar', emoji: '🔍',
    title: 'Búsqueda y filtros',
    body: 'Busca por comercio, filtra por cuenta o categoría. Las transferencias salen en gris para no inflar tus totales.' },

  // ─── TILE REPORTES + ENTRA ───
  { navigateTo: null, target: 'tile-reports', tag: 'Reportes', emoji: '📊',
    title: 'Sección Reportes',
    body: 'Comparativas mensuales y trimestrales. Para ver tendencias y planificar.' },
  { navigateTo: 'reports', target: 'reportsTabs', tag: 'Reportes', emoji: '📑',
    title: 'Mensual / Trimestral',
    body: 'Cambia entre vista mensual (últimos 6 meses) y trimestral (últimos 4 trimestres) con gráfica de tendencia.' },

  // ─── BOTTOM NAV ───
  { navigateTo: null, target: 'navHome', tag: 'Dashboard', emoji: '🏠',
    title: 'Botón Dashboard',
    body: 'Vuelve al inicio desde cualquier sección. Tu home base.' },
  { navigateTo: null, target: 'fab', tag: 'Acción rápida', emoji: '➕',
    title: 'Acción rápida (+)',
    body: 'Para registrar un gasto manual rápido: 4 modos — automático (Plaid), ATH Móvil, foto del recibo, o manual.',
    tip: 'Casi nunca lo necesitas. Kleo detecta tus gastos solo desde tus transacciones.' },
  { navigateTo: null, target: 'menu', tag: 'Más', emoji: '⋯',
    title: 'Menú "Más"',
    body: 'Acceso a todas las secciones, idioma (ES/EN), tema claro/oscuro, notificaciones, configuración del asesor y este tutorial.' },

  // ─── OUTRO ───
  { navigateTo: null, target: null, tag: 'Listo', emoji: '🚀',
    title: 'Listo para conectar tu banco',
    body: 'Vamos a conectar tus cuentas para activar TODO esto con tu data real.',
    tip: 'Plaid · solo lectura · 6 meses de historial. Kleo nunca puede mover tu dinero.' }
];

const _TOUR_STEPS_OLD = [
  {
    navigateTo: null,
    target: null,
    tag: 'Bienvenido',
    emoji: '👋',
    title: 'Hola, soy Kleo',
    body: 'Tu asesor financiero personal. Te voy a mostrar cada parte de la app en 30 segundos. Sigue las flechas — solo puedes avanzar usando los botones.',
    tip: 'Cada paso te muestra dónde tocar. El resto de la pantalla queda bloqueado para que no te pierdas.'
  },
  {
    target: 'hero',
    tag: 'Disponible',
    emoji: '💰',
    title: 'Disponible esta semana',
    body: 'El número más importante de tu día. Calcula cuánto puedes gastar libremente sin descuadrar pagos ni metas. Cambia entre Día / Semana / Ciclo / Mes.',
    tip: 'Por ahora dice "Configura tu presupuesto" porque aún no tienes data. Cuando conectes tu banco se llena solo.'
  },
  {
    target: 'action',
    tag: 'Acción del día',
    emoji: '✨',
    title: 'Acción recomendada hoy',
    body: 'Cada día te muestro UNA cosa que debes hacer. La más importante. El botón "Seguir plan" abre el por qué, con qué pagar y los pasos exactos.'
  },
  {
    target: 'week',
    tag: 'Tu semana',
    emoji: '📅',
    title: 'Esta semana',
    body: 'Resumen de los próximos 7 días: cuántos pagos vencen, suscripciones que se cobran, cierres de ciclo. Toca "Ver calendario" para ver el detalle.'
  },
  {
    target: 'risk',
    tag: 'Clima financiero',
    emoji: '⛅',
    title: 'Riesgo de la semana',
    body: 'Tu "clima financiero" — Bajo ☀️, Medio ⛅ o Alto ⛈. Te lee la semana en 2 segundos. Toca "Ver riesgos" para abrir Kleo AI con la solución.'
  },
  {
    target: 'score',
    tag: 'Kleo Score',
    emoji: '🤖',
    title: 'Tu Kleo Score',
    body: 'Estimación de tu FICO Score. Va de 300 a 850. Fórmula: Pago 35% · Utilización 30% · Antigüedad 15% · Mezcla 10% · Nuevo 10%.',
    tip: 'Para subir el score: paga a tiempo SIEMPRE y mantén utilización bajo 10%.'
  },
  {
    target: 'aiTips',
    tag: 'Asesor 24/7',
    emoji: '💡',
    title: 'Consejos de Kleo IA',
    body: 'Toca aquí para abrir tu asesor. Te genero un plan completo: disponible, riesgos, acciones recomendadas con pasos numerados, plan puente con tarjeta cuando aplique.'
  },
  {
    target: 'sections',
    tag: 'Secciones',
    emoji: '📂',
    title: 'Acceso a todas las secciones',
    body: 'Cada tile te lleva a su sección: Crédito (calculadora y plan por tarjeta), Cuentas, Metas, Calendario, Análisis, Transacciones, Reportes y Presupuesto.'
  },
  {
    target: 'fab',
    tag: 'Acción rápida',
    emoji: '➕',
    title: 'Agregar gasto manual',
    body: 'El botón + es para registrar un gasto manual rápido (efectivo, ATH Móvil, foto del recibo). Casi nunca lo vas a necesitar — Kleo detecta tus gastos solo.'
  },
  {
    target: 'menu',
    tag: 'Más opciones',
    emoji: '⋯',
    title: 'Menú "Más"',
    body: 'Aquí están todas las secciones, idioma (ES/EN), tema claro/oscuro, notificaciones y configuración del asesor. También puedes volver a ver este tutorial.'
  },
  // ─── Sección CRÉDITO ───
  {
    navigateTo: 'credit',
    target: 'creditPlan',
    tag: 'Crédito',
    emoji: '💳',
    title: 'Plan de acción por tarjeta',
    body: 'Por cada tarjeta que conectes te calculo el plan exacto: cuánto pagar, cuándo pagarlo (antes del cierre, no del due date) y cuándo NO usarla.',
    tip: 'El secreto: el banco reporta al buró el balance al cierre del ciclo. Pagar 2-3 días antes del cierre baja la utilización reportada.'
  },
  {
    navigateTo: 'credit',
    target: 'creditCalc',
    tag: 'Calculadora',
    emoji: '🧮',
    title: 'Calculadora de pago extra',
    body: 'Mueve el deslizador y ves al instante cuánto te ahorras en intereses y meses si pagas más del mínimo. 3 pasos simples.',
    tip: 'Estrategia avalanche: aplica el extra a la tarjeta con APR más alto. Te ahorra más intereses que distribuirlo.'
  },
  {
    navigateTo: 'credit',
    target: 'creditFactors',
    tag: 'FICO',
    emoji: '📊',
    title: 'Factores que afectan tu score',
    body: 'Los 5 factores del FICO con su peso en puntos: Pago 35% (~192 pts), Util 30% (~165), Edad 15% (~83), Mezcla 10% (~55), Nuevo 10% (~55).',
    tip: 'Toca cada factor para ver tips específicos para mejorarlo.'
  },

  // ─── Sección CALENDARIO ───
  {
    navigateTo: 'calendar',
    target: 'calMonth',
    tag: 'Calendario',
    emoji: '🗓',
    title: 'Calendario inteligente',
    body: 'Auto-poblado con tus pagos fijos, suscripciones, cierres de ciclo y aportes a metas. Cada día muestra el logo del evento dominante.',
    tip: 'Marco pagado automáticamente cuando detecto la transacción. Tú no tienes que tocar nada.'
  },

  // ─── Sección METAS ───
  {
    navigateTo: 'tab:goals',
    target: 'goalsCreate',
    tag: 'Metas',
    emoji: '🎯',
    title: 'Crear una meta',
    body: 'Toca el + para crear una meta (viaje, casa, fondo de emergencia). Vincula la cuenta donde guardas el dinero y los depósitos suman solos.',
    tip: 'Te recomiendo abrir una cuenta separada para metas. BPPR, Oriental y FirstBank tienen cuentas virtuales gratis.'
  },

  // ─── Sección KLEO AI ───
  {
    navigateTo: 'kleoai',
    target: 'aiAnalyze',
    tag: 'Asesor 24/7',
    emoji: '🤖',
    title: 'Tu asesor financiero',
    body: 'Toca este botón cuando quieras un análisis completo: disponible esta semana, riesgos detectados, acciones recomendadas con pasos numerados, plan puente con tarjeta si te falta efectivo.',
    tip: 'Mientras más data tenga (más meses conectados), más afinadas las recomendaciones.'
  },

  // ─── OUTRO ───
  {
    navigateTo: null,
    target: null,
    tag: 'Listo',
    emoji: '🚀',
    title: 'Listo para conectar tu banco',
    body: 'Ahora vamos a conectar tus cuentas para que pueda analizar tus últimos 6 meses y activar TODO esto con tu data real.',
    tip: 'Usamos Plaid — la misma tecnología de Venmo y Robinhood. Solo lectura. Kleo nunca puede mover tu dinero.'
  }
];
