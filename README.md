# DealMile

Every milestone starts with a clear deal.

DealMile connects project requirements, human-approved agreements, milestones, scope changes, and PayPal payments. See [DEPLOYMENT.md](./DEPLOYMENT.md) for deployment preparation, environment configuration, and release checks.

## Available now

- Responsive landing page with labeled, interactive workflow examples.
- Client/developer registration, login, and private database-backed workspaces.
- Project drafts with editable scope, milestones, budget, deadline, and an assigned developer.
- Developer review, rejection, acceptance, and revised proposals requiring client approval.
- Gemini project planning with structured output, Zod validation, editable recommendations, persistence, loading feedback, and failure recovery.

Real PayPal Sandbox checkout/capture is verified without a webhook. Milestone delivery/revision/approval and Gemini scope-change analysis with human-reviewed additional proposals are implemented. DealMile does not hold funds.

## Local setup

Requires Node.js 22.x, npm, Docker Compose (or an existing PostgreSQL server).

```bash
cp .env.example .env
# Replace AUTH_SECRET with a random value:
openssl rand -hex 32
npm install
docker compose up -d
npm run db:generate
npm run db:migrate
npm run dev
```

Open http://localhost:3000. Register a developer, then a client in another browser session. New projects go to a registered developer with the fewest unfinished assigned projects, with random selection only among ties. Drafts/planning/review reserve capacity; completed, rejected and cancelled projects do not count. Selection and creation share a serializable transaction with retries, including AI-assisted drafts. Existing draft retries retain their assigned partner. The client starts with an AI-generated draft, then reviews and revises scope, milestones, and budget. There are no authentication bypasses or seeded passwords.

Compose uses a named volume for persistence. If PostgreSQL is already running, configure its connection URL instead of starting a second container on the same port.

`APP_URL` is the configured application origin, including protocol and port. It remains `http://localhost:3000` during local development. Development also trusts the exact Codespaces forwarding URL derived from `CODESPACE_NAME` and `GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN`; Next.js Server Actions and authentication use this same explicit allowlist, so forwarded localhost requests work without broad wildcard trust. Production does not add the Codespaces development origin. Production requires HTTPS because cookies are secure in production. Environment variables are checked on the server; never publish `.env`.

## Gemini

Set `GEMINI_API_KEY` in `.env`. The default model is `gemini-3.5-flash-lite`, which was verified with the supplied key. Set `GEMINI_MODEL` to use another model available to your account.

The adapter calls the [Gemini generateContent REST API with structured JSON output](https://ai.google.dev/gemini-api/docs/generate-content/structured-output). The request uses `responseMimeType` and `responseJsonSchema` under `generationConfig`; no Gemini SDK is installed. Zod 4 exports the JSON Schema and validates the returned data. The provider ignores thought parts and never persists unvalidated text.

```bash
npm run check:gemini
```

This makes a real Gemini request and validates both the structured project plan and the proposal budget. It outputs the test plan, never API credentials. In the app, enter the project details and click **Generate project plan**, then review/edit the saved draft before submission. AI prices remain recommendations.

## PayPal Sandbox preparation

`PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` are server-only. `PAYPAL_WEBHOOK_ID` is optional for local Sandbox checkout. Server-created orders, buyer approval, capture, and an authenticated PayPal API read verify the order/capture IDs, amount, currency, recipient, and milestone before funding. Webhooks are an additional asynchronous reconciliation path, not a funding prerequisite. API endpoints are fixed to Sandbox.

```bash
npm run check:connections
```

This checks Gemini model availability and PayPal OAuth without printing credentials or access tokens. Do not register a webhook or deploy until authorized. A later public HTTPS callback can use `/api/paypal/webhook`. Without a webhook ID the endpoint returns 503 and accepts no events; checkout continues and the server logs that webhook confirmation is not configured.

Prepared payment code follows [PayPal Orders API](https://developer.paypal.com/api/rest/integration/orders-api) and [webhook verification](https://developer.paypal.com/api/rest/webhooks/rest/). Tests with fixtures are not real transaction evidence. The current setup targets one configured Sandbox merchant, not connected accounts for multiple sellers.

To prepare a real order for an existing agreed project:

```bash
npm run check:paypal -- <project-id>
```

Open `/projects/<project-id>` as its client and choose **Pay with PayPal**. Sign in using a **Personal Sandbox buyer**, separate from the configured Business seller (Developer Dashboard → Sandbox Accounts → View/Edit Account). Return to `/projects/<project-id>/payment?token=<order-id>` and choose **Confirm payment**. Browser return parameters cannot fund a milestone; capture and an authenticated PayPal read must pass verification first. Retries reuse the persisted order and capture request IDs.

`APP_URL` stays `http://localhost:3000`. If using a Codespaces browser URL, PayPal still returns to localhost: use local port forwarding, or reopen the same return path and `token` on the Codespaces URL in the client’s authenticated session. For Codespaces checkout without manual URL changes, configure `APP_URL` to the exact forwarded HTTPS origin and restart the server before creating a new order. Existing PayPal orders retain their original return URL. At deployment, configure the application’s public HTTPS origin; never retain localhost as the deployed `APP_URL`. Runtime production rejects HTTP and loopback callback origins.

## Delivery deadlines and cases

A milestone's delivery deadline starts at server-verified funding plus its agreed estimated days. Existing verified payments are backfilled by migration. Unpaid/locked work is not overdue. Submitted work awaits client review and does not trigger developer-overdue reminders.

Open a project to see the delivery date. Developers use **Request more delivery time**; clients approve/reject the requested date. The existing deadline stays in force until approval. **Report a delivery problem** records missing deliverables and contact evidence, pauses new checkout/capture and milestone approvals, and lets the developer propose a resolution. Client approval is required to resume with a new date, cancel unpaid remaining work, or authorize a full refund. Already-created orders must be reconciled before cancellation. A bounded server lease prevents a case from interrupting an active PayPal operation.

A full refund is a separate **Process / verify agreed refund** action after bilateral approval. It uses the persisted idempotency key with the [PayPal Payments API](https://developer.paypal.com/api/payments/v2/captures-refund) and an authenticated refund read. Capture association, full amount/currency and COMPLETED status must match before marking REFUNDED. Pending/failed/network-error responses leave the payment captured and the case open for verification retry. Verified refund cancels the affected milestone and remaining unpaid work; capture/refund history is retained. Existing real Sandbox captures are never automatically refunded by tests or deadlines.

Reminders are in-app, visible on dashboard/project loads, with one history entry per deadline/status. No emails, push messages or cron service are configured. To record reminders without page visits, schedule this command externally:

```bash
npm run check:deadlines
```

Delivery reports are internal records, not PayPal disputes. There is no administrator adjudication or forced refund. If a developer does not respond, the hold remains until withdrawal or an agreed resolution; the case links to PayPal's guidance for unresolved transactions. Full refund provider/database behavior is tested with isolated fixtures; a new real Sandbox refund has not been executed.

## Developer Schedule & bilateral cancellation

Developers open **Schedule** in the sidebar (`/developer/schedule`) to see milestone ranges across assigned submitted/agreed projects. Bryntum Calendar trial and React wrapper 7.3.7 provide month/week/agenda views. Project filtering, milestone links and an accessible work list remain available on mobile. Every milestone appears as an inclusive UTC date range. Active delivery windows use the verified capture start and stored deadline. Future work uses sequential milestone durations and is explicitly labeled Tentative; estimates start from today or after the preceding delivery window and may shift with readiness or agreement. A missing verified start is labeled estimated, even when the deadline is confirmed. These read-only forecasts never persist or replace contractual dates. Dense month cells use Bryntum overflow popups; project filtering and Agenda provide alternate views without a project cap. Payment amounts and PayPal gates are omitted. Calendar is read-only; changing a view never changes deadlines. Trial branding is preserved and production use remains subject to Bryntum licensing.

Calendar code loads in a separate client-only chunk, with local structural CSS/theme/icon fonts and a stable ProjectModel wrapper. The project-detail Gantt and its dependencies were removed. Activity retains its vertical timeline. Brief entrance and success transitions respect reduced motion.

Either assigned party can request cancellation from project details after proposal submission. Requests pause payment/milestone/agreement changes and require the other party's approval. Rejection or requester withdrawal lifts the hold. Completed milestones and their payments are retained. The current settlement supports cancellation of unpaid work plus a full refund of the single unfinished funded milestone; different/partial financial terms are not implemented. Unreconciled existing checkout orders block a request. A separate action processes an agreed refund using existing idempotent PayPal verification. Pending/failed refunds keep work paused; the project becomes cancelled only after authoritative completion.

Development logs include first-visit compilation. For a local production check, stop the development server, run `npm run build`, then `npm start`. Keep PostgreSQL running; this does not deploy the app.

## Checks

```bash
npm run db:validate
npm run typecheck
npm test
npm run test:integration
npm run build
npx playwright install chromium
npm run test:e2e
```

Integration/browser tests require a local or test PostgreSQL database. Tests create isolated accounts/projects and clean them up. Never run them against production. Browser tests start port 3100; stop other dev servers for this checkout first, because Next.js locks its development output directory. This Ubuntu 20.04 workspace uses `PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=ubuntu22.04-x64` for the fallback browser build.

Webpack is used for dev/build because Turbopack’s CSS IPC process cannot bind its port in this workspace environment.

## Architecture

- `app/`: server routes, layouts, actions, payment callback page, and prepared webhook endpoint.
- `components/`: reusable public/private layouts and focused interactive forms/controls.
- `lib/auth/`: salted scrypt passwords, HMAC-hashed opaque database sessions, and authorization.
- `lib/projects/`: validated proposals and server-enforced state transitions.
- `lib/ai/`: provider contract, Gemini REST adapter, and draft planner/persistence.
- `lib/payments/`: Sandbox adapter and prepared authoritative payment verification.
- `prisma/`: relational schema and committed migrations.
- `tests/`: unit, database integration, and browser tests.

Server Components are the default. Secrets, Prisma, provider requests, and financial transitions stay on the server. Clients cannot set arbitrary statuses. Database transactions prevent conflicting approvals and preserve proposal/activity history.

Email verification, password reset, MFA, external dispute reconciliation/admin mediation, multi-seller onboarding, and operational session cleanup are future work. Account roles are fixed at registration. The dependency audit is clean; Prisma’s configuration package uses a scoped override to the fixed `deepmerge-ts` 8.x release.
