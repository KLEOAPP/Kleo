import { LogoMark, Icon } from './icons.jsx';

/**
 * Header pequeño con logo Kleo interactivo (vuelve al inicio).
 * Opcional: botón de back izquierda en lugar del logo, y menú a la derecha.
 */
export default function TopBar({ onHome, onBack, onMenu, title, accent }) {
  return (
    <div style={{
      position: 'sticky',
      top: 0,
      zIndex: 20,
      background: 'var(--bg)',
      paddingTop: 44,
      paddingBottom: 8,
      paddingLeft: 16,
      paddingRight: 16,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottom: '1px solid transparent',
      transition: 'border-color .2s'
    }}>
      <div className="row gap-10" style={{ minWidth: 0 }}>
        {onBack ? (
          <button
            onClick={onBack}
            style={{
              width: 32, height: 32,
              borderRadius: '50%',
              background: 'var(--bg-elev)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            <Icon name="back" size={16} />
          </button>
        ) : (
          <button
            onClick={onHome}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: 4,
              borderRadius: 8,
              transition: 'opacity .15s'
            }}
            className="pressable"
            aria-label="Inicio"
          >
            <LogoMark size={32} />
          </button>
        )}
        {title && (
          <span style={{
            fontSize: 17,
            fontWeight: 600,
            color: accent || 'var(--text)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {title}
          </span>
        )}
      </div>

      {onMenu && (
        <button
          onClick={onMenu}
          style={{
            width: 32, height: 32,
            borderRadius: '50%',
            background: 'var(--bg-elev)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          <Icon name="menu" size={16} />
        </button>
      )}
    </div>
  );
}
