"use client";
import { useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
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
      height: 620,
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
        template: ({
          eventRecord,
        }: {
          eventRecord: { id: string | number };
        }) => {
          const item = items.find((i) => i.id === String(eventRecord.id));
          if (!item) return "";
          const encode = StringHelper.encodeHtml;
          return `<strong>${encode(item.title)}</strong><p>${encode(item.projectName)}</p><p>${scheduleDate(item.startAt)} – ${scheduleDate(item.endAt)} · UTC</p><p>${encode(workLabel(item, Date.parse(now)))}</p><p>${item.tentative ? (item.dueAt ? "Estimated start · confirmed deadline" : "Tentative · subject to agreement and project readiness") : "Confirmed delivery window"}</p>`;
        },
      },
      eventEditFeature: false,
      eventMenuFeature: false,
      scheduleMenuFeature: false,
      dragFeature: false,
      eventCopyPasteFeature: false,
      onEventClick: ({ eventRecord }) => {
        const item = items.find((i) => i.id === String(eventRecord.id));
        if (item)
          router.push(
            `/developer/projects/${item.projectId}#milestone-${item.id}`,
          );
      },
    }),
    [items, now, router],
  );
  return (
    <div className="dealmile-calendar">
      <BryntumCalendarProjectModel ref={project} {...projectConfig} />
      <BryntumCalendar {...config} />
    </div>
  );
}
