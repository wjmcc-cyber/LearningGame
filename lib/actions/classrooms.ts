"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { requireCurrentUser } from "@/lib/auth/session";
import { requireClassroomManager, requireClassroomMember } from "@/lib/permissions/classroom";

const classroomSchema = z.object({
  name: z.string().min(3).max(80),
  description: z.string().max(280).optional(),
});

const messageSchema = z.object({
  classroomId: z.string().cuid(),
  content: z.string().min(1).max(1000),
});

function makeInviteCode() {
  return Array.from(crypto.getRandomValues(new Uint8Array(12)), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export async function createClassroomAction(formData: FormData) {
  const prisma = await getDb();
  const user = await requireCurrentUser();
  const parsed = classroomSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
  });

  if (!parsed.success) {
    redirect(`/classrooms/new?error=${encodeURIComponent("Add a classroom name between 3 and 80 characters.")}`);
  }

  const classroom = await prisma.$transaction(async (tx) => {
    const created = await tx.classroom.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description,
        managerId: user.id,
      },
    });

    await tx.classroomInvite.create({
      data: {
        classroomId: created.id,
        code: makeInviteCode(),
      },
    });

    await tx.classroomMember.create({
      data: {
        classroomId: created.id,
        userId: user.id,
        role: "MANAGER",
      },
    });

    return created;
  });

  revalidatePath("/dashboard");
  redirect(`/classrooms/${classroom.id}`);
}

export async function joinClassroomAction(formData: FormData) {
  const prisma = await getDb();
  const user = await requireCurrentUser();
  const inviteCode = String(formData.get("inviteCode") || "");

  const invite = await prisma.classroomInvite.findUnique({
    where: { code: inviteCode },
    include: { classroom: true },
  });

  if (!invite) {
    redirect(`/dashboard?error=${encodeURIComponent("That classroom invite is not valid.")}`);
  }

  await prisma.classroomMember.upsert({
    where: {
      classroomId_userId: {
        classroomId: invite.classroomId,
        userId: user.id,
      },
    },
    update: {},
    create: {
      classroomId: invite.classroomId,
      userId: user.id,
      role: "MEMBER",
    },
  });

  revalidatePath("/dashboard");
  redirect(`/classrooms/${invite.classroomId}`);
}

export async function promoteManagerAction(formData: FormData) {
  const prisma = await getDb();
  const user = await requireCurrentUser();
  const classroomId = String(formData.get("classroomId") || "");
  const targetUserId = String(formData.get("targetUserId") || "");

  await requireClassroomManager(classroomId, user.id);

  await prisma.$transaction(async (tx) => {
    const targetMembership = await tx.classroomMember.findUnique({
      where: {
        classroomId_userId: {
          classroomId,
          userId: targetUserId,
        },
      },
    });

    if (!targetMembership) {
      throw new Error("That student is not in this classroom.");
    }

    await tx.classroom.update({
      where: { id: classroomId },
      data: {
        managerId: targetUserId,
      },
    });

    await tx.classroomMember.update({
      where: {
        classroomId_userId: {
          classroomId,
          userId: user.id,
        },
      },
      data: {
        role: "MEMBER",
      },
    });

    await tx.classroomMember.update({
      where: {
        classroomId_userId: {
          classroomId,
          userId: targetUserId,
        },
      },
      data: {
        role: "MANAGER",
      },
    });
  });

  revalidatePath(`/classrooms/${classroomId}`);
  redirect(`/classrooms/${classroomId}?success=${encodeURIComponent("Manager updated.")}`);
}

export async function removeMemberAction(formData: FormData) {
  const prisma = await getDb();
  const user = await requireCurrentUser();
  const classroomId = String(formData.get("classroomId") || "");
  const targetUserId = String(formData.get("targetUserId") || "");

  await requireClassroomManager(classroomId, user.id);

  if (targetUserId === user.id) {
    redirect(`/classrooms/${classroomId}?error=${encodeURIComponent("Promote someone else before removing yourself.")}`);
  }

  await prisma.classroomMember.delete({
    where: {
      classroomId_userId: {
        classroomId,
        userId: targetUserId,
      },
    },
  });

  revalidatePath(`/classrooms/${classroomId}`);
  redirect(`/classrooms/${classroomId}?success=${encodeURIComponent("Member removed.")}`);
}

export async function postClassroomMessageAction(formData: FormData) {
  const prisma = await getDb();
  const user = await requireCurrentUser();
  const parsed = messageSchema.safeParse({
    classroomId: formData.get("classroomId"),
    content: formData.get("content"),
  });

  if (!parsed.success) {
    redirect(`/dashboard?error=${encodeURIComponent("Messages need classroom context and some text.")}`);
  }

  await requireClassroomMember(parsed.data.classroomId, user.id);

  await prisma.classroomMessage.create({
    data: {
      classroomId: parsed.data.classroomId,
      userId: user.id,
      content: parsed.data.content,
    },
  });

  revalidatePath(`/classrooms/${parsed.data.classroomId}`);
  redirect(`/classrooms/${parsed.data.classroomId}`);
}

export async function deleteClassroomMessageAction(formData: FormData) {
  const prisma = await getDb();
  const user = await requireCurrentUser();
  const classroomId = String(formData.get("classroomId") || "");
  const messageId = String(formData.get("messageId") || "");

  await requireClassroomManager(classroomId, user.id);

  await prisma.classroomMessage.delete({
    where: { id: messageId },
  });

  revalidatePath(`/classrooms/${classroomId}`);
  redirect(`/classrooms/${classroomId}`);
}
