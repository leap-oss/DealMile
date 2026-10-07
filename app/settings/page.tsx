import { requireUser } from "@/lib/auth/session";
import { WorkspaceShell } from "@/components/workspace-shell";
export const metadata = { title: "Account" };
export default async function Page() {
  const user = await requireUser();
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
        </dl>
      </section>
    </WorkspaceShell>
  );
}
