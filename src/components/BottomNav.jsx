import { Icon } from './icons.jsx';

export default function BottomNav({ active, onChange, onAdd, onMenu, onSection, currentSection }) {
  const items = [
    { id: 'dashboard', label: 'Inicio', icon: 'home', type: 'tab' },
    { id: 'credit', label: 'Crédito', icon: 'cards', type: 'section' },
    { id: 'add', label: '', icon: 'plus', type: 'action' },
    { id: 'accounts', label: 'Cuentas', icon: 'chart', type: 'tab' },
    { id: 'menu', label: 'Más', icon: 'menu', type: 'action' }
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

        const isActive = item.type === 'section'
          ? currentSection === item.id
          : (!currentSection && active === item.id);

        return (
          <button
            key={item.id}
            className={`nav-item ${isActive ? 'active' : ''}`}
            onClick={() => {
              if (item.type === 'section') {
                onSection(item.id);
              } else {
                onChange(item.id);
              }
            }}
          >
            <Icon name={item.icon} size={20} color={isActive ? 'var(--green)' : 'var(--text-dim)'} />
            <span style={{ color: isActive ? 'var(--green)' : undefined }}>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
