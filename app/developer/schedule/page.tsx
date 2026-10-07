import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { WorkspaceShell } from "@/components/workspace-shell";
import { DeveloperSchedule } from "@/components/developer-schedule";
import { projectSchedule } from "@/lib/schedule/project";
export const metadata = { title: "Developer schedule" };
export default async function SchedulePage() {
  const user = await requireUser("DEVELOPER");
  const now = new Date();
  const projects = await db().project.findMany({
    where: {
      developerId: user.id,
      status: {
        in: [
          "PENDING_DEVELOPER_REVIEW",
          "DEVELOPER_REVIEW",
          "CLIENT_REVIEW",
          "AGREED",
          "ACTIVE",
          "COMPLETED",
        ],
      },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      paymentHold: true,
      milestones: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          estimatedDays: true,
          dueAt: true,
          change: { select: { status: true } },
          payments: {
            where: {
              verifiedAt: { not: null },
              paypalCaptureId: { not: null },
            },
            orderBy: { verifiedAt: "asc" },
            select: { verifiedAt: true, paypalCaptureId: true },
          },
        },
      },
    },
  });
  return (
    <WorkspaceShell user={user} active="schedule">
      <div className="dashboard-title">
        <div>
          <span className="eyebrow">YOUR WORK, IN VIEW</span>
          <h1>
            Schedule<span>.</span>
          </h1>
          <p>
            Milestone date ranges across your projects. All dates are shown in
            UTC.
          </p>
        </div>
      </div>
      <DeveloperSchedule
        now={now.toISOString()}
        items={projects.flatMap((p) => projectSchedule(p, now.getTime()))}
      />
    </WorkspaceShell>
  );
}
