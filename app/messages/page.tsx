import { sendDirectMessageAction } from "@/lib/actions/friends";
import { requireCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { SubmitButton } from "@/components/submit-button";

type MessagesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function MessagesPage({ searchParams }: MessagesPageProps) {
  const prisma = await getDb();
  const user = await requireCurrentUser();
  const params = await searchParams;
  const threadId = getParam(params.thread);
  const friendId = getParam(params.friend);

  const friendships = await prisma.friendship.findMany({
    where: {
      OR: [{ requesterId: user.id }, { addresseeId: user.id }],
    },
    include: {
      requester: {
        select: { id: true, displayName: true, username: true },
      },
      addressee: {
        select: { id: true, displayName: true, username: true },
      },
    },
  });

  const friends = friendships.map((friendship) =>
    friendship.requesterId === user.id ? friendship.addressee : friendship.requester,
  );

  const threads = await prisma.directMessageThread.findMany({
    where: {
      OR: [{ userAId: user.id }, { userBId: user.id }],
    },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
      },
      userA: {
        select: { id: true, displayName: true, username: true },
      },
      userB: {
        select: { id: true, displayName: true, username: true },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const selectedThread = threads.find((thread) => thread.id === threadId) || threads[0];
  const selectedFriend =
    friends.find((friend) => friend.id === friendId) ||
    (selectedThread
      ? selectedThread.userAId === user.id
        ? selectedThread.userB
        : selectedThread.userA
      : undefined);

  return (
    <div className="grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
      <section className="card px-6 py-6">
        <h1 className="section-title">Direct message threads</h1>
        <div className="mt-5 space-y-3">
          {friends.length === 0 ? (
            <div className="rounded-3xl bg-[var(--surface-alt)] px-5 py-6 text-sm text-[var(--muted)]">
              Add friends before sending direct messages.
            </div>
          ) : (
            friends.map((friend) => {
              const thread = threads.find((item) => item.userAId === friend.id || item.userBId === friend.id);
              const href = thread ? `/messages?thread=${thread.id}` : `/messages?friend=${friend.id}`;

              return (
                <a
                  key={friend.id}
                  href={href}
                  className={`block rounded-3xl px-5 py-4 ${
                    selectedFriend?.id === friend.id ? "bg-[var(--accent-soft)]" : "bg-[var(--surface-alt)]"
                  }`}
                >
                  <div className="font-semibold">{friend.displayName}</div>
                  <div className="mt-1 text-sm text-[var(--muted)]">@{friend.username}</div>
                </a>
              );
            })
          )}
        </div>
      </section>

      <section className="card px-6 py-6">
        {selectedFriend ? (
          <>
            <div className="border-b border-[var(--border)] pb-4">
              <div className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                Conversation
              </div>
              <div className="mt-2 text-2xl font-bold">{selectedFriend.displayName}</div>
              <div className="text-sm text-[var(--muted)]">@{selectedFriend.username}</div>
            </div>
            <div className="mt-5 space-y-3">
              {selectedThread?.messages.length ? (
                selectedThread.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`max-w-[85%] rounded-3xl px-4 py-3 ${
                      message.senderId === user.id
                        ? "ml-auto bg-[var(--accent)] text-white"
                        : "bg-[var(--surface-alt)]"
                    }`}
                  >
                    <div className="text-sm leading-7">{message.content}</div>
                    <div className={`mt-2 text-xs ${message.senderId === user.id ? "text-white/80" : "text-[var(--muted)]"}`}>
                      {formatDate(message.createdAt)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-3xl bg-[var(--surface-alt)] px-5 py-6 text-sm text-[var(--muted)]">
                  No messages yet. Send the first one.
                </div>
              )}
            </div>
            <form action={sendDirectMessageAction} className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]">
              <input type="hidden" name="recipientId" value={selectedFriend.id} />
              <input
                type="hidden"
                name="redirectTo"
                value={selectedThread ? `/messages?thread=${selectedThread.id}` : `/messages?friend=${selectedFriend.id}`}
              />
              <input name="content" placeholder="Write a message..." required />
              <SubmitButton pendingLabel="Sending...">Send</SubmitButton>
            </form>
          </>
        ) : (
          <div className="rounded-3xl bg-[var(--surface-alt)] px-5 py-6 text-sm text-[var(--muted)]">
            Pick a friend from the left to open or start a direct message thread.
          </div>
        )}
      </section>
    </div>
  );
}
