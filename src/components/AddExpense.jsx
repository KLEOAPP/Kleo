import { useState, useEffect } from 'react';
import { Icon } from './icons.jsx';
import { CATEGORIES, sampleReceiptMerchants } from '../data/sampleData.js';
import { fmtMoney, todayISO } from '../utils/storage.js';
import { useI18n } from '../i18n/index.jsx';

export default function AddExpense({ accounts, onAdd, onClose }) {
  const { strings: s } = useI18n();
  const [method, setMethod] = useState(null);

  return (
    <div className="screen-no-nav" style={{ paddingTop: 60, paddingBottom: 32 }}>
      <button className="back-btn" onClick={method ? () => setMethod(null) : onClose}>
        <Icon name={method ? 'back' : 'x'} size={20} />
      </button>

      {!method && (
        <>
          <h2 className="h2 mb-8">{s.addExpense}</h2>
          <p className="label mb-24">{s.chooseMethod}</p>

          <div className="method-grid">
            <button className="method-card" onClick={() => setMethod('plaid')}>
              <div className="method-icon" style={{ background: 'rgba(0,229,176,0.15)', color: 'var(--green)' }}>
                <Icon name="link" size={22} />
              </div>
              <div className="col gap-4">
                <span style={{ fontWeight: 600, fontSize: 15 }}>{s.automatic}</span>
                <span className="tiny">{s.automaticDesc}</span>
              </div>
            </button>

            <button className="method-card" onClick={() => setMethod('ath')}>
              <div className="method-icon" style={{ background: 'rgba(220, 20, 60, 0.15)', color: '#FF6B9D' }}>
                <Icon name="phone" size={22} />
              </div>
              <div className="col gap-4">
                <span style={{ fontWeight: 600, fontSize: 15 }}>{s.athMovil}</span>
                <span className="tiny">{s.athDetection}</span>
              </div>
            </button>

            <button className="method-card" onClick={() => setMethod('photo')}>
              <div className="method-icon" style={{ background: 'rgba(167, 139, 250, 0.15)', color: '#A78BFA' }}>
                <Icon name="camera" size={22} />
              </div>
              <div className="col gap-4">
                <span style={{ fontWeight: 600, fontSize: 15 }}>{s.photoReceipt}</span>
                <span className="tiny">{s.photoAiReads}</span>
              </div>
            </button>

            <button className="method-card" onClick={() => setMethod('manual')}>
              <div className="method-icon" style={{ background: 'rgba(0,132,255,0.15)', color: 'var(--blue)' }}>
                <Icon name="edit" size={22} />
              </div>
              <div className="col gap-4">
                <span style={{ fontWeight: 600, fontSize: 15 }}>{s.manual}</span>
                <span className="tiny">{s.manualWrite}</span>
              </div>
            </button>
          </div>

          <div className="ai-alert mt-24">
            <div className="ai-icon">
              <Icon name="sparkle" size={16} color="#0D0D14" />
            </div>
            <div className="col gap-4" style={{ flex: 1 }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>{s.kleoTip}</span>
              <span style={{ fontSize: 13, color: 'var(--text-mute)', lineHeight: 1.4 }}>{s.plaidTip}</span>
            </div>
          </div>
        </>
      )}

      {method === 'plaid' && <PlaidFlow accounts={accounts} onAdd={onAdd} s={s} />}
      {method === 'ath' && <AthFlow accounts={accounts} onAdd={onAdd} s={s} />}
      {method === 'photo' && <PhotoFlow accounts={accounts} onAdd={onAdd} s={s} />}
      {method === 'manual' && <ManualFlow accounts={accounts} onAdd={onAdd} s={s} />}
    </div>
  );
}

function PlaidFlow({ accounts, onAdd, s }) {
  const [stage, setStage] = useState('connect');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (stage === 'syncing') {
      const id = setInterval(() => {
        setProgress(p => {
          if (p >= 100) {
            clearInterval(id);
            setStage('done');
            return 100;
          }
          return p + 8;
        });
      }, 100);
      return () => clearInterval(id);
    }
  }, [stage]);

  if (stage === 'connect') {
    return (
      <>
        <h2 className="h2 mb-8">{s.autoConnection}</h2>
        <p className="label mb-24">{s.autoConnectionDesc}</p>

        <div className="col gap-12">
          {accounts.map(a => (
            <div key={a.id} className="card row gap-12 spread">
              <div className="row gap-12">
                <div style={{ width: 40, height: 40, borderRadius: 10, background: a.color }}></div>
                <div className="col gap-4">
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{a.name}</span>
                  <span className="tiny">••{a.last4}</span>
                </div>
              </div>
              <div className="row gap-6" style={{ color: 'var(--green)' }}>
                <Icon name="check" size={16} color="var(--green)" />
                <span className="tiny" style={{ color: 'var(--green)' }}>{s.connected}</span>
              </div>
            </div>
          ))}
        </div>

        <button className="btn-primary mt-24" onClick={() => setStage('syncing')}>
          {s.syncNow}
        </button>
      </>
    );
  }

  if (stage === 'syncing') {
    return (
      <div className="col" style={{ alignItems: 'center', justifyContent: 'center', flex: 1, gap: 24 }}>
        <div style={{ width: 100, height: 100, borderRadius: '50%', border: '3px solid var(--bg-elev)', borderTopColor: 'var(--green)', animation: 'spin 1s linear infinite' }}></div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <h3 className="h3">{s.syncing}</h3>
        <span className="label">{progress}% · {s.searchingTransactions}</span>
      </div>
    );
  }

  return (
    <div className="col" style={{ alignItems: 'center', justifyContent: 'center', flex: 1, gap: 16 }}>
      <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(0,229,176,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="check" size={48} color="var(--green)" stroke={3} />
      </div>
      <h3 className="h3">{s.synced}</h3>
      <p className="label" style={{ textAlign: 'center', maxWidth: 280 }}>{s.syncResult}</p>
    </div>
  );
}

function AthFlow({ accounts, onAdd, s }) {
  const [stage, setStage] = useState('detecting');
  const [selectedCat, setSelectedCat] = useState(null);

  useEffect(() => {
    if (stage === 'detecting') {
      const t = setTimeout(() => setStage('categorize'), 1400);
      return () => clearTimeout(t);
    }
  }, [stage]);

  const detected = { amount: 35.00, person: 'Jorge Méndez', date: 'Hace 2 minutos' };
  const quickCats = ['comida', 'transferencia', 'transporte', 'compras', 'entretenimiento', 'otro'];

  if (stage === 'detecting') {
    return (
      <div className="col" style={{ alignItems: 'center', justifyContent: 'center', flex: 1, gap: 16 }}>
        <div style={{ position: 'relative', width: 80, height: 80 }}>
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(220, 20, 60, 0.15)', animation: 'pulse 1.4s infinite' }}></div>
          <div style={{ position: 'absolute', inset: 8, borderRadius: '50%', background: 'rgba(220, 20, 60, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="phone" size={28} color="#FF6B9D" />
          </div>
        </div>
        <h3 className="h3">{s.detectingAth}</h3>
        <span className="label">{s.detectingAthDesc}</span>
      </div>
    );
  }

  return (
    <>
      <h2 className="h2 mb-8">{s.athDetected}</h2>
      <p className="label mb-16">{s.athDetectedDesc}</p>

      <div className="card mb-20">
        <div className="spread">
          <div className="col gap-4">
            <span className="tiny">{s.transferTo}</span>
            <span style={{ fontWeight: 600, fontSize: 16 }}>{detected.person}</span>
            <span className="tiny">{detected.date}</span>
          </div>
          <span className="h2" style={{ color: 'var(--danger)' }}>−{fmtMoney(detected.amount)}</span>
        </div>
      </div>

      <span className="label mb-8" style={{ display: 'block' }}>{s.category}</span>
      <div className="chip-grid">
        {quickCats.map(c => {
          const cat = CATEGORIES[c];
          return (
            <button
              key={c}
              className={`chip ${selectedCat === c ? 'selected' : ''}`}
              onClick={() => setSelectedCat(c)}
            >
              <span style={{ fontSize: 22 }}>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      <button
        className="btn-primary mt-24"
        disabled={!selectedCat}
        onClick={() => onAdd({
          accountId: 'acc_popular',
          amount: -detected.amount,
          merchant: `ATH Móvil — ${detected.person}`,
          category: selectedCat,
          date: todayISO(),
          method: 'ath'
        })}
      >
        {s.saveExpense}
      </button>
    </>
  );
}

function PhotoFlow({ accounts, onAdd, s }) {
  const [stage, setStage] = useState('capture');
  const [parsed, setParsed] = useState(null);
  const [accountId, setAccountId] = useState(accounts[0].id);

  const startScan = () => {
    setStage('scanning');
    setTimeout(() => {
      const r = sampleReceiptMerchants[Math.floor(Math.random() * sampleReceiptMerchants.length)];
      setParsed(r);
      setStage('confirm');
    }, 1800);
  };

  if (stage === 'capture') {
    return (
      <>
        <h2 className="h2 mb-8">{s.scanReceipt}</h2>
        <p className="label mb-24">{s.scanReceiptDesc}</p>

        <div onClick={startScan} style={{
          width: '100%', aspectRatio: '4/5', borderRadius: 22,
          background: 'var(--bg-card)', border: '2px dashed var(--border)',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: 16, cursor: 'pointer'
        }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(167, 139, 250, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="camera" size={36} color="#A78BFA" />
          </div>
          <span style={{ fontWeight: 600, fontSize: 16 }}>{s.tapToPhoto}</span>
          <span className="tiny">{s.orFromGallery}</span>
        </div>

        <button className="btn-primary mt-20" onClick={startScan}>
          <Icon name="camera" size={20} color="#0D0D14" />
          <span>{s.openCamera}</span>
        </button>
      </>
    );
  }

  if (stage === 'scanning') {
    return (
      <div className="col" style={{ alignItems: 'center', justifyContent: 'center', flex: 1, gap: 20 }}>
        <div style={{ position: 'relative', width: 200, height: 240, borderRadius: 18, background: 'var(--bg-card)', overflow: 'hidden', border: '1px solid var(--border)' }}>
          <div style={{ padding: 20, color: 'var(--text-dim)', fontSize: 11, fontFamily: 'monospace', lineHeight: 1.6 }}>
            WALMART<br/>
            CAGUAS PR<br/>
            ─────────<br/>
            PAN INTEGRAL  3.99<br/>
            LECHE 1G      4.85<br/>
            HUEVOS DOC    5.50<br/>
            DETERGENTE   12.99<br/>
            ARROZ 5LB     8.75<br/>
            ─────────<br/>
            TOTAL  $36.08<br/>
            IVU      4.55<br/>
          </div>
          <div style={{
            position: 'absolute', left: 0, right: 0, height: 3,
            background: 'var(--green)', boxShadow: '0 0 12px var(--green)',
            top: '50%', animation: 'scanline 1.4s ease-in-out infinite'
          }}></div>
          <style>{`@keyframes scanline { 0% { top: 0%; } 50% { top: 95%; } 100% { top: 0%; } }`}</style>
        </div>
        <h3 className="h3">{s.readingReceipt}</h3>
        <span className="label">{s.identifyingMerchant}</span>
      </div>
    );
  }

  return (
    <>
      <h2 className="h2 mb-8">{s.scannedReceipt}</h2>
      <p className="label mb-20">{s.confirmExtracted}</p>

      <div className="card mb-16">
        <div className="col gap-16">
          <div className="spread">
            <span className="label">{s.merchant}</span>
            <span style={{ fontWeight: 600 }}>{parsed.merchant}</span>
          </div>
          <div className="divider"></div>
          <div className="spread">
            <span className="label">{s.total}</span>
            <span style={{ fontWeight: 700, fontSize: 20 }}>{fmtMoney(parsed.amount)}</span>
          </div>
          <div className="divider"></div>
          <div className="spread">
            <span className="label">{s.category}</span>
            <div className="row gap-6">
              <span>{CATEGORIES[parsed.category].icon}</span>
              <span style={{ fontWeight: 600 }}>{CATEGORIES[parsed.category].label}</span>
            </div>
          </div>
          <div className="divider"></div>
          <div className="col gap-6">
            <span className="label">{s.detectedItems}</span>
            <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6 }}>{parsed.items.join(' · ')}</div>
          </div>
        </div>
      </div>

      <span className="label mb-8" style={{ display: 'block' }}>{s.chargeTo}</span>
      <div className="col gap-8">
        {accounts.map(a => (
          <button
            key={a.id}
            className="row gap-12 spread"
            style={{
              padding: '14px 16px', borderRadius: 14,
              background: 'var(--bg-card)',
              border: `1px solid ${accountId === a.id ? 'var(--green)' : 'var(--border)'}`
            }}
            onClick={() => setAccountId(a.id)}
          >
            <div className="row gap-12">
              <div style={{ width: 32, height: 32, borderRadius: 8, background: a.color }}></div>
              <span style={{ fontWeight: 500, fontSize: 14 }}>{a.name} ••{a.last4}</span>
            </div>
            {accountId === a.id && <Icon name="check" size={18} color="var(--green)" />}
          </button>
        ))}
      </div>

      <button
        className="btn-primary mt-24"
        onClick={() => onAdd({
          accountId,
          amount: -parsed.amount,
          merchant: parsed.merchant,
          category: parsed.category,
          date: todayISO(),
          method: 'photo'
        })}
      >
        {s.saveExpense}
      </button>
    </>
  );
}

function ManualFlow({ accounts, onAdd, s }) {
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [category, setCategory] = useState('comida');
  const [accountId, setAccountId] = useState(accounts[0].id);

  const valid = amount && parseFloat(amount) > 0 && merchant.trim().length > 0;

  return (
    <>
      <h2 className="h2 mb-8">{s.manualExpense}</h2>
      <p className="label mb-24">{s.fillAndSave}</p>

      <div className="col gap-16">
        <div className="col gap-6">
          <span className="label">{s.amount}</span>
          <div className="row" style={{
            background: 'var(--bg-input)', borderRadius: 14,
            border: '1px solid var(--border)', padding: '0 16px', height: 64
          }}>
            <span style={{ fontSize: 28, color: 'var(--text-mute)' }}>$</span>
            <input
              className="input-field"
              style={{ background: 'transparent', border: 'none', height: 64, fontSize: 28, fontWeight: 700, padding: '0 8px' }}
              value={amount}
              onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
              inputMode="decimal"
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="col gap-6">
          <span className="label">{s.merchantLabel}</span>
          <input
            className="input-field"
            value={merchant}
            onChange={e => setMerchant(e.target.value)}
            placeholder={s.merchantPlaceholder}
          />
        </div>

        <div className="col gap-6">
          <span className="label">{s.category}</span>
          <div className="chip-grid">
            {Object.entries(CATEGORIES).filter(([k]) => k !== 'ingreso').slice(0, 9).map(([key, cat]) => (
              <button
                key={key}
                className={`chip ${category === key ? 'selected' : ''}`}
                onClick={() => setCategory(key)}
              >
                <span style={{ fontSize: 22 }}>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="col gap-6">
          <span className="label">{s.accountLabel}</span>
          <div className="col gap-8">
            {accounts.map(a => (
              <button
                key={a.id}
                className="row gap-12 spread"
                style={{
                  padding: '14px 16px', borderRadius: 14,
                  background: 'var(--bg-card)',
                  border: `1px solid ${accountId === a.id ? 'var(--green)' : 'var(--border)'}`
                }}
                onClick={() => setAccountId(a.id)}
              >
                <div className="row gap-12">
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: a.color }}></div>
                  <span style={{ fontWeight: 500, fontSize: 14 }}>{a.name} ••{a.last4}</span>
                </div>
                {accountId === a.id && <Icon name="check" size={18} color="var(--green)" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        className="btn-primary mt-24"
        disabled={!valid}
        onClick={() => onAdd({
          accountId,
          amount: -parseFloat(amount),
          merchant: merchant.trim(),
          category,
          date: todayISO(),
          method: 'manual'
        })}
      >
        {s.saveExpense}
      </button>
    </>
  );
}
