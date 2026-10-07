# DealMile — Master Implementation Plan

> **Every milestone starts with a clear deal.**

## 1. Project Overview

**DealMile** is an AI-assisted project agreement and milestone payment platform for software developers/freelancers and their clients.

DealMile helps transform an unstructured client idea into:

- a clear project scope,
- structured milestones,
- an understandable timeline,
- an agreed budget,
- milestone-based payments,
- and controlled change requests.

The main problem DealMile addresses is not simply payment.

It addresses the relationship between:

```text
Requirements
    ↓
Scope
    ↓
Agreement
    ↓
Milestones
    ↓
Work
    ↓
Payment
```

Software projects frequently change after development begins.

Clients may request additional features that were not included in the original agreement.

This creates **scope creep**, unclear responsibilities, and payment disputes.

DealMile uses AI to compare new requests against the agreed scope and helps both parties convert legitimate additional work into reviewed and approved milestones.

### Core Product Principle

**AI recommends.**

**Humans approve.**

**PayPal handles payments.**

DealMile does **not** act as an escrow service and must never claim to hold client funds.

---

# 2. Elevator Pitch

> AI-powered project agreements that turn client requirements into clear milestones, detect scope changes, and connect approved work to PayPal payments.

---

# 3. Product Identity

## Name

**DealMile**

The name combines:

```text
Deal + Mile(stone)
```

It represents the idea that every stage of a software project should have a clear agreement.

## Tagline

> **Every milestone starts with a clear deal.**

## Product Positioning

DealMile is NOT:

- a freelancer marketplace,
- a project-management clone,
- an escrow provider,
- an AI coding assistant,
- or simply a PayPal checkout wrapper.

DealMile is:

> **An intelligent agreement layer between project requirements, work milestones, scope changes, and payments.**

---

# 4. Hackathon Objective

DealMile is being built for the **PayPal AI Hackathon**.

Primary award target:

**Best Use of PayPal + AI**

Secondary targets:

- Best Use of Agentic Commerce
- Most Impactful
- Most Creative
- Best Demo Delivery

Overall placement is desirable but should not determine unnecessary product scope.

The MVP must demonstrate that both **AI and PayPal are essential to the product**.

PayPal must not be a decorative payment button.

AI must not be a generic chatbot.

---

# 5. MVP Philosophy

Build a **small complete product**, not a large incomplete product.

Priority:

```text
Working end-to-end flow
        >
More features
```

The primary hackathon demo must work reliably from beginning to end.

Every major feature should support the central story:

```text
Client Idea
    ↓
AI Project Plan
    ↓
Human Agreement
    ↓
Milestone
    ↓
PayPal Payment
    ↓
Project Changes
    ↓
AI Scope Detection
    ↓
Human Approval
    ↓
Additional Milestone
    ↓
PayPal Payment
```

---

# 6. Technology Stack

## Application

- Next.js
- App Router
- TypeScript
- Tailwind CSS
- shadcn/ui where useful

## Database

- PostgreSQL
- Prisma ORM

## Validation

- Zod

## AI

Primary provider:

- Gemini API

However, business logic must not depend directly on Gemini-specific SDK code.

Use an AI provider abstraction.

Conceptually:

```ts
interface AIProvider {
  generateProjectPlan(input: ProjectPlanInput): Promise<ProjectPlan>;
  analyzeScopeChange(input: ScopeAnalysisInput): Promise<ScopeAnalysis>;
}
```

Initial implementation:

```text
AIProvider
    ↓
GeminiProvider
```

This allows another provider to be introduced later without rewriting DealMile's business logic.

## Payments

- PayPal Developer Platform
- PayPal Sandbox during development and hackathon demonstration
- PayPal Orders/payment APIs as appropriate
- PayPal webhooks

No real money is required during development.

## Demo Video

- Remotion
- Actual DealMile screen recordings
- Actual PayPal Sandbox demonstration
- Voice-over / captions

Remotion is used for presentation and editing.

It must NOT be used to fake product functionality.

---

# 7. Architecture

Keep architecture intentionally simple.

```text
Browser
   ↓
Next.js
   │
   ├── React UI
   │
   ├── Server Actions / Route Handlers
   │
   ├── Domain Services
   │      ├── Project
   │      ├── Milestone
   │      ├── AI
   │      └── Payment
   │
   ├── Gemini API
   │
   ├── PayPal API
   │
   └── Prisma
          ↓
      PostgreSQL
```

One application.

One repository.

One primary database.

Do NOT introduce unnecessary infrastructure.

Do not use:

- microservices,
- Kubernetes,
- message queues,
- separate Laravel backend,
- GraphQL,
- vector databases,

unless a concrete product requirement appears.

---

# 8. User Roles

MVP contains two roles.

## CLIENT

Can:

- Create project requests
- Describe software requirements
- Enter initial budget
- Enter desired deadline
- Ask AI to generate a project plan
- Review and edit AI recommendations
- Submit project request
- Review developer modifications
- Accept or reject proposal changes
- Pay unlocked milestones using PayPal
- View project progress
- Submit change requests
- Review additional milestone proposals

## DEVELOPER

Can:

- View incoming project requests
- Review requirements
- Review AI-generated project plans
- Modify milestones
- Modify pricing
- Modify timeline
- Modify scope
- Accept project
- Reject project
- Return revised proposal to client
- Start funded milestones
- Submit completed work status
- Review change requests
- Review AI scope analysis
- Propose additional milestones

---

# 9. Main Product Flow

```text
CLIENT
  ↓
Landing Page
  ↓
Authentication
  ↓
Client Dashboard
  ↓
Request a Project
  ↓
Requirements + Budget + Deadline
  ↓
AI Project Planning
  ↓
Client Reviews / Edits
  ↓
Submit Request
  ↓
PENDING_DEVELOPER_REVIEW
  ↓
Developer Reviews
  ↓
┌─────────────┬───────────────┬───────────────┐
│ Reject      │ Modify        │ Accept        │
└─────────────┴───────────────┴───────────────┘
                      ↓
              If modified:
               CLIENT_REVIEW
                      ↓
                Client accepts
                      ↓
                   AGREED
                      ↓
            Milestone #1 unlocked
                      ↓
              PayPal Sandbox
                      ↓
                 FUNDED
                      ↓
            Developer starts work
                      ↓
               IN_PROGRESS
```

---

# 10. AI Project Planner

Example client input:

```text
Project:
E-commerce Website

Requirements:
Build an e-commerce website with authentication,
product management, shopping cart, and admin dashboard.

Budget:
$1000

Deadline:
30 days
```

AI transforms this into structured data.

Example:

```json
{
  "summary": "E-commerce web application",
  "scope": [
    "Email/password authentication",
    "Product management",
    "Shopping cart",
    "Admin dashboard"
  ],
  "milestones": [
    {
      "title": "UI/UX Design",
      "description": "Design responsive application interfaces",
      "suggestedAmount": 150,
      "estimatedDays": 5
    },
    {
      "title": "Frontend Development",
      "description": "Implement the application frontend",
      "suggestedAmount": 250,
      "estimatedDays": 7
    }
  ],
  "risks": []
}
```

AI output used by application logic must be structured.

Never persist arbitrary raw AI output as trusted application state.

Pipeline:

```text
Gemini
   ↓
Structured Output
   ↓
Zod Validation
   ↓
Application Logic
   ↓
Human Review
   ↓
Database
```

---

# 11. AI Pricing Principle

AI may recommend:

- milestone distribution,
- relative complexity,
- timeline,
- approximate budget allocation.

AI does NOT determine final pricing.

Example:

```text
AI recommends:

Backend Development
$300

Developer reviews:
"This requires more work."

Developer changes:
$350

Client reviews:
$350

Client accepts
```

Final financial agreement is always human-approved.

---

# 12. Human Approval Principle

AI must never autonomously:

- accept contracts,
- finalize project pricing,
- approve project changes,
- charge users,
- authorize payments,
- create irreversible financial actions.

Flow:

```text
AI Recommendation
       ↓
Human Review
       ↓
Explicit Approval
       ↓
Financial Action
```

---

# 13. Project State Machine

Do not scatter arbitrary status strings throughout the application.

Initial project states:

```text
DRAFT

AI_PLANNING

PENDING_DEVELOPER_REVIEW

DEVELOPER_REVIEW

CLIENT_REVIEW

AGREED

ACTIVE

COMPLETED

REJECTED

CANCELLED
```

Example transitions:

```text
DRAFT
  ↓
AI_PLANNING
  ↓
PENDING_DEVELOPER_REVIEW
  ↓
DEVELOPER_REVIEW
  ├── REJECTED
  ├── CLIENT_REVIEW
  └── AGREED
```

State transitions must be validated server-side.

The browser must not be allowed to arbitrarily set project status.

---

# 14. Milestone State Machine

Initial states:

```text
LOCKED

AWAITING_PAYMENT

FUNDED

IN_PROGRESS

SUBMITTED

COMPLETED

CANCELLED
```

Normal flow:

```text
LOCKED
   ↓
AWAITING_PAYMENT
   ↓
FUNDED
   ↓
IN_PROGRESS
   ↓
SUBMITTED
   ↓
COMPLETED
```

Payment success does not mean work automatically starts.

Developer explicitly starts a funded milestone.

---

# 15. PayPal Payment Flow

Payment becomes available only after the relevant agreement exists.

```text
Project AGREED
      ↓
Milestone
AWAITING_PAYMENT
      ↓
Client selects Pay
      ↓
Server creates PayPal order
      ↓
PayPal Sandbox checkout
      ↓
Server capture / verification
      ↓
PayPal webhook
      ↓
Payment record updated
      ↓
Milestone → FUNDED
```

Critical rule:

> Never trust payment success reported only by the browser.

Payment status must be verified server-side.

Persist relevant PayPal identifiers.

Webhook handlers must be idempotent.

Duplicate webhook delivery must never create:

- duplicate payment records,
- duplicate milestone transitions,
- duplicate financial actions.

---

# 16. Scope Intelligence

This is DealMile's primary differentiating AI feature.

Original agreement:

```text
Authentication:
Email/password

Features:
Product management
Shopping cart
Admin dashboard
```

Client later requests:

```text
Please add Google Login and sales analytics.
```

DealMile compares:

```text
ORIGINAL AGREEMENT
        +
NEW REQUEST
        ↓
Gemini
        ↓
Scope Analysis
```

Example structured output:

```json
{
  "scopeChangeDetected": true,
  "changes": [
    {
      "feature": "Google OAuth",
      "includedInOriginalScope": false,
      "reason": "The original agreement only includes email/password authentication."
    },
    {
      "feature": "Sales Analytics",
      "includedInOriginalScope": false,
      "reason": "Analytics functionality was not included in the agreed scope."
    }
  ]
}
```

AI explains the difference.

AI does NOT automatically charge the client.

---

# 17. Change Request Flow

```text
Client submits Change Request
             ↓
Original Agreement + New Request
             ↓
         Gemini
             ↓
      Scope Analysis
             ↓
       Developer Review
             ↓
Developer chooses:
 ├── Already included
 ├── Reject
 ├── Accept without additional payment
 └── Propose additional milestone
             ↓
       Client Review
             ↓
        Client accepts
             ↓
Additional Milestone Created
             ↓
       PayPal Payment
```

This is one of the most important flows in the entire product.

---

# 18. Scope Intelligence UI

Scope detection must NOT appear as a generic chatbot response.

Prefer a visual comparison.

Example:

```text
ORIGINAL SCOPE                 NEW REQUEST

Email Authentication          Google Login
                              + NEW REQUIREMENT

No Analytics                  Sales Analytics
                              + NEW REQUIREMENT
```

Then:

```text
⚠ Potential Scope Change

2 new requirements detected.
```

Developer receives contextual actions.

Example:

```text
[ Included in Scope ]

[ Reject ]

[ Create Additional Milestone ]
```

---

# 19. MVP Pages

## Public

### `/`

Landing page.

Primary message:

> Turn project requirements into clear agreements, milestones, and smarter payments.

Primary CTA:

**Start a Project**

Secondary explanation should demonstrate:

```text
Plan → Agree → Pay → Adapt
```

---

## Client

### `/dashboard`

Show:

- Active projects
- Pending requests
- Project status
- Current milestone
- Payment progress
- Recent activity

### `/projects/new`

Inputs:

- Project name
- Project type
- Requirements
- Budget
- Desired deadline

Primary action:

**Generate Project Plan**

### `/projects/[id]/plan`

Show AI-generated:

- Summary
- Scope
- Milestones
- Budget allocation
- Timeline
- Risks

Allow:

- Edit milestone
- Add milestone
- Remove milestone
- Edit amount
- Regenerate plan
- Submit request

### `/projects/[id]`

Main project workspace.

Show:

- Project status
- Agreed scope
- Current milestone
- Milestones
- Payments
- Change requests
- Activity timeline
- Relevant AI analysis

---

## Developer

### `/developer`

Show:

- Incoming project requests
- Proposals awaiting action
- Active projects
- Current milestones

### `/developer/projects/[id]`

Developer review workspace.

Actions:

- Accept
- Reject
- Modify proposal

---

# 20. Database Entities

Initial conceptual entities:

```text
User

Project

ProjectScope

Milestone

ProposalRevision

Payment

ChangeRequest

AIAnalysis

ActivityLog
```

Important application state should use explicit relational data where practical.

Do not hide critical business state inside large arbitrary JSON blobs.

JSON may be used for AI analysis metadata where appropriate.

---

# 21. Relationships

Conceptually:

```text
User
 ├── Client Projects
 └── Developer Projects

Project
 ├── Scope
 ├── Milestones
 ├── Proposal Revisions
 ├── Change Requests
 ├── AI Analyses
 └── Activity Logs

Milestone
 └── Payments

Change Request
 ├── AI Analysis
 └── Optional Additional Milestone
```

Exact Prisma schema should be designed before Phase 1 implementation.

---

# 22. Authentication and Authorization

Authentication must support role-aware access.

Roles:

```text
CLIENT
DEVELOPER
```

Authorization must be enforced server-side.

Never rely exclusively on hidden UI controls.

A client cannot access another client's private project.

A developer cannot modify unauthorized projects.

---

# 23. Server Boundaries

Never expose:

```text
GEMINI_API_KEY

PAYPAL_CLIENT_SECRET

DATABASE_URL

AUTH_SECRET
```

to client-side JavaScript.

Gemini requests must originate server-side.

PayPal sensitive operations must originate server-side.

Prisma must never execute from client components.

---

# 24. Validation

Use Zod or equivalent validation for:

- Project creation
- Budget
- Deadlines
- Milestones
- Proposal revisions
- AI structured output
- Change requests
- Relevant PayPal payloads/internal data

Never directly persist arbitrary browser input.

Never directly trust AI output.

---

# 25. UI / UX Philosophy

DealMile must feel like a **modern interactive SaaS product**, not a collection of static forms and cards.

The interface should feel alive because application state is changing.

Do not confuse interactivity with excessive animation.

Animation must communicate:

- progress,
- state changes,
- hierarchy,
- success,
- errors,
- user actions.

Avoid animation that exists only for decoration.

---

# 26. UI Interaction Requirements

Important actions must provide immediate feedback.

Include meaningful states for:

- Buttons
- Forms
- AI generation
- Proposal submission
- Approval/rejection
- Project status changes
- Milestone changes
- Payment
- Scope detection
- Change requests

Use where appropriate:

- loading states,
- skeletons,
- toasts,
- dialogs,
- sheets,
- dropdowns,
- popovers,
- expandable panels,
- progress indicators,
- status steppers,
- subtle transitions.

Do not create a separate page for every minor action.

---

# 27. AI Interaction Experience

Do NOT implement:

```text
Generate Plan
    ↓
Frozen interface
    ↓
Result suddenly appears
```

Prefer:

```text
Generate Project Plan

Analyzing requirements...
        ↓
Defining scope...
        ↓
Creating milestones...
        ↓
Reviewing budget allocation...
        ↓
Plan ready
```

These are UX progress indicators.

They must NOT expose hidden model reasoning or chain-of-thought.

AI results may reveal progressively with subtle transitions.

---

# 28. Interactive Project Timeline

Project state should be visually understandable.

Example:

```text
Request
  ✓

AI Plan
  ✓

Developer Review
  ✓

Agreement
  ✓

Payment
  ●

Development
  ○

Completion
  ○
```

Status changes should update smoothly without unnecessary full-page reloads.

---

# 29. Interactive Milestones

Milestone cards should visually communicate their state.

Example:

```text
Milestone #1

UI/UX Design

$150

FUNDED

[ Start Milestone ]
```

After action:

```text
Milestone #1

UI/UX Design

$150

IN PROGRESS

[ Submit Work ]
```

Actions should be contextual.

Do not show irrelevant actions.

---

# 30. Payment UX

Payment must clearly communicate server-verified progress.

Example:

```text
Creating PayPal order...
        ↓
Waiting for payment...
        ↓
Verifying payment...
        ↓
Payment confirmed
        ↓
Milestone funded
```

Never show final payment success before server verification.

---

# 31. Motion Guidelines

Use subtle motion.

Normal UI feedback should generally feel fast.

Prefer approximately:

```text
150–300ms
```

for common transitions.

Possible implementation:

- CSS transitions
- Tailwind transitions
- a motion library if justified

Do not introduce a large animation dependency solely for decorative effects.

Respect reduced-motion preferences.

Primary actions must not depend on hover.

---

# 32. Design Direction

Avoid stereotypical AI-generated SaaS design.

Do NOT overuse:

- purple gradients,
- giant glowing AI buttons,
- glassmorphism,
- excessive gradients,
- floating decorative cards,
- unnecessary blobs,
- meaningless animations.

Prefer:

- strong typography,
- clean spacing,
- restrained colors,
- clear hierarchy,
- excellent status indicators,
- readable financial information,
- clear interactive components.

DealMile should visually feel like:

> **a trustworthy project/payment workflow product first and an AI product second.**

---

# 33. Responsive Requirements

Primary workflows must work on:

- Desktop
- Tablet
- Mobile

Do not require hover.

Ensure:

- usable touch targets,
- readable milestone cards,
- responsive dialogs/sheets,
- usable project timeline,
- readable scope comparison,
- accessible forms.

---

# 34. UI Definition of Done

A UI feature is NOT complete simply because it renders.

Verify where applicable:

```text
[ ] Real application data is used
[ ] Loading state exists
[ ] Empty state exists
[ ] Error state exists
[ ] Success feedback exists
[ ] Disabled state exists
[ ] Mobile layout works
[ ] Keyboard interaction works
[ ] State survives reload where appropriate
[ ] Interaction does not require unnecessary page reload
[ ] Animation does not block interaction
```

---

# 35. Suggested Project Structure

```text
src/
├── app/
│   ├── dashboard/
│   ├── developer/
│   ├── projects/
│   └── api/
│
├── components/
│   ├── ui/
│   ├── projects/
│   ├── milestones/
│   ├── payments/
│   └── scope/
│
├── lib/
│   ├── db/
│   ├── auth/
│   ├── ai/
│   │   ├── provider.ts
│   │   └── gemini.ts
│   ├── paypal/
│   └── validation/
│
├── services/
│   ├── project.service.ts
│   ├── milestone.service.ts
│   ├── scope.service.ts
│   ├── ai.service.ts
│   └── payment.service.ts
│
└── types/

prisma/
├── schema.prisma
└── migrations/
```

Avoid substantial business logic inside React components.

---

# 36. Next.js Rendering & Performance Strategy

DealMile must use Next.js intentionally.

Do NOT treat Next.js as a client-side React SPA.

## Server Components by Default

Prefer **Server Components by default**.

Use Client Components only when browser-side interactivity is required.

Do NOT add `"use client"` to entire pages or layouts unless absolutely necessary.

Good Client Component candidates:

- Interactive forms
- Dialogs and sheets
- Dropdowns
- Interactive milestone controls
- AI generation progress
- Payment controls
- Scope comparison interactions

Keep Client Component boundaries as small as practical.

---

## Data Fetching

For initial application data, prefer:

```text
Server Component
      ↓
Service Layer
      ↓
Prisma
      ↓
PostgreSQL
```

Do NOT create unnecessary internal HTTP requests such as:

```text
Server Component
      ↓
fetch("/api/projects")
      ↓
Route Handler
      ↓
Prisma
```

when the Server Component can safely call the service/database layer directly.

Route Handlers should primarily be used for:

- PayPal webhooks
- External integrations
- Browser-required API endpoints
- Public API boundaries where appropriate

---

## Rendering Strategy

Authenticated application pages contain personalized and frequently changing data.

Pages such as:

```text
/dashboard

/developer

/projects/[id]

/developer/projects/[id]
```

should be treated as dynamic application experiences.

Do not force static generation for personalized project or payment data.

Never globally cache sensitive user-specific information.

Public content such as the landing page should use static rendering where appropriate.

Do not make the entire application dynamic simply because authenticated pages require dynamic data.

---

## Mutations

Use Server Actions where they provide a clear and safe workflow.

Possible examples:

- Create project
- Update project draft
- Approve proposal
- Start milestone
- Submit change request

Every mutation must still perform server-side:

- Authentication
- Authorization
- Input validation
- State-transition validation

Never assume a Server Action is trusted simply because it originated from DealMile's UI.

---

## Revalidation

After successful mutations, update only the data that needs to change.

Avoid:

- Unnecessary full-page reloads
- Reloading unrelated data
- Excessively broad cache invalidation

Use the appropriate Next.js revalidation/navigation mechanism for the installed Next.js version.

Payment state must always remain authoritative in the server/database.

---

## Streaming and Suspense

Use Suspense and streaming when they meaningfully improve perceived performance.

Good candidates include:

- Dashboard summaries
- Activity timeline
- Secondary project information
- AI analysis panels

Do not create Suspense boundaries around every small component.

Allow the primary page structure to appear quickly while slower secondary content loads progressively.

---

## Loading Experience

Important routes should provide meaningful loading states.

Use where appropriate:

- `loading.tsx`
- Skeleton UI
- Local mutation pending states
- AI progress indicators

Avoid generic full-screen spinners when the rest of the interface can remain usable.

---

## JavaScript Bundle

Keep browser-side JavaScript intentionally small.

Avoid importing large libraries into Client Components when the functionality can remain server-side.

Do not install dependencies for trivial functionality.

Lazy-load genuinely heavy client-side features when useful.

Examples:

- Complex editors
- Large visualization components
- Rarely opened advanced tools

Do not lazy-load tiny components purely for optimization theater.

---

## Images and Assets

Use Next.js image optimization for normal application imagery where appropriate.

Provide sensible image dimensions and aspect ratios.

Avoid unnecessarily large assets.

Prefer CSS or lightweight SVG for simple decorative elements.

---

## Fonts

Use Next.js font optimization where appropriate.

Avoid unnecessary font families and excessive font weights.

Prefer a small and consistent typography system.

---

## Third-Party SDK Boundaries

Never expose server-only SDK functionality unnecessarily to the browser.

### Gemini

SERVER ONLY.

### Prisma

SERVER ONLY.

### PayPal

Secrets and sensitive PayPal operations:

SERVER ONLY.

Only browser-safe PayPal functionality required for checkout may execute client-side.

---

## Parallel Data Fetching

Avoid unnecessary sequential request waterfalls.

Bad:

```text
Load user
    ↓
Load project
    ↓
Load milestones
    ↓
Load payments
```

When operations are independent, load them concurrently or use efficient database queries.

Prefer intentional Prisma relation loading where appropriate.

---

## Database Performance

Avoid N+1 database queries.

Select only data required by the current view where practical.

Add indexes for fields frequently used for:

- Relationships
- Filtering
- Status queries
- External PayPal identifiers

Do not create indexes for every column without justification.

---

## Optimistic UI

Optimistic updates may be used for low-risk and reversible interactions.

Do NOT optimistically claim success for:

- PayPal payments
- Financial state
- Agreement approval requiring server validation
- Security-sensitive state transitions

Financial UI must wait for authoritative server confirmation.

---

## AI Performance

Gemini requests may take longer than normal database operations.

Do not block unrelated page rendering while waiting for AI.

Prefer:

```text
Existing Project UI
      remains usable
            +
AI Analysis Panel
      processes independently
```

Provide local AI progress feedback.

Do not regenerate AI analysis on every page render.

Persist useful AI results when appropriate.

---

## Performance Principles

Prioritize:

1. Fast initial useful content
2. Responsive interactions
3. Minimal unnecessary client JavaScript
4. Efficient database access
5. Clear loading feedback
6. Reliable server state

Do not chase benchmark scores at the expense of product functionality.

A perfect Lighthouse score is not the product.

The goal is for DealMile to feel fast, responsive, and reliable during real usage and the hackathon demonstration.

---

## Critical Next.js Rule

> **Server Components by default. Client Components by exception.**

Do not turn DealMile into a client-side SPA by adding `"use client"` throughout the application.

Rendering, caching, and revalidation APIs must follow the behavior of the actual Next.js version installed in the project rather than assumptions based on older versions.

-----

# 36. PHASE 0 — Foundation

Goal:

Create a reliable foundation.

Implement:

- Next.js
- TypeScript strict mode
- Tailwind
- shadcn/ui foundation
- Prisma
- PostgreSQL
- Environment validation
- Authentication
- Role authorization
- Base responsive layout
- Base error handling

Required checks:

```text
Prisma validation       PASS
Database migration      PASS
TypeScript              PASS
Production build        PASS
```

Do NOT implement Gemini or PayPal yet.

---

# 37. PHASE 1 — Core Project Workflow

Goal:

DealMile must function without AI or PayPal.

Implement:

```text
CLIENT

Create Project
↓
Save Draft
↓
Submit Request
```

Then:

```text
DEVELOPER

View Request
↓
Review
↓
Accept / Reject / Modify
```

Then:

```text
CLIENT

Review Changes
↓
Accept Proposal
```

Definition of done:

```text
Client creates project
→ database

Developer sees project
→ database

Developer modifies/accepts
→ database

Client sees result
→ database

Browser reload
→ state remains correct
```

No critical state may exist only in React state.

---

# 38. PHASE 2 — AI Project Planner

Goal:

Introduce Gemini after the core workflow works.

Implement:

```text
Requirements
     ↓
AIProvider
     ↓
GeminiProvider
     ↓
Structured Output
     ↓
Zod Validation
     ↓
Editable Project Plan
     ↓
Database
```

AI responsibilities:

- summarize requirements,
- identify scope,
- create milestones,
- recommend budget allocation,
- estimate relative timeline,
- identify obvious risks.

Everything remains editable before submission.

---

# 39. PHASE 3 — PayPal Sandbox

Goal:

Complete one real PayPal Sandbox transaction end-to-end.

Implement:

- PayPal authentication
- Create order
- Sandbox checkout
- Capture/verification
- Webhook endpoint
- Webhook verification
- Payment persistence
- Idempotency
- Milestone transition

Definition of done:

```text
Client clicks Pay
↓
PayPal Sandbox
↓
Sandbox payment succeeds
↓
Server verifies transaction
↓
Webhook received
↓
Database updated
↓
Milestone FUNDED
↓
Browser reload
↓
FUNDED remains correct
```

Do not continue until this works reliably.

---

# 40. PHASE 4 — Scope Intelligence

Goal:

Implement DealMile's killer feature.

```text
Client Change Request
        ↓
Original Agreement
        +
New Request
        ↓
AIProvider
        ↓
Gemini
        ↓
Structured Scope Analysis
        ↓
Developer Review
```

Developer can:

- mark as already included,
- reject,
- accept without additional payment,
- create additional milestone.

Client approves paid additional milestones.

---

# 41. PHASE 5 — Agentic Layer

Only implement after Phases 1–4 are stable.

Potential controlled tools:

```text
getProject()

getOriginalScope()

getMilestones()

getPaymentStatus()

analyzeChangeRequest()

proposeMilestone()
```

Potential payment-related tool:

```text
preparePayPalOrder()
```

Financial actions require explicit human confirmation.

The objective is useful agent behavior, not autonomous spending.

---

# 42. PHASE 6 — Product Polish

Improve:

- Loading states
- Empty states
- Error handling
- Responsive layout
- Skeletons
- Toasts
- Timeline
- Scope comparison
- Payment progress
- Milestone interaction
- Accessibility
- Mobile usability
- Visual consistency

Polish should improve perceived reliability.

Do not sacrifice core functionality for decorative polish.

---

# 43. PHASE 7 — Hackathon Demo Preparation

Create a predictable seeded demonstration project.

Example:

```text
Project:
E-Commerce Platform

Budget:
$1,000

Original Scope:
- Email/password authentication
- Product management
- Shopping cart
- Admin dashboard
```

Demo:

```text
1. Client enters requirements.

2. AI generates project plan.

3. Client reviews and submits.

4. Developer reviews and accepts.

5. Client pays Milestone #1 using PayPal Sandbox.

6. Server verifies payment.

7. Milestone becomes FUNDED.

8. Client asks:
   "Add Google Login and sales analytics."

9. AI compares the request against the agreement.

10. DealMile detects scope change.

11. Developer proposes additional milestone.

12. Client approves.

13. Client pays through PayPal Sandbox.

14. Dashboard updates project/payment state.
```

---

# 44. PHASE 8 — Submission Video

Use **Remotion** for the final hackathon video.

However:

> Remotion enhances the presentation. It does not replace proof that DealMile actually works.

Use a combination of:

```text
Actual DealMile recordings
+
Actual PayPal Sandbox flow
+
Remotion motion graphics
+
Captions
+
Voice-over
```

Target video duration:

**approximately 2:30–2:50**

Never rely on content after 3 minutes.

---

# 45. Video Structure

Suggested structure:

```text
00:00–00:10

DealMile

"Every milestone starts with a clear deal."
```

```text
00:10–00:25

Problem:

Unclear requirements
→ scope creep
→ payment disputes
```

```text
00:25–00:55

REAL APPLICATION

Client enters requirements.

AI generates:
- scope
- milestones
- timeline
- budget allocation
```

```text
00:55–01:15

Developer reviews proposal.

Both parties agree.
```

```text
01:15–01:35

REAL PAYPAL SANDBOX

Client pays first milestone.

Server verifies payment.

Milestone:
FUNDED
```

```text
01:35–02:05

KILLER FEATURE

Client:
"Add Google Login and Analytics."

DealMile:

⚠ SCOPE CHANGE DETECTED

Google OAuth
+ NEW

Sales Analytics
+ NEW
```

```text
02:05–02:25

Developer creates additional milestone.

Client approves.

PayPal Sandbox payment.
```

```text
02:25–02:40

Project timeline and dashboard update.
```

```text
02:40–02:50

DealMile

AI understands the scope.
Humans make the deal.
PayPal powers the payment.
```

---

# 46. Remotion Project Structure

Keep video code separated from application code where practical.

Example:

```text
video/
├── compositions/
├── scenes/
│   ├── Intro.tsx
│   ├── Problem.tsx
│   ├── ProjectPlan.tsx
│   ├── Agreement.tsx
│   ├── Payment.tsx
│   ├── ScopeChange.tsx
│   └── Outro.tsx
│
├── assets/
│   ├── recordings/
│   └── screenshots/
│
└── Root.tsx
```

Motion graphics may recreate concepts such as:

```text
Original Scope
      ↓
New Requirement
      ↓
AI Analysis
      ↓
Scope Change
      ↓
+$ Additional Milestone
      ↓
PayPal
```

But actual product footage must demonstrate real functionality.

---

# 47. Long-Term Vision

DealMile MVP assumes a client and developer can already establish a working relationship.

Future DealMile may allow clients to publish structured project opportunities.

Potential future flow:

```text
Client Idea
    ↓
AI Project Brief
    ↓
Publish Opportunity
    ↓
Developers Discover Project
    ↓
Developer Applies
    ↓
Client Selects Developer
    ↓
DealMile Agreement
    ↓
Milestones
    ↓
PayPal
```

This could help independent developers and developer communities discover structured project opportunities.

However:

**THIS IS NOT PART OF THE HACKATHON MVP.**

Do NOT implement:

- developer marketplace,
- job board,
- applicant tracking,
- reputation system,
- developer search,
- reviews,

during the initial hackathon build.

This belongs to post-hackathon product development.

---

# 48. Explicit MVP Non-Goals

Do NOT build:

- Freelancer marketplace
- Job board
- Developer discovery
- Real-time chat
- Video calling
- Source-code hosting
- GitHub replacement
- Jira replacement
- Trello replacement
- Escrow
- Internal wallet
- Withdrawal system
- Cryptocurrency
- Native mobile app
- Full accounting platform
- AI coding assistant
- Complex invoicing system

If a feature does not improve the primary demo, strongly question whether it belongs in MVP.

---

# 49. Coding Agent Rules

Codex must be treated as an **implementation agent**, not the product architect.

Do NOT prompt:

> Build DealMile.

Instead provide narrowly scoped tasks.

Example:

> Implement project creation using the existing Prisma schema. Do not implement Gemini or PayPal. Add server-side validation and authorization. Run Prisma validation, typecheck, tests, and production build. Fix failures before finishing.

For every task:

1. Read this plan.
2. Inspect existing architecture.
3. Understand the requested phase.
4. Implement only requested scope.
5. Do not silently redesign unrelated systems.
6. Validate external inputs.
7. Add/update tests where appropriate.
8. Run required checks.
9. Fix failures.
10. Report exactly what changed.

Never assume generated code works.

Verify it.

---

# 50. Coding Agent Architecture Rules

Codex must NOT:

- introduce a second backend,
- replace PostgreSQL,
- replace Prisma,
- change AI provider architecture without reason,
- call Gemini directly from random components,
- call PayPal from client components,
- expose secrets,
- modify project state directly from UI,
- add dependencies without justification,
- implement future marketplace features during MVP,
- create fake payment success states,
- bypass validation to make demos work.

Business logic belongs in appropriate server/domain layers.

---

# 51. Backend Definition of Done

For normal features:

```text
Prisma schema valid
        ✓

Migration works
        ✓

Database operation works
        ✓

Authorization works
        ✓

Validation works
        ✓

TypeScript passes
        ✓

Relevant tests pass
        ✓

Production build passes
        ✓
```

---

# 52. Payment Definition of Done

```text
PayPal Sandbox transaction
        ✓

Server-side verification
        ✓

Webhook verification
        ✓

Payment persistence
        ✓

Idempotency
        ✓

Correct milestone transition
        ✓

Browser reload preserves state
        ✓
```

A payment feature is not complete merely because PayPal Checkout opens.

---

# 53. AI Definition of Done

```text
Structured output
        ✓

Schema validation
        ✓

Failure handling
        ✓

Human review
        ✓

Database persistence
        ✓

No hidden reasoning exposed
        ✓
```

AI output must remain advisory.

---

# 54. Reliability Rules

Never:

- trust payment state from client JavaScript,
- trust unvalidated Gemini output,
- store critical state only in frontend state,
- expose server secrets,
- allow arbitrary state transitions,
- allow AI to autonomously charge users,
- mark payment successful without verification,
- introduce infrastructure without justification.

Prefer boring, predictable code over clever abstractions.

---

# 55. Development Priority

When trade-offs are required:

```text
1. End-to-end functionality

2. Payment correctness

3. Scope Intelligence

4. AI + PayPal integration depth

5. Reliability

6. User experience

7. Demo clarity

8. Visual polish

9. Additional features
```

Do not spend two days improving an animation if the payment webhook is unreliable.

Do not spend two days chasing a perfect performance score if the primary Scope Intelligence flow is incomplete.

---

# 56. Hackathon Submission Assets

Only prepare final submission materials after the product is stable.

Required/expected assets include:

- Public project description
- Built-with technology list
- Public source-code repository
- Open-source license
- Hosted demo or clear setup instructions
- Screenshots
- Image gallery
- YouTube demonstration video
- Final Devpost submission

Do not claim functionality in the project story that does not exist in the submitted build.

---

# 57. Submission Screenshots

Prioritize screenshots that communicate functionality.

Suggested gallery:

```text
1. Landing Page

2. Client Dashboard

3. AI Project Plan

4. Developer Proposal Review

5. Project Agreement / Milestones

6. PayPal Payment Flow

7. Funded Milestone

8. AI Scope Change Detection

9. Additional Milestone Proposal

10. Final Project Timeline
```

Do not upload fifteen nearly identical dashboard screenshots simply because fifteen slots exist.

---

# 58. Final MVP Success Condition

DealMile MVP is complete when a judge can understand and observe:

> A client describes a software project.

> AI transforms the idea into structured scope and milestones.

> The client and developer review the proposed agreement.

> Both sides agree.

> PayPal handles milestone payment.

> Development begins.

> The client requests additional work.

> DealMile AI compares the request with the original agreement.

> DealMile identifies potential scope creep.

> The developer reviews the AI analysis.

> The client and developer agree on an additional milestone.

> PayPal handles the additional payment.

That complete loop is **DealMile**.

Everything else is secondary.