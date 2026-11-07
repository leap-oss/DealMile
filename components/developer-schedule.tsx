"use client";
import dynamic from "next/dynamic";
import { useId, useMemo, useState } from "react";
import { CalendarDays, LoaderCircle } from "lucide-react";
import { workLabel, type ScheduleItem } from "@/lib/schedule/project";
import { Button } from "@/components/ui/button";
import "./schedule.css";
import { CalendarBoundary } from "./calendar-boundary";
import { loadScheduleCalendar } from "./calendar-loader";
const Calendar = dynamic(loadScheduleCalendar, {
  ssr: false,
  loading: () => (
    <p className="timeline-loading" role="status">
      <LoaderCircle className="spin" size={18} />
      Loading calendar controls…
    </p>
  ),
});
export function DeveloperSchedule({
  items,
  now,
  clientView = false,
  embedded = false,
}: {
  items: ScheduleItem[];
  now: string;
  clientView?: boolean;
  embedded?: boolean;
}) {
  const id = useId();
  const [attempt, setAttempt] = useState(0);
  const [projectFilter, setProjectFilter] = useState("all");
  const [stateFilter, setStateFilter] = useState("all");
  const nowMs = useMemo(() => Date.parse(now), [now]);
  const projectOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of items) {
      if (!map.has(item.projectId)) map.set(item.projectId, item.projectName);
    }
    return [...map.entries()];
  }, [items]);
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (projectFilter !== "all" && item.projectId !== projectFilter)
        return false;
      if (stateFilter === "confirmed")
        return !item.tentative && item.status !== "COMPLETED";
      if (stateFilter === "tentative") return item.tentative;
      if (stateFilter === "overdue")
        return workLabel(item, nowMs) === "Overdue";
      if (stateFilter === "completed") return item.status === "COMPLETED";
      return true;
    });
  }, [items, projectFilter, stateFilter, nowMs]);
  const tentative = filteredItems.filter((item) => item.tentative).length;
  const confirmed = filteredItems.filter(
    (item) => !item.tentative && item.status !== "COMPLETED",
  ).length;
  const overdue = filteredItems.filter(
    (item) => workLabel(item, nowMs) === "Overdue",
  ).length;
  const completed = filteredItems.filter(
    (item) => item.status === "COMPLETED",
  ).length;
  return (
    <div className="schedule-page">
      <p className="schedule-summary field-hint">
        {filteredItems.length} milestones · {tentative} tentative ranges · UTC.
        Select a milestone for its description and delivery window.
        {tentative > 0 && (
          <span className="schedule-estimate-note">
            Tentative dates estimate sequential work from today and may shift
            until work starts. Calendar views never change agreed deadlines.
          </span>
        )}
      </p>
      {items.length > 0 && (
        <div className="schedule-overview-strip" aria-label="Schedule summary">
          <div className="schedule-legend">
            <span className="schedule-chip" data-tone="active">
              <i aria-hidden="true" /> Confirmed ({confirmed})
            </span>
            <span className="schedule-chip" data-tone="tentative">
              <i aria-hidden="true" /> Tentative ({tentative})
            </span>
            <span className="schedule-chip" data-tone="completed">
              <i aria-hidden="true" /> Completed ({completed})
            </span>
            {overdue > 0 && (
              <span className="schedule-chip" data-tone="overdue">
                <i aria-hidden="true" /> Overdue ({overdue})
              </span>
            )}
          </div>
          {!embedded && (
            <div className="schedule-filters">
              {projectOptions.length > 1 && (
                <div className="form-field">
                  <label htmlFor={`${id}-project-filter`}>
                    Filter by project
                  </label>
                  <select
                    id={`${id}-project-filter`}
                    value={projectFilter}
                    onChange={(e) => setProjectFilter(e.target.value)}
                  >
                    <option value="all">
                      All projects ({projectOptions.length})
                    </option>
                    {projectOptions.map(([pid, name]) => (
                      <option key={pid} value={pid}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="form-field">
                <label htmlFor={`${id}-state-filter`}>
                  Filter by work status
                </label>
                <select
                  id={`${id}-state-filter`}
                  value={stateFilter}
                  onChange={(e) => setStateFilter(e.target.value)}
                >
                  <option value="all">All work states</option>
                  <option value="confirmed">Confirmed windows</option>
                  <option value="tentative">Tentative forecasts</option>
                  <option value="overdue">Overdue milestones</option>
                  <option value="completed">Completed milestones</option>
                </select>
              </div>
              {(projectFilter !== "all" || stateFilter !== "all") && (
                <Button
                  type="button"
                  variant="outline"
                  size="small"
                  onClick={() => {
                    setProjectFilter("all");
                    setStateFilter("all");
                  }}
                >
                  Reset filters
                </Button>
              )}
            </div>
          )}
        </div>
      )}
      {filteredItems.length ? (
        <section
          className="editor-section schedule-calendar"
          aria-label="Work calendar"
        >
          <CalendarBoundary
            key={attempt}
            retry={() => setAttempt((value) => value + 1)}
          >
            <Calendar
              key={`${now}:${projectFilter}:${stateFilter}`}
              items={filteredItems}
              now={now}
              clientView={clientView}
            />
          </CalendarBoundary>
        </section>
      ) : (
        <section className="editor-section schedule-empty">
          <CalendarDays size={28} />
          <h2>
            {items.length
              ? "No milestones match your schedule filter"
              : "No milestones to schedule yet"}
          </h2>
          <p>
            {items.length
              ? "Choose another project or work status filter to view scheduled milestones."
              : "Submitted projects and their milestones appear here, including tentative work."}
          </p>
        </section>
      )}
    </div>
  );
}
