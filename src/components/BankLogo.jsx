import { useState } from 'react';
import { getBankLogo } from '../utils/bankLogos.js';

/**
 * Logo del banco / emisor.
 * Intenta cargar el logo oficial vía Clearbit; si falla, muestra iniciales con el color de marca.
 */
export default function BankLogo({ institution, size = 36, radius = 10, style }) {
  const logo = getBankLogo(institution || '');
  const [imgFailed, setImgFailed] = useState(false);
  const showImage = logo.url && !imgFailed;

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
          src={logo.url}
          alt={logo.name}
          width={size}
          height={size}
          onError={() => setImgFailed(true)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            padding: size * 0.1
          }}
        />
      ) : (
        logo.initials
      )}
    </div>
  );
}
