import { useState, useEffect } from 'react';
import { LogoMark, Icon } from './icons.jsx';
import { verifyBiometric, getBiometricType, checkBiometricSupport } from '../lib/biometric.js';
import { useI18n } from '../i18n/index.jsx';

export default function FaceIdScreen({ userName, userId, onSuccess, onUsePin }) {
  const { strings: s } = useI18n();
  const [status, setStatus] = useState('checking'); // checking, scanning, success, failed, unsupported
  const bioType = getBiometricType();

  useEffect(() => {
    startBiometric();
  }, []);

  const startBiometric = async () => {
    // Verificar si el dispositivo soporta biometría
    const supported = await checkBiometricSupport();
    if (!supported) {
      setStatus('unsupported');
      // Si no soporta biometría, ir directo al PIN
      setTimeout(onUsePin, 1000);
      return;
    }

    setStatus('scanning');

    try {
      const ok = await verifyBiometric(userId);
      if (ok) {
        setStatus('success');
        setTimeout(onSuccess, 600);
      } else {
        setStatus('failed');
      }
    } catch (err) {
      console.error('Biometric error:', err);
      setStatus('failed');
    }
  };

  return (
    <div className="screen-no-nav" style={{ paddingTop: 80 }}>
      <div className="col" style={{ alignItems: 'center', gap: 14 }}>
        <LogoMark size={52} />
        <h2 className="h2" style={{ marginTop: 8 }}>
          {userName ? s.helloUser.replace('{name}', userName.split(' ')[0]) : s.welcome}
        </h2>
        <p className="label">
          {status === 'checking' && s.verifyingDevice}
          {status === 'scanning' && s.useBioToUnlock.replace('{bioType}', bioType)}
          {status === 'success' && s.identityVerified}
          {status === 'failed' && s.bioNotRecognized.replace('{bioType}', bioType)}
          {status === 'unsupported' && s.bioUnavailable}
        </p>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="faceid-circle" style={{
          borderColor: status === 'success' ? 'var(--green)' : status === 'failed' ? 'var(--danger)' : 'var(--green)',
          background: status === 'success' ? 'rgba(0, 229, 176, 0.15)' :
                      status === 'failed' ? 'rgba(255, 59, 48, 0.1)' : 'var(--bg-elev)'
        }}>
          {status === 'success' ? (
            <Icon name="check" size={56} color="var(--green)" stroke={3} />
          ) : status === 'failed' ? (
            <Icon name="lock" size={56} color="var(--danger)" stroke={1.5} />
          ) : (
            <Icon name="faceid" size={64} color="var(--green)" stroke={1.5} />
          )}
        </div>
      </div>

      <div className="col gap-12" style={{ alignItems: 'center', paddingBottom: 16 }}>
        {status === 'failed' && (
          <button
            className="btn-primary"
            onClick={startBiometric}
            style={{ width: '100%', maxWidth: 280 }}
          >
            {s.retryBio.replace('{bioType}', bioType)}
          </button>
        )}
        <button className="btn-ghost" onClick={onUsePin} style={{ color: 'var(--green)', fontWeight: 600 }}>
          {s.usePin}
        </button>
      </div>
    </div>
  );
}
