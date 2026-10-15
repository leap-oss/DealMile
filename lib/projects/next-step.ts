import type { ProjectStatus } from "@prisma/client";
/** Read-only guidance from existing state. This does not decide eligibility or mutate work. */
export function projectNextStep(status: ProjectStatus, developer: boolean) {
  switch (status) {
    case "DRAFT":
      return developer
        ? "The client is preparing a draft."
        : "Review your AI draft, then submit it to the developer.";
    case "AI_PLANNING":
      return "The AI plan is being prepared. Review the result before submitting.";
    case "PENDING_DEVELOPER_REVIEW":
      return developer
        ? "Your turn: open the proposal and start your review."
        : "Waiting for the developer to start reviewing your proposal.";
    case "DEVELOPER_REVIEW":
      return developer
        ? "Your turn: accept the proposal or send revised terms."
        : "The developer is reviewing the scope, dates, and amounts.";
    case "CLIENT_REVIEW":
      return developer
        ? "Waiting for the client to review your revised proposal."
        : "Your turn: review the revised terms, then approve or request a revision.";
    case "AGREED":
      return developer
        ? "Agreement reached. Check each milestone’s funding status before starting."
        : "Agreement reached. Open the project to fund the milestone awaiting payment.";
    case "ACTIVE":
      return "Open the project to check the next milestone and who needs to act.";
    case "COMPLETED":
      return "Work is complete. Open the project to review its recorded history.";
    case "CANCELLED":
      return "Project cancelled. Open the project to review its settlement and history.";
    case "REJECTED":
      return "Proposal rejected. Open the project to review the recorded decision.";
  }
}

export function milestoneNextStep(status: string, developer: boolean) {
  switch (status) {
    case "AWAITING_PAYMENT":
      return developer
        ? "Waiting for the client to fund this milestone. Start only after funding is verified."
        : "Your turn: fund this agreed milestone through PayPal Sandbox. Work can start after funding is verified.";
    case "FUNDED":
      return developer
        ? "Your turn: choose Start milestone to begin this work."
        : "Funding is verified. Waiting for the developer to start this milestone.";
    case "IN_PROGRESS":
      return developer
        ? "Your turn: finish the deliverables and submit your work for client review."
        : "The developer is working on this milestone. You can review it once work is submitted.";
    case "SUBMITTED":
      return developer
        ? "Waiting for the client to approve the delivered work or request a revision."
        : "Your turn: review the delivered work, then approve it or request a revision.";
    case "LOCKED":
      return "This milestone is locked. Complete the preceding milestone and check the agreement’s readiness first.";
    default:
      return "Review the milestone’s recorded status below.";
  }
}
