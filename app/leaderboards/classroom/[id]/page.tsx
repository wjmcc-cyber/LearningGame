import Link from "next/link";
import { requireCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

type ClassroomLeaderboardPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ClassroomLeaderboardPage({ params }: ClassroomLeaderboardPageProps) {
  await requireCurrentUser();
  const { id } = await params;
  const classroom = await prisma.classroom.findUniqueOrThrow({
    where: { id },
    include: {
      members: {
        include: {
          user: {
            select: {
              displayName: true,
            },
          },
        },
        orderBy: [{ classroomPoints: "desc" }, { createdAt: "asc" }],
      },
    },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <section className="card px-6 py-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="display-title text-3xl font-bold">{classroom.name} leaderboard</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Rankings are based on stored classroom points, not client-side calculations.
            </p>
          </div>
          <Link href={`/classrooms/${id}`} className="button-secondary">
            Back
          </Link>
        </div>
        <div className="mt-6 space-y-3">
          {classroom.members.map((member, index) => (
            <div key={member.id} className="flex items-center justify-between rounded-3xl bg-[var(--surface-alt)] px-5 py-4">
              <div>
                <div className="text-sm font-semibold text-[var(--muted)]">Rank #{index + 1}</div>
                <div className="font-semibold">{member.user.displayName}</div>
              </div>
              <div className="text-lg font-bold">{member.classroomPoints} pts</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
