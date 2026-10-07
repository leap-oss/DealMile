"use client";
import { useState } from "react";
import {
  ArrowUpRight,
  Check,
  CheckCheck,
  ChevronRight,
  FileText,
  Flag,
  LockKeyhole,
  Plus,
  ScanLine,
  Sparkles,
} from "lucide-react";
const steps = ["Plan", "Agree", "Pay", "Adapt"];
export function WorkflowPreview() {
  const [step, setStep] = useState(0);
  return (
    <div className="preview-wrap">
      <div className="preview-label">
        <span className="live-dot" /> A LITTLE CLARITY GOES A LONG WAY{" "}
        <span>Product preview</span>
      </div>
      <div className="workspace-preview">
        <div className="preview-sidebar">
          <span className="mini-mark">d.</span>
          <FileText size={19} />
          <Flag size={19} />
          <ScanLine size={19} />
          <div className="mini-avatar">JD</div>
        </div>
        <div className="preview-main">
          <div className="preview-top">
            <span>
              Workspace <ChevronRight size={13} /> E-commerce website
            </span>
            <span className="preview-dots">•••</span>
          </div>
          <div className="preview-heading">
            <div>
              <span className="eyebrow">PROJECT OVERVIEW</span>
              <h3>E-commerce website</h3>
              <p>A shared plan. A confident next step.</p>
            </div>
            <span className="status">
              <span />
              {step === 0 ? "Draft proposal" : "Agreement ready"}
            </span>
          </div>
          <div className="preview-stats">
            <div>
              <span>Project budget</span>
              <strong>
                $1,000<span> USD</span>
              </strong>
            </div>
            <div>
              <span>Estimated timeline</span>
              <strong>
                30<span> days</span>
              </strong>
            </div>
            <div>
              <span>Milestones</span>
              <strong>
                4<span> clear steps</span>
              </strong>
            </div>
          </div>
          <div
            className="preview-tabs"
            role="tablist"
            aria-label="Explore the DealMile workflow"
          >
            {steps.map((s, i) => (
              <button
                key={s}
                role="tab"
                id={`tab-${i}`}
                aria-controls="preview-panel"
                aria-selected={step === i}
                className={step === i ? "active" : ""}
                onClick={() => setStep(i)}
              >
                <span>0{i + 1}</span>
                {s}
              </button>
            ))}
          </div>
          <div
            id="preview-panel"
            role="tabpanel"
            aria-labelledby={`tab-${step}`}
            className="preview-content"
          >
            {step === 0 ? (
              <>
                <div className="preview-section-title">
                  <strong>Your project, broken down.</strong>
                  <span>
                    <Sparkles size={12} /> AI suggested
                  </span>
                </div>
                {[
                  ["01", "Discovery & design", "$150", "5 days"],
                  ["02", "Frontend development", "$250", "7 days"],
                  ["03", "Backend & integrations", "$400", "12 days"],
                ].map(([n, t, a, d]) => (
                  <div className="preview-milestone" key={n}>
                    <span className="milestone-number">{n}</span>
                    <div>
                      <strong>{t}</strong>
                      <span>{d} · Defined deliverables</span>
                    </div>
                    <b>{a}</b>
                    <ChevronRight size={15} />
                  </div>
                ))}
              </>
            ) : step === 1 ? (
              <div className="preview-feature">
                <CheckCheck size={29} />
                <h4>One agreement. Both on board.</h4>
                <p>
                  Review scope, adjust milestones, and approve the final
                  proposal together.
                </p>
                <div className="preview-check">
                  <Check size={15} /> Scope, timeline, and pricing reviewed
                </div>
                <div className="preview-check">
                  <Check size={15} /> Explicit approval from both parties
                </div>
              </div>
            ) : step === 2 ? (
              <div className="preview-feature">
                <LockKeyhole size={29} />
                <h4>A payment for every milestone.</h4>
                <p>
                  Pay through PayPal after an agreement. Work starts once the
                  server verifies payment.
                </p>
                <div className="payment-example">
                  <span>Discovery & design</span>
                  <strong>$150.00</strong>
                </div>
                <span className="paypal-word">
                  Pay<span>Pal</span> <small>Sandbox workflow</small>
                </span>
              </div>
            ) : (
              <div className="preview-feature">
                <ScanLine size={29} />
                <h4>New request? Make it a clear deal.</h4>
                <p>
                  Compare additional work with the original agreement before
                  making a decision.
                </p>
                <div className="scope-example">
                  <span>Email authentication</span>
                  <ArrowUpRight size={15} />
                  <strong>
                    Google login <Plus size={12} />
                  </strong>
                </div>
                <span className="scope-note">
                  Potential new requirement · Human review required
                </span>
              </div>
            )}
          </div>
          <div className="preview-footer">
            <span>
              <LockKeyhole size={12} /> You make the decisions. Always.
            </span>
            <span>Example project</span>
          </div>
        </div>
      </div>
      <div className="clarity-note">
        <span>
          <Check size={16} />
        </span>
        <div>
          <strong>Good work starts with a good agreement.</strong>
          <p>Less back-and-forth. More moving forward.</p>
        </div>
      </div>
    </div>
  );
}
