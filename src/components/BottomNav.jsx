import { Icon } from './icons.jsx';
import { useI18n } from '../i18n/index.jsx';

export default function BottomNav({ active, onChange, onAdd, onMenu }) {
  const { strings: s } = useI18n();

  return (
    <nav className="bottom-nav">
      <button
        className={`nav-item ${active === 'dashboard' ? 'active' : ''}`}
        onClick={() => onChange('dashboard')}
      >
        <Icon name="home" size={20} color={active === 'dashboard' ? 'var(--blue)' : 'var(--text-dim)'} />
        <span>{s.navHome}</span>
      </button>

      <button className="nav-item add-btn" onClick={onAdd}>
        <span className="add-circle">
          <Icon name="plus" size={24} color="#fff" stroke={3} />
        </span>
        <span style={{ marginTop: 4 }}>{s.navQuickAction}</span>
      </button>

      <button className="nav-item" onClick={onMenu}>
        <Icon name="more-horizontal" size={22} color="var(--text-dim)" />
        <span>{s.navMore}</span>
      </button>
    </nav>
  );
}
