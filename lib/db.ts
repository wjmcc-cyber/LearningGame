import { PrismaClient } from "@prisma/client";

declare global {
  var __studyLeaguePrisma: PrismaClient | undefined;
}

export const prisma =
  global.__studyLeaguePrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.__studyLeaguePrisma = prisma;
}
