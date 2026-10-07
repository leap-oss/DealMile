import {
  ArrowUpRight,
  CircleCheck,
  FileText,
  FolderOpen,
  Handshake,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { db } from "@/lib/db";
import { WorkspaceShell } from "@/components/workspace-shell";
import { StatusBadge } from "@/components/ui/status-badge";
import type { Role } from "@prisma/client";
import {
  deliveryTiming,
  recordDeliveryReminders,
  getDeliveryAlerts,
} from "@/lib/delivery/service";
export async function Dashboard({
  user,
}: {
  user: { id: string; name: string; role: Role };
}) {
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
  const projects = await db().project.findMany({
    where,
    select: { id: true, name: true, status: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
    take: 20,
  });
  await recordDeliveryReminders(projects.map((p) => p.id));
  const reminders = await getDeliveryAlerts(user);
  const [active, pending, completed] = await Promise.all([
    db().project.count({
      where: { ...where, status: { in: ["AGREED", "ACTIVE"] } },
    }),
    db().project.count({
      where: {
        ...where,
        status: {
          in: ["PENDING_DEVELOPER_REVIEW", "DEVELOPER_REVIEW", "CLIENT_REVIEW"],
        },
      },
    }),
    db().project.count({ where: { ...where, status: "COMPLETED" } }),
  ]);
  return (
    <WorkspaceShell user={user}>
      <span className="eyebrow">LET’S MAKE GOOD WORK HAPPEN</span>
      <div className="dashboard-title">
        <div>
          <h1>
            Welcome, {user.name.split(" ")[0]}
            <span>.</span>
          </h1>
          <p>
            {user.role === "CLIENT"
              ? "A clear view of your projects and what comes next."
              : "Your agreements, your work, and your next milestone."}
          </p>
        </div>
        {user.role === "CLIENT" ? (
          <Link href="/projects/new" className="button button-primary">
            Start a project <ArrowUpRight size={16} />
          </Link>
        ) : (
          <span className="account-role">Developer workspace</span>
        )}
      </div>
      <div className="dashboard-stats">
        {[
          { label: "Active projects", value: active, icon: FolderOpen },
          { label: "Awaiting agreement", value: pending, icon: Handshake },
          { label: "Completed projects", value: completed, icon: CircleCheck },
        ].map((s) => (
          <article
            key={s.label}
            className={
              s.label === "Active projects" ? "stat-primary" : undefined
            }
          >
            <div>
              <span>{s.label}</span>
              <s.icon size={19} />
            </div>
            <strong>{s.value.toString().padStart(2, "0")}</strong>
          </article>
        ))}
      </div>
      <section className="projects-panel">
        {!!reminders.length && (
          <section
            className="delivery-reminders"
            aria-label="Delivery reminders"
          >
            <h2>Delivery needs attention</h2>
            {reminders.map((m) => (
              <Link
                key={m.id}
                href={
                  user.role === "CLIENT"
                    ? `/projects/${m.projectId}`
                    : `/developer/projects/${m.projectId}`
                }
              >
                <span>
                  <strong>{m.title}</strong>
                  <small>
                    {m.project.name} ·{" "}
                    {m.project.paymentHold
                      ? "Delivery case open"
                      : "Review delivery or request an extension"}
                  </small>
                </span>
                <span
                  className={`delivery-label ${deliveryTiming(m.status, m.dueAt)?.toLowerCase()}`}
                >
                  {deliveryTiming(m.status, m.dueAt) === "OVERDUE"
                    ? "Overdue"
                    : "Due within 48 hours"}
                </span>
              </Link>
            ))}
          </section>
        )}
        <div className="panel-heading">
          <h2>
            Your projects <span>{projects.length}</span>
          </h2>
          <span>Latest activity first</span>
        </div>
        {projects.length ? (
          <div>
            {projects.map((p) => (
              <Link
                href={
                  user.role === "CLIENT"
                    ? `/projects/${p.id}`
                    : `/developer/projects/${p.id}`
                }
                className="project-row"
                key={p.id}
              >
                <FileText size={20} />
                <strong>{p.name}</strong>
                <StatusBadge status={p.status} />
                <time dateTime={p.updatedAt.toISOString()}>
                  {p.updatedAt.toLocaleDateString("en-US")}
                </time>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <span className="empty-icon">
              <FolderOpen size={31} strokeWidth={1.3} />
            </span>
            <h3>A fresh start for your next project.</h3>
            <p>
              {user.role === "CLIENT"
                ? "Start a project and define your first agreement."
                : "Project requests from your clients will appear here."}
              <br />
              Clear scope. Shared expectations. A confident next step.
            </p>
            <Link
              href={user.role === "CLIENT" ? "/projects/new" : "/#how-it-works"}
              className="button button-outline"
            >
              {user.role === "CLIENT"
                ? "Create your first project"
                : "Explore the workflow"}{" "}
              <ArrowUpRight size={16} />
            </Link>
          </div>
        )}
      </section>
      <div className="workspace-tip">
        <ShieldCheck size={23} />
        <div>
          <strong>A shared plan makes all the difference.</strong>
          <p>
            Align on scope, pricing, and timeline before work begins. Every
            approval belongs to you.
          </p>
        </div>
      </div>
    </WorkspaceShell>
  );
}
