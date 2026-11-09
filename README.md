# DealMile

**AI-assisted client–developer agreements with verified PayPal milestone payments.**

DealMile turns raw client requirements into structured, milestone-based agreements with Google Gemini, supports bilateral negotiation and approvals, verifies PayPal Sandbox funding server-side before work begins, tracks deliveries, and detects scope changes mid-project.

> *"AI recommends. Humans approve. PayPal verifies."*

---

## Highlights & Features

- **Gemini Project Planning:** Converts unstructured project briefs into structured deliverables and sequential milestones aligned to budget and deadline, backed by strict Zod schema validation.
- **Bilateral Human Agreement:** Neither client nor developer can unilaterally dictate terms. Full proposal lifecycle: Draft $\rightarrow$ Developer Review $\rightarrow$ Bilateral Agreement $\rightarrow$ Milestone Payment $\rightarrow$ Delivery.
- **PayPal Sandbox Milestone Verification:** Real server-side order creation, buyer authorization, and capture verification through PayPal REST APIs. Milestones unlock only upon verified capture with immutable audit IDs. DealMile never holds funds.
- **AG Grid Financial Ledger & Dashboards:** Scannable, dense financial table with client/developer perspectives, sortable milestone schedules, capture IDs, and CSV export.
- **Bryntum Schedule Calendar:** Visual timeline displaying active multi-day delivery windows for funded milestones and sequential tentative projections for upcoming work.
- **Gemini Scope Intelligence:** Evaluates new scope requests against original contract snapshots, automatically flagging out-of-scope creep, estimated cost adjustments, and schedule impacts.
- **Deadline Safeguards & Bilateral Extension:** Delivery countdowns tied to server-verified capture, bilateral deadline adjustment requests, problem reporting holds, and idempotent refund resolution.
- **Project Lifecycle Management:** Two-step confirmation for deleting inactive `REJECTED` and `CANCELLED` projects.

---

## Live Demo Workflow (Step-by-Step)

1. **Client Onboarding & Project Definition (`/projects/new`):**
   Client inputs project name, category, budget, and raw requirements, then clicks **Generate project plan**.
2. **AI Planning Review (`/projects/[id]/plan`):**
   Gemini generates structured deliverables, milestone pricing, and estimated days. The client can edit any detail, adjust milestone amounts, and save.
3. **Bilateral Proposal Agreement:**
   - Client submits the proposal to the assigned developer.
   - Developer logs in (`/developer`), reviews the terms, and clicks **Accept proposal** (locking status to `Agreed`).
4. **PayPal Sandbox Milestone Funding (`/projects/[id]/payment`):**
   - Client clicks **Pay with PayPal Sandbox** on Milestone 01.
   - Signs into PayPal Sandbox buyer account and approves payment.
   - Redirects to DealMile confirmation where server-side capture verification records the PayPal Order ID and Capture ID.
5. **Verified Work & Schedule Management:**
   - Developer verifies capture details in the AG Grid ledger and clicks **Start milestone**.
   - Both parties monitor the active delivery window on the **Bryntum Calendar** (`/schedule`).
6. **Scope Intelligence (`/projects/[id]`):**
   Client submits an additional feature request. Gemini compares it against the original agreement snapshot and tags new requirements as out-of-scope.

---

## Tech Stack

- **Framework:** [Next.js](https://nextjs.org/) (App Router, Server Components & Server Actions)
- **Language & Runtime:** [TypeScript](https://www.typescriptlang.org/), Node.js 22.x
- **AI Engine:** [Google Gemini API](https://ai.google.dev/) (REST API with Structured Output JSON Schema)
- **Payment Platform:** [PayPal Developer Platform](https://developer.paypal.com/) (Orders v2 API, Server-Side Captures, Refunds, & Webhook verification)
- **Enterprise Components:** [AG Grid](https://www.ag-grid.com/) (Financial Ledger & Project Grids), [Bryntum Calendar](https://bryntum.com/products/calendar/) (Delivery Schedule)
- **Database & ORM:** [PostgreSQL](https://www.postgresql.org/), [Prisma ORM](https://www.prisma.io/)
- **Validation & Styling:** [Zod](https://zod.dev/), [Tailwind CSS](https://tailwindcss.com/)
- **Testing:** [Playwright](https://playwright.dev/) (E2E), Node.js native test runner

---

## Local Setup

### Prerequisites
- Node.js 22.x & npm
- Docker & Docker Compose (or a local PostgreSQL instance)
- Google Gemini API key
- PayPal Developer Sandbox credentials

### Installation

```bash
# 1. Clone repository & install dependencies
git clone <repo-url>
cd dealmile
npm install

# 2. Configure environment variables
cp .env.example .env
# Edit .env and supply:
# - GEMINI_API_KEY
# - PAYPAL_CLIENT_ID & PAYPAL_CLIENT_SECRET
# - Generate AUTH_SECRET: openssl rand -hex 32

# 3. Start PostgreSQL container & run migrations
docker compose up -d
npm run db:generate
npm run db:migrate

# 4. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

> **Tip for Multi-User Testing:** Register a developer account in one browser profile, and a client account in an incognito window or separate profile.

---

## Verifying Integrations

Run automated connection and integrity checks:

```bash
# Verify Gemini AI structured output & planning
npm run check:gemini

# Verify Gemini model availability & PayPal OAuth connection
npm run check:connections

# Verify delivery deadline logic
npm run check:deadlines

# Validate Prisma schema & type safety
npm run db:validate
npm run typecheck
npm test
```

---

## Architecture

- `app/` — Server routes, layouts, server actions, and PayPal callback handlers.
- `components/` — Workspace shells, AG Grid financial ledger, Bryntum Calendar, and accessible UI controls.
- `lib/ai/` — Gemini REST client, structured JSON schemas, project planner, and scope intelligence comparator.
- `lib/payments/` — PayPal Sandbox integration, capture verification, idempotency locks, and refund flows.
- `lib/projects/` — Bilateral agreement state machine, proposal versioning, and transaction isolation.
- `lib/schedule/` — Bryntum Calendar data projection for confirmed and tentative delivery windows.
- `prisma/` — PostgreSQL schema, indexes, and historical audit trail tables.
- `tests/` — Unit tests, database integration suites, and Playwright E2E tests.

---

## Security & Payment Integrity

- **Server-Side Validation:** All status transitions, pricing calculations, and payment captures are executed and validated exclusively on the server.
- **Idempotency & Concurrency:** Database transactions and bounded leases protect against duplicate captures, conflicting proposal approvals, or race conditions.
- **Zero Custody:** DealMile does not hold client funds. All financial transactions flow directly between client and developer via PayPal Sandbox.
