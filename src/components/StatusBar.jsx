import { Icon } from './icons.jsx';

export default function StatusBar() {
  const time = new Date().toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: false
  });
  return (
    <div className="status-bar">
      <span>{time}</span>
      <div className="status-icons">
        <Icon name="signal" size={14} />
        <Icon name="wifi" size={14} />
        <Icon name="battery" size={20} stroke={1.5} />
      </div>
    </div>
  );
}
