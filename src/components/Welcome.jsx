import { useState } from 'react';
import { Logo, Icon } from './icons.jsx';

export default function Welcome({ onLogin }) {
  const [loading, setLoading] = useState(null);

  const handle = async (provider) => {
    setLoading(provider);
    try {
      await onLogin(provider);
    } catch (err) {
      setLoading(null);
    }
  };

  return (
    <div className="screen-no-nav" style={{ justifyContent: 'space-between', paddingTop: 80 }}>
      <div className="col gap-20" style={{ alignItems: 'center', flex: 1, justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Logo size={120} />
        </div>
        <h1 className="h1 gradient-text" style={{ fontSize: 52, fontWeight: 800 }}>Kleo</h1>
        <p style={{ color: 'var(--text-mute)', textAlign: 'center', maxWidth: 280, fontSize: 16 }}>
          Tus finanzas personales en un solo lugar.<br/>Hecho para Puerto Rico.
        </p>
      </div>

      <div className="col gap-12" style={{ paddingBottom: 8 }}>
        <button className="btn-primary" onClick={() => handle('google')} disabled={loading}>
          {loading === 'google' ? (
            <span>Conectando…</span>
          ) : (
            <>
              <Icon name="google" size={20} />
              <span>Continuar con Google</span>
            </>
          )}
        </button>

        <button
          className="btn-secondary"
          style={{ background: '#fff', color: '#000', border: 'none' }}
          onClick={() => handle('apple')}
          disabled={loading}
        >
          {loading === 'apple' ? (
            <span>Conectando…</span>
          ) : (
            <>
              <Icon name="apple" size={20} color="#000" />
              <span style={{ fontWeight: 600 }}>Continuar con Apple</span>
            </>
          )}
        </button>

        <p className="tiny" style={{ textAlign: 'center', marginTop: 8, lineHeight: 1.5 }}>
          Al continuar aceptas nuestros<br/>
          <span style={{ color: 'var(--green)' }}>Términos</span> y <span style={{ color: 'var(--green)' }}>Política de Privacidad</span>
        </p>
      </div>
    </div>
  );
}
