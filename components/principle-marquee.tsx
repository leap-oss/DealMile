import { Handshake, Sparkles } from "lucide-react";
export function PrincipleMarquee() {
  return (
    <section
      className="principle-strip principle-marquee"
      aria-label="How DealMile works"
    >
      <span id="marquee-keyboard-hint" className="sr-only">
        Scrolling pauses while this section has keyboard focus or the pointer is
        over it.
      </span>
      <div className="marquee-viewport">
        <div className="marquee-track">
          {[false, true].map((duplicate) => (
            <div
              className="marquee-group"
              key={String(duplicate)}
              aria-hidden={duplicate || undefined}
            >
              {duplicate ? (
                <span className="marquee-intro">Explore the workflow</span>
              ) : (
                <a
                  href="#how-it-works"
                  className="marquee-intro"
                  aria-describedby="marquee-keyboard-hint"
                >
                  Explore the workflow
                </a>
              )}
              <span>
                <Sparkles size={18} aria-hidden="true" />
                <strong>AI proposes the scope</strong>
              </span>
              <span>
                <Handshake size={19} aria-hidden="true" />
                <strong>Both partners agree</strong>
              </span>
              <span>
                <span className="paypal-icon" aria-hidden="true">
                  P
                </span>
                <strong>PayPal Sandbox funds milestones</strong>
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
