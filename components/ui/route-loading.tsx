import { LoaderCircle } from "lucide-react";
export function RouteLoading({
  title = "Opening workspace…",
  description = "Loading your projects and next steps.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="route-loading" role="status" aria-busy="true">
      <div className="route-loading-message">
        <LoaderCircle size={20} className="spin" aria-hidden="true" />
        <div>
          <strong>{title}</strong>
          <p>{description}</p>
        </div>
      </div>
      <div className="route-loading-preview" aria-hidden="true">
        <div className="skeleton skeleton-title" />
        <div className="skeleton skeleton-panel" />
      </div>
    </div>
  );
}
