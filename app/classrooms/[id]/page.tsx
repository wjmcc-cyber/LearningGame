import Link from "next/link";
import {
  deleteClassroomMessageAction,
  postClassroomMessageAction,
  promoteManagerAction,
  removeMemberAction,
} from "@/lib/actions/classrooms";
import { deleteDocumentAction, uploadDocumentAction } from "@/lib/actions/documents";
import { generateQuizAction } from "@/lib/actions/quiz";
import { requireCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { requireClassroomMember } from "@/lib/permissions/classroom";
import { formatDate } from "@/lib/utils";
import { SubmitButton } from "@/components/submit-button";

type ClassroomPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ClassroomDetailPage({ params, searchParams }: ClassroomPageProps) {
  const user = await requireCurrentUser();
  const { id } = await params;
  const membership = await requireClassroomMember(id, user.id);
  const paramsData = await searchParams;
  const error = getParam(paramsData.error);
  const success = getParam(paramsData.success);
  const classroom = await prisma.classroom.findUniqueOrThrow({
    where: { id },
    include: {
      invite: true,
      members: {
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
              username: true,
              totalPoints: true,
            },
          },
        },
      },
      documents: {
        orderBy: { createdAt: "desc" },
      },
      messages: {
        include: {
          author: {
            select: {
              displayName: true,
              username: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 30,
      },
    },
  });

  const sortedMembers = [...classroom.members].sort((a, b) => {
    if (a.role !== b.role) {
      return a.role === "MANAGER" ? -1 : 1;
    }

    return b.classroomPoints - a.classroomPoints;
  });

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      ) : null}
      <section className="card px-6 py-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="pill bg-[var(--accent-soft)] text-[var(--accent)]">
              {membership.role === "MANAGER" ? "Manager view" : "Member view"}
            </div>
            <h1 className="display-title mt-4 text-4xl font-bold">{classroom.name}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted)]">
              {classroom.description || "No classroom description yet."}
            </p>
          </div>
          <div className="rounded-3xl bg-[var(--surface-alt)] px-5 py-4">
            <div className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
              Invite link
            </div>
            <div className="mt-2 break-all text-sm font-semibold">
              /join/{classroom.invite?.code}
            </div>
            <Link
              href={`/leaderboards/classroom/${classroom.id}`}
              className="mt-4 inline-flex text-sm font-semibold text-[var(--accent)]"
            >
              Open classroom leaderboard
            </Link>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.95fr]">
        <section className="space-y-6">
          <article className="card px-6 py-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="section-title">Documents</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Upload `pdf`, `txt`, or `md`. Duplicate content hashes are blocked and do not earn points.
                </p>
              </div>
              <div className="rounded-full bg-[var(--surface-alt)] px-4 py-2 text-sm font-semibold">
                {classroom.documents.length} files
              </div>
            </div>
            <form action={uploadDocumentAction} className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]">
              <input type="hidden" name="classroomId" value={classroom.id} />
              <input name="document" type="file" accept=".pdf,.txt,.md" required />
              <SubmitButton pendingLabel="Uploading...">Upload for +200</SubmitButton>
            </form>
            <div className="mt-5 space-y-3">
              {classroom.documents.length === 0 ? (
                <div className="rounded-3xl bg-[var(--surface-alt)] px-5 py-6 text-sm text-[var(--muted)]">
                  No documents yet. Upload the first study file to unlock quiz generation.
                </div>
              ) : (
                classroom.documents.map((document) => (
                  <div
                    key={document.id}
                    className="rounded-3xl border border-[var(--border)] bg-white px-5 py-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold">{document.originalName}</div>
                        <div className="mt-1 text-sm text-[var(--muted)]">
                          {document.extension.toUpperCase()} • {formatDate(document.createdAt)}
                        </div>
                      </div>
                      {document.uploaderId === user.id || classroom.managerId === user.id ? (
                        <form action={deleteDocumentAction}>
                          <input type="hidden" name="classroomId" value={classroom.id} />
                          <input type="hidden" name="documentId" value={document.id} />
                          <button type="submit" className="button-danger">
                            Delete
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </div>
          </article>

          <article className="card px-6 py-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="section-title">Generate quiz</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Choose one or more documents, or use Select All to generate a fresh attempt.
                </p>
              </div>
            </div>
            <form action={generateQuizAction} className="mt-5 space-y-4">
              <input type="hidden" name="classroomId" value={classroom.id} />
              <label className="flex items-center gap-3 rounded-2xl bg-[var(--surface-alt)] px-4 py-3">
                <input type="checkbox" name="selectAll" value="all" className="h-4 w-4" />
                <span className="text-sm font-semibold">Select all classroom documents</span>
              </label>
              <div className="grid gap-3">
                {classroom.documents.map((document) => (
                  <label
                    key={document.id}
                    className="flex items-center gap-3 rounded-2xl border border-[var(--border)] px-4 py-3"
                  >
                    <input
                      type="checkbox"
                      name="documentIds"
                      value={document.id}
                      className="h-4 w-4"
                    />
                    <span className="text-sm font-semibold">{document.originalName}</span>
                  </label>
                ))}
              </div>
              <SubmitButton pendingLabel="Generating quiz...">Generate quiz</SubmitButton>
            </form>
          </article>

          <article className="card px-6 py-6">
            <h2 className="section-title">Classroom chat</h2>
            <form action={postClassroomMessageAction} className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]">
              <input type="hidden" name="classroomId" value={classroom.id} />
              <input name="content" placeholder="Drop a study update or a question..." required />
              <SubmitButton pendingLabel="Sending...">Send</SubmitButton>
            </form>
            <div className="mt-5 space-y-3">
              {classroom.messages.length === 0 ? (
                <div className="rounded-3xl bg-[var(--surface-alt)] px-5 py-6 text-sm text-[var(--muted)]">
                  No chat messages yet.
                </div>
              ) : (
                classroom.messages.map((message) => (
                  <div key={message.id} className="rounded-3xl border border-[var(--border)] px-5 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold">
                          {message.author.displayName}{" "}
                          <span className="muted text-sm">@{message.author.username}</span>
                        </div>
                        <div className="mt-2 text-sm leading-7">{message.content}</div>
                        <div className="mt-2 text-xs text-[var(--muted)]">{formatDate(message.createdAt)}</div>
                      </div>
                      {membership.role === "MANAGER" ? (
                        <form action={deleteClassroomMessageAction}>
                          <input type="hidden" name="classroomId" value={classroom.id} />
                          <input type="hidden" name="messageId" value={message.id} />
                          <button type="submit" className="button-danger">
                            Delete
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </div>
          </article>
        </section>

        <section className="space-y-6">
          <article className="card px-6 py-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="section-title">Members</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">Manager powers are centralized here.</p>
              </div>
              <div className="rounded-full bg-[var(--surface-alt)] px-4 py-2 text-sm font-semibold">
                {classroom.members.length} students
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {sortedMembers.map((member) => (
                <div key={member.id} className="rounded-3xl border border-[var(--border)] px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">{member.user.displayName}</div>
                      <div className="mt-1 text-sm text-[var(--muted)]">@{member.user.username}</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span
                          className={`pill ${
                            member.role === "MANAGER"
                              ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                              : "bg-[var(--surface-alt)] text-[var(--muted)]"
                          }`}
                        >
                          {member.role === "MANAGER" ? "Manager" : "Member"}
                        </span>
                        <span className="pill bg-amber-50 text-amber-700">{member.classroomPoints} pts</span>
                      </div>
                    </div>
                    {membership.role === "MANAGER" && member.userId !== user.id ? (
                      <div className="flex flex-wrap gap-2">
                        <form action={promoteManagerAction}>
                          <input type="hidden" name="classroomId" value={classroom.id} />
                          <input type="hidden" name="targetUserId" value={member.userId} />
                          <button type="submit" className="button-secondary">
                            Promote
                          </button>
                        </form>
                        <form action={removeMemberAction}>
                          <input type="hidden" name="classroomId" value={classroom.id} />
                          <input type="hidden" name="targetUserId" value={member.userId} />
                          <button type="submit" className="button-danger">
                            Remove
                          </button>
                        </form>
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="card px-6 py-6">
            <h2 className="section-title">Leaderboard preview</h2>
            <div className="mt-5 space-y-3">
              {sortedMembers.slice(0, 5).map((member, index) => (
                <div key={member.id} className="flex items-center justify-between rounded-2xl bg-[var(--surface-alt)] px-4 py-3">
                  <div>
                    <div className="text-sm font-semibold">#{index + 1}</div>
                    <div className="font-semibold">{member.user.displayName}</div>
                  </div>
                  <div className="font-semibold">{member.classroomPoints} pts</div>
                </div>
              ))}
            </div>
          </article>
        </section>
      </div>
    </div>
  );
}
