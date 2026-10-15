import "./landing.css";
import type { Metadata } from "next";
import { isDeploymentPreview, publicSiteOrigin } from "@/lib/site";
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
export const metadata: Metadata = {
  title: { absolute: "DealMile — Project agreements and milestone payments" },
  description:
    "Turn requirements into an editable project plan, agree on milestones, fund work in PayPal Sandbox, and review deliveries together.",
  ...(publicSiteOrigin() ? { alternates: { canonical: "/" } } : {}),
  robots: { index: !isDeploymentPreview, follow: !isDeploymentPreview },
  openGraph: {
    title: "Agree on the work. Then fund each milestone.",
    description:
      "Project scope, shared terms, and reviewed delivery. PayPal Sandbox only; no real money moves.",
    siteName: "DealMile",
    type: "website",
    ...(publicSiteOrigin() ? { url: "/" } : {}),
  },
  twitter: { card: "summary_large_image" },
};

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
              Create account <ArrowRight size={15} />
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
              Agree on the work.
              <span>Then fund each milestone.</span>
            </h1>
            <p>
              Turn your requirements into an editable AI draft. Agree on scope,
              price, and delivery with your developer. Fund each milestone in
              PayPal Sandbox before its work starts.
            </p>
            <div className="hero-actions">
              <Link href="/register" className={buttonVariants()}>
                Create account <ArrowUpRight size={18} />
              </Link>
              <a href="#how-it-works" className="text-link">
                See how it works <ArrowRight size={17} />
              </a>
            </div>
            <div className="hero-assurance">
              <ShieldCheck size={15} /> AI proposes. You and your developer
              agree.
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
                From your brief
                <br />
                to reviewed delivery.
              </h2>
            </div>
            <p>
              Draft the plan, agree on the terms, fund the next milestone, then
              review what was delivered.
            </p>
          </div>
          <div className="landing-workbench">
            <WorkflowPreview />
            <div className="workbench-guide">
              {" "}
              <div className="steps-grid">
                {[
                  {
                    title: "Start with an editable draft",
                    text: "Describe your project, budget, and deadline. AI suggests scope and milestones for you to review and edit.",
                  },
                  {
                    title: "Agree before work begins",
                    text: "The assigned developer reviews your proposal. Resolve changes to deliverables, prices, and estimates before agreeing.",
                  },
                  {
                    title: "Fund the next milestone",
                    text: "After agreement, pay for the next milestone through PayPal Sandbox. Work starts after the server verifies its funding.",
                  },
                  {
                    title: "Review the delivered work",
                    text: "The developer submits the milestone. Approve the delivery or request revisions before moving to the next milestone.",
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
              <ScanBadge /> <span>SCOPE REVIEW</span>
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
                <small>+ 2 ITEMS TO REVIEW</small>
              </div>
            </div>
            <div className="analysis-footer">
              <Sparkles size={16} />
              <span>
                <span className="scope-detected">
                  Potential scope change · example
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
              Compare a new request with the agreed scope. AI flags possible
              additions and suggests an impact on cost and time. Both partners
              review the proposal before the extra work becomes a milestone.
            </p>
            <a href="#how-it-works" className="text-link">
              Review the workflow <ArrowRight size={17} />
            </a>
            <div className="human-note">
              <ShieldCheck size={19} />
              <span>
                AI suggestions need your review.
                <br />
                <strong>Agreement stays with both partners.</strong>
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
              Clients review the plan and delivered work.
              <br className="desktop-break" /> Developers review proposals and
              deliver funded milestones.
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
                <h3>See the scope. Know the cost.</h3>
                <p id="client-description">
                  Review the draft, agree on milestone costs, and approve
                  delivered work or ask for revisions.
                </p>
                <span id="client-action" className="text-link">
                  Join as a client <ArrowUpRight size={17} aria-hidden="true" />
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
                <h3>Agree before you build.</h3>
                <p id="developer-description">
                  Review assigned proposals, agree on deliverables, and submit
                  each funded milestone for client review.
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
              Create account <MoveUpRight size={19} />
            </Link>
            <p>PayPal Sandbox only · No real money moves</p>
          </div>
        </section>
      </main>
      <footer className="footer container">
        <Brand />
        <span>Agreed scope. Funded milestones. Reviewed delivery.</span>
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
