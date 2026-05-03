import { getBankLogo } from '../utils/bankLogos.js';

/**
 * Logo del banco / emisor — iniciales con el color de marca.
 * Si el nombre no está en el mapa, genera iniciales y un color consistente.
 */
export default function BankLogo({ institution, size = 36, radius = 10, style }) {
  const logo = getBankLogo(institution || '');
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: logo.bg,
        color: logo.fg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: Math.max(10, size * 0.32),
        fontWeight: 800,
        letterSpacing: '-0.02em',
        flexShrink: 0,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        ...style
      }}
    >
      {logo.icon || logo.initials}
    </div>
  );
}
