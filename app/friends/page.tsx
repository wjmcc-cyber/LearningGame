import Link from "next/link";
import { addFriendAction } from "@/lib/actions/friends";
import { requireCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { SubmitButton } from "@/components/submit-button";

type FriendsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function FriendsPage({ searchParams }: FriendsPageProps) {
  const user = await requireCurrentUser();
  const params = await searchParams;
  const query = (getParam(params.q) || "").trim();
  const error = getParam(params.error);
  const success = getParam(params.success);
  const friendships = await prisma.friendship.findMany({
    where: {
      OR: [{ requesterId: user.id }, { addresseeId: user.id }],
    },
    include: {
      requester: {
        select: {
          id: true,
          displayName: true,
          username: true,
          totalPoints: true,
        },
      },
      addressee: {
        select: {
          id: true,
          displayName: true,
          username: true,
          totalPoints: true,
        },
      },
    },
  });

  const friendIds = friendships.map((friendship) =>
    friendship.requesterId === user.id ? friendship.addresseeId : friendship.requesterId,
  );

  const suggestions = await prisma.user.findMany({
    where: {
      id: {
        notIn: [user.id, ...friendIds],
      },
      OR: query
        ? [
            { displayName: { contains: query } },
            { username: { contains: query } },
            { email: { contains: query } },
          ]
        : undefined,
    },
    orderBy: [{ totalPoints: "desc" }, { displayName: "asc" }],
    take: 10,
  });

  const friends = friendships
    .map((friendship) => (friendship.requesterId === user.id ? friendship.addressee : friendship.requester))
    .sort((a, b) => b.totalPoints - a.totalPoints);

  return (
    <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <section className="card px-6 py-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="section-title">Friends</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Search by display name, username, or email. Friend adds are immediate in V1.
            </p>
          </div>
          <Link href="/leaderboards/friends" className="button-secondary">
            Leaderboard
          </Link>
        </div>
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
        <form className="mt-5">
          <input name="q" defaultValue={query} placeholder="Search students" />
        </form>
        <div className="mt-5 space-y-3">
          {suggestions.length === 0 ? (
            <div className="rounded-3xl bg-[var(--surface-alt)] px-5 py-6 text-sm text-[var(--muted)]">
              No new students match the current search.
            </div>
          ) : (
            suggestions.map((candidate) => (
              <div key={candidate.id} className="rounded-3xl border border-[var(--border)] px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold">{candidate.displayName}</div>
                    <div className="mt-1 text-sm text-[var(--muted)]">@{candidate.username}</div>
                  </div>
                  <form action={addFriendAction}>
                    <input type="hidden" name="targetUserId" value={candidate.id} />
                    <SubmitButton pendingLabel="Adding..." className="button-secondary">
                      Add friend
                    </SubmitButton>
                  </form>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="card px-6 py-6">
        <h2 className="section-title">Your friend list</h2>
        <div className="mt-5 space-y-3">
          {friends.length === 0 ? (
            <div className="rounded-3xl bg-[var(--surface-alt)] px-5 py-6 text-sm text-[var(--muted)]">
              Add a few classmates to unlock direct messages and the friend leaderboard.
            </div>
          ) : (
            friends.map((friend) => (
              <div key={friend.id} className="flex items-center justify-between rounded-3xl bg-[var(--surface-alt)] px-5 py-4">
                <div>
                  <div className="font-semibold">{friend.displayName}</div>
                  <div className="mt-1 text-sm text-[var(--muted)]">@{friend.username}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{friend.totalPoints} pts</div>
                  <Link href={`/messages?friend=${friend.id}`} className="mt-2 inline-flex text-sm font-semibold text-[var(--accent)]">
                    Message
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
