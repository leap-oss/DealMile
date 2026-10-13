import Link from "next/link";
import {
  ArrowUpRight,
  LayoutDashboard,
  LogOut,
  Settings,
  ShieldCheck,
  CalendarDays,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { logout } from "@/app/(auth)/actions";
import type { Role } from "@prisma/client";
export function WorkspaceShell({
  user,
  active = "overview",
  children,
}: {
  user: { name: string; role: Role };
  active?: "overview" | "settings" | "schedule";
  children: React.ReactNode;
}) {
  const root = user.role === "CLIENT" ? "/dashboard" : "/developer";
  return (
    <div className="workspace-shell">
      <a href="#workspace-content" className="product-skip-link">
        Skip to content
      </a>
      <aside className="workspace-sidebar">
        <Brand />
        <span className="workspace-label">
          {user.role === "CLIENT" ? "CLIENT" : "DEVELOPER"} WORKSPACE
        </span>
        <nav aria-label="Workspace navigation">
          <Link
            href={root}
            className={active === "overview" ? "selected" : ""}
            aria-current={active === "overview" ? "page" : undefined}
          >
            <LayoutDashboard size={18} />
            Overview
          </Link>
          {user.role === "DEVELOPER" && (
            <Link
              href="/developer/schedule"
              className={active === "schedule" ? "selected" : ""}
              aria-current={active === "schedule" ? "page" : undefined}
            >
              <CalendarDays size={18} />
              Schedule
            </Link>
          )}
          <Link
            href="/settings"
            aria-current={active === "settings" ? "page" : undefined}
            className={active === "settings" ? "selected" : ""}
          >
            <Settings size={18} />
            Account
          </Link>
        </nav>
        <div className="sidebar-note">
          <ShieldCheck size={23} />
          <strong>You’re in control.</strong>
          <p>Every agreement starts with your approval.</p>
          <Link href="/#how-it-works">
            Explore the workflow <ArrowUpRight size={13} />
          </Link>
        </div>
        <div className="sidebar-profile">
          <span className="user-avatar">
            {user.name.slice(0, 2).toUpperCase()}
          </span>
          <div>
            <strong>{user.name}</strong>
            <span>{user.role === "CLIENT" ? "Client" : "Developer"}</span>
          </div>
          <form action={logout}>
            <button aria-label="Log out" title="Log out">
              <LogOut size={18} />
            </button>
          </form>
        </div>
      </aside>
      <div className="workspace-body">
        <header className="workspace-header">
          <span>
            Workspace{" "}
            <span>
              /{" "}
              {active === "settings"
                ? "Account"
                : active === "schedule"
                  ? "Schedule"
                  : "Overview"}
            </span>
          </span>
          <span className="workspace-secure">
            <ShieldCheck size={14} /> Your private workspace
          </span>
          <form action={logout} className="mobile-logout">
            <button aria-label="Log out">
              <LogOut size={18} />
            </button>
          </form>
        </header>
        <main
          id="workspace-content"
          tabIndex={-1}
          className="workspace-content"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
