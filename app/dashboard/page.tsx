import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireCurrentUser } from "@/lib/auth/session";
import { formatDate } from "@/lib/utils";

type DashboardPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const user = await requireCurrentUser();
  const params = await searchParams;
  const error = getParam(params.error);
  const memberships = await prisma.classroomMember.findMany({
    where: { userId: user.id },
    include: {
      classroom: {
        include: {
          invite: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
  const friendships = await prisma.friendship.findMany({
    where: {
      OR: [{ requesterId: user.id }, { addresseeId: user.id }],
    },
  });
  const recentPoints = await prisma.pointsLedger.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 6,
  });

  return (
    <div className="space-y-6">
      {error ? (
        <div className="alert-error rounded-2xl px-4 py-3 text-sm">
          {error}
        </div>
      ) : null}
      <section className="grid gap-4 md:grid-cols-3">
        <article className="card px-5 py-5">
          <div className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
            Total points
          </div>
          <div className="mt-2 text-3xl font-bold">{user.totalPoints.toLocaleString()}</div>
        </article>
        <article className="card px-5 py-5">
          <div className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
            Classrooms
          </div>
          <div className="mt-2 text-3xl font-bold">{memberships.length}</div>
        </article>
        <article className="card px-5 py-5">
          <div className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
            Friends
          </div>
          <div className="mt-2 text-3xl font-bold">{friendships.length}</div>
        </article>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
        <section className="card px-6 py-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="section-title">Your classrooms</h1>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Create a classroom or jump back into an existing one.
              </p>
            </div>
            <Link href="/classrooms/new" className="button-primary">
              New classroom
            </Link>
          </div>
          <div className="mt-5 space-y-3">
            {memberships.length === 0 ? (
              <div className="rounded-3xl bg-[var(--surface-alt)] px-5 py-6 text-sm text-[var(--muted)]">
                You have not joined any classrooms yet. Create one or open a shared invite link.
              </div>
            ) : (
              memberships.map((membership) => (
                <Link
                  key={membership.id}
                  href={`/classrooms/${membership.classroomId}`}
                  className="panel block rounded-3xl px-5 py-4 transition hover:border-[var(--accent)]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold">{membership.classroom.name}</div>
                      <div className="mt-1 text-sm text-[var(--muted)]">
                        {membership.classroom.description || "No description yet."}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="pill bg-[var(--accent-soft)] text-[var(--accent)]">
                        {membership.role === "MANAGER" ? "Manager" : "Member"}
                      </div>
                      <div className="mt-2 text-sm font-semibold">{membership.classroomPoints} pts</div>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>

        <section className="space-y-6">
          <article className="card px-6 py-6">
            <h2 className="section-title">Quick links</h2>
            <div className="mt-4 grid gap-3">
              <Link href="/friends" className="button-secondary text-center">
                Manage friends
              </Link>
              <Link href="/messages" className="button-secondary text-center">
                Direct messages
              </Link>
              <Link href="/leaderboards/friends" className="button-secondary text-center">
                Friend leaderboard
              </Link>
            </div>
          </article>
          <article className="card px-6 py-6">
            <h2 className="section-title">Recent points</h2>
            <div className="mt-4 space-y-3">
              {recentPoints.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">No point events yet.</p>
              ) : (
                recentPoints.map((item) => (
                  <div key={item.id} className="rounded-2xl bg-[var(--surface-alt)] px-4 py-3">
                    <div className="font-semibold">
                      +{item.amount} for {item.reason.replaceAll("_", " ").toLowerCase()}
                    </div>
                    <div className="mt-1 text-xs text-[var(--muted)]">{formatDate(item.createdAt)}</div>
                  </div>
                ))
              )}
            </div>
          </article>
        </section>
      </div>
    </div>
  );
}
