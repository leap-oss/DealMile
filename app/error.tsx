"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="fallback">
      <span className="eyebrow">LET’S GET BACK ON TRACK</span>
      <h1>Something interrupted your workspace.</h1>
      <p>We couldn’t load this page. Try again in a moment.</p>
      <div>
        <Button onClick={reset}>Try again</Button>
        <Link href="/" className="button button-outline">
          Back to home
        </Link>
      </div>
    </main>
  );
}
