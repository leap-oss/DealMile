import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  FileCheck2,
  Flag,
  GitCompareArrows,
  MoveUpRight,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { WorkflowPreview } from "@/components/workflow-preview";
import { buttonVariants } from "@/components/ui/button";
import { PrincipleMarquee } from "@/components/principle-marquee";
export default function Home() {
  return (
    <>
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
      <main>
        <section className="hero container">
          <div className="hero-copy">
            <div className="hero-kicker">
              <span className="tiny-diamond" /> CLEAR SCOPE. CONFIDENT
              COLLABORATION.
            </div>
            <h1>
              Great projects.
              <br />
              Clear agreements.
              <br />
              <span>Every milestone.</span>
            </h1>
            <p>
              Turn your project idea into a shared plan.
              <br className="desktop-break" /> Agree on the work, pay by
              milestone, and keep
              <br className="desktop-break" /> scope changes from becoming
              surprises.
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
              <ShieldCheck size={15} /> AI recommends. You decide.
            </div>
          </div>
          <WorkflowPreview />
        </section>
        <PrincipleMarquee />
        <section id="how-it-works" className="how-section container">
          <div className="section-heading">
            <div>
              <span className="eyebrow">
                FROM “I HAVE AN IDEA” TO “LET’S BUILD IT”
              </span>
              <h2>
                Less guesswork.
                <br />
                More common ground.
              </h2>
            </div>
            <p>
              One connected workflow for everything
              <br className="desktop-break" /> that happens between an idea and
              delivery.
            </p>
          </div>
          <div className="steps-grid">
            {[
              {
                icon: Sparkles,
                title: "Plan with clarity",
                text: "Describe your idea. AI helps turn requirements into scope, milestones, and a realistic starting point.",
                label: "A shared understanding",
              },
              {
                icon: FileCheck2,
                title: "Agree together",
                text: "Review the details, refine the proposal, and approve what you’re building before work begins.",
                label: "No assumptions",
              },
              {
                icon: Flag,
                title: "Pay by milestone",
                text: "Connect approved work to PayPal payments. Every payment has a clear purpose and a next step.",
                label: "Progress you can see",
              },
              {
                icon: GitCompareArrows,
                title: "Adapt without friction",
                text: "New requirements happen. Compare them with your agreement and decide on additional work together.",
                label: "Changes without surprises",
              },
            ].map((item, i) => (
              <article className="step-card" key={item.title}>
                <div className="step-top">
                  <span className="step-icon">
                    <item.icon size={22} strokeWidth={1.6} />
                  </span>
                  <span className="step-count">0{i + 1}</span>
                </div>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
                <div className="step-label">
                  <span /> {item.label}
                </div>
              </article>
            ))}
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
            <span className="eyebrow">
              KEEP THE RELATIONSHIP. LOSE THE SCOPE CREEP.
            </span>
            <h2>
              “One small change”
              <br />
              deserves a clear
              <br />
              <span>conversation.</span>
            </h2>
            <p>
              Extra work shouldn’t mean awkward conversations. DealMile helps
              compare new requests with the original scope, so everyone knows
              what’s included—and what needs a new agreement.
            </p>
            <a href="#how-it-works" className="text-link">
              Meet scope intelligence <ArrowRight size={17} />
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
              <span className="eyebrow">TWO SIDES. ONE SHARED PLAN.</span>
              <h2>
                Built for people
                <br />
                who build together.
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
              <span className="eyebrow">FOR CLIENTS</span>
              <h3>Your idea, with a clear path forward.</h3>
              <p>
                Understand what you’re getting, when it’s arriving, and what
                each milestone costs.
              </p>
              <Link href="/register?role=CLIENT" className="text-link">
                Bring your idea <ArrowUpRight size={17} />
              </Link>
            </article>
            <article>
              <span className="eyebrow">FOR DEVELOPERS</span>
              <h3>Your work, with the boundaries it deserves.</h3>
              <p>
                Start with aligned expectations and turn additional requirements
                into reviewed proposals.
              </p>
              <Link href="/register?role=DEVELOPER" className="text-link">
                Build with confidence <ArrowUpRight size={17} />
              </Link>
            </article>
          </div>
        </section>
        <section className="cta-section container">
          <div>
            <span className="eyebrow">START ON THE SAME PAGE.</span>
            <h2>
              Every milestone starts
              <br />
              with a clear deal.
            </h2>
          </div>
          <div>
            <Link href="/register" className={buttonVariants()}>
              Let’s make it clear <MoveUpRight size={19} />
            </Link>
            <p>A little structure. A lot more confidence.</p>
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
    </>
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
