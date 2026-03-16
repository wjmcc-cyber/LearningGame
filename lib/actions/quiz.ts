"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { PointsReason } from "@prisma/client";
import { getDb } from "@/lib/db";
import { requireCurrentUser } from "@/lib/auth/session";
import { requireClassroomMember } from "@/lib/permissions/classroom";
import { awardPoints } from "@/lib/points";
import { generateQuizQuestions } from "@/lib/quiz/provider";

export async function generateQuizAction(formData: FormData) {
  const prisma = await getDb();
  const user = await requireCurrentUser();
  const classroomId = String(formData.get("classroomId") || "");
  const selectAll = String(formData.get("selectAll") || "") === "all";
  const requestedIds = formData.getAll("documentIds").map((value) => String(value));

  await requireClassroomMember(classroomId, user.id);

  const documents = await prisma.document.findMany({
    where: {
      classroomId,
      ...(selectAll ? {} : { id: { in: requestedIds } }),
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (documents.length === 0) {
    redirect(`/classrooms/${classroomId}?error=${encodeURIComponent("Pick at least one document for the quiz.")}`);
  }

  const questions = await generateQuizQuestions(documents);

  if (questions.length === 0) {
    redirect(`/classrooms/${classroomId}?error=${encodeURIComponent("The selected documents did not produce enough quiz material.")}`);
  }

  const attempt = await prisma.$transaction(async (tx) => {
    const quiz = await tx.quiz.create({
      data: {
        classroomId,
        createdById: user.id,
        title: `Quiz on ${documents.length} document${documents.length === 1 ? "" : "s"}`,
        documentLinks: {
          create: documents.map((document) => ({
            documentId: document.id,
          })),
        },
        questions: {
          create: questions.map((question, index) => ({
            prompt: question.prompt,
            optionsJson: JSON.stringify(question.options),
            correctIndex: question.correctIndex,
            explanation: question.explanation,
            position: index,
          })),
        },
      },
    });

    return tx.quizAttempt.create({
      data: {
        quizId: quiz.id,
        userId: user.id,
      },
    });
  });

  revalidatePath(`/classrooms/${classroomId}`);
  redirect(`/classrooms/${classroomId}/quiz/${attempt.id}`);
}

export async function answerQuestionAction(formData: FormData) {
  const prisma = await getDb();
  const user = await requireCurrentUser();
  const attemptId = String(formData.get("attemptId") || "");
  const questionId = String(formData.get("questionId") || "");
  const selectedIndex = Number(formData.get("selectedIndex"));

  const attempt = await prisma.quizAttempt.findUnique({
    where: { id: attemptId },
    include: {
      quiz: {
        include: {
          classroom: true,
          questions: {
            orderBy: {
              position: "asc",
            },
          },
        },
      },
      responses: true,
    },
  });

  if (!attempt || attempt.userId !== user.id) {
    redirect("/dashboard?error=Quiz+attempt+not+found.");
  }

  await requireClassroomMember(attempt.quiz.classroomId, user.id);

  const question = attempt.quiz.questions.find((item) => item.id === questionId);

  if (!question || Number.isNaN(selectedIndex)) {
    redirect(`/classrooms/${attempt.quiz.classroomId}/quiz/${attemptId}?error=${encodeURIComponent("Pick an answer before submitting.")}`);
  }

  const existing = await prisma.quizResponse.findUnique({
    where: {
      attemptId_questionId: {
        attemptId,
        questionId,
      },
    },
  });

  if (existing) {
    redirect(`/classrooms/${attempt.quiz.classroomId}/quiz/${attemptId}?answered=${encodeURIComponent(questionId)}`);
  }

  await prisma.$transaction(async (tx) => {
    const response = await tx.quizResponse.create({
      data: {
        attemptId,
        questionId,
        selectedIndex,
        isCorrect: selectedIndex === question.correctIndex,
      },
    });

    if (selectedIndex === question.correctIndex) {
      await awardPoints(tx, {
        userId: user.id,
        classroomId: attempt.quiz.classroomId,
        amount: 100,
        reason: PointsReason.QUIZ_CORRECT,
        referenceType: "QUIZ_RESPONSE",
        referenceId: response.id,
      });
    }

    const responseCount = await tx.quizResponse.count({
      where: {
        attemptId,
      },
    });

    if (responseCount === attempt.quiz.questions.length) {
      await tx.quizAttempt.update({
        where: { id: attemptId },
        data: {
          completedAt: new Date(),
        },
      });
    }
  });

  revalidatePath(`/classrooms/${attempt.quiz.classroomId}/quiz/${attemptId}`);
  redirect(`/classrooms/${attempt.quiz.classroomId}/quiz/${attemptId}?answered=${encodeURIComponent(questionId)}`);
}

export async function saveQuestionFeedbackAction(formData: FormData) {
  const prisma = await getDb();
  const user = await requireCurrentUser();
  const questionId = String(formData.get("questionId") || "");
  const value = String(formData.get("value") || "");
  const redirectTo = String(formData.get("redirectTo") || "/dashboard");

  if (value !== "LIKE" && value !== "DISLIKE") {
    redirect(redirectTo);
  }

  await prisma.questionFeedback.upsert({
    where: {
      userId_questionId: {
        userId: user.id,
        questionId,
      },
    },
    update: {
      value,
    },
    create: {
      userId: user.id,
      questionId,
      value,
    },
  });

  revalidatePath(redirectTo);
  redirect(redirectTo);
}
