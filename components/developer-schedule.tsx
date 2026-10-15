"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
import { CalendarDays, LoaderCircle } from "lucide-react";
import type { ScheduleItem } from "@/lib/schedule/project";
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
}: {
  items: ScheduleItem[];
  now: string;
}) {
  const [attempt, setAttempt] = useState(0);
  const tentative = items.filter((item) => item.tentative).length;
  return (
    <div className="schedule-page">
      <p className="schedule-summary field-hint">
        {items.length} milestones · {tentative} tentative ranges · UTC. Select a
        milestone for its description and delivery window.
        {tentative > 0 && (
          <span className="schedule-estimate-note">
            Tentative dates estimate sequential work from today and may shift
            until work starts. Calendar views never change agreed deadlines.
          </span>
        )}
      </p>
      {items.length ? (
        <section
          className="editor-section schedule-calendar"
          aria-label="Work calendar"
        >
          <CalendarBoundary
            key={attempt}
            retry={() => setAttempt((value) => value + 1)}
          >
            <Calendar key={now} items={items} now={now} />
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
    </div>
  );
}
