"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { capturePayment, prepareOrder } from "@/lib/payments/service";
import { PaymentError } from "@/lib/payments/paypal";
export type PaymentState = { error?: string; success?: string };
export async function payMilestone(
  _state: PaymentState,
  form: FormData,
): Promise<PaymentState> {
  const user = await requireUser("CLIENT");
  let url: string;
  try {
    url = await prepareOrder(user.id, String(form.get("milestoneId") ?? ""));
  } catch (error) {
    return {
      error:
        error instanceof PaymentError
          ? error.message
          : "Unable to prepare payment. Please try again.",
    };
  }
  redirect(url);
}
export async function confirmPayment(
  _state: PaymentState,
  form: FormData,
): Promise<PaymentState> {
  const user = await requireUser("CLIENT");
  let milestoneId: string;
  try {
    milestoneId = await capturePayment(
      user.id,
      String(form.get("orderId") ?? ""),
    );
  } catch (error) {
    return {
      error:
        error instanceof PaymentError
          ? error.message
          : "Unable to verify payment. Please retry verification.",
    };
  }
  const { db } = await import("@/lib/db");
  const milestone = await db().milestone.findUniqueOrThrow({
    where: { id: milestoneId },
    select: { projectId: true, status: true },
  });
  revalidatePath(`/projects/${milestone.projectId}`);
  revalidatePath(`/projects/${milestone.projectId}/payment`);
  revalidatePath(`/developer/projects/${milestone.projectId}`);
  revalidatePath("/dashboard");
  revalidatePath("/developer");
  return {
    success:
      milestone.status === "FUNDED"
        ? "Payment confirmed. Your milestone is funded."
        : "Capture recorded. Waiting for authoritative server verification.",
  };
}
