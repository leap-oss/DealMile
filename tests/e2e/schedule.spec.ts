import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { createHmac, randomBytes } from "node:crypto";
const prisma = new PrismaClient();
test("developer calendar shows cross-project work, filters, mobile layout and bilateral cancellation", async ({
  browser,
}) => {
  test.setTimeout(180000);
  const prefix = `schedule-${Date.now()}`,
    users: string[] = [],
    projects: string[] = [],
    contexts: import("@playwright/test").BrowserContext[] = [];
  try {
    const account = async (role: "CLIENT" | "DEVELOPER", suffix: string) => {
      const user = await prisma.user.create({
        data: {
          name: suffix,
          email: `${prefix}-${suffix}@example.com`,
          passwordHash: "unused",
          role,
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
    };
    const developer = await account("DEVELOPER", "developer"),
      client = await account("CLIENT", "client"),
      other = await account("DEVELOPER", "other");
    const due = new Date();
    due.setUTCHours(23, 59, 59, 0);
    const project = async (name: string, developerId: string) => {
      const p = await prisma.project.create({
        data: {
          name,
          type: "Website",
          requirements: "Build an accessible website",
          budget: 100,
          deadline: new Date("2028-12-31"),
          status: "ACTIVE",
          developerId,
          clientId: client.user.id,
          milestones: {
            create: [
              {
                title: `${name} implementation`,
                description: "Complete agreed implementation",
                amount: 70,
                estimatedDays: 3,
                position: 0,
                status: "IN_PROGRESS",
                dueAt: due,
              },
              {
                title: `${name} polish`,
                description: "Polish after implementation",
                amount: 30,
                estimatedDays: 2,
                position: 1,
              },
            ],
          },
        },
        include: { milestones: { orderBy: { position: "asc" } } },
      });
      projects.push(p.id);
      return p;
    };
    const alpha = await project("Alpha", developer.user.id),
      beta = await project("Beta", developer.user.id),
      privateProject = await project("Private", other.user.id);
    // Isolated capture fixture for visible readiness. This test never calls PayPal.
    await prisma.payment.createMany({
      data: [alpha, beta].map((p) => ({
        milestoneId: p.milestones[0].id,
        amount: 70,
        currency: "USD",
        status: "CAPTURED",
        verifiedAt: new Date(due.getTime() - 3 * 86400000),
        paypalCaptureId: `${p.id}CAPTURE`,
        paypalOrderId: `${p.id}ORDER`,
      })),
    });
    const errors: string[] = [],
      warnings: string[] = [],
      cdn: string[] = [];
    developer.page.on("pageerror", (e) => errors.push(e.message));
    developer.page.on("console", (m) => {
      if (
        /inner store configurations|Structural CSS missing|CSS issues detected/.test(
          m.text(),
        )
      )
        warnings.push(m.text());
    });
    developer.page.on("request", (r) => {
      if (/cdn.*bryntum|bryntum.*cdn/i.test(r.url())) cdn.push(r.url());
    });
    await developer.page.goto("/developer/schedule");
    await expect(
      developer.page.getByRole("heading", { name: "Schedule." }),
    ).toBeVisible();
    await expect(developer.page.locator(".b-calendar")).toBeVisible({
      timeout: 90000,
    });
    const monthColors = await developer.page.evaluate(() => {
      const current = document.querySelector(
        ".dealmile-calendar .b-month-view .b-calendar-cell:not(.b-other-month)",
      );
      const other = document.querySelector(
        ".dealmile-calendar .b-month-view .b-calendar-cell.b-other-month",
      );
      return current && other
        ? [
            getComputedStyle(current).backgroundColor,
            getComputedStyle(other).backgroundColor,
          ]
        : [];
    });
    expect(monthColors).toHaveLength(2);
    expect(monthColors[0]).not.toBe(monthColors[1]);
    await expect(developer.page.locator(".schedule-work")).toHaveCount(4);
    await expect(
      developer.page.locator(".schedule-work-list"),
    ).not.toContainText("Private");
    await expect(
      developer.page.locator(".schedule-work-list"),
    ).not.toContainText(/PayPal|\$|funded/i);
    await expect(
      developer.page
        .locator(".b-cal-event")
        .filter({ hasText: "Alpha implementation" })
        .first(),
    ).toBeVisible();
    await expect(
      developer.page
        .locator(".b-cal-event")
        .filter({ hasText: "Tentative · Alpha polish" })
        .first(),
    ).toBeVisible();
    await expect(
      developer.page.locator(`#schedule-work-${alpha.milestones[0].id}`),
    ).toContainText("Confirmed delivery window");
    await expect(
      developer.page.locator(`#schedule-work-${alpha.milestones[1].id}`),
    ).toContainText("Tentative");
    await developer.page.screenshot({
      path: "/tmp/dealmile-schedule-desktop.png",
      fullPage: true,
    });
    await developer.page
      .getByLabel("Project", { exact: true })
      .selectOption(alpha.id);
    await expect(developer.page.locator(".schedule-work")).toHaveCount(2);
    await expect(
      developer.page
        .locator(".b-cal-event")
        .filter({ hasText: "Beta implementation" }),
    ).toHaveCount(0);
    await developer.page.setViewportSize({ width: 390, height: 844 });
    await expect(developer.page.locator(".b-calendar")).toBeVisible();
    expect(
      await developer.page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await developer.page.screenshot({
      path: "/tmp/dealmile-schedule-mobile.png",
      fullPage: true,
    });
    // Dense dates must remain bounded and reveal hidden work through SDK overflow.
    for (let index = 0; index < 7; index++)
      await project(`Dense ${index}`, developer.user.id);
    await developer.page.goto("/developer/schedule");
    await expect(developer.page.locator(".schedule-work")).toHaveCount(18);
    const overflow = developer.page
      .locator(".b-cal-cell-overflow")
      .filter({ visible: true })
      .first();
    await expect(overflow).toBeVisible();
    await overflow.click();
    await expect(developer.page.locator(".b-overflow-popup")).toBeVisible();
    expect(
      await developer.page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await developer.page.keyboard.press("Escape");
    await developer.page
      .getByLabel("Project", { exact: true })
      .selectOption(alpha.id);
    await developer.page
      .getByRole("link", { name: "Alpha implementation", exact: true })
      .click();
    await expect(developer.page).toHaveURL(
      new RegExp(`/developer/projects/${alpha.id}`),
    );
    await expect(
      developer.page.getByRole("button", { name: "Open timeline" }),
    ).toHaveCount(0);
    await developer.page
      .getByText("Request cancellation by mutual agreement", { exact: true })
      .click();
    await developer.page
      .getByLabel("Cancellation reason", { exact: true })
      .fill("I cannot continue and propose refunding unfinished work.");
    await developer.page
      .getByRole("button", {
        name: "Request project cancellation",
        exact: true,
      })
      .click();
    await expect(
      developer.page.getByText("Cancellation · pending", { exact: true }),
    ).toBeVisible();
    await expect(
      developer.page.getByRole("button", {
        name: "Approve cancellation settlement",
        exact: true,
      }),
    ).toHaveCount(0);
    await client.page.goto(`/projects/${alpha.id}`);
    await expect(
      client.page.getByText("Cancellation · pending", { exact: true }),
    ).toBeVisible();
    await client.page
      .getByLabel("Reason if declining", { exact: true })
      .fill("We can negotiate a different delivery schedule instead.");
    await client.page
      .getByRole("button", { name: "Decline cancellation", exact: true })
      .click();
    await expect(
      client.page.getByText("Cancellation · rejected", { exact: true }),
    ).toBeVisible();
    await client.page.goto("/developer/schedule");
    await expect(client.page).toHaveURL(/\/dashboard$/);
    await other.page.goto("/developer/schedule");
    await expect(other.page.locator(".schedule-work-list")).toContainText(
      privateProject.name,
    );
    await expect(other.page.locator(".schedule-work-list")).not.toContainText(
      "Alpha",
    );
    const saved = await prisma.project.findUniqueOrThrow({
      where: { id: alpha.id },
      include: { milestones: { orderBy: { position: "asc" } } },
    });
    expect(saved.paymentHold).toBe(false);
    expect(saved.status).toBe("ACTIVE");
    expect(saved.milestones[0].dueAt?.getTime()).toBe(due.getTime());
    expect(errors).toEqual([]);
    expect(warnings).toEqual([]);
    expect(cdn).toEqual([]);
  } finally {
    await Promise.allSettled(contexts.map((c) => c.close()));
    await prisma.payment.deleteMany({
      where: { milestone: { projectId: { in: projects } } },
    });
    await prisma.project.deleteMany({ where: { id: { in: projects } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    await prisma.$disconnect();
  }
});
