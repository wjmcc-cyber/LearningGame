import { PointsReason, Prisma } from "@prisma/client";

type AwardPointsInput = {
  userId: string;
  classroomId?: string | null;
  amount: number;
  reason: PointsReason;
  referenceType: string;
  referenceId: string;
};

export async function awardPoints(
  db: Prisma.TransactionClient,
  { userId, classroomId, amount, reason, referenceType, referenceId }: AwardPointsInput,
) {
  const existing = await db.pointsLedger.findUnique({
    where: {
      userId_referenceType_referenceId: {
        userId,
        referenceType,
        referenceId,
      },
    },
  });

  if (existing) {
    return false;
  }

  await db.pointsLedger.create({
    data: {
      userId,
      classroomId,
      amount,
      reason,
      referenceType,
      referenceId,
    },
  });

  await db.user.update({
    where: { id: userId },
    data: {
      totalPoints: {
        increment: amount,
      },
    },
  });

  if (classroomId) {
    await db.classroomMember.update({
      where: {
        classroomId_userId: {
          classroomId,
          userId,
        },
      },
      data: {
        classroomPoints: {
          increment: amount,
        },
      },
    });
  }

  return true;
}
