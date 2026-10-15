import { ArrowRight } from "lucide-react";
export function ProjectGuide({
  developer,
  expanded,
}: {
  developer: boolean;
  expanded: boolean;
}) {
  const steps = developer
    ? [
        [
          "Review the request",
          "Open a project to accept its proposal or send revised terms.",
        ],
        [
          "Wait for funding",
          "The client funds an agreed milestone through PayPal Sandbox. Start after funding is verified.",
        ],
        [
          "Deliver for review",
          "Submit work from the milestone. The client approves it or requests revisions.",
        ],
      ]
    : [
        [
          "Describe your project",
          "Enter requirements, budget, and a deadline. AI drafts a plan for you to edit.",
        ],
        [
          "Agree with the developer",
          "Review scope, dates, and milestone amounts together before funding.",
        ],
        [
          "Fund, then review work",
          "Fund the ready milestone through PayPal Sandbox, then review the developer’s delivery.",
        ],
      ];
  return (
    <details className="project-guide" open={expanded}>
      <summary>New to DealMile? Here’s the project workflow</summary>
      <ol>
        {steps.map(([title, description], index) => (
          <li key={title}>
            <span aria-hidden="true">{index + 1}</span>
            <div>
              <h2>{title}</h2>
              <p>{description}</p>
            </div>
            {index < 2 && <ArrowRight size={16} aria-hidden="true" />}
          </li>
        ))}
      </ol>
      <p className="guide-note">
        AI suggests. You review and approve. This demo uses PayPal Sandbox; no
        live payments.
      </p>
    </details>
  );
}
