import { Handshake, Sparkles } from "lucide-react";
export function PrincipleMarquee() {
  return (
    <section
      className="principle-strip principle-marquee"
      aria-label="How DealMile works"
    >
      <div className="marquee-viewport">
        <div className="marquee-track">
          {[false, true].map((duplicate) => (
            <div
              className="marquee-group"
              key={String(duplicate)}
              aria-hidden={duplicate || undefined}
            >
              <span className="marquee-intro">
                A better way to work together.
              </span>
              <span>
                <Sparkles size={18} aria-hidden="true" />
                <strong>AI understands the scope</strong>
              </span>
              <span>
                <Handshake size={19} aria-hidden="true" />
                <strong>Humans make the deal</strong>
              </span>
              <span>
                <span className="paypal-icon" aria-hidden="true">
                  P
                </span>
                <strong>PayPal powers the payment</strong>
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
