import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { createHmac, randomBytes } from "node:crypto";
const prisma = new PrismaClient();
test("overdue delivery, extension approval and bilateral case resolution survive reload", async ({
  browser,
}) => {
  test.setTimeout(120000);
  const prefix = `delivery-e2e-${Date.now()}`;
  const users: string[] = [],
    contexts: import("@playwright/test").BrowserContext[] = [];
  let projectId: string | undefined;
  try {
    async function account(role: "CLIENT" | "DEVELOPER") {
      const user = await prisma.user.create({
        data: {
          name: `Delivery ${role}`,
          role,
          email: `${prefix}-${role}@example.com`,
          passwordHash: "unused",
        },
      });
      users.push(user.id);
      const token = randomBytes(32).toString("hex");
      await prisma.session.create({
        data: {
          userId: user.id,
          tokenHash: createHmac("sha256", process.env.AUTH_SECRET!)
            .update(token)
            .digest("hex"),
          expiresAt: new Date(Date.now() + 3600000),
        },
      });
      const context = await browser.newContext();
      contexts.push(context);
      await context.addCookies([
        {
          name: "dealmile_session",
          value: token,
          domain: "localhost",
          path: "/",
          httpOnly: true,
          sameSite: "Lax",
        },
      ]);
      return { user, page: await context.newPage() };
    }
    const client = await account("CLIENT"),
      developer = await account("DEVELOPER");
    // Isolated captured payment fixture; this test never refunds the user's real Sandbox capture.
    const project = await prisma.project.create({
      data: {
        name: "Delivery follow-up demo",
        type: "Website",
        requirements: "Deliver a working project workspace",
        clientId: client.user.id,
        developerId: developer.user.id,
        status: "ACTIVE",
        budget: 100,
        deadline: new Date("2028-12-31"),
        milestones: {
          create: {
            title: "Initial delivery",
            description: "Deliver the project workspace",
            amount: 100,
            estimatedDays: 3,
            position: 0,
            status: "IN_PROGRESS",
            dueAt: new Date(Date.now() - 86400000),
            payments: {
              create: {
                amount: 100,
                currency: "USD",
                status: "CAPTURED",
                verifiedAt: new Date(),
                paypalOrderId: "DELIVERYE2EORDER123",
                paypalCaptureId: "DELIVERYE2ECAP1234",
                paypalPayeeId: "fixture-merchant",
              },
            },
          },
        },
      },
      include: { milestones: true },
    });
    projectId = project.id;
    await client.page.goto("/dashboard");
    const reminders = client.page.getByRole("region", {
      name: "Delivery reminders",
    });
    await expect(reminders.getByText("Overdue", { exact: true })).toBeVisible();
    await expect(reminders.getByRole("link")).toHaveAttribute(
      "href",
      `/projects/${project.id}`,
    );
    await client.page.screenshot({
      path: "/tmp/dealmile-delivery-dashboard-desktop.png",
      fullPage: true,
      style: "nextjs-portal { visibility: hidden; }",
    });
    await developer.page.goto(`/developer/projects/${project.id}`);
    await expect(
      developer.page.getByText("Overdue", { exact: true }),
    ).toBeVisible();
    await developer.page
      .getByText("Request more delivery time", { exact: true })
      .click();
    const date = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);
    await developer.page.getByLabel("Requested delivery date (UTC)").fill(date);
    await developer.page
      .getByLabel("Extension reason")
      .fill("The integration work needs a revised implementation timeline.");
    await developer.page
      .getByRole("button", { name: "Request deadline extension" })
      .click();
    await expect(
      developer.page.getByText("Deadline extension awaiting client approval"),
    ).toBeVisible();
    await client.page.goto(`/projects/${project.id}`);
    await client.page
      .getByRole("button", { name: "Approve extension", exact: true })
      .click();
    await expect(
      client.page.getByText("Deadline extension awaiting client approval"),
    ).toHaveCount(0);
    await client.page
      .getByText("Report a delivery problem", { exact: true })
      .click();
    await client.page
      .getByLabel("Delivery problem")
      .fill(
        "The developer has stopped responding and no staging build is available.",
      );
    await client.page
      .getByLabel("Evidence and contact attempts", { exact: true })
      .fill("Three messages sent this week; no review links were supplied.");
    await client.page
      .getByRole("button", { name: "Open delivery case" })
      .click();
    await expect(
      client.page.getByText("Delivery case open · payments paused"),
    ).toBeVisible();
    await developer.page.reload();
    await expect(
      developer.page.getByRole("button", { name: "Submit work", exact: true }),
    ).toHaveCount(0);
    await developer.page
      .getByLabel("Proposed resolution")
      .selectOption("RESUME");
    const resumed = new Date(Date.now() + 10 * 86400000)
      .toISOString()
      .slice(0, 10);
    await developer.page
      .getByLabel("New deadline for resume (UTC)")
      .fill(resumed);
    await developer.page
      .getByLabel("Resolution explanation")
      .fill(
        "Resume work with a clear delivery date and staging review checkpoints.",
      );
    await developer.page
      .getByRole("button", { name: "Send resolution proposal" })
      .click();
    await expect(
      developer.page.getByText("Delivery case · proposed", { exact: true }),
    ).toBeVisible();
    await client.page.reload();
    await client.page.setViewportSize({ width: 390, height: 844 });
    await client.page.screenshot({
      path: "/tmp/dealmile-delivery-case-mobile.png",
      fullPage: true,
      style: "nextjs-portal { visibility: hidden; }",
    });
    expect(
      await client.page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await client.page
      .getByRole("button", { name: "Approve resolution", exact: true })
      .click();
    await expect(
      client.page.getByText("Delivery case · resolved", { exact: true }),
    ).toBeVisible();
    await expect(
      client.page.getByText("Delivery case open · payments paused"),
    ).toHaveCount(0);
    await developer.page.reload();
    await expect(developer.page.getByLabel("Delivered work")).toBeVisible();
    const saved = await prisma.milestone.findUniqueOrThrow({
      where: { id: project.milestones[0].id },
      include: { project: true, payments: true },
    });
    expect(saved.dueAt?.toISOString().slice(0, 10)).toBe(resumed);
    expect(saved.project.paymentHold).toBe(false);
    expect(saved.payments[0].status).toBe("CAPTURED");
    expect(
      await prisma.deliveryReminder.count({
        where: { milestoneId: saved.id, kind: "OVERDUE" },
      }),
    ).toBe(1);
    // Separate refund-receipt display fixture; no real provider refund is initiated.
    await prisma.payment.update({
      where: { id: saved.payments[0].id },
      data: {
        status: "REFUNDED",
        paypalRefundId: "DELIVERYE2EREF1234",
        refundVerifiedAt: new Date(),
      },
    });
    await prisma.milestone.update({
      where: { id: saved.id },
      data: { status: "CANCELLED" },
    });
    await prisma.project.update({
      where: { id: project.id },
      data: { status: "CANCELLED" },
    });
    await client.page.goto(
      `/projects/${project.id}/payment?token=DELIVERYE2EORDER123&cancelled=1`,
    );
    await expect(client.page.getByRole("heading", { level: 1 })).toHaveText(
      "Refund confirmed.",
    );
    await expect(
      client.page.getByText("Full PayPal refund verified.", { exact: true }),
    ).toBeVisible();
    await expect(
      client.page.getByRole("button", { name: "Confirm payment", exact: true }),
    ).toHaveCount(0);
    await expect(
      client.page.getByText("DELIVERYE2EREF1234", { exact: true }),
    ).toBeVisible();
  } finally {
    await Promise.all(contexts.map((c) => c.close()));
    if (projectId) {
      await prisma.payment.deleteMany({ where: { milestone: { projectId } } });
      await prisma.project.delete({ where: { id: projectId } });
    }
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    await prisma.$disconnect();
  }
});
