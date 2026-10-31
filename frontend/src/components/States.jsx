export function Loading({ label = 'Loading your workspace…' }) {
  return <div className="state-card" role="status"><span className="spinner" />{label}</div>;
}

export function ErrorState({ error, onRetry }) {
  return <div className="notice notice-error" role="alert"><span>{error}</span>{onRetry && <button className="text-button" onClick={onRetry}>Try again</button>}</div>;
}

export function EmptyState({ title, detail, action }) {
  return <div className="empty-state"><span className="empty-icon"><i /></span><h3>{title}</h3><p>{detail}</p>{action}</div>;
}
