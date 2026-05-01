import { useState, useCallback } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { Icon } from './icons.jsx';

function PlaidLinkButton({ linkToken, onSuccess, loading }) {
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
      {loading ? 'Conectando...' : '🏦 Conectar mi banco'}
    </button>
  );
}

export default function ConnectBank({ userId, onConnected, onClose }) {
  const [linkToken, setLinkToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null); // null, 'linking', 'success', 'error'
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
        {/* Header */}
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
            {status === 'success' ? '¡Conectado!' :
             status === 'linking' ? 'Conectando...' :
             'Conecta tu banco'}
          </h2>

          <p style={{ color: 'var(--text-mute)', maxWidth: 280, lineHeight: 1.5, fontSize: 14 }}>
            {status === 'success'
              ? `${result?.accountsLinked || 0} cuentas y ${result?.transactionsImported || 0} transacciones importadas`
              : status === 'linking'
              ? 'Importando tus cuentas y transacciones...'
              : 'Conecta tu cuenta bancaria para sincronizar automáticamente tus transacciones y balances.'
            }
          </p>
        </div>

        {/* Actions */}
        {status === 'success' ? (
          <button className="btn-primary" onClick={onClose} style={{ width: '100%' }}>
            Continuar
          </button>
        ) : status === 'error' ? (
          <div className="col gap-12">
            <p style={{ color: 'var(--danger)', textAlign: 'center', fontSize: 14 }}>
              Hubo un error al conectar. Intenta de nuevo.
            </p>
            <button className="btn-primary" onClick={() => { setStatus(null); setLinkToken(null); }} style={{ width: '100%' }}>
              Reintentar
            </button>
          </div>
        ) : linkToken ? (
          <PlaidLinkButton linkToken={linkToken} onSuccess={handleSuccess} loading={loading} />
        ) : (
          <button
            className="btn-primary"
            onClick={getLinkToken}
            disabled={loading}
            style={{ width: '100%' }}
          >
            {loading ? 'Preparando...' : '🏦 Conectar mi banco'}
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
          {status === 'success' ? '' : 'Ahora no'}
        </button>

        {/* Info */}
        {!status && (
          <div className="col gap-12 mt-20">
            <div className="card" style={{ background: 'var(--bg-elev)', border: 'none' }}>
              <div className="row gap-12">
                <span style={{ fontSize: 20 }}>🔒</span>
                <div className="col gap-2" style={{ flex: 1 }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>Seguro y encriptado</span>
                  <span className="tiny">Usamos Plaid, la misma tecnología que usan Venmo y Robinhood</span>
                </div>
              </div>
            </div>
            <div className="card" style={{ background: 'var(--bg-elev)', border: 'none' }}>
              <div className="row gap-12">
                <span style={{ fontSize: 20 }}>👁️</span>
                <div className="col gap-2" style={{ flex: 1 }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>Solo lectura</span>
                  <span className="tiny">Kleo nunca puede mover tu dinero, solo ver tus transacciones</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
