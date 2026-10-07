import { requireUser } from "@/lib/auth/session";
import { WorkspaceShell } from "@/components/workspace-shell";
import { ProjectForm } from "@/components/project-form";
export const metadata = { title: "Start a project" };
export default async function Page() {
  const user = await requireUser("CLIENT");
  return (
    <WorkspaceShell user={user}>
      <span className="eyebrow">EVERY MILESTONE STARTS HERE</span>
      <div className="dashboard-title">
        <div>
          <h1>
            Let’s define the deal<span>.</span>
          </h1>
          <p>
            Outline your requirements, agree on the work, and move forward
            together.
          </p>
        </div>
      </div>
      <ProjectForm />
    </WorkspaceShell>
  );
}
