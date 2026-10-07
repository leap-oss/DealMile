import { ScanLine } from "lucide-react";
import type { ChangeRequest, AIAnalysis } from "@prisma/client";
import { scopeAnalysisSchema } from "@/lib/ai/contracts";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  ChangeControls,
  ChangeRequestForm,
} from "@/components/change-controls";
export function ScopeIntelligence({
  projectId,
  developer,
  open,
  changes,
}: {
  projectId: string;
  developer: boolean;
  open: boolean;
  changes: (ChangeRequest & { analysis: AIAnalysis | null })[];
}) {
  return (
    <section
      className="editor-section scope-intelligence"
      aria-labelledby="scope-intelligence-heading"
    >
      <div className="panel-heading inline-panel">
        <h2 id="scope-intelligence-heading">
          <ScanLine size={18} /> Scope intelligence
        </h2>
        <span>AI recommends. Humans approve.</span>
      </div>
      {!developer && open && <ChangeRequestForm projectId={projectId} />}
      {!changes.length && (
        <p className="field-hint">
          New requests and their comparison with your agreement will appear
          here.
        </p>
      )}
      {changes.map((change) => {
        const result = scopeAnalysisSchema.safeParse(change.analysis?.result);
        return (
          <article key={change.id} className="scope-change-card">
            <div className="scope-change-heading">
              <h3>Change request</h3>
              <StatusBadge status={change.status} />
            </div>
            <div className="comparison scope-workspace-comparison">
              <div>
                <span>ORIGINAL SCOPE AT REQUEST</span>
                <ul>
                  {change.scopeSnapshot.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
              <span className="comparison-versus" aria-hidden="true">
                VS
              </span>
              <div>
                <span>NEW REQUEST</span>
                <p>{change.description}</p>
              </div>
            </div>
            {result.success ? (
              <div className="scope-analysis">
                <strong>
                  {result.data.scopeChangeDetected
                    ? "Potential scope change detected"
                    : "Request matches existing scope"}
                </strong>
                <p className="field-hint">
                  Advisory analysis. Developer review and explicit client
                  approval decide the agreement.
                </p>
                {result.data.changes.map((feature, i) => (
                  <div key={i} className="scope-finding">
                    <StatusBadge
                      status={
                        feature.includedInOriginalScope
                          ? "INCLUDED"
                          : "SCOPE_CHANGE"
                      }
                    >
                      {feature.includedInOriginalScope
                        ? "Included"
                        : "+ New requirement"}
                    </StatusBadge>
                    <h4>{feature.feature}</h4>
                    <p>{feature.reason}</p>
                    {feature.originalRequirement && (
                      <small>
                        Original requirement: {feature.originalRequirement}
                      </small>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="field-hint">
                {change.status === "ANALYZING"
                  ? "Gemini is comparing this request…"
                  : "Analysis did not finish. Your request is saved; retry to continue."}
              </p>
            )}
            {change.status === "PENDING" && !developer && open && (
              <ChangeRequestForm
                projectId={projectId}
                retryId={change.id}
                description={change.description}
              />
            )}
            {change.proposedTitle && (
              <div className="additional-terms">
                <h4>{change.proposedTitle}</h4>
                <p>{change.proposedDescription}</p>
                <strong>
                  ${change.proposedAmount?.toFixed(2)} USD{" "}
                  <span>· {change.proposedDays} estimated days</span>
                </strong>
              </div>
            )}
            {change.resolutionNote && (
              <p className="field-hint">{change.resolutionNote}</p>
            )}
            {open && (
              <ChangeControls
                id={change.id}
                status={change.status}
                developer={developer}
                amount={change.proposedAmount?.toFixed(2)}
                days={change.proposedDays ?? undefined}
              />
            )}
            {change.status === "APPROVED" && change.milestoneId && (
              <p className="action-success">
                Additional milestone approved. Its payment follows the normal
                milestone sequence.
              </p>
            )}
          </article>
        );
      })}
    </section>
  );
}
