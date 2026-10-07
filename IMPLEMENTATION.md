# DealMile implementation status

## Scope

The user requested the entire MVP through Gemini and PayPal. Latest instruction: enable real Sandbox checkout/capture without a webhook, keep `APP_URL` on localhost, do not deploy, and do not register a PayPal webhook yet. The full MVP remains in progress.

## Implemented and verified

### Phase 0 — Foundation

Next.js App Router, React 19, strict TypeScript, Tailwind, reusable button foundation, responsive landing page, PostgreSQL/Prisma schema and migrations, environment validation, client/developer registration and password login, database-backed HTTP-only sessions, role/ownership authorization, protected dashboards/account pages, and loading/error states.

### Phase 1 — Core project workflow

Client supplies requirements, an initial budget, and a deadline. AI generates scope and milestone allocations; an existing developer is assigned randomly. Client edits the draft milestone details and budget before submitting. Developer reviews, accepts, rejects, or proposes revisions. Client approves or requests another revision. Server-authorized serializable transactions preserve proposal history and activity. Acceptance unlocks the first milestone without claiming payment success.

Browser verification covers a full draft → developer revision → client approval cycle, reload persistence, locked draft visibility, ownership boundaries, and budget validation.

### Phase 2 — Gemini project planner

Server-only `AIProvider` abstraction with a real Gemini REST adapter. Structured outputs use `generationConfig.responseMimeType` and `generationConfig.responseJsonSchema`. No Gemini SDK is installed; SDK-specific `responseFormat.text.mimeType` is not used.

Zod validates the response envelope and plan, then proposal validation checks budget allocation and financial precision. Suggested scope/milestones are saved as an editable draft with advisory analysis metadata. AI never accepts an agreement. Incomplete or invalid responses are rejected, thought parts are discarded, and failed regeneration preserves the previous draft. Transient HTTP errors have bounded retries under a shared 60-second timeout.

Real `check-gemini-plan.ts` verification succeeded with `gemini-3.5-flash-lite`: 3 milestones, total USD 1,000, structured output and proposal validation both passed. Model 3.8 also produced one valid plan but repeatedly returned HTTP 503 on subsequent requests. The verified 3.5 Flash Lite model is now the default; `GEMINI_MODEL` can override it.

## Phase 3 — Sandbox payments and milestone lifecycle

Real Sandbox order `7M6828902L633494B` for the existing “lms SMK website” $200 milestone was approved by the buyer. PayPal returned COMPLETED with capture `0G2343276X489315Y`. Authenticated server verification persisted the capture and FUNDED status. Rechecking preserved the same capture and verification timestamp without another charge. Webhook configuration remains optional and empty; no webhook was registered and nothing was deployed.

Server authorization requires verified captured payment before FUNDED → IN_PROGRESS → SUBMITTED → COMPLETED. Clients may request a delivery revision. Completing a milestone unlocks the next payment; projects complete only when remaining work and open change requests are resolved. Serializable transactions and retries protect concurrent transitions.

This MVP uses one configured Sandbox merchant. Connected developer merchant onboarding is future work.

## Phase 4 — Scope intelligence

Change requests preserve an immutable agreed-scope snapshot. Real Gemini structured analysis is schema-validated and presented as original scope versus new request. Failed analysis remains retryable. Developer review can classify inclusion, reject, accept without extra charge, or propose additional deliverables, budget and days. Only client approval updates agreed scope/budget and creates an additional milestone, which follows the existing payment sequence. AI does not approve changes or payments.

Integration coverage includes authorization, unpaid-work rejection, delivery revisions, next-milestone unlocking, concurrent completion, failed-analysis recovery, free/rejected changes, additional-proposal approval and final completion. Payment fixtures in automated domain/browser lifecycle tests are regression data, not evidence of a real transaction; the real Sandbox transaction above is verified separately.

Production environment validation rejects HTTP/localhost callback origins while retaining local HTTP development support. Existing PayPal orders keep their originally supplied return URL.

## Delivery follow-up

Implemented milestone due dates from verified funding, due-soon/overdue in-app reminders, audited/deduplicated reminders, developer extension requests and client decisions. A client can report a delivery issue with evidence; the server holds further payments, scope approvals and milestone transitions. Developer proposals require client approval to resume with a new date, cancel unpaid work, or authorize a full refund. Existing checkouts must be reconciled before cancellation; a bounded payment-operation lease protects active API calls.

Full refunds require explicit bilateral agreement and a separate processing action. Persisted request keys support retries; the authenticated PayPal refund read must match the capture, amount/currency and COMPLETED status before REFUNDED is saved. Pending/failed/mismatched responses keep the case open and payment unchanged. Late capture reconciliation cannot undo verified refunds. Financial history remains intact. No real refund of the user's existing $200 Sandbox capture has been performed.

Reminders appear on authenticated dashboard/project reads; `check:deadlines` supports a separately scheduled background check. No email delivery or cron host was configured. No administrator arbitration, unilateral forced refund, partial refund or external PayPal dispute-state synchronization is implemented.

## Developer assignment

New manual and AI-assisted projects select the least-loaded registered developer, randomizing only ties. All unfinished assignments (including draft/planning/review) reserve a slot; completed/rejected/cancelled projects are excluded. Selection and creation run in the same serializable transaction with bounded retries. AI generation runs outside that transaction, and regenerating an existing draft retains its partner. PostgreSQL integration tests verify terminal-state exclusion, concurrent manual/AI assignment distribution and retry stability.

## Developer Schedule and bilateral cancellation

The project-detail Gantt was replaced with a dedicated developer-only Schedule route using Bryntum Calendar trial/React 7.3.7. The server scopes data to assigned projects; month/week/agenda show every milestone as a UTC range. Verified delivery windows use capture timestamps and stored deadlines; other ranges are explicitly tentative, sequential duration forecasts. No forecast is persisted. The accessible list includes both ends and certainty labels. Dense dates use overflow popups without dropping projects. Project filters and links support cross-project navigation. Payment gates and amounts are excluded. Calendar is read-only, lazy-loaded with local CSS/fonts and a stable ProjectModel. Activity stays a vertical history timeline. Animation is restrained and respects reduced motion.

A sixth migration records cancellation requests, proposer/approver, settlement snapshot and linked refund case, with a partial unique index preventing simultaneous pending requests. Either assigned party can propose; only the other can approve or reject; the requester can withdraw. A payment-operation guard and hold protect settlement review. Completed work/payments remain retained. Unpaid remaining work can be cancelled by consent; a single unfinished funded milestone requires a full verified refund through the existing refund service before cancellation completes. No actual user Sandbox payment was refunded during testing.

## Remaining MVP work

Finish demonstration/product polish. Public deployment, webhook registration and multi-seller onboarding remain outside the authorized scope. A second real additional-milestone transaction would require another buyer checkout; automated scope/lifecycle tests use explicitly labeled payment fixtures.

## Verification

- Prisma schema validation: passed.
- All six PostgreSQL migrations: applied successfully.
- TypeScript: passed.
- Unit tests: passed (request shape, validation, failure handling, retries, password/role validation, proposal totals, payment verification).
- PostgreSQL integration tests: passed (planner persistence/recovery and payment confirmation/idempotency with fixtures).
- Real Gemini browser scope-change test: passed (analysis, developer proposal, client approval, additional milestone and delivery revision/completion, mobile overflow). Full browser regression: all 10 tests passed, including authentication, role guards, Codespaces proxy origin, project agreement and scope/delivery workflow.
- Production build: passed.
- Dependency audit: zero vulnerabilities after compatible template patches and a scoped `deepmerge-ts` override for Prisma configuration.
