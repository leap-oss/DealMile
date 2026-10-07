import Link from "next/link";
export default function NotFound() {
  return (
    <main className="fallback">
      <span className="eyebrow">404 · A SMALL DETOUR</span>
      <h1>This page isn’t on the plan.</h1>
      <p>Let’s get you back to a clear starting point.</p>
      <Link href="/" className="button button-primary">
        Back to home
      </Link>
    </main>
  );
}
