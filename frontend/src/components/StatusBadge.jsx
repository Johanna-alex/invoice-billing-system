function StatusBadge({ status }) {
  const className = String(status || "").toLowerCase().replaceAll(" ", "-");
  return <span className={`status-badge ${className}`}>{status || "Unknown"}</span>;
}

export default StatusBadge;
