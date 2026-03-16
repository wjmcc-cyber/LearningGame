import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { getRuntimeConfig } from "@/lib/runtime-config";

function buildSessionToken() {
  return `${crypto.randomUUID().replaceAll("-", "")}${crypto.randomUUID().replaceAll("-", "")}`;
}

export const getCurrentSession = cache(async () => {
  const prisma = await getDb();
  const { sessionCookieName } = await getRuntimeConfig();
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;

  if (!token) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: { token },
    include: {
      user: {
        select: {
          id: true,
          displayName: true,
          username: true,
          email: true,
          totalPoints: true,
        },
      },
    },
  });

  if (!session || session.expiresAt < new Date()) {
    if (session) {
      await prisma.session.delete({ where: { id: session.id } });
    }

    return null;
  }

  return session;
});

export const getCurrentUser = cache(async () => {
  const session = await getCurrentSession();
  return session?.user ?? null;
});

export async function requireCurrentUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function createSession(userId: string) {
  const prisma = await getDb();
  const { sessionCookieName, sessionTtlDays } = await getRuntimeConfig();
  const expiresAt = new Date(Date.now() + sessionTtlDays * 24 * 60 * 60 * 1000);
  const token = buildSessionToken();
  const cookieStore = await cookies();

  await prisma.session.create({
    data: {
      token,
      userId,
      expiresAt,
    },
  });

  cookieStore.set(sessionCookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
}

export async function clearSession() {
  const prisma = await getDb();
  const { sessionCookieName } = await getRuntimeConfig();
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;

  if (token) {
    await prisma.session.deleteMany({
      where: { token },
    });
  }

  cookieStore.delete(sessionCookieName);
}
