export type ScheduleItem = {
  id: string;
  projectId: string;
  projectName: string;
  title: string;
  description: string;
  status: string;
  dueAt: string | null;
  startAt: string;
  endAt: string;
  tentative: boolean;
  paused: boolean;
  additionalScope: boolean;
};
const DAY = 86400000;
const midnight = (value: number) => Math.floor(value / DAY) * DAY;
export type ScheduleProject = {
  id: string;
  name: string;
  paymentHold: boolean;
  milestones: {
    id: string;
    title: string;
    description: string;
    status: string;
    estimatedDays: number;
    dueAt: Date | null;
    change: { status: string } | null;
    payments: { verifiedAt: Date | null; paypalCaptureId: string | null }[];
  }[];
};
/** Read-only forecast: never persists or replaces contractual delivery deadlines. */
export function projectSchedule(
  project: ScheduleProject,
  now: number,
): ScheduleItem[] {
  let cursor = midnight(now);
  return project.milestones
    .filter((m) => m.status !== "CANCELLED")
    .map((m) => {
      const duration = Math.max(1, m.estimatedDays) * DAY;
      const verifiedStart = m.payments.find(
        (p) => p.verifiedAt && p.paypalCaptureId,
      )?.verifiedAt;
      const end = m.dueAt?.getTime() ?? cursor + duration - 1;
      const start = m.dueAt
        ? (verifiedStart?.getTime() ?? end - duration)
        : cursor;
      cursor = Math.max(midnight(now), midnight(end) + DAY);
      return {
        id: m.id,
        projectId: project.id,
        projectName: project.name,
        title: m.title,
        description: m.description,
        status: m.status,
        dueAt: m.dueAt?.toISOString() ?? null,
        startAt: new Date(Math.min(start, end)).toISOString(),
        endAt: new Date(end).toISOString(),
        tentative: !m.dueAt || !verifiedStart,
        paused: project.paymentHold,
        additionalScope: m.change?.status === "APPROVED",
      };
    });
}
export function scheduleDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
export function workLabel(item: ScheduleItem, now = Date.now()) {
  if (item.status === "COMPLETED") return "Completed";
  if (item.paused) return "Paused · awaiting agreement";
  if (item.status === "SUBMITTED") return "Awaiting client review";
  if (["LOCKED", "AWAITING_PAYMENT"].includes(item.status))
    return "Awaiting project readiness";
  if (item.dueAt && new Date(item.dueAt).getTime() < now) return "Overdue";
  return item.status === "IN_PROGRESS" ? "In progress" : "Ready to start";
}
export function calendarEvents(items: ScheduleItem[], now = Date.now()) {
  return items
    .filter((item) => item.status !== "CANCELLED")
    .map((item) => {
      const startDate = new Date(
        midnight(Date.parse(item.startAt)),
      ).toISOString();
      const label = workLabel(item, now);
      return {
        id: item.id,
        name: `${item.tentative ? "Tentative · " : ""}${item.title} · ${item.projectName}`,
        cls: item.tentative ? "schedule-tentative" : "schedule-confirmed",
        startDate,
        endDate: new Date(midnight(Date.parse(item.endAt)) + DAY).toISOString(),
        allDay: true,
        eventColor:
          label === "Overdue"
            ? "#a52a27"
            : item.status === "COMPLETED"
              ? "#246b48"
              : item.paused
                ? "#6b685f"
                : "#3157d5",
      };
    });
}
