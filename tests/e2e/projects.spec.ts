import { test, expect, type BrowserContext } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { createHmac, randomBytes } from "node:crypto";
import { hashPassword } from "../../lib/auth/password";
const prisma = new PrismaClient();
test("project draft, authorization, developer revision and client approval persist", async ({
  browser,
}) => {
  test.setTimeout(120000);
  const prefix = `workflow-${Date.now()}`;
  const contexts: BrowserContext[] = [];
  const users: string[] = [];
  try {
    async function account(role: "CLIENT" | "DEVELOPER", suffix: string) {
      const user = await prisma.user.create({
        data: {
          name: `Workflow ${suffix}`,
          email: `${prefix}-${suffix}@example.com`,
          role,
          passwordHash: await hashPassword("a secure workflow passphrase"),
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
    const client = await account("CLIENT", "client"),
      developer = await account("DEVELOPER", "developer"),
      intruder = await account("CLIENT", "intruder");
    await client.page.goto("/projects/new");
    await expect(
      client.page.getByRole("button", { name: "Generate project plan" }),
    ).toBeEnabled();
    await expect(client.page.getByLabel("Developer’s email")).toHaveCount(0);
    await expect(client.page.getByLabel("Milestone title")).toHaveCount(0);
    // A provider fixture keeps the human-review browser test independent of Gemini availability.
    const draft = await prisma.project.create({
      data: {
        name: "AI proposal fixture",
        type: "Website",
        requirements: "Build an e-commerce site with authentication",
        budget: 1000,
        deadline: new Date("2027-12-31"),
        clientId: client.user.id,
        developerId: developer.user.id,
        scope: { create: { description: "Product catalog", position: 0 } },
        milestones: {
          create: {
            title: "Implementation",
            description: "Deliver the working application",
            amount: 1000,
            estimatedDays: 20,
            position: 0,
          },
        },
      },
    });
    await client.page.goto(`/projects/${draft.id}/plan`);
    await expect(
      client.page.getByRole("button", { name: "Save changes" }),
    ).toBeEnabled();
    await client.page.getByLabel("Project name").fill("E-commerce Platform");
    await client.page
      .getByLabel("Requirements", { exact: true })
      .fill(
        "Build email/password authentication, product management, shopping cart, and an admin dashboard.",
      );
    await client.page
      .getByLabel("Included scope")
      .fill(
        "Email/password authentication\nProduct management\nShopping cart\nAdmin dashboard",
      );
    await client.page.getByLabel("Total budget (USD)").fill("1000");
    await client.page.getByLabel("Desired deadline").fill("2027-12-31");
    await client.page.getByLabel("Milestone title").fill("UI/UX Design");
    await client.page
      .getByLabel("Deliverables")
      .fill("Deliver responsive interface designs");
    await client.page.getByLabel("Amount (USD)", { exact: true }).fill("900");
    await client.page.getByLabel("Estimated days").fill("5");
    await client.page.getByRole("button", { name: "Save changes" }).click();
    await expect(client.page.locator(".form-error")).toContainText("add up");
    await client.page.getByLabel("Amount (USD)", { exact: true }).fill("1000");
    await client.page.getByRole("button", { name: "Save changes" }).click();
    await expect(client.page).toHaveURL(/\/projects\/c[a-z0-9]+$/);
    const id = client.page.url().split("/").at(-1)!;
    expect(
      (await prisma.project.findUniqueOrThrow({ where: { id } })).status,
    ).toBe("DRAFT");
    await developer.page.goto(`/developer/projects/${id}`);
    await expect(
      developer.page.getByRole("heading", {
        name: "This page isn’t on the plan.",
      }),
    ).toBeVisible();
    await client.page
      .getByRole("button", { name: "Submit to developer" })
      .click();
    await expect(client.page.locator(".project-status")).toContainText(
      "pending developer review",
    );
    await intruder.page.goto(`/projects/${id}`);
    await expect(
      intruder.page.getByRole("heading", {
        name: "This page isn’t on the plan.",
      }),
    ).toBeVisible();
    await developer.page.goto(`/developer/projects/${id}`);
    await developer.page.getByRole("button", { name: "Start review" }).click();
    await expect(
      developer.page.getByRole("button", { name: "Accept proposal" }),
    ).toBeVisible();
    await developer.page.getByRole("link", { name: "Revise proposal" }).click();
    await expect(
      developer.page.getByRole("button", { name: "Send revised proposal" }),
    ).toBeEnabled();
    await developer.page.getByLabel("Total budget (USD)").fill("1200");
    await developer.page
      .getByLabel("Amount (USD)", { exact: true })
      .fill("1200");
    await developer.page
      .getByRole("button", { name: "Send revised proposal" })
      .click();
    await expect(developer.page.locator(".project-status")).toContainText(
      "client review",
    );
    await client.page.reload();
    await expect(
      client.page.getByText("Your developer has proposed revised terms."),
    ).toBeVisible();
    await client.page
      .getByRole("button", { name: "Approve revised proposal" })
      .click();
    await expect(client.page.locator(".project-status")).toHaveText("agreed");
    await client.page.reload();
    const project = await prisma.project.findUniqueOrThrow({
      where: { id },
      include: { milestones: true, revisions: true },
    });
    expect(Number(project.budget)).toBe(1200);
    expect(project.status).toBe("AGREED");
    expect(project.milestones[0].status).toBe("AWAITING_PAYMENT");
    expect(project.revisions).toHaveLength(2);
    expect(project.revisions.some((r) => r.acceptedAt)).toBe(true);
    await client.page.goto("/dashboard");
    await client.page.screenshot({
      path: "/tmp/dealmile-projects-desktop.png",
      fullPage: true,
      style: "nextjs-portal { visibility: hidden; }",
    });
    await client.page.setViewportSize({ width: 390, height: 844 });
    await client.page.screenshot({
      path: "/tmp/dealmile-projects-mobile.png",
      fullPage: true,
      style: "nextjs-portal { visibility: hidden; }",
    });
    expect(
      await client.page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await client.page.goto(`/projects/${id}`);
    await client.page.screenshot({
      path: "/tmp/dealmile-agreement-mobile.png",
      fullPage: true,
      style: "nextjs-portal { visibility: hidden; }",
    });
    // An incomplete legacy capture record cannot show success until the server funds it.
    const token = `ui-payment-${prefix}`;
    await prisma.payment.create({
      data: {
        milestoneId: project.milestones[0].id,
        amount: 1200,
        currency: "USD",
        status: "CAPTURED",
        paypalOrderId: token,
        paypalPayeeId: "sandbox-ui-fixture",
      },
    });
    await client.page.goto(`/projects/${id}/payment?token=${token}`);
    await expect(
      client.page.getByText(
        "Waiting for server-verified PayPal capture confirmation…",
      ),
    ).toBeVisible();
    await expect(
      client.page.getByText("Milestone funded.", { exact: true }),
    ).toHaveCount(0);
    await client.page.screenshot({
      path: "/tmp/dealmile-payment-mobile.png",
      fullPage: true,
      style: "nextjs-portal { visibility: hidden; }",
    });
    expect(
      await client.page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await client.page.setViewportSize({ width: 1440, height: 1000 });
    await client.page.screenshot({
      path: "/tmp/dealmile-payment-desktop.png",
      fullPage: true,
      style: "nextjs-portal { visibility: hidden; }",
    });
    await developer.page.goto(`/projects/${id}/plan`);
    await expect(
      developer.page.getByRole("heading", {
        name: "This page isn’t on the plan.",
      }),
    ).toBeVisible();
    await client.page.setViewportSize({ width: 390, height: 844 });
    expect(
      await client.page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  } finally {
    await Promise.all(contexts.map((c) => c.close()));
    await prisma.payment.deleteMany({
      where: { milestone: { project: { clientId: { in: users } } } },
    });
    await prisma.project.deleteMany({ where: { clientId: { in: users } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    await prisma.$disconnect();
  }
});
