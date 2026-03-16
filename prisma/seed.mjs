import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";

loadEnv({ path: path.join(process.cwd(), ".env.local"), quiet: true });
loadEnv({ path: path.join(process.cwd(), ".env"), quiet: true });

const prisma = new PrismaClient();
const storageDir = path.join(process.cwd(), "storage", "documents");

function hashContent(value) {
  return createHash("sha256").update(value).digest("hex");
}

function pairKey(a, b) {
  return [a, b].sort().join(":");
}

async function awardPoints(tx, { userId, classroomId, amount, reason, referenceType, referenceId }) {
  await tx.pointsLedger.create({
    data: {
      userId,
      classroomId,
      amount,
      reason,
      referenceType,
      referenceId,
    },
  });

  await tx.user.update({
    where: { id: userId },
    data: {
      totalPoints: {
        increment: amount,
      },
    },
  });

  if (classroomId) {
    await tx.classroomMember.update({
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
}

async function main() {
  await rm(storageDir, { recursive: true, force: true });
  await mkdir(storageDir, { recursive: true });

  await prisma.questionFeedback.deleteMany();
  await prisma.quizResponse.deleteMany();
  await prisma.quizAttempt.deleteMany();
  await prisma.quizQuestion.deleteMany();
  await prisma.quizDocument.deleteMany();
  await prisma.quiz.deleteMany();
  await prisma.classroomMessage.deleteMany();
  await prisma.directMessage.deleteMany();
  await prisma.directMessageThread.deleteMany();
  await prisma.friendship.deleteMany();
  await prisma.document.deleteMany();
  await prisma.classroomInvite.deleteMany();
  await prisma.classroomMember.deleteMany();
  await prisma.pointsLedger.deleteMany();
  await prisma.classroom.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("Password123!", 12);

  const [alice, ben, chloe] = await Promise.all([
    prisma.user.create({
      data: {
        email: "alice@student.test",
        username: "alice",
        displayName: "Alice Nguyen",
        passwordHash,
      },
    }),
    prisma.user.create({
      data: {
        email: "ben@student.test",
        username: "ben",
        displayName: "Ben Patel",
        passwordHash,
      },
    }),
    prisma.user.create({
      data: {
        email: "chloe@student.test",
        username: "chloe",
        displayName: "Chloe Martin",
        passwordHash,
      },
    }),
  ]);

  const classroom = await prisma.classroom.create({
    data: {
      name: "BIO101 Semester Sprint",
      description: "Shared biology notes, quiz prep, and leaderboard points for the midterm block.",
      managerId: alice.id,
    },
  });

  await prisma.classroomInvite.create({
    data: {
      classroomId: classroom.id,
      code: "bio101-sprint",
    },
  });

  await prisma.classroomMember.createMany({
    data: [
      { classroomId: classroom.id, userId: alice.id, role: "MANAGER" },
      { classroomId: classroom.id, userId: ben.id, role: "MEMBER" },
      { classroomId: classroom.id, userId: chloe.id, role: "MEMBER" },
    ],
  });

  const documents = [
    {
      originalName: "cell-structure.txt",
      extension: "txt",
      mimeType: "text/plain",
      uploaderId: alice.id,
      content: `Cell theory states that all organisms are made of cells, cells are the basic units of life, and cells arise from existing cells. Eukaryotic cells contain membrane-bound organelles including a nucleus, mitochondria, and endoplasmic reticulum. The plasma membrane controls transport through selective permeability, while ribosomes drive protein synthesis.`,
    },
    {
      originalName: "genetics-review.md",
      extension: "md",
      mimeType: "text/markdown",
      uploaderId: ben.id,
      content: `# Genetics Review

Gregor Mendel used pea plants to describe dominant and recessive inheritance patterns. During meiosis, homologous chromosomes separate in meiosis I and sister chromatids separate in meiosis II. Genetic variation increases through independent assortment, crossing over, and random fertilization.`,
    },
  ];

  const createdDocuments = [];

  for (const document of documents) {
    const contentHash = hashContent(document.content);
    const storedName = `${contentHash}.${document.extension}`;
    await writeFile(path.join(storageDir, storedName), document.content, "utf8");

    const created = await prisma.document.create({
      data: {
        classroomId: classroom.id,
        uploaderId: document.uploaderId,
        originalName: document.originalName,
        storedName,
        mimeType: document.mimeType,
        extension: document.extension,
        sizeBytes: Buffer.byteLength(document.content),
        contentHash,
        textContent: document.content.replace(/\s+/g, " ").trim(),
      },
    });

    createdDocuments.push(created);
  }

  await prisma.$transaction(async (tx) => {
    await awardPoints(tx, {
      userId: alice.id,
      classroomId: classroom.id,
      amount: 200,
      reason: "DOCUMENT_UPLOAD",
      referenceType: "DOCUMENT",
      referenceId: createdDocuments[0].id,
    });

    await awardPoints(tx, {
      userId: ben.id,
      classroomId: classroom.id,
      amount: 200,
      reason: "DOCUMENT_UPLOAD",
      referenceType: "DOCUMENT",
      referenceId: createdDocuments[1].id,
    });
  });

  const quiz = await prisma.quiz.create({
    data: {
      classroomId: classroom.id,
      createdById: alice.id,
      title: "BIO101 seed quiz",
      documentLinks: {
        create: createdDocuments.map((document) => ({
          documentId: document.id,
        })),
      },
      questions: {
        create: [
          {
            position: 0,
            prompt: "Which organelle is primarily associated with ATP production in eukaryotic cells?",
            optionsJson: JSON.stringify([
              "Mitochondria",
              "Golgi apparatus",
              "Cell wall",
              "Lysosome",
            ]),
            correctIndex: 0,
            explanation: "The study notes identify mitochondria as key organelles in eukaryotic cells.",
          },
          {
            position: 1,
            prompt: "What separates during meiosis I?",
            optionsJson: JSON.stringify([
              "Sister chromatids",
              "Homologous chromosomes",
              "Messenger RNA",
              "Centrioles",
            ]),
            correctIndex: 1,
            explanation: "The genetics review states that homologous chromosomes separate in meiosis I.",
          },
          {
            position: 2,
            prompt: "Which process increases genetic variation?",
            optionsJson: JSON.stringify([
              "Selective permeability",
              "Crossing over",
              "Protein synthesis",
              "Cell theory",
            ]),
            correctIndex: 1,
            explanation: "The notes explicitly cite crossing over as a source of genetic variation.",
          },
        ],
      },
    },
    include: {
      questions: true,
    },
  });

  const aliceAttempt = await prisma.quizAttempt.create({
    data: {
      quizId: quiz.id,
      userId: alice.id,
      completedAt: new Date(),
    },
  });

  const benAttempt = await prisma.quizAttempt.create({
    data: {
      quizId: quiz.id,
      userId: ben.id,
      completedAt: new Date(),
    },
  });

  const aliceResponses = await Promise.all([
    prisma.quizResponse.create({
      data: {
        attemptId: aliceAttempt.id,
        questionId: quiz.questions[0].id,
        selectedIndex: 0,
        isCorrect: true,
      },
    }),
    prisma.quizResponse.create({
      data: {
        attemptId: aliceAttempt.id,
        questionId: quiz.questions[1].id,
        selectedIndex: 1,
        isCorrect: true,
      },
    }),
    prisma.quizResponse.create({
      data: {
        attemptId: aliceAttempt.id,
        questionId: quiz.questions[2].id,
        selectedIndex: 2,
        isCorrect: false,
      },
    }),
  ]);

  const benResponses = await Promise.all([
    prisma.quizResponse.create({
      data: {
        attemptId: benAttempt.id,
        questionId: quiz.questions[0].id,
        selectedIndex: 0,
        isCorrect: true,
      },
    }),
    prisma.quizResponse.create({
      data: {
        attemptId: benAttempt.id,
        questionId: quiz.questions[1].id,
        selectedIndex: 0,
        isCorrect: false,
      },
    }),
    prisma.quizResponse.create({
      data: {
        attemptId: benAttempt.id,
        questionId: quiz.questions[2].id,
        selectedIndex: 1,
        isCorrect: true,
      },
    }),
  ]);

  await prisma.$transaction(async (tx) => {
    for (const response of [aliceResponses[0], aliceResponses[1]]) {
      await awardPoints(tx, {
        userId: alice.id,
        classroomId: classroom.id,
        amount: 100,
        reason: "QUIZ_CORRECT",
        referenceType: "QUIZ_RESPONSE",
        referenceId: response.id,
      });
    }

    for (const response of [benResponses[0], benResponses[2]]) {
      await awardPoints(tx, {
        userId: ben.id,
        classroomId: classroom.id,
        amount: 100,
        reason: "QUIZ_CORRECT",
        referenceType: "QUIZ_RESPONSE",
        referenceId: response.id,
      });
    }
  });

  await prisma.questionFeedback.createMany({
    data: [
      {
        userId: alice.id,
        questionId: quiz.questions[0].id,
        value: "LIKE",
      },
      {
        userId: ben.id,
        questionId: quiz.questions[2].id,
        value: "DISLIKE",
      },
    ],
  });

  await prisma.classroomMessage.createMany({
    data: [
      {
        classroomId: classroom.id,
        userId: alice.id,
        content: "Uploaded the cell structure notes. Let’s generate a practice quiz before lab.",
      },
      {
        classroomId: classroom.id,
        userId: ben.id,
        content: "I added the genetics review sheet. The meiosis section should be useful for the next quiz.",
      },
    ],
  });

  await prisma.friendship.createMany({
    data: [
      {
        requesterId: alice.id,
        addresseeId: ben.id,
        pairKey: pairKey(alice.id, ben.id),
        status: "ACCEPTED",
      },
      {
        requesterId: alice.id,
        addresseeId: chloe.id,
        pairKey: pairKey(alice.id, chloe.id),
        status: "ACCEPTED",
      },
    ],
  });

  const thread = await prisma.directMessageThread.create({
    data: {
      pairKey: pairKey(alice.id, ben.id),
      userAId: [alice.id, ben.id].sort()[0],
      userBId: [alice.id, ben.id].sort()[1],
    },
  });

  await prisma.directMessage.createMany({
    data: [
      {
        threadId: thread.id,
        senderId: alice.id,
        content: "Want to compare quiz scores after class?",
      },
      {
        threadId: thread.id,
        senderId: ben.id,
        content: "Yes. I want another attempt after I review meiosis again.",
      },
    ],
  });

  console.log("Seed complete.");
  console.log("Demo users:");
  console.log("alice@student.test / Password123!");
  console.log("ben@student.test / Password123!");
  console.log("chloe@student.test / Password123!");
  console.log("Invite code: bio101-sprint");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
