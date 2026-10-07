"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarDays, LoaderCircle } from "lucide-react";
import {
  workLabel,
  scheduleDate,
  type ScheduleItem,
} from "@/lib/schedule/project";
import { CalendarBoundary } from "./calendar-boundary";
const Calendar = dynamic(() => import("./schedule-calendar"), {
  ssr: false,
  loading: () => (
    <p className="timeline-loading" role="status">
      <LoaderCircle className="spin" size={18} />
      Loading your calendar…
    </p>
  ),
});
export function DeveloperSchedule({
  items,
  now,
}: {
  items: ScheduleItem[];
  now: string;
}) {
  const [projectId, setProjectId] = useState("all");
  const [attempt, setAttempt] = useState(0);
  const projects = useMemo(
    () => Array.from(new Map(items.map((i) => [i.projectId, i.projectName]))),
    [items],
  );
  const filtered = useMemo(
    () => items.filter((i) => projectId === "all" || i.projectId === projectId),
    [items, projectId],
  );
  const tentative = filtered.filter((i) => i.tentative).length;
  return (
    <div className="schedule-page">
      <div className="schedule-controls form-field">
        <label htmlFor="schedule-project">Project</label>
        <select
          id="schedule-project"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
        >
          <option value="all">All projects</option>
          {projects.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
        <p className="field-hint">
          {filtered.length} milestones · {tentative} tentative ranges. Tentative
          dates estimate sequential work from today using milestone durations;
          they may shift until work starts. Changing the view never changes a
          deadline.
        </p>
      </div>
      {filtered.length ? (
        <section
          className="editor-section schedule-calendar"
          aria-label="Work calendar"
        >
          <CalendarBoundary
            key={`${projectId}-${attempt}`}
            retry={() => setAttempt((value) => value + 1)}
          >
            <Calendar
              key={JSON.stringify(filtered)}
              items={filtered}
              now={now}
            />
          </CalendarBoundary>
        </section>
      ) : (
        <section className="editor-section schedule-empty">
          <CalendarDays size={28} />
          <h2>No milestones to schedule yet</h2>
          <p>
            Submitted projects and their milestones appear here, including
            tentative work.
          </p>
        </section>
      )}
      <section className="editor-section">
        <h2>Work & deadlines</h2>
        <p className="field-hint">
          An accessible list of every milestone in the selected projects.
        </p>
        <div className="schedule-work-list">
          {filtered.length ? (
            filtered.map((item) => (
              <article
                key={item.id}
                id={`schedule-work-${item.id}`}
                className="schedule-work"
              >
                <div>
                  <span className="eyebrow">
                    {item.projectName}
                    {item.additionalScope ? " · Additional scope" : ""}
                  </span>
                  <h3>
                    <Link
                      href={`/developer/projects/${item.projectId}#milestone-${item.id}`}
                    >
                      {item.title}
                    </Link>
                  </h3>
                  <p>{item.description}</p>
                </div>
                <div>
                  <span className="status-badge">
                    {workLabel(item, new Date(now).getTime())}
                  </span>
                  <p>
                    <time dateTime={item.startAt}>
                      {scheduleDate(item.startAt)}
                    </time>
                    {" – "}
                    <time dateTime={item.endAt}>
                      {scheduleDate(item.endAt)}
                    </time>{" "}
                    · UTC
                  </p>
                  <p className="field-hint">
                    {item.tentative
                      ? item.dueAt
                        ? "Estimated start · confirmed deadline"
                        : "Tentative · subject to agreement and project readiness"
                      : "Confirmed delivery window"}
                  </p>
                </div>
              </article>
            ))
          ) : (
            <p>
              No projects to schedule yet. Submitted projects assigned to you
              will appear here.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
