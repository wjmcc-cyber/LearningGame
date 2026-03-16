import { getDb } from "@/lib/db";

export async function requireClassroomMember(classroomId: string, userId: string) {
  const prisma = await getDb();
  const member = await prisma.classroomMember.findUnique({
    where: {
      classroomId_userId: {
        classroomId,
        userId,
      },
    },
    include: {
      classroom: {
        include: {
          invite: true,
        },
      },
      user: true,
    },
  });

  if (!member) {
    throw new Error("You are not a member of this classroom.");
  }

  return member;
}

export async function requireClassroomManager(classroomId: string, userId: string) {
  const member = await requireClassroomMember(classroomId, userId);

  if (member.role !== "MANAGER") {
    throw new Error("Only the classroom manager can do that.");
  }

  return member;
}

export async function getDocumentWithPermissions(documentId: string) {
  const prisma = await getDb();
  return prisma.document.findUnique({
    where: { id: documentId },
    include: {
      classroom: {
        select: {
          id: true,
          managerId: true,
        },
      },
    },
  });
}
