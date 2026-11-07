export function LoadingState({ label = "Loading data…" }) {
  return <div className="state-card"><span className="spinner" /><p>{label}</p></div>;
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="state-card error-state">
      <span className="state-icon">!</span>
      <div><strong>Something went wrong</strong><p>{message}</p></div>
      {onRetry && <button className="button secondary small" onClick={onRetry}>Try again</button>}
    </div>
  );
}

export function EmptyState({ title, message }) {
  return <div className="empty-state"><span className="empty-icon">◇</span><h3>{title}</h3><p>{message}</p></div>;
}
