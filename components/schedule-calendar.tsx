"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

const toLocalCalendarDate = (iso: string) => `${iso.slice(0, 10)}T00:00:00`;

function localizeEvent<T extends { startDate: string; endDate: string }>(
  event: T,
): T {
  return {
    ...event,
    startDate: toLocalCalendarDate(event.startDate),
    endDate: toLocalCalendarDate(event.endDate),
  };
}

export default function ScheduleCalendar({
  items,
  now,
  clientView = false,
}: {
  items: ScheduleItem[];
  now: string;
  clientView?: boolean;
}) {
  const project = useRef<BryntumCalendarProjectModel>(null);
  const calendar = useRef<BryntumCalendar>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [visibleMode, setVisibleMode] = useState("month");
  const selectedId = useRef<string | null>(null);
  const fullEvents = useMemo(
    () => calendarEvents(items, Date.parse(now)).map(localizeEvent),
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
    () =>
      new Map(
        calendarEvents(items, Date.parse(now)).map((event) => [
          event.id,
          localizeEvent(deadlineMarker(event)),
        ]),
      ),
    [items, now],
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
    setExpandedId(null);
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
        setExpandedId(id);
        setActiveId(id);
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
    [eventsById, clearRange],
  );
  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      const btn = (event.target as HTMLElement | null)?.closest<HTMLElement>(
        "[data-range-toggle]",
      );
      if (!btn) return;
      const id = btn.dataset.rangeToggle;
      if (!id) return;
      event.preventDefault();
      if (selectedId.current === id) {
        clearRange();
        btn.textContent = "Show delivery range on calendar";
      } else {
        void revealRange(id);
        btn.textContent = "Hide delivery range";
      }
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [clearRange, revealRange]);

  const activeItem = activeId ? itemsById.get(activeId) : null;
  const expandedItem = expandedId ? itemsById.get(expandedId) : null;

  const config = useMemo<BryntumCalendarProps>(
    () => ({
      project,
      readOnly: true,
      date: new Date(toLocalCalendarDate(now)),
      height: "auto",
      sidebar: false,
      mode: "month",
      viewContainer: {
        height: 680,
        flex: 1,
        width: "100%",
        layout: { animateCardChange: false },
      },
      eventRenderer: ({
        eventRecord,
      }: {
        eventRecord: { id: string | number; name: string };
      }) => {
        const item = itemsById.get(String(eventRecord.id));
        const encode = StringHelper.encodeHtml;
        if (!item) return encode(eventRecord.name);
        const prefix = item.tentative
          ? `<span class="gcal-pill-badge">Tentative</span><span class="sr-only"> · </span>`
          : "";
        return `<span class="gcal-pill-body">${prefix}<strong class="gcal-pill-title">${encode(item.title)}</strong><span class="gcal-pill-project"> · ${encode(item.projectName)}</span></span>`;
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
        setActiveId(id);
      },
      onEventKeyDown: ({ domEvent, eventElement }) => {
        const key = (domEvent as KeyboardEvent).key;
        if (key === "Enter" || key === " ") {
          domEvent.preventDefault();
          domEvent.stopImmediatePropagation();
          eventElement.click();
        }
      },
      onScheduleClick: () => {
        clearRange();
        setActiveId(null);
      },
      onActiveItemChange: ({ source }) => {
        const wasMonth = presentationMode.current === "month";
        const isMonth = source.mode === "month";
        presentationMode.current = source.mode;
        const store = project.current?.instance.eventStore;
        if (store && wasMonth !== isMonth) {
          store.beginBatch();
          try {
            clearRange();
            setActiveId(null);
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
          scrollable: true,
          scrollAction: "realign",
          hideDelay: false,
          hideOnDelegateChange: false,
          maxWidth: "min(420px, calc(100vw - 24px))",
          maxHeight: "min(480px, calc(100dvh - 24px))",
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
          const href = `${clientView ? "/projects" : "/developer/projects"}/${encodeURIComponent(item.projectId)}#milestone-${encodeURIComponent(item.id)}`;
          const isExpanded = selectedId.current === item.id;
          const showRangeToggle = presentationMode.current === "month";
          return `<div class="schedule-event-details">
            <p class="schedule-event-project">${encode(item.projectName)}${item.additionalScope ? " · Additional scope" : ""}</p>
            <p class="schedule-event-status">${encode(workLabel(item, Date.parse(now)))}</p>
            <p class="schedule-event-description">${encode(item.description)}</p>
            <dl><div><dt>Delivery window</dt><dd>${scheduleDate(item.startAt)} – ${scheduleDate(item.endAt)} · UTC</dd></div></dl>
            <p class="schedule-event-note">${windowLabel}</p>
            <div class="schedule-event-actions">
              <a class="schedule-event-link" href="${encode(href)}">Open milestone</a>
              ${
                showRangeToggle
                  ? `<button type="button" class="schedule-event-range-btn" data-range-toggle="${encode(item.id)}">${isExpanded ? "Hide delivery range" : "Show delivery range on calendar"}</button>`
                  : ""
              }
            </div>
          </div>`;
        },
      },
      eventEditFeature: false,
      eventMenuFeature: false,
      scheduleMenuFeature: false,
      dragFeature: false,
      eventCopyPasteFeature: false,
    }),
    [itemsById, markersById, tintDays, now, fullEvents, clearRange, clientView],
  );
  return (
    <div className="dealmile-calendar">
      <div className="schedule-range-controls" data-mode={visibleMode}>
        <p role="status">
          {visibleMode === "month"
            ? expandedItem
              ? `Showing full delivery range for ${expandedItem.title} (${scheduleDate(expandedItem.startAt)} – ${scheduleDate(expandedItem.endAt)} · UTC).`
              : activeItem
                ? `Selected: ${activeItem.title} · ${activeItem.projectName} (${scheduleDate(activeItem.startAt)} – ${scheduleDate(activeItem.endAt)} · UTC).`
                : "Milestones appear as markers on their deadline or estimated finish date. Click a marker to inspect details."
            : "This view shows full milestone delivery ranges."}
        </p>
        {visibleMode === "month" && (expandedItem || activeItem) && (
          <div className="schedule-range-buttons">
            {expandedItem ? (
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
            ) : (
              activeItem && (
                <Button
                  type="button"
                  variant="outline"
                  size="small"
                  onClick={() => void revealRange(activeItem.id)}
                >
                  Show delivery range
                </Button>
              )
            )}
          </div>
        )}
      </div>
      <BryntumCalendarProjectModel ref={project} {...projectConfig} />
      <BryntumCalendar ref={calendar} {...config} />
    </div>
  );
}
