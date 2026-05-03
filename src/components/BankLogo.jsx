import { useState } from 'react';
import { getBankLogo } from '../utils/bankLogos.js';

/**
 * Logo del banco / emisor.
 * Intenta cargar el logo oficial probando varias fuentes (Clearbit → Google → DuckDuckGo)
 * y cae a iniciales con el color de marca si todas fallan.
 */
export default function BankLogo({ institution, size = 36, radius = 10, style }) {
  const logo = getBankLogo(institution || '');
  const [urlIdx, setUrlIdx] = useState(0);
  const url = logo.urls?.[urlIdx];
  const showImage = !!url;

  const handleError = () => {
    if (urlIdx < (logo.urls?.length || 0) - 1) {
      setUrlIdx(urlIdx + 1);
    } else {
      // Marcar como totalmente fallido (índice fuera de rango)
      setUrlIdx(logo.urls?.length || 0);
    }
  };

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: showImage ? '#fff' : logo.bg,
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: Math.max(10, size * 0.32),
        fontWeight: 800,
        letterSpacing: '-0.02em',
        flexShrink: 0,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        overflow: 'hidden',
        ...style
      }}
    >
      {showImage ? (
        <img
          key={url}
          src={url}
          alt={logo.name}
          referrerPolicy="no-referrer"
          onError={handleError}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            padding: size * 0.08,
            display: 'block'
          }}
        />
      ) : (
        logo.initials
      )}
    </div>
  );
}
