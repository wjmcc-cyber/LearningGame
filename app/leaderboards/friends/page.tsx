import { requireCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";

export default async function FriendLeaderboardPage() {
  const prisma = await getDb();
  const user = await requireCurrentUser();
  const friendships = await prisma.friendship.findMany({
    where: {
      OR: [{ requesterId: user.id }, { addresseeId: user.id }],
    },
  });

  const friendIds = friendships.map((friendship) =>
    friendship.requesterId === user.id ? friendship.addresseeId : friendship.requesterId,
  );

  const leaderboardUsers = await prisma.user.findMany({
    where: {
      id: {
        in: Array.from(new Set([user.id, ...friendIds])),
      },
    },
    orderBy: [{ totalPoints: "desc" }, { displayName: "asc" }],
    select: {
      id: true,
      displayName: true,
      totalPoints: true,
    },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <section className="card px-6 py-6">
        <h1 className="display-title text-3xl font-bold">Friend leaderboard</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Rankings use each student’s cached total points across all classes.
        </p>
        <div className="mt-6 space-y-3">
          {leaderboardUsers.map((friend, index) => (
            <div key={friend.id} className="flex items-center justify-between rounded-3xl bg-[var(--surface-alt)] px-5 py-4">
              <div>
                <div className="text-sm font-semibold text-[var(--muted)]">Rank #{index + 1}</div>
                <div className="font-semibold">{friend.displayName}</div>
              </div>
              <div className="text-lg font-bold">{friend.totalPoints} pts</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
