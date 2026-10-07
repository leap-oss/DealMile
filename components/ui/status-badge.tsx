import { cn } from "@/lib/utils";

/** Presentation only: the caller supplies the authoritative workflow state. */
export function StatusBadge({
  status,
  className,
  children,
}: {
  status: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <span className={cn("status-badge", className)} data-status={status}>
      {children ?? status.replaceAll("_", " ").toLowerCase()}
    </span>
  );
}
