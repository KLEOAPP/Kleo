import { Icon } from './icons.jsx';

export default function BottomNav({ active, onChange, onAdd, onMenu }) {
  return (
    <nav className="bottom-nav">
      <button
        className={`nav-item ${active === 'dashboard' ? 'active' : ''}`}
        onClick={() => onChange('dashboard')}
      >
        <Icon name="home" size={20} color={active === 'dashboard' ? 'var(--blue)' : 'var(--text-dim)'} />
        <span>Inicio</span>
      </button>

      <button className="nav-item add-btn" onClick={onAdd}>
        <span className="add-circle">
          <Icon name="plus" size={22} color="#fff" stroke={3} />
        </span>
      </button>

      <button key="menu" className="nav-item" onClick={onMenu}>
        <Icon name="menu" size={20} color="var(--text-dim)" />
        <span>Más</span>
      </button>
    </nav>
  );
}
