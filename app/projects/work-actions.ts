"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { mutateMilestone } from "@/lib/milestones/service";
import { analyzeChange, resolveChange } from "@/lib/changes/service";
import { AIError } from "@/lib/ai/gemini";
import { ProjectError } from "@/lib/projects/service";
import {
  deliveryAction as mutateDelivery,
  processRefund,
} from "@/lib/delivery/service";
import { PaymentError } from "@/lib/payments/paypal";
import {
  cancellationAction,
  refundCancellation,
} from "@/lib/cancellations/service";
export type WorkState = { error?: string; success?: string };
function errorMessage(error: unknown) {
  if (error instanceof z.ZodError)
    return error.issues[0]?.message ?? "Check the form details.";
  if (
    error instanceof AIError ||
    error instanceof ProjectError ||
    error instanceof PaymentError
  )
    return error.message;
  return "Unable to update. Reload and try again.";
}
export async function deliveryAction(
  _state: WorkState,
  form: FormData,
): Promise<WorkState> {
  const user = await requireUser();
  try {
    const id =
      form.get("action") === "process_refund"
        ? await processRefund(user, String(form.get("recordId") ?? ""))
        : await mutateDelivery(
            user,
            String(form.get("milestoneId") ?? ""),
            form.get("action"),
            Object.fromEntries(form),
          );
    refresh(id);
    return { success: "Delivery follow-up updated." };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}
function refresh(id: string) {
  revalidatePath("/developer/schedule");
  revalidatePath(`/projects/${id}`);
  revalidatePath(`/projects/${id}/payment`);
  revalidatePath(`/developer/projects/${id}`);
  revalidatePath("/dashboard");
  revalidatePath("/developer");
}
export async function cancelProject(
  _state: WorkState,
  form: FormData,
): Promise<WorkState> {
  const user = await requireUser();
  try {
    const action = form.get("action");
    if (action === "approve" && form.get("consent") !== "yes")
      throw new ProjectError(
        "Confirm the displayed cancellation settlement before approving.",
      );
    const id =
      action === "refund"
        ? await refundCancellation(user, String(form.get("requestId") ?? ""))
        : await cancellationAction(
            user,
            String(form.get("projectId") ?? ""),
            action,
            Object.fromEntries(form),
          );
    refresh(id);
    return { success: "Cancellation request updated." };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}
export async function milestoneAction(
  _state: WorkState,
  form: FormData,
): Promise<WorkState> {
  const user = await requireUser();
  try {
    const id = await mutateMilestone(
      user,
      String(form.get("milestoneId") ?? ""),
      form.get("action"),
      form.get("note"),
    );
    refresh(id);
    return { success: "Milestone updated." };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}
export async function requestChange(
  _state: WorkState,
  form: FormData,
): Promise<WorkState> {
  const user = await requireUser("CLIENT");
  const id = String(form.get("projectId") ?? "");
  try {
    await analyzeChange(
      user,
      id,
      form.get("description"),
      String(form.get("retryId") ?? "") || undefined,
    );
    refresh(id);
    return { success: "Scope comparison ready for developer review." };
  } catch (error) {
    refresh(id);
    return { error: errorMessage(error) };
  }
}
export async function changeAction(
  _state: WorkState,
  form: FormData,
): Promise<WorkState> {
  const user = await requireUser();
  try {
    const id = await resolveChange(
      user,
      String(form.get("changeId") ?? ""),
      form.get("action"),
      Object.fromEntries(form),
    );
    refresh(id);
    return { success: "Change request updated." };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}
