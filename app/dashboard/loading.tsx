export default function Loading() {
  return (
    <div
      className="loading-workspace"
      role="status"
      aria-label="Loading workspace"
    >
      <div className="skeleton skeleton-title" />
      <div className="loading-stats">
        <div className="skeleton" />
        <div className="skeleton" />
        <div className="skeleton" />
      </div>
      <div className="skeleton skeleton-panel" />
      <span className="sr-only">Loading your workspace…</span>
    </div>
  );
}
