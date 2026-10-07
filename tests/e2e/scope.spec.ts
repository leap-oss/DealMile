import { test, expect, type BrowserContext } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { createHmac, randomBytes } from "node:crypto";
const prisma = new PrismaClient();
test("real Gemini scope comparison, human proposal approval and funded milestone delivery", async ({
  browser,
}) => {
  test.setTimeout(180000);
  const prefix = `scope-e2e-${Date.now()}`;
  const users: string[] = [];
  const contexts: BrowserContext[] = [];
  let projectId: string | undefined;
  try {
    async function account(role: "CLIENT" | "DEVELOPER") {
      const user = await prisma.user.create({
        data: {
          name: `Scope ${role}`,
          email: `${prefix}-${role.toLowerCase()}@example.com`,
          role,
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
    const project = await prisma.project.create({
      data: {
        name: "Commerce scope comparison",
        type: "Website",
        requirements:
          "Build an e-commerce platform with email/password authentication, a product catalog, and a shopping cart.",
        budget: 100,
        deadline: new Date("2027-12-31"),
        clientId: client.user.id,
        developerId: developer.user.id,
        status: "ACTIVE",
        scope: {
          create: [
            { description: "Email/password authentication", position: 0 },
            { description: "Product catalog and shopping cart", position: 1 },
          ],
        },
        milestones: {
          create: {
            title: "Original implementation",
            description: "Deliver the original agreed commerce scope",
            amount: 100,
            estimatedDays: 5,
            position: 0,
            status: "COMPLETED",
          },
        },
      },
    });
    projectId = project.id;
    await client.page.goto(`/projects/${project.id}`);
    await client.page
      .getByLabel("New change request")
      .fill(
        "Add Google OAuth sign-in and a sales analytics dashboard. These are new features beyond the email/password login and shopping cart.",
      );
    await client.page
      .getByRole("button", { name: "Analyze change request" })
      .click();
    await expect(
      client.page.getByText("Potential scope change detected", { exact: true }),
    ).toBeVisible({ timeout: 90000 });
    const change = await prisma.changeRequest.findFirstOrThrow({
      where: { projectId: project.id },
      include: { analysis: true },
    });
    expect(change.status).toBe("DEVELOPER_REVIEW");
    expect(change.analysis?.provider).toBe("Gemini");
    expect(
      await prisma.milestone.count({ where: { projectId: project.id } }),
    ).toBe(1);
    await developer.page.goto(`/developer/projects/${project.id}`);
    await developer.page
      .getByText("Propose additional milestone", { exact: true })
      .click();
    await developer.page
      .getByLabel("Additional milestone title")
      .fill("Google OAuth and sales analytics");
    await developer.page
      .getByLabel("Additional deliverables")
      .fill(
        "Deliver Google sign-in, account linking, and a sales analytics dashboard.",
      );
    await developer.page.getByLabel("Additional amount (USD)").fill("50");
    await developer.page.getByLabel("Additional estimated days").fill("3");
    await developer.page
      .getByRole("button", { name: "Send additional proposal" })
      .click();
    await expect(
      developer.page.getByText("client review", { exact: true }).last(),
    ).toBeVisible();
    await client.page.reload();
    await client.page
      .getByRole("button", { name: "Approve additional milestone" })
      .click();
    await expect(
      client.page.getByText("Additional milestone approved.", { exact: false }),
    ).toBeVisible();
    const approved = await prisma.changeRequest.findUniqueOrThrow({
      where: { id: change.id },
      include: { milestone: true, project: true },
    });
    expect(approved.status).toBe("APPROVED");
    expect(approved.project.budget.toString()).toBe("150");
    expect(approved.milestone?.status).toBe("AWAITING_PAYMENT");
    expect(
      await prisma.payment.count({
        where: { milestoneId: approved.milestoneId! },
      }),
    ).toBe(0);
    await client.page.setViewportSize({ width: 390, height: 844 });
    await client.page.screenshot({
      path: "/tmp/dealmile-scope-mobile.png",
      fullPage: true,
      style: "nextjs-portal { visibility: hidden; }",
    });
    expect(
      await client.page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    // Separate deterministic delivery fixture; this is not PayPal transaction evidence.
    await prisma.payment.create({
      data: {
        milestoneId: approved.milestoneId!,
        amount: 50,
        currency: "USD",
        status: "CAPTURED",
        verifiedAt: new Date(),
        paypalOrderId: "SCOPEUNITORDER12345",
        paypalCaptureId: `scope-unit-${prefix}`,
        paypalPayeeId: "unit-merchant",
      },
    });
    await prisma.milestone.update({
      where: { id: approved.milestoneId! },
      data: { status: "FUNDED" },
    });
    await developer.page.reload();
    await developer.page
      .getByRole("button", { name: "Start milestone" })
      .click();
    await expect(developer.page.getByLabel("Delivered work")).toBeVisible();
    await developer.page
      .getByLabel("Delivered work")
      .fill(
        "Google sign-in, account linking, and analytics are delivered in the staging build.",
      );
    await developer.page.getByRole("button", { name: "Submit work" }).click();
    await client.page.reload();
    await client.page
      .getByRole("button", { name: "Request work revision" })
      .click();
    await developer.page.reload();
    await developer.page
      .getByLabel("Delivered work")
      .fill(
        "The client review fixes and analytics corrections are delivered in the staging build.",
      );
    await developer.page.getByRole("button", { name: "Submit work" }).click();
    await client.page.reload();
    await client.page
      .getByRole("button", { name: "Approve work", exact: true })
      .click();
    await expect(
      client.page.locator(".dashboard-title > .project-status"),
    ).toHaveText("completed");
    await client.page.reload();
    expect(
      (await prisma.project.findUniqueOrThrow({ where: { id: project.id } }))
        .status,
    ).toBe("COMPLETED");
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
    if (projectId) {
      await prisma.changeRequest.deleteMany({ where: { projectId } });
      await prisma.payment.deleteMany({ where: { milestone: { projectId } } });
      await prisma.project.delete({ where: { id: projectId } });
    }
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    await prisma.$disconnect();
  }
});
