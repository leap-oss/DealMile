import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { WorkspaceShell } from "@/components/workspace-shell";
import { DeveloperSchedule } from "@/components/developer-schedule";
import { projectSchedule } from "@/lib/schedule/project";
export const metadata = { title: "Project schedule" };
export default async function ClientSchedulePage() {
  const user = await requireUser("CLIENT");
  const now = new Date();
  const projects = await db().project.findMany({
    where: {
      clientId: user.id,
      status: {
        notIn: ["REJECTED", "CANCELLED"],
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
          <span className="eyebrow">YOUR AGREEMENTS, IN VIEW</span>
          <h1>
            Schedule<span>.</span>
          </h1>
          <p>
            Milestone delivery windows and tentative forecasts across your
            projects. All dates are shown in UTC.
          </p>
        </div>
      </div>
      <DeveloperSchedule
        now={now.toISOString()}
        clientView
        items={projects.flatMap((p) => projectSchedule(p, now.getTime()))}
      />
    </WorkspaceShell>
  );
}
