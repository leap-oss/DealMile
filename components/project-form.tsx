"use client";
import {
  useActionState,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { ArrowRight, LoaderCircle, Plus, Trash2 } from "lucide-react";
import {
  generateProjectPlan,
  saveNewProject,
  saveProposal,
  type ProjectFormState,
} from "@/app/projects/actions";
import type { ProposalInput } from "@/lib/projects/validation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
type Milestone = {
  title: string;
  description: string;
  amount: string;
  estimatedDays: string;
};
// Keep the server-rendered form disabled until its controlled fields hydrate.
const subscribeHydration = () => () => {};
const clientReady = () => true;
const serverReady = () => false;
function AiProgress() {
  const [stage, setStage] = useState(0);
  useEffect(() => {
    let next = 0;
    const timer = setInterval(() => {
      next += 1;
      setStage(next);
      if (next === 3) clearInterval(timer);
    }, 4500);
    return () => clearInterval(timer);
  }, []);
  return (
    <p className="ai-progress" role="status">
      {
        [
          "Waiting for an AI draft…",
          "Still waiting for the AI draft…",
          "This is taking a little longer. Keep this page open…",
          "Still waiting for the AI service. The draft will appear when it is ready…",
        ][stage]
      }
    </p>
  );
}
export function ProjectForm({
  initial,
  projectId,
  developer = false,
}: {
  initial?: ProposalInput;
  projectId?: string;
  developer?: boolean;
}) {
  const [state, action, pending] = useActionState<ProjectFormState, FormData>(
    projectId ? saveProposal : saveNewProject,
    {},
  );
  const [aiState, generateAction, aiPending] = useActionState<
    ProjectFormState,
    FormData
  >(generateProjectPlan, {});
  const ready = useSyncExternalStore(
    subscribeHydration,
    clientReady,
    serverReady,
  );
  const [details, setDetails] = useState({
    name: initial?.name ?? "",
    type: initial?.type ?? "Website",
    requirements: initial?.requirements ?? "",
    budget: String(initial?.budget ?? ""),
    deadline: initial?.deadline ?? "",
    scope: initial?.scope.join("\n") ?? "",
  });
  const [milestones, setMilestones] = useState<Milestone[]>(
    initial?.milestones.length
      ? initial.milestones.map((m) => ({
          ...m,
          amount: String(m.amount),
          estimatedDays: String(m.estimatedDays),
        }))
      : [{ title: "", description: "", amount: "", estimatedDays: "" }],
  );
  function update(key: keyof typeof details, value: string) {
    setDetails({ ...details, [key]: value });
  }
  function updateMilestone(index: number, key: keyof Milestone, value: string) {
    setMilestones(
      milestones.map((m, i) => (i === index ? { ...m, [key]: value } : m)),
    );
  }
  const serializedMilestones = useMemo(
    () => JSON.stringify(milestones),
    [milestones],
  );
  const total = useMemo(
    () => milestones.reduce((n, m) => n + (Number(m.amount) || 0), 0),
    [milestones],
  );
  return (
    <form
      action={projectId ? action : generateAction}
      className="project-form"
      aria-busy={pending || aiPending}
    >
      {!projectId && (
        <div className="project-form-guide">
          <strong>First, create a draft plan.</strong>
          <p>
            Fill in the project details and choose Generate project plan. You’ll
            review and edit the AI draft before sending it to a developer. No
            payment is taken at this step.
          </p>
        </div>
      )}
      <fieldset disabled={!ready || pending || aiPending}>
        <input type="hidden" name="projectId" value={projectId ?? ""} />
        <input type="hidden" name="milestones" value={serializedMilestones} />
        <div className="editor-grid">
          <div>
            <section className="editor-section">
              <div className="editor-heading">
                <span>01</span>
                <div>
                  <h2>The project</h2>
                  <p>Start with a shared understanding of the work.</p>
                </div>
              </div>
              <div className="form-field">
                <label htmlFor="project-name">Project name</label>
                <input
                  id="project-name"
                  name="name"
                  required
                  minLength={3}
                  maxLength={120}
                  placeholder="e.g. E-commerce website"
                  value={details.name}
                  onChange={(e) => update("name", e.target.value)}
                />
              </div>
              <div className="form-field">
                <label htmlFor="project-type">Project type</label>
                <select
                  id="project-type"
                  name="type"
                  value={details.type}
                  onChange={(e) => update("type", e.target.value)}
                >
                  {[
                    "Website",
                    "Web application",
                    "Mobile application",
                    "API / Backend",
                    "Other",
                  ].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label htmlFor="requirements">Requirements</label>
                <textarea
                  id="requirements"
                  name="requirements"
                  required
                  minLength={20}
                  maxLength={10000}
                  rows={5}
                  placeholder="What are we building? Describe your users, key features, and what success looks like."
                  value={details.requirements}
                  onChange={(e) => update("requirements", e.target.value)}
                />
              </div>
              {projectId && (
                <div className="form-field">
                  <label htmlFor="scope">Included scope</label>
                  <textarea
                    id="scope"
                    name="scope"
                    required
                    rows={4}
                    placeholder={
                      "One requirement per line\nEmail/password authentication\nProduct management\nShopping cart"
                    }
                    value={details.scope}
                    onChange={(e) => update("scope", e.target.value)}
                  />
                  <small className="field-hint">
                    One clear deliverable per line. This becomes your
                    agreement’s scope.
                  </small>
                </div>
              )}
            </section>
            {projectId && (
              <section className="editor-section">
                <div className="editor-heading">
                  <span>02</span>
                  <div>
                    <h2>The milestones</h2>
                    <p>Define what’s delivered and what each step costs.</p>
                  </div>
                </div>
                {milestones.map((m, i) => (
                  <div className="milestone-editor" key={i}>
                    <div className="milestone-editor-heading">
                      <span>Milestone {String(i + 1).padStart(2, "0")}</span>
                      <button
                        type="button"
                        className="icon-button"
                        aria-label={`Remove milestone ${i + 1}`}
                        disabled={milestones.length === 1}
                        onClick={() =>
                          setMilestones(
                            milestones.filter((_, index) => index !== i),
                          )
                        }
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                    <div className="form-field">
                      <label htmlFor={`title-${i}`}>Milestone title</label>
                      <input
                        id={`title-${i}`}
                        required
                        minLength={3}
                        maxLength={120}
                        placeholder="e.g. Discovery & design"
                        value={m.title}
                        onChange={(e) =>
                          updateMilestone(i, "title", e.target.value)
                        }
                      />
                    </div>
                    <div className="form-field">
                      <label htmlFor={`description-${i}`}>Deliverables</label>
                      <textarea
                        id={`description-${i}`}
                        required
                        minLength={5}
                        maxLength={2000}
                        rows={2}
                        placeholder="What will be completed in this milestone?"
                        value={m.description}
                        onChange={(e) =>
                          updateMilestone(i, "description", e.target.value)
                        }
                      />
                    </div>
                    <div className="form-row">
                      <div className="form-field">
                        <label htmlFor={`amount-${i}`}>Amount (USD)</label>
                        <input
                          id={`amount-${i}`}
                          type="number"
                          required
                          min="0.01"
                          max="1000000"
                          step="0.01"
                          value={m.amount}
                          onChange={(e) =>
                            updateMilestone(i, "amount", e.target.value)
                          }
                        />
                      </div>
                      <div className="form-field">
                        <label htmlFor={`days-${i}`}>Estimated days</label>
                        <input
                          id={`days-${i}`}
                          type="number"
                          required
                          min="1"
                          max="365"
                          step="1"
                          value={m.estimatedDays}
                          onChange={(e) =>
                            updateMilestone(i, "estimatedDays", e.target.value)
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  disabled={milestones.length >= 20}
                  onClick={() =>
                    setMilestones([
                      ...milestones,
                      {
                        title: "",
                        description: "",
                        amount: "",
                        estimatedDays: "",
                      },
                    ])
                  }
                >
                  <Plus size={15} /> Add milestone
                </Button>
              </section>
            )}
          </div>
          <aside>
            <section className="editor-section editor-summary">
              <span className="eyebrow">THE AGREEMENT AT A GLANCE</span>
              <h2>Make every detail count.</h2>
              {!developer && projectId && (
                <div className="ai-generate-block">
                  <Button
                    type="submit"
                    variant="outline"
                    formAction={generateAction}
                    formNoValidate
                    disabled={!ready || pending || aiPending}
                  >
                    {aiPending ? (
                      <>
                        <LoaderCircle className="spin" size={16} />
                        Planning with Gemini…
                      </>
                    ) : (
                      <>
                        {projectId
                          ? "Regenerate AI plan"
                          : "Generate project plan"}
                        <ArrowRight size={15} />
                      </>
                    )}
                  </Button>
                  <p className="field-hint">
                    Let AI suggest scope and milestones. Review every detail
                    before sending.
                  </p>
                  {aiPending && <AiProgress />}
                  {aiState.error && (
                    <div className="form-error" role="alert">
                      {aiState.error}
                      {aiState.draftId && (
                        <Link href={`/projects/${aiState.draftId}/plan`}>
                          {" "}
                          Open saved draft →
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              )}
              <div className="form-field">
                <label htmlFor="budget">Total budget (USD)</label>
                <input
                  id="budget"
                  name="budget"
                  type="number"
                  required
                  min="0.01"
                  max="1000000"
                  step="0.01"
                  value={details.budget}
                  onChange={(e) => update("budget", e.target.value)}
                />
              </div>
              <div className="form-field">
                <label htmlFor="deadline">Desired deadline</label>
                <input
                  id="deadline"
                  name="deadline"
                  type="date"
                  required
                  min={
                    !projectId
                      ? new Date().toISOString().slice(0, 10)
                      : undefined
                  }
                  value={details.deadline}
                  onChange={(e) => update("deadline", e.target.value)}
                />
              </div>
              {!projectId && (
                <p className="field-hint">
                  A developer will be assigned automatically from available
                  accounts. AI will suggest scope, milestones, and how to
                  allocate your initial budget. You can revise everything before
                  submitting.
                </p>
              )}
              {projectId && (
                <div className="budget-check">
                  <span>
                    Allocated to {milestones.length} milestone
                    {milestones.length !== 1 ? "s" : ""}
                  </span>
                  <strong>
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                    }).format(total)}
                  </strong>
                  <small>
                    {Math.round(total * 100) ===
                      Math.round(Number(details.budget) * 100) && total > 0
                      ? "Matches your budget"
                      : "Milestone amounts must match your budget."}
                  </small>
                </div>
              )}
              <p className="field-hint">
                {developer
                  ? "Your revised terms go back to the client for explicit approval."
                  : "Review the AI draft and revise milestones and budget before sending it to your assigned developer."}
              </p>
              {aiState.error && !projectId && (
                <div className="form-error" role="alert">
                  {aiState.error}
                  {aiState.draftId && (
                    <Link href={`/projects/${aiState.draftId}/plan`}>
                      {" "}
                      Open saved draft →
                    </Link>
                  )}
                </div>
              )}
              {state.error && (
                <div className="form-error" role="alert">
                  {state.error}
                </div>
              )}
              <Button
                type="submit"
                className="auth-submit"
                disabled={!ready || pending || aiPending}
              >
                {pending || aiPending ? (
                  <>
                    <LoaderCircle className="spin" size={16} />
                    {aiPending ? "Planning with Gemini…" : "Saving…"}
                  </>
                ) : (
                  <>
                    {developer
                      ? "Send revised proposal"
                      : projectId
                        ? "Save changes"
                        : "Generate project plan"}
                    <ArrowRight size={16} />
                  </>
                )}
              </Button>
              {aiPending && !projectId && (
                <p className="field-hint" role="status">
                  Waiting for the AI draft. This can take longer than saving a
                  project. Keep this page open; no payment is taken.
                </p>
              )}
            </section>
          </aside>
        </div>
      </fieldset>
    </form>
  );
}
