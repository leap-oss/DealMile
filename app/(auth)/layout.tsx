import { Brand } from "@/components/brand";
import { Check, ArrowLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="auth-layout">
      <aside className="auth-aside">
        <Brand />
        <div>
          <span className="eyebrow">A BETTER START TO EVERY PROJECT</span>
          <h1>
            Good work starts
            <br />
            with a good
            <br />
            <span>agreement.</span>
          </h1>
          <p>
            A shared understanding of what you’re building,
            <br />
            what it costs, and what comes next.
          </p>
          <ul>
            <li>
              <Check size={17} />
              Clear scope and deliverables
            </li>
            <li>
              <Check size={17} />
              Milestones you agree on together
            </li>
            <li>
              <Check size={17} />
              Room for change. Without surprises.
            </li>
          </ul>
        </div>
        <span className="auth-aside-footer">
          <ShieldCheck size={16} /> AI recommends. Humans approve.
        </span>
      </aside>
      <section className="auth-content">
        <Link href="/" className="back-link">
          <ArrowLeft size={16} /> Back to home
        </Link>
        <div className="auth-card">{children}</div>
        <p className="auth-bottom">Every milestone starts with a clear deal.</p>
      </section>
    </main>
  );
}
