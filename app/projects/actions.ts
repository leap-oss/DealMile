"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import {
  createProject,
  mutateProject,
  ProjectError,
} from "@/lib/projects/service";
export type ProjectFormState = {
  error?: string;
  success?: string;
  draftId?: string;
};
function payload(form: FormData) {
  return {
    ...Object.fromEntries(form),
    scope: String(form.get("scope") ?? "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean),
    milestones: JSON.parse(String(form.get("milestones") ?? "[]")),
  };
}
function errorMessage(error: unknown) {
  if (error instanceof z.ZodError)
    return error.issues[0]?.message ?? "Please check the project details.";
  if (error instanceof SyntaxError) return "Please check milestone details.";
  if (error instanceof ProjectError) return error.message;
  return "Unable to save. The project may have changed; reload and try again.";
}
export async function saveNewProject(
  _state: ProjectFormState,
  form: FormData,
): Promise<ProjectFormState> {
  const user = await requireUser("CLIENT");
  let id: string;
  try {
    id = (await createProject(user, payload(form))).id;
  } catch (error) {
    return { error: errorMessage(error) };
  }
  revalidatePath("/dashboard");
  redirect(`/projects/${id}`);
}
export async function saveProposal(
  _state: ProjectFormState,
  form: FormData,
): Promise<ProjectFormState> {
  const user = await requireUser();
  const id = String(form.get("projectId") ?? "");
  try {
    await mutateProject(
      user,
      id,
      user.role === "CLIENT" ? "save" : "revise",
      payload(form),
    );
  } catch (error) {
    return { error: errorMessage(error) };
  }
  revalidatePath(`/projects/${id}`);
  revalidatePath(`/developer/projects/${id}`);
  revalidatePath("/dashboard");
  revalidatePath("/developer");
  redirect(
    user.role === "CLIENT" ? `/projects/${id}` : `/developer/projects/${id}`,
  );
}
const actionSchema = z.enum([
  "submit",
  "review",
  "accept",
  "reject",
  "approve",
  "request_revision",
]);
export async function projectAction(
  _state: ProjectFormState,
  form: FormData,
): Promise<ProjectFormState> {
  const user = await requireUser();
  const id = String(form.get("projectId") ?? "");
  try {
    await mutateProject(user, id, actionSchema.parse(form.get("action")));
  } catch (error) {
    return { error: errorMessage(error) };
  }
  revalidatePath(`/projects/${id}`);
  revalidatePath(`/developer/projects/${id}`);
  revalidatePath("/dashboard");
  revalidatePath("/developer");
  return { success: "Project updated." };
}

export async function generateProjectPlan(
  _state: ProjectFormState,
  form: FormData,
): Promise<ProjectFormState> {
  const user = await requireUser("CLIENT");
  let id: string;
  try {
    const { generateDraft } = await import("@/lib/ai/planner");
    id = await generateDraft(
      user.id,
      Object.fromEntries(form),
      String(form.get("projectId") ?? "") || undefined,
    );
  } catch (error) {
    const { AIError } = await import("@/lib/ai/gemini");
    return {
      error: error instanceof AIError ? error.message : errorMessage(error),
      draftId: error instanceof AIError ? error.draftId : undefined,
    };
  }
  revalidatePath("/dashboard");
  redirect(`/projects/${id}/plan`);
}
