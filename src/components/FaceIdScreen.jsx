import { useState, useEffect } from 'react';
import { LogoMark, Icon } from './icons.jsx';

export default function FaceIdScreen({ userName, onSuccess, onUsePin }) {
  const [scanning, setScanning] = useState(true);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setScanning(false);
      setSuccess(true);
      setTimeout(onSuccess, 600);
    }, 1800);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="screen-no-nav" style={{ paddingTop: 80 }}>
      <div className="col" style={{ alignItems: 'center', gap: 14 }}>
        <LogoMark size={52} />
        <h2 className="h2" style={{ marginTop: 8 }}>
          {userName ? `Hola, ${userName.split(' ')[0]}` : 'Bienvenido'}
        </h2>
        <p className="label">Mira al frente para desbloquear</p>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="faceid-circle" style={{
          borderColor: success ? 'var(--green)' : 'var(--green)',
          background: success ? 'rgba(0, 229, 176, 0.15)' : 'var(--bg-elev)'
        }}>
          {success ? (
            <Icon name="check" size={56} color="var(--green)" stroke={3} />
          ) : (
            <Icon name="faceid" size={64} color="var(--green)" stroke={1.5} />
          )}
        </div>
      </div>

      <div className="col gap-12" style={{ alignItems: 'center', paddingBottom: 16 }}>
        <p className="label" style={{ color: success ? 'var(--green)' : 'var(--text-mute)' }}>
          {scanning ? 'Escaneando…' : success ? 'Identidad verificada' : 'Toca para reintentar'}
        </p>
        <button className="btn-ghost" onClick={onUsePin} style={{ color: 'var(--green)', fontWeight: 600 }}>
          Usar PIN
        </button>
      </div>
    </div>
  );
}
