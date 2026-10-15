"use client";
import { useCallback, useMemo, useRef, useState } from "react";
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
import { Button } from "@/components/ui/button";
import { deadlineMarker, deliveryRange } from "@/lib/schedule/presentation";
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
  const calendar = useRef<BryntumCalendar>(null);
  const [selectedTitle, setSelectedTitle] = useState<string | null>(null);
  const [visibleMode, setVisibleMode] = useState("month");
  const selectedId = useRef<string | null>(null);
  const fullEvents = useMemo(
    () => calendarEvents(items, Date.parse(now)),
    [items, now],
  );
  const itemsById = useMemo(
    () => new Map(items.map((item) => [item.id, item])),
    [items],
  );
  const eventsById = useMemo(
    () => new Map(fullEvents.map((event) => [event.id, event])),
    [fullEvents],
  );
  const markersById = useMemo(
    () => new Map(fullEvents.map((event) => [event.id, deadlineMarker(event)])),
    [fullEvents],
  );
  const presentationMode = useRef("month");
  const projectConfig = useMemo<BryntumCalendarProjectModelProps>(
    () => ({ events: [...markersById.values()] }),
    [markersById],
  );
  const dayTones = useMemo(() => {
    const tones = new Map<string, string>();
    for (const [id, marker] of markersById) {
      const item = itemsById.get(id)!;
      const tone =
        workLabel(item, Date.parse(now)) === "Overdue"
          ? "overdue"
          : item.status === "COMPLETED"
            ? "completed"
            : item.paused
              ? "paused"
              : item.tentative
                ? "tentative"
                : "active";
      const day = marker.startDate.slice(0, 10);
      tones.set(
        day,
        tones.has(day) && tones.get(day) !== tone ? "mixed" : tone,
      );
    }
    return tones;
  }, [markersById, itemsById, now]);
  const tintDays = useCallback(
    (element: HTMLElement) => {
      for (const cell of element.querySelectorAll<HTMLElement>(
        ".b-calendar-cell[data-date]",
      )) {
        const tone = dayTones.get(cell.dataset.date!);
        if (tone) cell.dataset.scheduleTone = tone;
        else delete cell.dataset.scheduleTone;
      }
    },
    [dayTones],
  );
  const clearRange = useCallback(() => {
    const id = selectedId.current;
    const marker = id ? markersById.get(id) : undefined;
    if (marker)
      project.current?.instance.eventStore.getById(id!)?.set({
        ...deliveryRange(marker),
        cls: marker.cls,
      });
    selectedId.current = null;
    setSelectedTitle(null);
  }, [markersById]);
  const revealRange = useCallback(
    async (id: string) => {
      if (calendar.current?.instance.mode !== "month") return;
      const event = eventsById.get(id);
      const store = project.current?.instance.eventStore;
      if (!event || !store) return;
      if (selectedId.current === id) return;
      store.beginBatch();
      try {
        clearRange();
        selectedId.current = id;
        setSelectedTitle(itemsById.get(id)?.title ?? event.name);
        store.getById(id)?.set({
          ...deliveryRange(event),
          cls: `${event.cls} schedule-expanded-range`,
        });
      } finally {
        store.endBatch();
      }
      await project.current?.instance.commitAsync();
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve()),
      );
    },
    [eventsById, itemsById, clearRange],
  );
  const config = useMemo<BryntumCalendarProps>(
    () => ({
      project,
      readOnly: true,
      date: new Date(now),
      timeZone: "UTC",
      height: "auto",
      sidebar: false,
      mode: "month",
      viewContainer: {
        height: 680,
        flex: 1,
        width: "100%",
        layout: { animateCardChange: false },
      },
      modes: {
        day: false,
        week: true,
        month: {
          height: 680,
          sixWeeks: true,
          autoRowHeight: false,
          minRowHeight: 0,
          showWeekColumn: false,
          showWeekNumber: false,
          listeners: {
            paint: ({ source }: { source: { element: HTMLElement } }) =>
              tintDays(source.element),
            refresh: () => {
              const element =
                calendar.current?.instance.element.querySelector<HTMLElement>(
                  ".b-month-view",
                );
              if (element) tintDays(element);
            },
          },
        },
        year: false,
        agenda: true,
      },
      onEventClick: ({ eventRecord }) => {
        const id = String(eventRecord.id);
        if (
          calendar.current?.instance.mode !== "month" ||
          selectedId.current === id
        )
          return;
        // Let Bryntum open its card against the final, expanded event element.
        // Cancelling this first notification avoids anchoring to a removed cell.
        void revealRange(id).then(() => {
          if (selectedId.current !== id) return;
          calendar.current?.instance.element
            .querySelector<HTMLElement>(
              `.b-month-view .b-weeks-container .b-cal-event-wrap:not(.b-overflow)[data-event-id="${CSS.escape(id)}"]`,
            )
            ?.click();
        });
        return false;
      },
      onEventKeyDown: ({ domEvent, eventElement }) => {
        const key = (domEvent as KeyboardEvent).key;
        if (key === "Enter" || key === " ") {
          domEvent.preventDefault();
          domEvent.stopImmediatePropagation();
          eventElement.click();
        }
      },
      onScheduleClick: () => clearRange(),
      onActiveItemChange: ({ source }) => {
        const wasMonth = presentationMode.current === "month";
        const isMonth = source.mode === "month";
        presentationMode.current = source.mode;
        const store = project.current?.instance.eventStore;
        if (store && wasMonth !== isMonth) {
          store.beginBatch();
          try {
            clearRange();
            for (const event of fullEvents) {
              const record = store.getById(event.id);
              const presentation = isMonth ? markersById.get(event.id)! : event;
              record?.set({
                ...deliveryRange(presentation),
                cls: presentation.cls,
              });
            }
          } finally {
            store.endBatch();
          }
        }
        setVisibleMode(source.mode);
      },
      eventTooltipFeature: {
        showOn: "click",
        tooltip: {
          cls: "dealmile-event-tip",
          scrollAction: "realign",
          hideDelay: false,
          hideOnDelegateChange: false,
          maxWidth: "min(420px, calc(100vw - 32px))",
          maxHeight: "min(560px, calc(100dvh - 32px))",
        },
        titleRenderer: (record) => {
          const item = itemsById.get(String(record.id));
          return StringHelper.encodeHtml(item?.title ?? record.name);
        },
        renderer: ({ eventRecord }) => {
          const item = itemsById.get(String(eventRecord.id));
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
    [
      itemsById,
      markersById,
      tintDays,
      now,
      fullEvents,
      revealRange,
      clearRange,
    ],
  );
  return (
    <div className="dealmile-calendar">
      <div className="schedule-range-controls" data-mode={visibleMode}>
        <p role="status">
          {visibleMode === "month"
            ? selectedTitle
              ? `Showing the delivery range for ${selectedTitle}.`
              : "Milestones appear on their deadline or estimated finish date. Select a marker to reveal its delivery range."
            : "This view shows full milestone delivery ranges."}
        </p>
        {selectedTitle && (
          <Button
            type="button"
            variant="outline"
            size="small"
            onClick={() => {
              const id = selectedId.current;
              clearRange();
              if (id) {
                requestAnimationFrame(() => {
                  calendar.current?.instance.element
                    .querySelector<HTMLElement>(
                      `[data-event-id="${CSS.escape(id)}"]`,
                    )
                    ?.focus();
                });
              }
            }}
          >
            Hide delivery range
          </Button>
        )}
      </div>
      <BryntumCalendarProjectModel ref={project} {...projectConfig} />
      <BryntumCalendar ref={calendar} {...config} />
    </div>
  );
}
