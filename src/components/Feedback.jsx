import { useState } from 'react';
import { Icon } from './icons.jsx';
import TopBar from './TopBar.jsx';
import { storage } from '../utils/storage.js';
import { useI18n } from '../i18n/index.jsx';

export default function Feedback({ user, onBack, onHome, onSubmit }) {
  const { strings: s } = useI18n();
  const [type, setType] = useState(null);
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const types = [
    { id: 'idea', icon: '💡', label: s.idea, color: 'var(--blue)', placeholder: s.ideaPlaceholder },
    { id: 'bug', icon: '🐛', label: s.bug, color: 'var(--danger)', placeholder: s.bugPlaceholder },
    { id: 'love', icon: '❤️', label: s.love, color: 'var(--pink)', placeholder: s.lovePlaceholder },
    { id: 'other', icon: '💬', label: s.other, color: 'var(--purple)', placeholder: s.otherPlaceholder }
  ];

  const handleSubmit = () => {
    const entry = {
      id: 'fb_' + Date.now(),
      type,
      message: message.trim(),
      rating,
      user: user?.email || 'anonymous',
      timestamp: new Date().toISOString()
    };
    const all = storage.get('feedback', []);
    all.push(entry);
    storage.set('feedback', all);
    setSubmitted(true);
    if (onSubmit) onSubmit(entry);
    setTimeout(() => { onBack(); }, 1800);
  };

  if (submitted) {
    return (
      <div className="screen" style={{ paddingTop: 0 }}>
        <TopBar onHome={onHome} onBack={onBack} title={s.thanksTitle} />
        <div className="col" style={{
          alignItems: 'center', justifyContent: 'center',
          flex: 1, gap: 16, padding: 40, textAlign: 'center'
        }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'rgba(0,181,137,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Icon name="check" size={48} color="var(--green)" stroke={3} />
          </div>
          <h2 className="h2">{s.thanksFeedback}</h2>
          <p style={{ color: 'var(--text-mute)', maxWidth: 280, lineHeight: 1.5 }}>{s.thanksDesc}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="screen" style={{ paddingTop: 0 }}>
      <TopBar onHome={onHome} onBack={onBack} title={s.suggestions} />

      <div style={{ padding: '12px 0' }}>
        <span style={{ fontSize: 13, color: 'var(--text-mute)', display: 'block', marginBottom: 16 }}>
          {s.yourOpinionMatters}
        </span>

        {!type && (
          <>
            <div className="section-header" style={{ margin: '0 0 8px' }}>
              <span>{s.whatIsItAbout}</span>
            </div>
            <div className="col gap-10">
              {types.map(t => (
                <button
                  key={t.id}
                  className="card row gap-12 pressable"
                  style={{ textAlign: 'left', padding: 16 }}
                  onClick={() => setType(t.id)}
                >
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: t.color + '22',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 22
                  }}>
                    {t.icon}
                  </div>
                  <span style={{ fontWeight: 600, fontSize: 15, flex: 1 }}>{t.label}</span>
                  <Icon name="back" size={14} color="var(--text-mute)" stroke={2} />
                </button>
              ))}
            </div>
          </>
        )}

        {type && (
          <>
            <div className="row gap-10 mb-16">
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: types.find(t => t.id === type).color + '22',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18
              }}>
                {types.find(t => t.id === type).icon}
              </div>
              <span style={{ fontWeight: 600, fontSize: 15, flex: 1 }}>
                {types.find(t => t.id === type).label}
              </span>
              <button
                onClick={() => { setType(null); setMessage(''); }}
                className="tiny"
                style={{ color: 'var(--blue)', fontWeight: 600 }}
              >
                {s.change}
              </button>
            </div>

            <div className="card mb-16">
              <span className="label" style={{ display: 'block', marginBottom: 12 }}>{s.rateKleo}</span>
              <div className="row gap-6" style={{ justifyContent: 'space-between' }}>
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    onClick={() => setRating(n)}
                    style={{
                      flex: 1,
                      padding: '12px 0',
                      borderRadius: 12,
                      background: rating === n ? 'var(--gradient)' : 'var(--bg-elev)',
                      color: rating === n ? '#fff' : 'var(--text)',
                      fontSize: 22,
                      transition: 'all .15s'
                    }}
                  >
                    {n <= rating ? '⭐' : '☆'}
                  </button>
                ))}
              </div>
              <span className="tiny" style={{ display: 'block', textAlign: 'center', marginTop: 8 }}>
                {rating === 0 ? s.tapStar :
                 rating === 5 ? s.loveIt :
                 rating >= 4 ? s.veryGood :
                 rating >= 3 ? s.itsOk :
                 rating >= 2 ? s.needsWork : s.dontLike}
              </span>
            </div>

            <div className="col gap-6">
              <span className="label">{s.tellMe}</span>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder={types.find(t => t.id === type).placeholder}
                rows={6}
                style={{
                  width: '100%',
                  padding: 14,
                  borderRadius: 12,
                  background: 'var(--bg-elev)',
                  border: 'none',
                  fontSize: 15,
                  fontFamily: 'inherit',
                  color: 'var(--text)',
                  resize: 'none',
                  outline: 'none',
                  lineHeight: 1.5
                }}
              />
            </div>

            <button
              className="btn-primary mt-20"
              disabled={!message.trim()}
              onClick={handleSubmit}
            >
              {s.sendSuggestion}
            </button>

            <p className="tiny mt-12" style={{ textAlign: 'center', lineHeight: 1.5 }}>
              {s.feedbackAnonymous.split('\n').map((line, i) => (
                <span key={i}>{line}{i === 0 ? <br /> : null}</span>
              ))}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
