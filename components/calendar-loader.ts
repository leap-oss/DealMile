let calendarModule: Promise<typeof import("./schedule-calendar")> | undefined;
/** Load the heavy SDK on Schedule intent, and reuse the request when the view mounts. */
export function loadScheduleCalendar() {
  calendarModule ??= import("./schedule-calendar").catch((error) => {
    calendarModule = undefined;
    throw error;
  });
  return calendarModule;
}
