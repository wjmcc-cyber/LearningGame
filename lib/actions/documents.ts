"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { PointsReason } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireCurrentUser } from "@/lib/auth/session";
import { getDocumentWithPermissions, requireClassroomMember } from "@/lib/permissions/classroom";
import { awardPoints } from "@/lib/points";
import {
  deleteStudyDocument,
  parseStudyDocument,
  saveStudyDocument,
} from "@/lib/storage/documents";

export async function uploadDocumentAction(formData: FormData) {
  const user = await requireCurrentUser();
  const classroomId = String(formData.get("classroomId") || "");
  const file = formData.get("document");

  await requireClassroomMember(classroomId, user.id);

  if (!(file instanceof File)) {
    redirect(`/classrooms/${classroomId}?error=${encodeURIComponent("Choose a document to upload.")}`);
  }

  let parsedDocument;

  try {
    parsedDocument = await parseStudyDocument(file);
  } catch (error) {
    const message = error instanceof Error ? error.message : "The document could not be processed.";
    redirect(`/classrooms/${classroomId}?error=${encodeURIComponent(message)}`);
  }

  const existing = await prisma.document.findUnique({
    where: {
      classroomId_contentHash: {
        classroomId,
        contentHash: parsedDocument.contentHash,
      },
    },
    select: { id: true },
  });

  if (existing) {
    redirect(`/classrooms/${classroomId}?error=${encodeURIComponent("That exact document is already in this classroom. No duplicate points awarded.")}`);
  }

  const storedName = await saveStudyDocument(
    parsedDocument.buffer,
    parsedDocument.contentHash,
    parsedDocument.extension,
  );

  await prisma.$transaction(async (tx) => {
    const document = await tx.document.create({
      data: {
        classroomId,
        uploaderId: user.id,
        originalName: parsedDocument.originalName,
        storedName,
        mimeType: parsedDocument.mimeType,
        extension: parsedDocument.extension,
        sizeBytes: parsedDocument.sizeBytes,
        contentHash: parsedDocument.contentHash,
        textContent: parsedDocument.textContent,
      },
    });

    await awardPoints(tx, {
      userId: user.id,
      classroomId,
      amount: 200,
      reason: PointsReason.DOCUMENT_UPLOAD,
      referenceType: "DOCUMENT",
      referenceId: document.id,
    });
  });

  revalidatePath(`/classrooms/${classroomId}`);
  redirect(`/classrooms/${classroomId}?success=${encodeURIComponent("Document uploaded for +200 points.")}`);
}

export async function deleteDocumentAction(formData: FormData) {
  const user = await requireCurrentUser();
  const classroomId = String(formData.get("classroomId") || "");
  const documentId = String(formData.get("documentId") || "");
  const document = await getDocumentWithPermissions(documentId);

  if (!document || document.classroom.id !== classroomId) {
    redirect(`/classrooms/${classroomId}?error=${encodeURIComponent("Document not found.")}`);
  }

  if (document.uploaderId !== user.id && document.classroom.managerId !== user.id) {
    redirect(`/classrooms/${classroomId}?error=${encodeURIComponent("You cannot delete that document.")}`);
  }

  const shouldDeleteStoredFile = await prisma.$transaction(async (tx) => {
    await tx.document.delete({
      where: { id: documentId },
    });

    const remainingCopies = await tx.document.count({
      where: {
        storedName: document.storedName,
      },
    });

    return remainingCopies === 0;
  });

  if (shouldDeleteStoredFile) {
    await deleteStudyDocument(document.storedName);
  }

  revalidatePath(`/classrooms/${classroomId}`);
  redirect(`/classrooms/${classroomId}?success=${encodeURIComponent("Document deleted.")}`);
}
