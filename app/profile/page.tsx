import { updateProfileAction } from "@/lib/actions/auth";
import { requireCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { SubmitButton } from "@/components/submit-button";

type ProfilePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const sessionUser = await requireCurrentUser();
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: sessionUser.id },
    include: {
      pointsLedger: {
        orderBy: { createdAt: "desc" },
        take: 8,
      },
    },
  });
  const params = await searchParams;
  const error = getParam(params.error);
  const success = getParam(params.success);

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <section className="card px-6 py-6">
        <h1 className="section-title">Profile</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Your display name is visible across classrooms, chat, and leaderboards.
        </p>
        {error ? (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
        {success ? (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </div>
        ) : null}
        <form action={updateProfileAction} className="mt-6 space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-semibold">Display name</span>
            <input name="displayName" defaultValue={user.displayName} required />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-semibold">Username</span>
            <input name="username" defaultValue={user.username} required />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-semibold">Email</span>
            <input name="email" type="email" defaultValue={user.email} required />
          </label>
          <SubmitButton pendingLabel="Updating profile...">Save profile</SubmitButton>
        </form>
      </section>

      <section className="card px-6 py-6">
        <h2 className="section-title">Points ledger snapshot</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <div className="rounded-3xl bg-[var(--surface-alt)] px-5 py-5">
            <div className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
              Total points
            </div>
            <div className="mt-2 text-3xl font-bold">{user.totalPoints.toLocaleString()}</div>
          </div>
          <div className="rounded-3xl bg-[var(--surface-alt)] px-5 py-5">
            <div className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
              Ledger entries
            </div>
            <div className="mt-2 text-3xl font-bold">{user.pointsLedger.length} recent</div>
          </div>
        </div>
        <div className="mt-5 space-y-3">
          {user.pointsLedger.map((entry) => (
            <div key={entry.id} className="rounded-2xl border border-[var(--border)] px-4 py-3">
              <div className="font-semibold">
                +{entry.amount} from {entry.reason.replaceAll("_", " ").toLowerCase()}
              </div>
              <div className="mt-1 text-xs text-[var(--muted)]">{entry.referenceType}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
