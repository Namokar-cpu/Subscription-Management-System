export default function StatusBadge({ status }) {
  const normalized = String(status || 'unknown').toLowerCase().replaceAll('_', ' ');
  return <span className={`status-badge status-${normalized.replaceAll(' ', '-')}`}><i />{normalized}</span>;
}
