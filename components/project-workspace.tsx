import { PendingLink as Link } from "@/components/ui/pending-link";
import { milestoneNextStep, projectNextStep } from "@/lib/projects/next-step";
import { notFound } from "next/navigation";
import {
  Check,
  ChevronLeft,
  Clock3,
  LockKeyhole,
  Pencil,
  ShieldCheck,
} from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { WorkspaceShell } from "@/components/workspace-shell";
import { PayButton } from "@/components/payment-controls";
import { StatusBadge } from "@/components/ui/status-badge";
import { MilestoneControls } from "@/components/milestone-controls";
import { ScopeIntelligence } from "@/components/scope-intelligence";
import { ProjectActions } from "@/components/project-actions";
import { DeliveryFollowup } from "@/components/delivery-followup";
import { recordDeliveryReminders } from "@/lib/delivery/service";
import { ProjectCancellation } from "@/components/project-cancellation";
import ProjectLedgerGrid, {
  type LedgerMilestoneRow,
} from "@/components/project-ledger-grid";
import { projectSchedule } from "@/lib/schedule/project";
import { formatProjectCurrency, projectStatusLabel } from "@/lib/projects/list";

type RevisionSnapshot = {
  budget?: number;
  deadline?: string;
  scope?: string[];
  milestones?: {
    title?: string;
    description?: string;
    amount?: number;
    estimatedDays?: number;
  }[];
};

function RevisionSnapshotView({
  snapshot,
  currency,
}: {
  snapshot: unknown;
  currency: string;
}) {
  if (!snapshot || typeof snapshot !== "object") return null;
  const data = snapshot as RevisionSnapshot;
  const milestones = Array.isArray(data.milestones) ? data.milestones : [];
  const scope = Array.isArray(data.scope) ? data.scope : [];
  return (
    <div className="revision-snapshot-card">
      <div className="revision-snapshot-meta">
        {typeof data.budget === "number" && (
          <span>
            <strong>Budget:</strong>{" "}
            {formatProjectCurrency(data.budget, currency)}
          </span>
        )}
        {typeof data.deadline === "string" && (
          <span>
            <strong>Deadline:</strong> {data.deadline} · UTC
          </span>
        )}
        <span>
          <strong>Milestones:</strong> {milestones.length}
        </span>
      </div>
      {scope.length > 0 && (
        <ul className="revision-scope-list">
          {scope.map((item, idx) => (
            <li key={idx}>{String(item)}</li>
          ))}
        </ul>
      )}
      {milestones.length > 0 && (
        <div className="revision-milestones-list">
          {milestones.map((m, idx) => (
            <div key={idx} className="revision-milestone-row">
              <span>
                {String(idx + 1).padStart(2, "0")}. {m.title ?? "Milestone"}
              </span>
              <span>
                {m.estimatedDays ?? 1}d ·{" "}
                {formatProjectCurrency(Number(m.amount ?? 0), currency)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export async function ProjectWorkspace({
  id,
  developer = false,
}: {
  id: string;
  developer?: boolean;
}) {
  const user = await requireUser(developer ? "DEVELOPER" : "CLIENT");
  const project = await db().project.findFirst({
    where: {
      id,
      ...(developer
        ? { developerId: user.id, status: { notIn: ["DRAFT", "AI_PLANNING"] } }
        : { clientId: user.id }),
    },
    include: {
      client: { select: { name: true } },
      developer: { select: { name: true } },
      scope: { orderBy: { position: "asc" } },
      milestones: {
        orderBy: { position: "asc" },
        include: {
          extensions: { orderBy: { createdAt: "desc" } },
          deliveryCases: { orderBy: { createdAt: "desc" } },
          payments: true,
          change: { select: { status: true } },
        },
      },
      cancellations: { orderBy: { createdAt: "desc" } },
      activities: { orderBy: { createdAt: "desc" }, take: 30 },
      revisions: { orderBy: { version: "desc" }, take: 10 },
      changes: { orderBy: { createdAt: "desc" }, include: { analysis: true } },
    },
  });
  if (!project) notFound();
  await recordDeliveryReminders([id]);
  const now = new Date();
  const agreed = ["AGREED", "ACTIVE", "COMPLETED"].includes(project.status);
  const editing =
    !project.paymentHold &&
    ((!developer && project.status === "DRAFT") ||
      (developer && project.status === "DEVELOPER_REVIEW"));
  const actions = developer
    ? project.status === "PENDING_DEVELOPER_REVIEW"
      ? [{ value: "review", label: "Start review" }]
      : project.status === "DEVELOPER_REVIEW"
        ? [
            { value: "accept", label: "Accept proposal" },
            { value: "reject", label: "Reject proposal", secondary: true },
          ]
        : []
    : project.status === "DRAFT"
      ? [{ value: "submit", label: "Submit to developer" }]
      : project.status === "CLIENT_REVIEW"
        ? [
            { value: "approve", label: "Approve revised proposal" },
            {
              value: "request_revision",
              label: "Request another revision",
              secondary: true,
            },
          ]
        : [];
  const nextMilestone = project.milestones.find(
    (milestone) => !["COMPLETED", "CANCELLED"].includes(milestone.status),
  );
  const scheduleItems = projectSchedule(
    {
      id: project.id,
      name: project.name,
      paymentHold: project.paymentHold,
      milestones: project.milestones.map((m) => ({
        id: m.id,
        title: m.title,
        description: m.description,
        status: m.status,
        estimatedDays: m.estimatedDays,
        dueAt: m.dueAt,
        change: m.change,
        payments: m.payments
          .filter((p) => p.verifiedAt && p.paypalCaptureId)
          .map((p) => ({
            verifiedAt: p.verifiedAt,
            paypalCaptureId: p.paypalCaptureId,
          })),
      })),
    },
    now.getTime(),
  );
  const ledgerRows: LedgerMilestoneRow[] = project.milestones.map((m, i) => {
    const capturedPayment = m.payments.find(
      (p) => p.status === "CAPTURED" && p.verifiedAt && p.paypalCaptureId,
    );
    const refundedPayment = m.payments.find(
      (p) => p.status === "REFUNDED" && p.refundVerifiedAt && p.paypalRefundId,
    );
    const pendingOrder = m.payments.find((p) => p.paypalOrderId);
    const verificationState = refundedPayment
      ? "Verified refund"
      : capturedPayment
        ? "Verified capture"
        : pendingOrder
          ? "Checkout created"
          : "Unfunded";
    const paypalReference = refundedPayment
      ? `Refund ${refundedPayment.paypalRefundId}`
      : capturedPayment
        ? `Capture ${capturedPayment.paypalCaptureId}`
        : pendingOrder?.paypalOrderId
          ? `Order ${pendingOrder.paypalOrderId}`
          : "Awaiting milestone readiness";
    return {
      id: m.id,
      step: String(i + 1).padStart(2, "0"),
      title: m.title,
      stageLabel: projectStatusLabel(m.status),
      estimatedDays: m.estimatedDays,
      dueAt: m.dueAt?.toISOString() ?? null,
      amount: Number(m.amount),
      fundedAmount: capturedPayment ? Number(capturedPayment.amount) : 0,
      refundedAmount: refundedPayment ? Number(refundedPayment.amount) : 0,
      currency: project.currency,
      verificationState,
      paypalReference,
      additionalScope: m.change?.status === "APPROVED",
    };
  });
  return (
    <WorkspaceShell user={user}>
      <Link
        href={developer ? "/developer" : "/dashboard"}
        className="back-link"
      >
        <ChevronLeft size={15} />
        All projects
      </Link>
      <div className="dashboard-title">
        <div>
          <span className="eyebrow">{project.type.toUpperCase()}</span>
          <h1>
            {project.name}
            <span>.</span>
          </h1>
          <p>
            {project.client.name} <span className="muted">↔</span>{" "}
            {project.developer?.name ?? "Developer"}
          </p>
        </div>
        <StatusBadge status={project.status} className="project-status" />
      </div>
      {project.paymentHold && (
        <div className="delivery-hold" role="status">
          <ShieldCheck size={20} />
          <div>
            <strong>
              {project.cancellations.some((request) =>
                ["PENDING", "REFUND_PENDING"].includes(request.status),
              )
                ? "Cancellation pending · payments paused"
                : "Delivery case open · payments paused"}
            </strong>
            <p>
              Resolve the open delivery case or cancellation request before
              making new payments or approving milestones. Existing payments
              stay recorded; opening a case does not refund them.
            </p>
          </div>
        </div>
      )}
      {!project.paymentHold && (
        <section
          className="project-next-step"
          aria-labelledby="next-step-heading"
        >
          <h2 id="next-step-heading">What happens next</h2>
          <p>
            {agreed && project.status !== "COMPLETED" && nextMilestone ? (
              <>
                <strong>{nextMilestone.title}.</strong>{" "}
                {milestoneNextStep(nextMilestone.status, developer)}
              </>
            ) : (
              projectNextStep(project.status, developer)
            )}
          </p>
          {agreed && project.status !== "COMPLETED" && (
            <p className="field-hint">
              Each milestone below shows its current status and available
              actions. New requirements go in Scope intelligence.{" "}
              {nextMilestone && (
                <a
                  href={`#milestone-${nextMilestone.id}`}
                  className="text-link"
                >
                  Jump to active milestone →
                </a>
              )}
            </p>
          )}
        </section>
      )}
      <div
        className="project-stepper"
        role="list"
        aria-label="Project progress; steps are informational"
      >
        {[
          "Draft",
          "Developer review",
          "Agreement",
          "Payment",
          "Development",
        ].map((s, i) => {
          const current =
            project.status === "COMPLETED"
              ? 5
              : project.status === "ACTIVE"
                ? 4
                : project.status === "DRAFT"
                  ? 0
                  : agreed
                    ? 3
                    : 1;
          return (
            <div
              key={s}
              role="listitem"
              aria-current={i === current ? "step" : undefined}
              className={i < current ? "done" : i === current ? "current" : ""}
            >
              <span className="project-step-number" aria-hidden="true">
                {i + 1}
              </span>
              <strong>
                {s}
                {i < current && <Check size={14} aria-hidden="true" />}
              </strong>
              <small className="sr-only">
                {i < current
                  ? "Completed stage"
                  : i === current
                    ? "Current stage"
                    : "Upcoming stage"}
              </small>
            </div>
          );
        })}
      </div>
      {project.status === "CLIENT_REVIEW" && (
        <div className="review-banner">
          <ShieldCheck size={20} />
          <div>
            <strong>Your developer has proposed revised terms.</strong>
            <p>
              Review the scope, amounts, and timeline below before approving.
            </p>
          </div>
        </div>
      )}
      <div className="project-summary-grid">
        <div>
          <span>Total budget</span>
          <strong>
            {new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: project.currency,
            }).format(Number(project.budget))}
          </strong>
        </div>
        <div>
          <span>Desired deadline</span>
          <strong>
            {project.deadline.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              timeZone: "UTC",
            })}
          </strong>
        </div>
        <div>
          <span>Milestones</span>
          <strong>
            {project.milestones.length} <small>defined steps</small>
          </strong>
        </div>
      </div>
      <div className="project-toolbar">
        <ProjectActions id={id} actions={project.paymentHold ? [] : actions} />
        {editing && (
          <Link
            className="button button-outline"
            href={
              developer
                ? `/projects/${id}/plan?review=developer`
                : `/projects/${id}/plan`
            }
          >
            <Pencil size={15} />
            {developer ? "Revise proposal" : "Edit draft"}
          </Link>
        )}
      </div>
      <Link
        href={developer ? "/developer/schedule" : "/schedule"}
        preloadCalendar
        className="back-link"
      >
        View your work schedule →
      </Link>
      <div className="project-content-grid">
        <div>
          <section className="editor-section">
            <h2>{agreed ? "Agreed scope" : "Proposed scope"}</h2>
            <p className="requirements-text">{project.requirements}</p>
            <ul className="scope-list">
              {project.scope.map((s) => (
                <li key={s.id}>
                  <Check size={15} />
                  {s.description}
                </li>
              ))}
            </ul>
          </section>
          <ProjectLedgerGrid
            projectName={project.name}
            rows={ledgerRows}
            scheduleItems={scheduleItems}
            now={now.toISOString()}
            developer={developer}
          />
          <section className="editor-section">
            <div className="panel-heading inline-panel">
              <h2>Milestones</h2>
              <span>Payments handled by PayPal</span>
            </div>
            {project.milestones.map((m, i) => (
              <article
                className="workspace-milestone"
                key={m.id}
                id={`milestone-${m.id}`}
                tabIndex={-1}
              >
                <span className="milestone-number">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3>{m.title}</h3>
                  <p>{m.description}</p>
                  {m.submissionNote && (
                    <div className="submission-note">
                      <strong>Submitted work</strong>
                      <p>{m.submissionNote}</p>
                    </div>
                  )}
                  {agreed && !project.paymentHold && (
                    <MilestoneControls
                      id={m.id}
                      status={m.status}
                      developer={developer}
                    />
                  )}
                  <DeliveryFollowup
                    milestoneId={m.id}
                    status={m.status}
                    dueAt={m.dueAt}
                    developer={developer}
                    hold={project.paymentHold}
                    extensions={m.extensions}
                    cases={m.deliveryCases.filter(
                      (item) =>
                        !project.cancellations.some(
                          (request) => request.deliveryCaseId === item.id,
                        ),
                    )}
                  />
                  <span>
                    <Clock3 size={12} />
                    {m.estimatedDays} estimated days
                  </span>
                </div>
                <div className="milestone-finance">
                  <strong>
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: project.currency,
                    }).format(Number(m.amount))}
                  </strong>
                  <StatusBadge status={m.status}>
                    <LockKeyhole size={11} />
                    {m.status.replaceAll("_", " ").toLowerCase()}
                  </StatusBadge>
                  {m.payments.some(
                    (p) => p.status === "REFUNDED" && p.refundVerifiedAt,
                  ) && (
                    <span className="delivery-label refunded">
                      PayPal refund verified
                    </span>
                  )}
                  {!developer &&
                    !project.paymentHold &&
                    m.status === "AWAITING_PAYMENT" && (
                      <PayButton milestoneId={m.id} />
                    )}
                </div>
              </article>
            ))}
            {agreed && (
              <div className="payment-notice">
                <ShieldCheck size={16} />
                <p>
                  PayPal Sandbox payments fund one approved milestone at a time.
                  Payment confirmation requires server-side capture
                  verification. Signed webhooks provide additional confirmation.
                  DealMile does not hold funds.
                </p>
              </div>
            )}
          </section>
          {agreed && (
            <ScopeIntelligence
              projectId={id}
              developer={developer}
              open={project.status !== "COMPLETED" && !project.paymentHold}
              changes={project.changes}
            />
          )}
        </div>
        <aside>
          <section className="editor-section">
            <h2>Activity</h2>
            <div className="activity-list">
              {project.activities.map((a) => (
                <article key={a.id}>
                  <span />
                  <div>
                    <p>{a.description}</p>
                    <time dateTime={a.createdAt.toISOString()}>
                      {a.createdAt.toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </time>
                  </div>
                </article>
              ))}
            </div>
          </section>
          <section className="editor-section">
            <h2>Proposal history</h2>
            <div className="revision-list">
              {project.revisions.length ? (
                project.revisions.map((r) => (
                  <details key={r.id}>
                    <summary>
                      Version {r.version}{" "}
                      <span>{r.acceptedAt ? "Approved" : "Proposed"}</span>
                    </summary>
                    <p>{r.summary}</p>
                    <RevisionSnapshotView
                      snapshot={r.snapshot}
                      currency={project.currency}
                    />
                  </details>
                ))
              ) : (
                <p className="field-hint">
                  Your first proposal version is recorded when you submit the
                  draft.
                </p>
              )}
            </div>
          </section>
          <ProjectCancellation project={project} userId={user.id} />
        </aside>
      </div>
    </WorkspaceShell>
  );
}
