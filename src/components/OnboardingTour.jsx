import { useEffect, useState, useCallback, useRef } from 'react';
import { Icon } from './icons.jsx';

/**
 * Tour interactivo de la app — spotlight con popover.
 *
 * Cada step apunta a un elemento del DOM marcado con `data-tour="..."`.
 * El overlay bloquea TODO clic fuera del popover (incluso el target). El
 * usuario solo puede avanzar con los botones del popover.
 *
 * Diseño:
 *  - SVG mask con hueco rectangular redondeado en el target → spotlight
 *  - Anillo morado con glow alrededor del target
 *  - Popover flotante encima/debajo según haya espacio
 *  - Auto-scroll al target si está fuera del viewport
 *  - Re-mide en resize/scroll
 *
 * `steps` = [{ target: 'hero', title, body, ...}]
 *   Si target es null → popover centrado (intro/outro).
 */
export default function OnboardingTour({ steps, onComplete, onSkip }) {
  const [stepIdx, setStepIdx] = useState(0);
  const [rect, setRect] = useState(null);
  const step = steps[stepIdx];
  const isLast = stepIdx === steps.length - 1;
  const measureTimerRef = useRef(null);

  const measure = useCallback(() => {
    if (!step?.target) {
      setRect(null);
      return;
    }
    const el = document.querySelector(`[data-tour="${step.target}"]`);
    if (!el) {
      // Reintentar — el target puede estar montándose
      measureTimerRef.current = setTimeout(measure, 120);
      return;
    }
    const r = el.getBoundingClientRect();
    setRect({
      top: r.top, left: r.left, width: r.width, height: r.height,
      bottom: r.bottom, right: r.right
    });
  }, [step]);

  // Auto-scroll y medición al cambiar de paso
  useEffect(() => {
    clearTimeout(measureTimerRef.current);
    if (!step?.target) {
      setRect(null);
      return;
    }
    const el = document.querySelector(`[data-tour="${step.target}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    }
    // Esperar a que el scroll termine
    measureTimerRef.current = setTimeout(measure, 450);
    return () => clearTimeout(measureTimerRef.current);
  }, [stepIdx, measure]);

  // Re-mide en resize y scroll
  useEffect(() => {
    if (!step?.target) return;
    const onResize = () => measure();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
    };
  }, [step, measure]);

  // Bloquear scroll del body mientras el tour esté activo
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = original; };
  }, []);

  const next = () => isLast ? finish() : setStepIdx(i => i + 1);
  const back = () => setStepIdx(i => Math.max(0, i - 1));

  const finish = () => {
    try { localStorage.setItem('kleo_tutorial_completed', 'true'); } catch {}
    onComplete?.();
  };

  // Posición del popover: arriba o debajo del target, lo que tenga más espacio
  const popoverPos = computePopoverPosition(rect);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        pointerEvents: 'auto'
      }}
      onClick={(e) => {
        // Bloquear cualquier click que no sea sobre el popover
        e.stopPropagation();
      }}
    >
      {/* Overlay oscuro con hueco (spotlight) */}
      <svg
        width="100%" height="100%"
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      >
        <defs>
          <mask id="kleo-tour-mask">
            <rect width="100%" height="100%" fill="white" />
            {rect && (
              <rect
                x={Math.max(0, rect.left - 8)}
                y={Math.max(0, rect.top - 8)}
                width={rect.width + 16}
                height={rect.height + 16}
                rx={18} ry={18}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          width="100%" height="100%"
          fill="rgba(0, 0, 0, 0.82)"
          mask="url(#kleo-tour-mask)"
        />
      </svg>

      {/* Anillo morado pulsante alrededor del target */}
      {rect && (
        <div
          style={{
            position: 'absolute',
            top: rect.top - 8,
            left: rect.left - 8,
            width: rect.width + 16,
            height: rect.height + 16,
            borderRadius: 18,
            boxShadow: '0 0 0 2px #A855F7, 0 0 30px rgba(168, 85, 247, 0.7), 0 0 60px rgba(168, 85, 247, 0.4)',
            pointerEvents: 'none',
            animation: 'kleoTourPulse 2s ease-in-out infinite'
          }}
        />
      )}

      {/* Popover */}
      <div
        style={{
          position: 'absolute',
          ...popoverPos,
          width: 'calc(100% - 32px)',
          maxWidth: 380,
          background: 'var(--bg-card)',
          border: '1px solid rgba(168, 85, 247, 0.35)',
          borderRadius: 20,
          padding: 18,
          boxShadow: '0 12px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(168, 85, 247, 0.2)',
          animation: 'kleoTourPopIn .25s ease',
          pointerEvents: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Flecha pegada al target si existe */}
        {rect && popoverPos.arrow && (
          <div style={{
            position: 'absolute',
            ...popoverPos.arrow,
            width: 14, height: 14,
            background: 'var(--bg-card)',
            border: '1px solid rgba(168, 85, 247, 0.35)',
            transform: 'rotate(45deg)',
            zIndex: -1
          }} />
        )}

        {/* Header */}
        <div className="row gap-8 mb-10" style={{ alignItems: 'center' }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'var(--brand-grad)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0
          }}>
            <span style={{ fontSize: 20 }}>{step.emoji}</span>
          </div>
          <div className="col gap-2" style={{ flex: 1, minWidth: 0 }}>
            <span style={{
              fontSize: 9, fontWeight: 800, color: 'var(--text-mute)',
              textTransform: 'uppercase', letterSpacing: '0.06em'
            }}>
              Paso {stepIdx + 1} de {steps.length} · {step.tag}
            </span>
            <span style={{ fontSize: 16, fontWeight: 800, lineHeight: 1.2 }}>
              {step.title}
            </span>
          </div>
        </div>

        {/* Body */}
        <p style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 12 }}>
          {step.body}
        </p>

        {step.tip && (
          <div style={{
            background: 'rgba(0, 229, 176, 0.10)',
            border: '1px solid rgba(0, 229, 176, 0.3)',
            borderRadius: 10, padding: 10, marginBottom: 12
          }}>
            <div className="row gap-8" style={{ alignItems: 'flex-start' }}>
              <span style={{ fontSize: 14 }}>💡</span>
              <span style={{ fontSize: 11, lineHeight: 1.5 }}>{step.tip}</span>
            </div>
          </div>
        )}

        {/* Progress dots */}
        <div className="row gap-3 mb-12" style={{ alignItems: 'center' }}>
          {steps.map((_, i) => (
            <span key={i} style={{
              flex: 1, height: 3, borderRadius: 999,
              background: i <= stepIdx ? 'var(--brand-grad)' : 'var(--bg-elev)',
              opacity: i === stepIdx ? 1 : i < stepIdx ? 0.55 : 1
            }} />
          ))}
        </div>

        {/* Botones */}
        <div className="row gap-8">
          {stepIdx > 0 && (
            <button
              onClick={back}
              style={{
                flex: '0 0 auto', padding: '11px 14px',
                borderRadius: 10, background: 'var(--bg-elev)',
                fontWeight: 700, fontSize: 13
              }}
            >
              <Icon name="back" size={14} />
            </button>
          )}
          <button
            onClick={next}
            style={{
              flex: 1, padding: '11px 14px',
              borderRadius: 10, background: 'var(--brand-grad)',
              color: '#fff', fontWeight: 800, fontSize: 13,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              boxShadow: '0 4px 14px rgba(168, 85, 247, 0.4)'
            }}
          >
            <span>{isLast ? '✨ Empezar' : 'Siguiente'}</span>
            {!isLast && <Icon name="back" size={12} color="#fff" stroke={2.5} style={{ transform: 'rotate(180deg)' }} />}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes kleoTourPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.55; }
        }
        @keyframes kleoTourPopIn {
          from { opacity: 0; transform: translateY(8px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}

/**
 * Decide dónde poner el popover según el rect del target.
 * Si rect es null → centrado.
 * Si target arriba → popover abajo (con flecha hacia arriba).
 * Si target abajo → popover arriba (con flecha hacia abajo).
 */
function computePopoverPosition(rect) {
  if (typeof window === 'undefined') return { top: 100, left: 16 };

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const popMaxWidth = Math.min(380, vw - 32);
  const popLeft = (vw - popMaxWidth) / 2;

  if (!rect) {
    return {
      top: vh / 2 - 140,
      left: popLeft,
      arrow: null
    };
  }

  const padding = 16;
  const popHeight = 240; // estimado conservador
  const spaceAbove = rect.top;
  const spaceBelow = vh - rect.bottom;

  if (spaceBelow >= popHeight + padding || spaceBelow > spaceAbove) {
    // Popover debajo del target
    return {
      top: rect.bottom + 16,
      left: popLeft,
      arrow: {
        top: -7,
        left: Math.max(20, Math.min(popMaxWidth - 28, rect.left + rect.width / 2 - popLeft - 7)),
        borderRight: 'none',
        borderBottom: 'none'
      }
    };
  } else {
    // Popover encima del target
    return {
      bottom: vh - rect.top + 16,
      left: popLeft,
      arrow: {
        bottom: -7,
        left: Math.max(20, Math.min(popMaxWidth - 28, rect.left + rect.width / 2 - popLeft - 7)),
        borderLeft: 'none',
        borderTop: 'none'
      }
    };
  }
}
