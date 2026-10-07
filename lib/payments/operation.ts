import "server-only";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { transaction } from "@/lib/projects/transaction";
import { PaymentError } from "./paypal";
/** A bounded lease serializes checkout/capture against a newly opened delivery case.
 * Provider requests time out; the five-minute lease also recovers after a process crash.
 */
export async function paymentOperation<T>(
  projectId: string,
  clientId: string,
  reconcile: boolean,
  work: () => Promise<T>,
) {
  const key = randomUUID();
  await transaction(async (tx) => {
    const project = await tx.project.findFirst({
      where: { id: projectId, clientId, status: { in: ["AGREED", "ACTIVE"] } },
    });
    if (!project)
      throw new PaymentError("This project is not available to your account.");
    if (project.paymentHold && !reconcile)
      throw new PaymentError(
        "Payments are paused while the delivery case is open.",
      );
    if (project.paymentBusyUntil && project.paymentBusyUntil > new Date())
      throw new PaymentError(
        "A PayPal request is already in progress. Wait before retrying.",
      );
    await tx.project.update({
      where: { id: projectId },
      data: {
        paymentOperationKey: key,
        paymentBusyUntil: new Date(Date.now() + 5 * 60000),
      },
    });
  });
  try {
    return await work();
  } finally {
    await db().project.updateMany({
      where: { id: projectId, paymentOperationKey: key },
      data: { paymentOperationKey: null, paymentBusyUntil: null },
    });
  }
}
