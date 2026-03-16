import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { joinClassroomAction } from "@/lib/actions/classrooms";
import { SubmitButton } from "@/components/submit-button";

type JoinPageProps = {
  params: Promise<{ inviteCode: string }>;
};

export default async function JoinClassroomPage({ params }: JoinPageProps) {
  const prisma = await getDb();
  const user = await getCurrentUser();
  const { inviteCode } = await params;

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/join/${inviteCode}`)}`);
  }

  const invite = await prisma.classroomInvite.findUnique({
    where: { code: inviteCode },
    include: {
      classroom: {
        include: {
          members: true,
        },
      },
    },
  });

  if (!invite) {
    return (
      <div className="mx-auto max-w-xl">
        <section className="card px-6 py-8">
          <h1 className="section-title">Invite not found</h1>
          <p className="mt-3 text-sm text-[var(--muted)]">
            This classroom invite link is no longer valid.
          </p>
        </section>
      </div>
    );
  }

  const isMember = invite.classroom.members.some((member) => member.userId === user.id);

  return (
    <div className="mx-auto max-w-xl">
      <section className="card px-6 py-8">
        <div className="pill bg-[var(--accent-soft)] text-[var(--accent)]">Permanent invite link</div>
        <h1 className="display-title mt-5 text-3xl font-bold">{invite.classroom.name}</h1>
        <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
          {invite.classroom.description || "No classroom description yet."}
        </p>
        <div className="mt-5 rounded-3xl bg-[var(--surface-alt)] px-5 py-5">
          <div className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
            Active members
          </div>
          <div className="mt-2 text-3xl font-bold">{invite.classroom.members.length}</div>
        </div>
        {isMember ? (
          <a href={`/classrooms/${invite.classroomId}`} className="button-primary mt-6 inline-flex">
            Open classroom
          </a>
        ) : (
          <form action={joinClassroomAction} className="mt-6">
            <input type="hidden" name="inviteCode" value={inviteCode} />
            <SubmitButton pendingLabel="Joining classroom...">Join classroom</SubmitButton>
          </form>
        )}
      </section>
    </div>
  );
}
