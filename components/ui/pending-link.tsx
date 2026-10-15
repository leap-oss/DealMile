"use client";
import Link, { useLinkStatus } from "next/link";
import { LoaderCircle } from "lucide-react";
function LinkFeedback({ label }: { label: string }) {
  const { pending } = useLinkStatus();
  return (
    <span
      className={`link-feedback${pending ? " is-pending" : ""}`}
      role="status"
    >
      {pending && (
        <>
          <LoaderCircle size={14} className="spin" aria-hidden="true" />
          {label}
        </>
      )}
    </span>
  );
}
/** Next's pending state follows actual navigation, including slow server responses. */
export function PendingLink({
  children,
  pendingLabel = "Opening…",
  preloadCalendar = false,
  onMouseEnter,
  onFocus,
  onPointerDown,
  ...props
}: React.ComponentProps<typeof Link> & {
  pendingLabel?: string;
  preloadCalendar?: boolean;
}) {
  const preload = () => {
    if (preloadCalendar) {
      void import("@/components/calendar-loader")
        .then(({ loadScheduleCalendar }) => loadScheduleCalendar())
        .catch(() => {
          /* The calendar boundary offers retry if loading fails. */
        });
    }
  };
  return (
    <Link
      {...props}
      onMouseEnter={(event) => {
        onMouseEnter?.(event);
        preload();
      }}
      onPointerDown={(event) => {
        onPointerDown?.(event);
        preload();
      }}
      onFocus={(event) => {
        onFocus?.(event);
        preload();
      }}
    >
      {children}
      <LinkFeedback label={pendingLabel} />
    </Link>
  );
}
