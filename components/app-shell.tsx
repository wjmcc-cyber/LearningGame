import Link from "next/link";
import { logoutAction } from "@/lib/actions/auth";

type AppShellProps = {
  children: React.ReactNode;
  user: {
    id: string;
    displayName: string;
    username: string;
    totalPoints: number;
  } | null;
};

const signedOutNav = [
  { href: "/", label: "Overview" },
  { href: "/login", label: "Log in" },
  { href: "/signup", label: "Sign up" },
];

const signedInNav = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/classrooms/new", label: "New classroom" },
  { href: "/friends", label: "Friends" },
  { href: "/messages", label: "Messages" },
  { href: "/profile", label: "Profile" },
];

export function AppShell({ children, user }: AppShellProps) {
  const nav = user ? signedInNav : signedOutNav;

  return (
    <div className="app-background min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <header className="card mb-6 flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center justify-between gap-4">
            <Link href={user ? "/dashboard" : "/"} className="display-title text-2xl font-bold">
              Study League
            </Link>
            <span className="pill bg-[var(--accent-soft)] text-[var(--accent)]">MVP</span>
          </div>
          <nav className="flex flex-wrap items-center gap-2">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full px-4 py-2 text-sm font-semibold text-[var(--muted)] transition hover:bg-white hover:text-[var(--foreground)]"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {user ? (
              <>
                <div className="rounded-2xl bg-[var(--surface-alt)] px-4 py-2">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                    Logged in
                  </div>
                  <div className="font-semibold">
                    {user.displayName} <span className="muted">@{user.username}</span>
                  </div>
                  <div className="text-sm font-semibold text-[var(--accent)]">
                    {user.totalPoints.toLocaleString()} pts
                  </div>
                </div>
                <form action={logoutAction}>
                  <button type="submit" className="button-secondary w-full sm:w-auto">
                    Log out
                  </button>
                </form>
              </>
            ) : (
              <div className="rounded-2xl bg-[var(--surface-alt)] px-4 py-3 text-sm font-medium text-[var(--muted)]">
                Build classrooms, quizzes, leaderboards, and social study loops.
              </div>
            )}
          </div>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}
