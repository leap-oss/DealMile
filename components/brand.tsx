import Link from "next/link";
export function Brand({ light = false }: { light?: boolean }) {
  return (
    <Link
      href="/"
      className={`brand ${light ? "brand-light" : ""}`}
      aria-label="DealMile home"
    >
      <span className="brand-mark">
        <span />
        <span />
        <span />
      </span>
      DealMile<span className="brand-period">.</span>
    </Link>
  );
}
