import type { calendarEvents } from "./project";
type CalendarEvent = ReturnType<typeof calendarEvents>[number];
/** Explicit duration keeps Bryntum's engine from retaining a previous range length. */
export function deliveryRange(event: CalendarEvent) {
  return {
    startDate: event.startDate,
    endDate: event.endDate,
    duration:
      (Date.parse(event.endDate) - Date.parse(event.startDate)) / 86400000,
    durationUnit: "day" as const,
  };
}
/** A Month overview marker occupies the final UTC day; the source range stays intact. */
export function deadlineMarker(event: CalendarEvent) {
  return {
    ...event,
    duration: 1,
    durationUnit: "day" as const,
    startDate: new Date(Date.parse(event.endDate) - 86400000).toISOString(),
    cls: `${event.cls} schedule-date-marker`,
  };
}
