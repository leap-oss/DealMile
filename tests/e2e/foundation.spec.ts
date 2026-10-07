import { test, expect } from "@playwright/test";
test("landing marquee supports pause, reduced motion and full-width sticky navigation", async ({
  page,
}) => {
  await page.goto("/");
  const track = page.locator(".marquee-track");
  await expect(track).toBeVisible();
  await expect(track).toHaveCSS("animation-name", "principle-scroll");
  await expect(page.getByText("Pause motion", { exact: true })).toHaveCount(0);
  await page.locator(".principle-marquee").hover();
  await expect(track).toHaveCSS("animation-play-state", "paused");
  await page.mouse.move(0, 0);
  await expect(track).toHaveCSS("animation-play-state", "running");
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.evaluate(() => scrollTo(0, 600));
    const bounds = await page.locator(".public-header").boundingBox();
    expect(bounds?.x).toBe(0);
    expect(bounds?.width).toBe(width);
    expect(bounds?.y).toBe(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(track).toHaveCSS("animation-name", "none");
  await expect(page.locator(".marquee-group[aria-hidden='true']")).toBeHidden();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const prefix = `foundation-${Date.now()}`;
const password = "a secure e2e passphrase";
test.afterAll(async () => {
  const users = await prisma.user.findMany({
    where: { email: { startsWith: prefix } },
    select: { email: true },
  });
  await prisma.user.deleteMany({ where: { email: { startsWith: prefix } } });
  const { createHmac } = await import("node:crypto");
  await prisma.authAttempt.deleteMany({
    where: {
      key: {
        in: users.map((u) =>
          createHmac("sha256", process.env.AUTH_SECRET!)
            .update(`auth:${u.email}`)
            .digest("hex"),
        ),
      },
    },
  });
  await prisma.$disconnect();
});
test("public workflow preview works and stays within mobile viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  await page.screenshot({ path: "/tmp/dealmile-desktop.png", fullPage: true });
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Clear agreements",
  );
  await page.getByRole("tab", { name: /03\s*Pay/ }).click();
  await expect(page.getByRole("tabpanel")).toContainText(
    "A payment for every milestone",
  );
  await page.getByRole("tab", { name: /04\s*Adapt/ }).click();
  await expect(page.getByRole("tabpanel")).toContainText(
    "Potential new requirement",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "/tmp/dealmile-mobile.png", fullPage: true });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("anonymous users cannot open private workspaces", async ({ page }) => {
  for (const path of ["/dashboard", "/developer", "/settings"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login$/);
  }
});
for (const role of ["CLIENT", "DEVELOPER"] as const) {
  test(`${role}: registration, persistence, role guard, logout and login`, async ({
    page,
  }) => {
    const email = `${prefix}-${role.toLowerCase()}@example.com`;
    const root = role === "CLIENT" ? "/dashboard" : "/developer";
    await page.goto(`/register?role=${role}`);
    await page.getByLabel("Full name").fill(`Test ${role}`);
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL(new RegExp(`${root}$`));
    await expect(
      page.getByRole("heading", { name: /Welcome, Test/ }),
    ).toBeVisible();
    for (const [size, width, height] of [
      ["desktop", 1440, 1000],
      ["tablet", 768, 1024],
      ["mobile", 390, 844],
    ] as const) {
      await page.setViewportSize({ width, height });
      await page.screenshot({
        path: `/tmp/dealmile-${role.toLowerCase()}-${size}.png`,
        fullPage: true,
        style: "nextjs-portal { visibility: hidden; }",
      });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await expect(
        page
          .getByRole("navigation", { name: "Workspace navigation" })
          .getByRole("link", { name: "Overview" }),
      ).toHaveAttribute("aria-current", "page");
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    const overview = page
      .getByRole("navigation", { name: "Workspace navigation" })
      .getByRole("link", { name: "Overview" });
    await page.keyboard.press("Tab");
    await overview.focus();
    expect(
      await overview.evaluate((el) => getComputedStyle(el).outlineStyle),
    ).toBe("solid");
    expect(
      await overview.evaluate((el) => getComputedStyle(el).outlineWidth),
    ).toBe("3px");
    if (role === "CLIENT") {
      await page.emulateMedia({ reducedMotion: "reduce" });
      const start = page.getByRole("link", { name: "Start a project" });
      await start.hover();
      expect(await start.evaluate((el) => getComputedStyle(el).transform)).toBe(
        "none",
      );
      await page.emulateMedia({ reducedMotion: "no-preference" });
    }
    const cookies = await page.context().cookies();
    const cookie = cookies.find((c) => c.name === "dealmile_session");
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe("Lax");
    await page.reload();
    await expect(page).toHaveURL(new RegExp(`${root}$`));
    await page.goto(role === "CLIENT" ? "/developer" : "/dashboard");
    await expect(page).toHaveURL(new RegExp(`${root}$`));
    await page.goto("/settings");
    await expect(page.getByText(email, { exact: true })).toBeVisible();
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    expect(user.passwordHash).not.toContain(password);
    expect(user.role).toBe(role);
    expect(await prisma.session.count({ where: { userId: user.id } })).toBe(1);
    await page.getByRole("button", { name: "Log out" }).first().click();
    await expect(page).toHaveURL("/");
    expect(await prisma.session.count({ where: { userId: user.id } })).toBe(0);
    await page.goto(root);
    await expect(page).toHaveURL(/\/login$/);
    await page.getByLabel("Email address").fill(email);
    await page
      .getByLabel("Password", { exact: true })
      .fill("incorrect passphrase");
    await page.getByRole("button", { name: "Log in", exact: true }).click();
    await expect(page.locator(".form-error")).toContainText(
      "Email or password is incorrect",
    );
    await expect(page.getByLabel("Email address")).toHaveValue(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Log in", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${root}$`));
    // Revoking the database session invalidates the browser cookie immediately.
    await prisma.session.deleteMany({ where: { userId: user.id } });
    await page.reload();
    await expect(page).toHaveURL(/\/login$/);
  });
}
test("forged session cannot grant access", async ({ page, context }) => {
  await context.addCookies([
    {
      name: "dealmile_session",
      value: "a".repeat(64),
      domain: "localhost",
      path: "/",
    },
  ]);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);
});
test("registration works with a Codespaces proxy forwarded host", async ({
  page,
  context,
}) => {
  await context.setExtraHTTPHeaders({
    "x-forwarded-host": "test-codespaces-proxy-3100.app.github.dev",
  });
  const email = `${prefix}-proxy@example.com`;
  await page.goto("/register");
  await page.getByLabel("Full name").fill("Proxy Test Client");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(
    page.getByRole("heading", { name: /Welcome, Proxy/ }),
  ).toBeVisible();
  expect((await prisma.user.findUniqueOrThrow({ where: { email } })).role).toBe(
    "CLIENT",
  );
  await page.getByRole("button", { name: "Log out" }).first().click();
  await expect(page).toHaveURL("/");
});
