import "./landing.css";
import Link from "next/link";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  GitCompareArrows,
  MoveUpRight,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { AgreementPreview } from "@/components/agreement-preview";
import { WorkflowPreview } from "@/components/workflow-preview";
import { buttonVariants } from "@/components/ui/button";
import { PrincipleMarquee } from "@/components/principle-marquee";
const landingFont = Geist({
  subsets: ["latin"],
  variable: "--dm-geist",
  display: "swap",
});
const landingMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--dm-geist-mono",
  display: "swap",
});
const landingDisplay = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--dm-editorial",
  display: "swap",
});
export default function Home() {
  return (
    <div
      className={`landing-page hallmark-landing ${landingFont.variable} ${landingMono.variable} ${landingDisplay.variable}`}
    >
      <a className="landing-skip-link" href="#landing-content">
        Skip to content
      </a>
      <header className="public-header">
        <div className="public-header-content container">
          <Brand />
          <nav aria-label="Main navigation">
            <a href="#how-it-works">How it works</a>
            <a href="#why-dealmile">Why DealMile</a>
            <a href="#built-for">Who it’s for</a>
          </nav>
          <div className="header-actions">
            <Link
              href="/register"
              className={buttonVariants({ size: "small" })}
            >
              Get started <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </header>
      <main id="landing-content" tabIndex={-1}>
        <section className="hero container">
          <div className="hero-copy">
            <div className="hero-kicker">
              Client–developer agreements · PayPal Sandbox
            </div>
            <h1>
              Clear agreements.
              <span>Work paid by milestone.</span>
            </h1>
            <p>
              Define the scope, agree on the budget, and pay for approved work.
              When requirements change, review the proposal together.
            </p>
            <div className="hero-actions">
              <Link href="/register" className={buttonVariants()}>
                Start a project <ArrowUpRight size={18} />
              </Link>
              <a href="#how-it-works" className="text-link">
                See how it works <ArrowRight size={17} />
              </a>
            </div>
            <div className="hero-assurance">
              <ShieldCheck size={15} /> AI drafts the plan. Both partners
              approve.
            </div>
          </div>
          <AgreementPreview />
        </section>
        <PrincipleMarquee />
        <section
          id="how-it-works"
          className="how-section container"
          aria-label="Project workflow"
        >
          <div className="section-heading">
            <div>
              <h2>
                From requirements
                <br />
                to approved work.
              </h2>
            </div>
            <p>
              Scope, agreements, delivery, and payment stay connected throughout
              the project.
            </p>
          </div>
          <div className="landing-workbench">
            <WorkflowPreview />
            <div className="workbench-guide">
              {" "}
              <div className="steps-grid">
                {[
                  {
                    title: "Define the scope",
                    text: "Describe your idea. AI helps turn requirements into scope, milestones, and a realistic starting point.",
                  },
                  {
                    title: "Agree together",
                    text: "Review the details, refine the proposal, and approve what you’re building before work begins.",
                  },
                  {
                    title: "Pay by milestone",
                    text: "Connect approved work to PayPal payments. Every payment has a clear purpose and a next step.",
                  },
                  {
                    title: "Review scope changes",
                    text: "New requirements happen. Compare them with your agreement and decide on additional work together.",
                  },
                ].map((item, i) => (
                  <article className="step-card" key={item.title}>
                    <div className="step-top">
                      <span className="step-count">0{i + 1}</span>
                    </div>
                    <h3>{item.title}</h3>
                    <p>{item.text}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>
        <section id="why-dealmile" className="scope-section container">
          <div className="scope-visual">
            <div className="scope-visual-top">
              <ScanBadge /> <span>SCOPE INTELLIGENCE</span>
              <span className="example-badge">Workflow example</span>
            </div>
            <div className="request-bubble">
              <span>CLIENT CHANGE REQUEST</span>
              <p>
                “Can we add Google login
                <br />
                and a sales analytics dashboard?”
              </p>
            </div>
            <div className="comparison">
              <div>
                <span>ORIGINAL SCOPE</span>
                <p>
                  <Check size={14} /> Email & password login
                </p>
                <p>
                  <Check size={14} /> Product management
                </p>
                <p>
                  <Check size={14} /> Shopping cart
                </p>
              </div>
              <span className="comparison-versus" aria-hidden="true">
                VS
              </span>
              <div>
                <span>NEW REQUEST</span>
                <p>
                  <PlusBadge /> Google login
                </p>
                <p>
                  <PlusBadge /> Sales analytics
                </p>
                <small>+ 2 NEW REQUIREMENTS</small>
              </div>
            </div>
            <div className="analysis-footer">
              <Sparkles size={16} />
              <span>
                <span className="scope-detected">
                  Scope change detected · example
                </span>
                <br />
                <strong>You decide what happens next.</strong>
              </span>
              <ArrowUpRight size={18} />
            </div>
          </div>
          <div className="scope-copy">
            <h2>
              Know when a request
              <span>changes the deal.</span>
            </h2>
            <p>
              Extra work shouldn’t mean awkward conversations. DealMile helps
              compare new requests with the original scope, so everyone knows
              what’s included—and what needs a new agreement.
            </p>
            <a href="#how-it-works" className="text-link">
              Review the workflow <ArrowRight size={17} />
            </a>
            <div className="human-note">
              <ShieldCheck size={19} />
              <span>
                AI is your second pair of eyes.
                <br />
                <strong>Never the final decision-maker.</strong>
              </span>
            </div>
          </div>
        </section>
        <section id="built-for" className="audience-section container">
          <div className="section-heading">
            <div>
              <h2>
                A shared agreement.
                <br />
                Two clear roles.
              </h2>
            </div>
            <p>
              For independent developers and the clients
              <br className="desktop-break" /> who count on them. No marketplace
              required.
            </p>
          </div>
          <div className="audience-grid">
            <article>
              <Link
                href="/register?role=CLIENT"
                className="audience-card-link"
                aria-labelledby="client-action"
                aria-describedby="client-description"
              >
                <span className="eyebrow">For clients</span>
                <h3>Know what you’re paying for.</h3>
                <p id="client-description">
                  Understand what you’re getting, when it’s arriving, and what
                  each milestone costs.
                </p>
                <span id="client-action" className="text-link">
                  Start a client project{" "}
                  <ArrowUpRight size={17} aria-hidden="true" />
                </span>
              </Link>
            </article>
            <article>
              <Link
                href="/register?role=DEVELOPER"
                className="audience-card-link"
                aria-labelledby="developer-action"
                aria-describedby="developer-description"
              >
                <span className="eyebrow">For developers</span>
                <h3>Make the scope explicit.</h3>
                <p id="developer-description">
                  Start with aligned expectations and turn additional
                  requirements into reviewed proposals.
                </p>
                <span id="developer-action" className="text-link">
                  Join as a developer{" "}
                  <ArrowUpRight size={17} aria-hidden="true" />
                </span>
              </Link>
            </article>
          </div>
        </section>
        <section className="cta-section container">
          <div>
            <h2>
              Every milestone starts
              <br />
              with a clear deal.
            </h2>
          </div>
          <div>
            <Link href="/register" className={buttonVariants()}>
              Start a project <MoveUpRight size={19} />
            </Link>
            <p>PayPal Sandbox demo · No live payments</p>
          </div>
        </section>
      </main>
      <footer className="footer container">
        <Brand />
        <span>Clear agreements. Better collaboration.</span>
        <a href="#how-it-works">
          How it works <ArrowUpRight size={13} />
        </a>
        <span>© {new Date().getFullYear()} DealMile</span>
      </footer>
    </div>
  );
}
function ScanBadge() {
  return (
    <span className="scan-badge">
      <GitCompareArrows size={18} />
    </span>
  );
}
function PlusBadge() {
  return <span className="plus-badge">+</span>;
}
