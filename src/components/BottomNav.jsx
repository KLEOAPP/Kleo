import { Icon } from './icons.jsx';

export default function BottomNav({ active, onChange, onAdd, onMenu }) {
  const items = [
    { id: 'dashboard', label: 'Inicio', icon: 'home' },
    { id: 'accounts', label: 'Cuentas', icon: 'cards' },
    { id: 'add', label: '', icon: 'plus' },
    { id: 'goals', label: 'Metas', icon: 'target' },
    { id: 'menu', label: 'Más', icon: 'menu' }
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
              <span>Más</span>
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
