import { useState, useCallback, useEffect } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { Icon } from './icons.jsx';
import { useI18n } from '../i18n/index.jsx';

const OAUTH_RESUME_KEY = 'kleo_plaid_oauth_link_token';

function PlaidLinkButton({ linkToken, onSuccess, loading, s, autoOpen, receivedRedirectUri }) {
  const { open, ready } = usePlaidLink({
    token: linkToken,
    receivedRedirectUri,
    onSuccess: (public_token, metadata) => {
      try { localStorage.removeItem(OAUTH_RESUME_KEY); } catch {}
      onSuccess(public_token, metadata);
    },
    onExit: () => {
      try { localStorage.removeItem(OAUTH_RESUME_KEY); } catch {}
    }
  });

  // Auto-abrir si volvemos de OAuth redirect con un link token guardado
  useEffect(() => {
    if (autoOpen && ready) open();
  }, [autoOpen, ready, open]);

  return (
    <button
      className="btn-primary"
      onClick={() => {
        // Guardar el link_token antes de abrir, para poder reanudar tras OAuth redirect
        try { localStorage.setItem(OAUTH_RESUME_KEY, linkToken); } catch {}
        open();
      }}
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
  const [errorDetail, setErrorDetail] = useState(null);

  // Detectar si volvemos de un OAuth redirect (Chase, Capital One, Wells, etc.)
  const isOAuthResume = typeof window !== 'undefined' &&
    window.location.href.includes('?oauth_state_id=');
  const [resumeToken, setResumeToken] = useState(null);

  useEffect(() => {
    if (isOAuthResume) {
      try {
        const saved = localStorage.getItem(OAUTH_RESUME_KEY);
        if (saved) {
          setResumeToken(saved);
          setLinkToken(saved);
        }
      } catch {}
    }
  }, [isOAuthResume]);

  const getLinkToken = useCallback(async () => {
    setLoading(true);
    setErrorDetail(null);
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
        setErrorDetail(data);
        setStatus('error');
      }
    } catch (err) {
      console.error(err);
      setErrorDetail({ error: err.message });
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
            <p style={{ color: 'var(--danger)', textAlign: 'center', fontSize: 14, fontWeight: 600 }}>{s.bankError}</p>
            {errorDetail && (
              <div style={{
                background: 'rgba(255, 77, 109, 0.10)',
                border: '1px solid rgba(255, 77, 109, 0.3)',
                padding: 12,
                borderRadius: 10,
                fontSize: 11,
                lineHeight: 1.5,
                color: 'var(--text-mute)',
                fontFamily: 'monospace',
                wordBreak: 'break-word'
              }}>
                {errorDetail.error_code && <div><strong>Code:</strong> {errorDetail.error_code}</div>}
                {errorDetail.error_type && <div><strong>Type:</strong> {errorDetail.error_type}</div>}
                {errorDetail.env && <div><strong>Env:</strong> {errorDetail.env}</div>}
                <div><strong>Error:</strong> {errorDetail.error}</div>
                {errorDetail.detail && <div style={{ marginTop: 4 }}>{errorDetail.detail}</div>}
              </div>
            )}
            <button className="btn-primary" onClick={() => { setStatus(null); setLinkToken(null); setErrorDetail(null); }} style={{ width: '100%' }}>
              {s.retry}
            </button>
          </div>
        ) : linkToken ? (
          <PlaidLinkButton
            linkToken={linkToken}
            onSuccess={handleSuccess}
            loading={loading}
            s={s}
            autoOpen={!!resumeToken}
            receivedRedirectUri={resumeToken ? window.location.href : undefined}
          />
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
