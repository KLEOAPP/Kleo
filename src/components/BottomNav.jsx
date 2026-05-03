import { Icon } from './icons.jsx';
import { useI18n } from '../i18n/index.jsx';

export default function BottomNav({ active, onChange, onAdd, onMenu }) {
  const { strings: s } = useI18n();
  const items = [
    { id: 'dashboard', label: s.navHome, icon: 'home' },
    { id: 'add', label: '', icon: 'plus' },
    { id: 'kleoai', label: s.navKleoAi, icon: 'sparkle' },
    { id: 'menu', label: s.navMore, icon: 'menu' }
  ];

  return (
    <nav className="bottom-nav">
      {items.map(item => {
        if (item.id === 'add') {
          return (
            <button key="add" className="nav-item add-btn" onClick={onAdd}>
              <span className="add-circle">
                <Icon name="plus" size={22} color="#fff" stroke={3} />
              </span>
            </button>
          );
        }
        if (item.id === 'menu') {
          return (
            <button key="menu" className="nav-item" onClick={onMenu}>
              <Icon name="menu" size={20} color="var(--text-dim)" />
              <span>{s.navMore}</span>
            </button>
          );
        }
        return (
          <button
            key={item.id}
            className={`nav-item ${active === item.id ? 'active' : ''}`}
            onClick={() => onChange(item.id)}
          >
            <Icon name={item.icon} size={20} color={active === item.id ? 'var(--blue)' : 'var(--text-dim)'} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
