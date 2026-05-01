import { useState } from 'react';
import { merchantLogo } from '../utils/merchantLogo.js';
import { CATEGORIES } from '../data/sampleData.js';

/**
 * Muestra el logo del comercio si existe.
 * Si no, muestra el emoji de la categoría.
 */
export default function MerchantIcon({ merchant, category, size = 40 }) {
  const [errored, setErrored] = useState(false);
  const url = merchantLogo(merchant, 128);
  const cat = CATEGORIES[category] || CATEGORIES.otro;

  if (url && !errored) {
    return (
      <div style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: '#FFFFFF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        overflow: 'hidden',
        border: '1px solid var(--border-soft)'
      }}>
        <img
          src={url}
          alt={merchant}
          width={size * 0.65}
          height={size * 0.65}
          onError={() => setErrored(true)}
          style={{ objectFit: 'contain', display: 'block' }}
        />
      </div>
    );
  }

  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: cat.color + '22',
      color: cat.color,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      fontSize: size * 0.45
    }}>
      {cat.icon}
    </div>
  );
}
