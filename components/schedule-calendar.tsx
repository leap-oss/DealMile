"use client";
import { useMemo, useRef } from "react";
import {
  BryntumCalendar,
  BryntumCalendarProjectModel,
  type BryntumCalendarProps,
  type BryntumCalendarProjectModelProps,
} from "@bryntum/calendar-react";
import "@bryntum/calendar/stockholm-light.css";
import "@bryntum/calendar/calendar.css";
import "@bryntum/calendar/fontawesome/css/fontawesome.css";
import "@bryntum/calendar/fontawesome/css/solid.css";
import { StringHelper } from "@bryntum/calendar";
import {
  calendarEvents,
  scheduleDate,
  workLabel,
  type ScheduleItem,
} from "@/lib/schedule/project";
export default function ScheduleCalendar({
  items,
  now,
}: {
  items: ScheduleItem[];
  now: string;
}) {
  const project = useRef<BryntumCalendarProjectModel>(null);
  const projectConfig = useMemo<BryntumCalendarProjectModelProps>(
    () => ({ events: calendarEvents(items, new Date(now).getTime()) }),
    [items, now],
  );
  const config = useMemo<BryntumCalendarProps>(
    () => ({
      project,
      readOnly: true,
      date: new Date(now),
      timeZone: "UTC",
      height: "clamp(580px, 76dvh, 880px)",
      sidebar: false,
      mode: "month",
      modes: {
        day: false,
        week: true,
        month: { showWeekColumn: false, showWeekNumber: false },
        year: false,
        agenda: true,
      },
      eventTooltipFeature: {
        showOn: "click",
        tooltip: {
          cls: "dealmile-event-tip",
          maxWidth: "min(420px, calc(100vw - 32px))",
          maxHeight: "min(560px, calc(100dvh - 32px))",
        },
        titleRenderer: (record) => {
          const item = items.find((i) => i.id === String(record.id));
          return StringHelper.encodeHtml(item?.title ?? record.name);
        },
        renderer: async ({ eventRecord }) => {
          const item = items.find((i) => i.id === String(eventRecord.id));
          if (!item) return "";
          const encode = StringHelper.encodeHtml;
          const windowLabel = item.tentative
            ? item.dueAt
              ? "Estimated start · confirmed deadline"
              : "Tentative · subject to agreement and project readiness"
            : "Confirmed delivery window";
          const href = `/developer/projects/${encodeURIComponent(item.projectId)}#milestone-${encodeURIComponent(item.id)}`;
          return `<div class="schedule-event-details">
            <p class="schedule-event-project">${encode(item.projectName)}${item.additionalScope ? " · Additional scope" : ""}</p>
            <p class="schedule-event-status">${encode(workLabel(item, Date.parse(now)))}</p>
            <p class="schedule-event-description">${encode(item.description)}</p>
            <dl><div><dt>Delivery window</dt><dd>${scheduleDate(item.startAt)} – ${scheduleDate(item.endAt)} · UTC</dd></div></dl>
            <p class="schedule-event-note">${windowLabel}</p>
            <a class="schedule-event-link" href="${encode(href)}">Open milestone</a>
          </div>`;
        },
      },
      eventEditFeature: false,
      eventMenuFeature: false,
      scheduleMenuFeature: false,
      dragFeature: false,
      eventCopyPasteFeature: false,
    }),
    [items, now],
  );
  return (
    <div className="dealmile-calendar">
      <BryntumCalendarProjectModel ref={project} {...projectConfig} />
      <BryntumCalendar {...config} />
    </div>
  );
}
