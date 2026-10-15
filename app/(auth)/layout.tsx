import { Geist } from "next/font/google";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Brand } from "@/components/brand";
import "./auth.css";

const authFont = Geist({
  subsets: ["latin"],
  variable: "--auth-font",
  display: "swap",
});

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={`auth-layout auth-shell ${authFont.variable}`}>
      <a className="product-skip-link" href="#auth-content">
        Skip to form
      </a>
      <aside className="auth-aside" aria-label="About DealMile">
        <Brand />
        <div className="auth-story">
          <p className="auth-overline">A shared plan for the work ahead</p>
          <h2>
            Clear scope.
            <br />
            <span>Shared terms.</span>
          </h2>
          <p>
            From the first proposal to the last delivery, know what is agreed
            and who acts next.
          </p>
          <ol className="auth-workflow">
            {[
              [
                "01",
                "Agree on the work",
                "Review deliverables, prices, and time estimates together.",
              ],
              [
                "02",
                "Fund one milestone",
                "Sandbox funding is verified before that milestone starts.",
              ],
              [
                "03",
                "Review the delivery",
                "Approve submitted work or request revisions.",
              ],
            ].map(([number, title, description]) => (
              <li key={number}>
                <span className="auth-step-number" aria-hidden="true">
                  {number}
                </span>
                <div>
                  <strong>{title}</strong>
                  <p>{description}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <p className="auth-aside-footer">
          <ShieldCheck size={17} aria-hidden="true" /> AI proposes. Both
          partners decide.
        </p>
      </aside>
      <div className="auth-content">
        <header className="auth-topbar">
          <div className="auth-mobile-brand">
            <Brand />
          </div>
          <Link href="/" className="back-link">
            <ArrowLeft size={16} aria-hidden="true" /> Back to home
          </Link>
          <span className="auth-environment">PayPal Sandbox</span>
        </header>
        <main id="auth-content" tabIndex={-1} className="auth-card">
          {children}
        </main>
        <p className="auth-bottom">
          Sandbox payments only. No real money moves.
        </p>
      </div>
    </div>
  );
}
