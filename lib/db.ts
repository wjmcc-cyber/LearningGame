import { Prisma, PrismaClient } from "@prisma/client";

declare global {
  var __studyLeaguePrisma: PrismaClient | undefined;
}

const prismaLog: Prisma.LogLevel[] = process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"];

function createPrismaClient() {
  return new PrismaClient({
    log: prismaLog,
  });
}

export async function getDb() {
  if (global.__studyLeaguePrisma) {
    return global.__studyLeaguePrisma;
  }

  const client = createPrismaClient();

  if (process.env.NODE_ENV !== "production") {
    global.__studyLeaguePrisma = client;
  }

  return client;
}

export type DbClient = Awaited<ReturnType<typeof getDb>>;
