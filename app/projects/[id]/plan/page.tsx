import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { WorkspaceShell } from "@/components/workspace-shell";
import { ProjectForm } from "@/components/project-form";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
export const metadata = { title: "Edit proposal" };
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const developer = user.role === "DEVELOPER";
  const project = await db().project.findFirst({
    where: {
      id,
      ...(developer
        ? { developerId: user.id, status: "DEVELOPER_REVIEW" }
        : { clientId: user.id, status: "DRAFT" }),
    },
    include: {
      scope: { orderBy: { position: "asc" } },
      milestones: { orderBy: { position: "asc" } },
      analyses: {
        where: { kind: "PROJECT_PLAN" },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });
  if (!project) notFound();
  return (
    <WorkspaceShell user={user}>
      <Link
        className="back-link"
        href={developer ? `/developer/projects/${id}` : `/projects/${id}`}
      >
        <ChevronLeft size={15} />
        Back to project
      </Link>
      <div className="dashboard-title">
        <div>
          <h1>
            {developer ? "Refine the proposal" : "Edit your draft"}
            <span>.</span>
          </h1>
          <p>
            {developer
              ? "Make the terms clear. The client will review your changes before agreeing."
              : "Every deliverable, deadline, and amount stays editable before submission."}
          </p>
        </div>
      </div>
      {project.summary && (
        <div className="review-banner">
          <div>
            <strong>AI suggested · Your review comes next</strong>
            <p>{project.summary}</p>
            {project.analyses[0] && (
              <AIPlanRisks result={project.analyses[0].result} />
            )}
          </div>
        </div>
      )}
      <ProjectForm
        key={project.updatedAt.toISOString()}
        projectId={id}
        developer={developer}
        initial={{
          name: project.name,
          type: project.type,
          requirements: project.requirements,
          budget: Number(project.budget),
          deadline: project.deadline.toISOString().slice(0, 10),
          scope: project.scope.map((s) => s.description),
          milestones: project.milestones.map((m) => ({
            title: m.title,
            description: m.description,
            amount: Number(m.amount),
            estimatedDays: m.estimatedDays,
          })),
        }}
      />
    </WorkspaceShell>
  );
}

function AIPlanRisks({ result }: { result: unknown }) {
  const value = result as { risks?: unknown };
  if (!Array.isArray(value.risks)) return null;
  return (
    <ul className="ai-risks">
      {value.risks
        .filter((v): v is string => typeof v === "string")
        .map((r, i) => (
          <li key={i}>{r}</li>
        ))}
    </ul>
  );
}
