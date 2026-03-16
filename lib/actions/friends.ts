"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { requireCurrentUser } from "@/lib/auth/session";
import { buildPairKey } from "@/lib/utils";

export async function addFriendAction(formData: FormData) {
  const prisma = await getDb();
  const user = await requireCurrentUser();
  const targetUserId = String(formData.get("targetUserId") || "");

  if (!targetUserId || targetUserId === user.id) {
    redirect(`/friends?error=${encodeURIComponent("Pick another student to add as a friend.")}`);
  }

  await prisma.friendship.upsert({
    where: {
      pairKey: buildPairKey(user.id, targetUserId),
    },
    update: {},
    create: {
      requesterId: user.id,
      addresseeId: targetUserId,
      pairKey: buildPairKey(user.id, targetUserId),
      status: "ACCEPTED",
    },
  });

  revalidatePath("/friends");
  redirect(`/friends?success=${encodeURIComponent("Friend added.")}`);
}

export async function sendDirectMessageAction(formData: FormData) {
  const prisma = await getDb();
  const user = await requireCurrentUser();
  const content = String(formData.get("content") || "").trim();
  const recipientId = String(formData.get("recipientId") || "");
  const redirectTo = String(formData.get("redirectTo") || "/messages");

  if (!recipientId || !content) {
    redirect(`${redirectTo}${redirectTo.includes("?") ? "&" : "?"}error=${encodeURIComponent("Pick a friend and enter a message.")}`);
  }

  const pairKey = buildPairKey(user.id, recipientId);
  const friendship = await prisma.friendship.findUnique({
    where: { pairKey },
  });

  if (!friendship) {
    redirect(`/friends?error=${encodeURIComponent("You can only message accepted friends.")}`);
  }

  const thread = await prisma.directMessageThread.upsert({
    where: { pairKey },
    update: {},
    create: {
      pairKey,
      userAId: [user.id, recipientId].sort()[0],
      userBId: [user.id, recipientId].sort()[1],
    },
  });

  await prisma.directMessage.create({
    data: {
      threadId: thread.id,
      senderId: user.id,
      content,
    },
  });

  revalidatePath("/messages");
  redirect(`/messages?thread=${thread.id}`);
}
