"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  ArrowUpRight,
  Check,
  CheckCheck,
  LockKeyhole,
  Pause,
  Play,
  ScanLine,
  Sparkles,
} from "lucide-react";
const steps = ["Plan", "Agree", "Fund", "Review"];
const intervalMs = 6000;
function subscribeMotion(callback: () => void) {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}
function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
function subscribeVisibility(callback: () => void) {
  document.addEventListener("visibilitychange", callback);
  return () => document.removeEventListener("visibilitychange", callback);
}
export function WorkflowPreview() {
  const [step, setStep] = useState(0);
  const [playback, setPlayback] = useState<boolean | null>(null);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [inView, setInView] = useState(false);
  const preview = useRef<HTMLDivElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const reducedMotion = useSyncExternalStore(
    subscribeMotion,
    prefersReducedMotion,
    () => true,
  );
  const visible = useSyncExternalStore(
    subscribeVisibility,
    () => document.visibilityState === "visible",
    () => false,
  );
  const playing = playback ?? !reducedMotion;
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      setInView(entry.isIntersecting);
    });
    if (preview.current) observer.observe(preview.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!playing || hovered || focused || !visible || !inView) return;
    const timer = window.setInterval(
      () => setStep((current) => (current + 1) % steps.length),
      intervalMs,
    );
    return () => window.clearInterval(timer);
  }, [playing, hovered, focused, visible, inView]);
  function selectStep(next: number) {
    setPlayback(false);
    setStep(next);
  }
  return (
    <div
      ref={preview}
      className="preview-wrap"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setFocused(false);
      }}
    >
      <div className="preview-label">
        <span>Interactive workflow</span>
        <span>Example project · Sandbox</span>
      </div>
      <div className="workspace-preview">
        <div className="preview-main">
          <div className="preview-top">
            <span>Proposed milestone plan</span>
            <span>Human review required</span>
          </div>
          <div className="preview-heading">
            <div>
              <h3>E-commerce website</h3>
              <p>Scope and budget for an example website.</p>
            </div>
            <span className="status">
              <span />
              {
                [
                  "Draft proposal",
                  "Terms under review",
                  "Ready for funding",
                  "Awaiting client review",
                ][step]
              }
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
                ref={(element) => {
                  tabs.current[i] = element;
                }}
                tabIndex={step === i ? 0 : -1}
                onKeyDown={(event) => {
                  const next =
                    event.key === "ArrowRight"
                      ? (i + 1) % steps.length
                      : event.key === "ArrowLeft"
                        ? (i + steps.length - 1) % steps.length
                        : event.key === "Home"
                          ? 0
                          : event.key === "End"
                            ? steps.length - 1
                            : null;
                  if (next !== null) {
                    event.preventDefault();
                    selectStep(next);
                    tabs.current[next]?.focus();
                  }
                }}
                role="tab"
                id={`tab-${i}`}
                aria-controls="preview-panel"
                aria-selected={step === i}
                className={step === i ? "active" : ""}
                onClick={() => selectStep(i)}
              >
                <span>0{i + 1}</span>
                {s}
              </button>
            ))}
          </div>
          <div
            id="preview-panel"
            role="tabpanel"
            tabIndex={0}
            aria-labelledby={`tab-${step}`}
            className="preview-content"
          >
            {step === 0 ? (
              <>
                <div className="preview-section-title">
                  <strong>A draft you can review and edit.</strong>
                  <span>
                    <Sparkles size={12} /> AI suggested
                  </span>
                </div>
                {[
                  ["01", "Discovery & design", "$150", "5 days"],
                  ["02", "Frontend development", "$250", "7 days"],
                  ["03", "Backend & integrations", "$400", "12 days"],
                  ["04", "Testing & delivery", "$200", "6 days"],
                ].map(([n, t, a, d]) => (
                  <div className="preview-milestone" key={n}>
                    <span className="milestone-number">{n}</span>
                    <div>
                      <strong>{t}</strong>
                      <span>{d} · Defined deliverables</span>
                    </div>
                    <b>{a}</b>
                  </div>
                ))}
              </>
            ) : step === 1 ? (
              <div className="preview-feature">
                <CheckCheck size={29} />
                <h4>Agree on the terms first.</h4>
                <p>
                  Review the deliverables, milestone prices, and time estimates.
                  Both partners agree before funding begins.
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
                <h4>Fund a milestone before work starts.</h4>
                <p>
                  After agreement, fund the next milestone in PayPal Sandbox.
                  Work starts after server verification, not a browser redirect.
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
                <h4>Review what was delivered.</h4>
                <p>
                  The developer submits the milestone for client review. Approve
                  the work or request revisions before the next milestone.
                </p>
                <div className="scope-example">
                  <span>Milestone submitted</span>
                  <ArrowUpRight size={15} />
                  <strong>
                    Client review <Check size={12} />
                  </strong>
                </div>
                <span className="scope-note">
                  Example status · Client approval required
                </span>
              </div>
            )}
          </div>
          <div className="preview-footer">
            <span>
              <LockKeyhole size={12} /> AI suggests. Both partners decide.
            </span>
            <button
              className="preview-playback"
              type="button"
              aria-label={
                playing ? "Pause workflow preview" : "Play workflow preview"
              }
              title="Advance to the next step every 6 seconds"
              onClick={() => {
                setPlayback(!playing);
                // Explicit playback can resume while this control retains focus.
                setFocused(false);
              }}
            >
              {playing ? (
                <Pause size={12} aria-hidden="true" />
              ) : (
                <Play size={12} aria-hidden="true" />
              )}
              {playing ? "Pause" : "Play"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
