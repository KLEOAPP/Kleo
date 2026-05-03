import { useState, useCallback } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { Icon } from './icons.jsx';
import { useI18n } from '../i18n/index.jsx';

function PlaidLinkButton({ linkToken, onSuccess, loading, s }) {
  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: (public_token, metadata) => {
      onSuccess(public_token, metadata);
    },
  });

  return (
    <button
      className="btn-primary"
      onClick={() => open()}
      disabled={!ready || loading}
      style={{ width: '100%' }}
    >
      {loading ? s.bankConnecting : s.connectMyBank}
    </button>
  );
}

export default function ConnectBank({ userId, onConnected, onClose }) {
  const { strings: s } = useI18n();
  const [linkToken, setLinkToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [result, setResult] = useState(null);

  const getLinkToken = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/plaid/create-link-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      const data = await res.json();
      if (data.link_token) {
        setLinkToken(data.link_token);
      } else {
        setStatus('error');
      }
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
    setLoading(false);
  }, [userId]);

  const handleSuccess = async (publicToken) => {
    setStatus('linking');
    setLoading(true);
    try {
      const res = await fetch('/api/plaid/exchange-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ public_token: publicToken, userId })
      });
      const data = await res.json();
      if (data.success) {
        setStatus('success');
        setResult(data);
        if (onConnected) onConnected();
      } else {
        setStatus('error');
      }
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
    setLoading(false);
  };

  return (
    <div className="screen" style={{ paddingTop: 0 }}>
      <div style={{ padding: '60px 0 20px' }}>
        <div className="col gap-16" style={{ alignItems: 'center', textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: status === 'success' ? 'rgba(0,181,137,0.15)' : 'rgba(0,122,255,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 36
          }}>
            {status === 'success' ? '✅' : '🏦'}
          </div>

          <h2 className="h2">
            {status === 'success' ? s.bankConnected :
             status === 'linking' ? s.bankConnecting :
             s.connectYourBank}
          </h2>

          <p style={{ color: 'var(--text-mute)', maxWidth: 280, lineHeight: 1.5, fontSize: 14 }}>
            {status === 'success'
              ? s.bankSuccessDesc
                  .replace('{accounts}', result?.accountsLinked || 0)
                  .replace('{transactions}', result?.transactionsImported || 0)
              : status === 'linking'
              ? s.bankLinkingDesc
              : s.bankDesc
            }
          </p>
        </div>

        {status === 'success' ? (
          <button className="btn-primary" onClick={onClose} style={{ width: '100%' }}>
            {s.continue}
          </button>
        ) : status === 'error' ? (
          <div className="col gap-12">
            <p style={{ color: 'var(--danger)', textAlign: 'center', fontSize: 14 }}>{s.bankError}</p>
            <button className="btn-primary" onClick={() => { setStatus(null); setLinkToken(null); }} style={{ width: '100%' }}>
              {s.retry}
            </button>
          </div>
        ) : linkToken ? (
          <PlaidLinkButton linkToken={linkToken} onSuccess={handleSuccess} loading={loading} s={s} />
        ) : (
          <button
            className="btn-primary"
            onClick={getLinkToken}
            disabled={loading}
            style={{ width: '100%' }}
          >
            {loading ? s.preparing : s.connectMyBank}
          </button>
        )}

        <button
          onClick={onClose}
          style={{
            width: '100%',
            padding: 14,
            marginTop: 16,
            fontSize: 14,
            color: 'var(--text-mute)',
            fontWeight: 500
          }}
        >
          {status === 'success' ? '' : s.notNow}
        </button>

        {!status && (
          <div className="col gap-12 mt-20">
            <div className="card" style={{ background: 'var(--bg-elev)', border: 'none' }}>
              <div className="row gap-12">
                <span style={{ fontSize: 20 }}>🔒</span>
                <div className="col gap-2" style={{ flex: 1 }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{s.secureEncrypted}</span>
                  <span className="tiny">{s.secureDesc}</span>
                </div>
              </div>
            </div>
            <div className="card" style={{ background: 'var(--bg-elev)', border: 'none' }}>
              <div className="row gap-12">
                <span style={{ fontSize: 20 }}>👁️</span>
                <div className="col gap-2" style={{ flex: 1 }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{s.readOnly}</span>
                  <span className="tiny">{s.readOnlyDesc}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
