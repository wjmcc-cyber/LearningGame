import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaD1 } from "@prisma/adapter-d1";
import { getCloudflareEnv } from "@/lib/cloudflare";

declare global {
  var __studyLeaguePrisma: PrismaClient | undefined;
}

const prismaLog: Prisma.LogLevel[] =
  process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"];

function resolveLocalDatabaseUrl(databaseUrl: string) {
  if (!databaseUrl.startsWith("file:")) {
    return databaseUrl;
  }

  const relativePath = databaseUrl.replace("file:", "");

  if (/^[a-zA-Z]:[\\/]/.test(relativePath) || relativePath.startsWith("/")) {
    return databaseUrl;
  }

  return `file:${new URL(`file://${process.cwd().replace(/\\/g, "/")}/prisma/${relativePath}`).pathname}`;
}

async function createPrismaClient() {
  const cloudflareEnv = await getCloudflareEnv();

  if (cloudflareEnv?.DB) {
    return new PrismaClient({
      adapter: new PrismaD1(cloudflareEnv.DB),
      log: prismaLog,
    });
  }

  const url = process.env.DATABASE_URL;

  if (url) {
    const { PrismaLibSQL } = await import("@prisma/adapter-libsql");

    return new PrismaClient({
      adapter: new PrismaLibSQL({
        url: resolveLocalDatabaseUrl(url),
        authToken: process.env.TURSO_AUTH_TOKEN,
      }),
      log: prismaLog,
    });
  }

  return new PrismaClient({
    log: prismaLog,
  });
}

export const prisma = global.__studyLeaguePrisma ?? (await createPrismaClient());

if (process.env.NODE_ENV !== "production") {
  global.__studyLeaguePrisma = prisma;
}
