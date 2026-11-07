import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { WorkspaceShell } from "@/components/workspace-shell";
import { ProfileForm } from "@/components/profile-form";
import { PendingLink as Link } from "@/components/ui/pending-link";
import { ArrowUpRight, CalendarDays, LayoutDashboard } from "lucide-react";
export const metadata = { title: "Account" };
export default async function Page() {
  const user = await requireUser();
  const where =
    user.role === "CLIENT"
      ? { clientId: user.id }
      : {
          developerId: user.id,
          status: {
            notIn: [
              "DRAFT",
              "AI_PLANNING",
            ] as import("@prisma/client").ProjectStatus[],
          },
        };
  const [totalProjects, activeProjects, completedProjects] = await Promise.all([
    db().project.count({ where }),
    db().project.count({
      where: { ...where, status: { in: ["AGREED", "ACTIVE"] } },
    }),
    db().project.count({ where: { ...where, status: "COMPLETED" } }),
  ]);
  return (
    <WorkspaceShell user={user} active="settings">
      <span className="eyebrow">YOUR WORKSPACE, YOUR DETAILS</span>
      <div className="dashboard-title">
        <div>
          <h1>
            Account<span>.</span>
          </h1>
          <p>Your identity in every project agreement.</p>
        </div>
      </div>
      <section className="account-panel">
        <h2>Profile details</h2>
        <dl>
          <div>
            <dt>Full name</dt>
            <dd>{user.name}</dd>
          </div>
          <div>
            <dt>Email address</dt>
            <dd>{user.email}</dd>
          </div>
          <div>
            <dt>Account role</dt>
            <dd>{user.role === "CLIENT" ? "Client" : "Developer"}</dd>
          </div>
          <div>
            <dt>Member since</dt>
            <dd>
              {user.createdAt.toLocaleDateString("en-US", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </dd>
          </div>
          <div>
            <dt>Agreement activity</dt>
            <dd>
              {totalProjects} total · {activeProjects} active ·{" "}
              {completedProjects} completed
            </dd>
          </div>
        </dl>
        <ProfileForm currentName={user.name} />
        <div className="work-buttons" style={{ marginTop: 20 }}>
          <Link
            href={user.role === "CLIENT" ? "/dashboard" : "/developer"}
            className="button button-outline button-small"
          >
            <LayoutDashboard size={15} /> Go to overview
          </Link>
          <Link
            href={
              user.role === "DEVELOPER" ? "/developer/schedule" : "/schedule"
            }
            preloadCalendar
            className="button button-outline button-small"
          >
            <CalendarDays size={15} /> View schedule <ArrowUpRight size={14} />
          </Link>
        </div>
      </section>
    </WorkspaceShell>
  );
}
