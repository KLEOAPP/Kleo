import { useState, useEffect } from 'react';
import { LogoMark, Icon } from './icons.jsx';
import { useI18n } from '../i18n/index.jsx';

export default function PinScreen({ mode, verifyAsync, onComplete, onCancel, userName }) {
  // mode: 'create' | 'verify'
  const { strings: s } = useI18n();
  const [pin, setPin] = useState('');
  const [step, setStep] = useState(mode === 'create' ? 'create' : 'verify');
  const [firstPin, setFirstPin] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    if (pin.length === 6) {
      handleSubmit();
    }
  }, [pin]);

  const handleSubmit = async () => {
    await new Promise(r => setTimeout(r, 150));
    if (step === 'create') {
      setFirstPin(pin);
      setStep('confirm');
      setPin('');
    } else if (step === 'confirm') {
      if (pin === firstPin) {
        onComplete(pin);
      } else {
        setError(true);
        setTimeout(() => {
          setPin('');
          setError(false);
          setStep('create');
          setFirstPin('');
        }, 600);
      }
    } else if (step === 'verify') {
      const ok = await verifyAsync(pin);
      if (ok) {
        onComplete(pin);
      } else {
        setError(true);
        setTimeout(() => {
          setPin('');
          setError(false);
        }, 600);
      }
    }
  };

  const press = (digit) => {
    if (pin.length < 6) {
      setPin(pin + digit);
    }
  };

  const erase = () => {
    setPin(pin.slice(0, -1));
  };

  const titles = {
    create: s.createPin,
    confirm: s.confirmPin,
    verify: userName ? s.helloUser.replace('{name}', userName.split(' ')[0]) : s.enterPin
  };

  const subtitles = {
    create: s.pinSubCreate,
    confirm: s.pinSubConfirm,
    verify: error ? s.pinIncorrect : s.pinSubVerify
  };

  return (
    <div className="screen-no-nav" style={{ paddingTop: 70 }}>
      <div className="col" style={{ alignItems: 'center', gap: 16, marginBottom: 12 }}>
        <LogoMark size={56} />
      </div>

      <div className="col" style={{ alignItems: 'center', flex: 1, gap: 8 }}>
        <h2 className="h2" style={{ marginTop: 24 }}>{titles[step]}</h2>
        <p className="label" style={{ color: error ? 'var(--danger)' : 'var(--text-mute)' }}>
          {subtitles[step]}
        </p>

        <div className="pin-dots" style={error ? { animation: 'shake .4s' } : {}}>
          {[0,1,2,3,4,5].map(i => (
            <div
              key={i}
              className={`pin-dot ${pin.length > i ? 'filled' : ''}`}
              style={error ? { borderColor: 'var(--danger)', background: pin.length > i ? 'var(--danger)' : 'transparent' } : {}}
            />
          ))}
        </div>

        <div className="keypad" style={{ marginTop: 'auto' }}>
          {[1,2,3,4,5,6,7,8,9].map(n => (
            <button key={n} className="keypad-key" onClick={() => press(String(n))}>{n}</button>
          ))}
          <div className="keypad-key empty"></div>
          <button className="keypad-key" onClick={() => press('0')}>0</button>
          <button className="keypad-key" onClick={erase} style={{ fontSize: 20 }}>⌫</button>
        </div>

        {onCancel && (
          <button className="btn-ghost" style={{ marginTop: 16 }} onClick={onCancel}>
            {s.cancel}
          </button>
        )}
      </div>
    </div>
  );
}
