# DealMile visual system

This refactor changes presentation only. Authentication, routes, project transitions,
Prisma queries, Gemini calls, PayPal capture, and webhook verification are unchanged.
Server Components remain Server Components; no animation or runtime UI library was added.

## Shared tokens

`app/globals.css` owns the palette and component styles:

| Token                           | Value / role                                                                            |
| ------------------------------- | --------------------------------------------------------------------------------------- |
| Background / surface            | `#F7F4EA` / `#FFFEF8`                                                                   |
| Foreground / muted              | `#151515` / `#6B685F`                                                                   |
| Border / strong border          | `#D1CEC5` / `#1B1B1B`                                                                   |
| Brand / primary action          | `#E85D2A` / `#C84920`                                                                   |
| Secondary accent                | `#3157D5`                                                                               |
| Success / warning / danger text | `#246B48` / `#70520B` / `#A52A27`                                                       |
| Semantic surfaces               | Quiet green, yellow, blue, and red tints; status and notices only                       |
| Radius                          | 8px cards, 6px controls                                                                 |
| Hard shadows                    | 3px actions, 4px highlighted cards                                                      |
| Transition                      | 160ms; respects reduced motion                                                          |
| Type scale                      | Shared 12 / 14 / 16 / 18 / 36px tokens, responsive headings and large financial figures |

The primary action uses a deeper brand-orange shade so white button text reaches
4.74:1 contrast. Muted text reaches 5.51:1 on the surface and 5.06:1 on the background.
Orange is reserved for branding, primary actions, and selected-state accents.

## Reusable components

- `Button`: primary, outline, ghost, and danger variants; keyboard focus, hover,
  pressed, disabled, and loading presentations.
- `StatusBadge`: presentation-only rendering of the state supplied by its caller.
  Review/payment-wait states are amber; agreement/active states blue; funded/completed
  green; rejected/failed red; drafts and locked states neutral. Every badge includes text.
- `WorkspaceShell`: existing desktop sidebar and mobile navigation architecture,
  clearer selected item, `aria-current`, and larger touch targets.
- Shared cards, form fields, notices, financial figures, and project rows use the same tokens.

## Updated pages

Landing and labeled scope preview, login/register, client/developer dashboards,
account settings, new-project and proposal editors, project agreements/milestones,
payment confirmation/waiting, loading, and fallback pages inherit the shared theme.

The landing scope preview is labeled as an example. Authenticated projects now use real Gemini analysis with original scope versus new request, human proposal review, and client approval. Delivery follow-up reuses shared surface/status tokens for deadlines, case holds, extension forms and resolution proposals.

Payment success requires authoritative server verification. The later Sandbox payment update allows funding after authenticated capture verification, with webhooks providing additional reconciliation. A captured payment not yet verified/funded retains its waiting presentation.

## Validation

Unit and PostgreSQL integration tests, authentication/project browser regression
coverage, production build, desktop/tablet/mobile screenshots, keyboard-focus and
reduced-motion checks, and a captured-but-unconfirmed payment UI check.

The project now has `npm run lint`. Babel parses TypeScript syntax independently of
the existing TypeScript 7 compiler. React Hooks and JSX accessibility checks are enabled.
Two pre-existing `set-state-in-effect` findings in the project form are warnings for
that file only; its hydration and AI-progress behavior was preserved as requested.

Developer Schedule uses Bryntum Calendar in a dedicated workspace page. Its neutral surface and semantic work colors are accompanied by an accessible deadline list. Undated work is explicitly unscheduled; financial states are kept in project details. Activity uses a connected vertical history timeline. The calendar and success feedback use brief transitions with a reduced-motion override. Trial branding is preserved.
