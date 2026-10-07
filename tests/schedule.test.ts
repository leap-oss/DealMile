import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calendarEvents,
  projectSchedule,
  type ScheduleProject,
  workLabel,
  type ScheduleItem,
} from "../lib/schedule/project";
const item: ScheduleItem = {
  id: "work",
  projectId: "project",
  projectName: "Website",
  title: "Authentication",
  description: "Implement auth",
  status: "IN_PROGRESS",
  dueAt: "2026-10-09T23:59:59Z",
  startAt: "2026-10-07T12:00:00Z",
  endAt: "2026-10-09T23:59:59Z",
  tentative: false,
  paused: false,
  additionalScope: false,
};
test("calendar displays full inclusive UTC ranges and tentative work", () => {
  const events = calendarEvents([
    item,
    { ...item, id: "future", dueAt: null, tentative: true },
    { ...item, status: "CANCELLED" },
  ]);
  assert.equal(events.length, 2);
  assert.equal(events[0].startDate, "2026-10-07T00:00:00.000Z");
  assert.equal(events[0].endDate, "2026-10-10T00:00:00.000Z");
  assert.equal(events[1].name, "Tentative · Authentication · Website");
});
const project: ScheduleProject = {
  id: "project",
  name: "Website",
  paymentHold: false,
  milestones: [
    {
      id: "first",
      title: "Build",
      description: "Build",
      status: "IN_PROGRESS",
      estimatedDays: 3,
      dueAt: new Date("2026-10-10T12:00:00Z"),
      change: null,
      payments: [
        {
          verifiedAt: new Date("2026-10-07T12:00:00Z"),
          paypalCaptureId: "capture",
        },
      ],
    },
    {
      id: "second",
      title: "Polish",
      description: "Polish",
      status: "LOCKED",
      estimatedDays: 2,
      dueAt: null,
      change: { status: "APPROVED" },
      payments: [],
    },
  ],
};
test("verified delivery window precedes sequential tentative milestone ranges", () => {
  const items = projectSchedule(project, Date.parse("2026-10-07"));
  assert.equal(items[0].tentative, false);
  assert.equal(items[0].startAt, "2026-10-07T12:00:00.000Z");
  assert.equal(items[0].endAt, "2026-10-10T12:00:00.000Z");
  assert.equal(items[1].startAt, "2026-10-11T00:00:00.000Z");
  assert.equal(items[1].endAt, "2026-10-12T23:59:59.999Z");
  assert.equal(items[1].tentative, true);
  assert.equal(items[1].additionalScope, true);
  assert.equal(project.milestones[1].dueAt, null);
});
test("extensions move forecast, overdue work does not backdate future work", () => {
  const extended = structuredClone(project);
  extended.milestones[0].dueAt = new Date("2026-10-15T12:00:00Z");
  assert.equal(
    projectSchedule(extended, Date.parse("2026-10-07"))[1].startAt,
    "2026-10-16T00:00:00.000Z",
  );
  assert.equal(
    projectSchedule(project, Date.parse("2026-10-20"))[1].startAt,
    "2026-10-20T00:00:00.000Z",
  );
});
test("unverified starts remain estimates and preagreement milestones appear sequentially", () => {
  const draft = structuredClone(project);
  draft.milestones[0].payments = [];
  assert.equal(
    projectSchedule(draft, Date.parse("2026-10-07"))[0].tentative,
    true,
  );
  draft.milestones[0].dueAt = null;
  const items = projectSchedule(draft, Date.parse("2026-10-07T22:00:00Z"));
  assert.equal(items[0].startAt, "2026-10-07T00:00:00.000Z");
  assert.equal(items[0].endAt, "2026-10-09T23:59:59.999Z");
  assert.equal(items[1].startAt, "2026-10-10T00:00:00.000Z");
  draft.milestones[0].status = "CANCELLED";
  assert.equal(projectSchedule(draft, Date.parse("2026-10-07")).length, 1);
});
test("work labels distinguish review and pause from overdue work", () => {
  const now = Date.parse("2026-10-11");
  assert.equal(workLabel(item, now), "Overdue");
  assert.equal(
    workLabel({ ...item, status: "SUBMITTED" }, now),
    "Awaiting client review",
  );
  assert.equal(
    workLabel({ ...item, paused: true }, now),
    "Paused · awaiting agreement",
  );
  assert.equal(
    workLabel({ ...item, status: "COMPLETED", paused: true }, now),
    "Completed",
  );
  assert.equal(
    workLabel({ ...item, status: "AWAITING_PAYMENT", dueAt: null }, now),
    "Awaiting project readiness",
  );
});
