"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { clearSession, createSession, requireCurrentUser } from "@/lib/auth/session";
import { safeRedirectPath } from "@/lib/utils";

const signupSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(24).regex(/^[a-zA-Z0-9_]+$/),
  displayName: z.string().min(2).max(60),
  password: z.string().min(8).max(100),
  redirectTo: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  redirectTo: z.string().optional(),
});

const profileSchema = z.object({
  displayName: z.string().min(2).max(60),
  username: z.string().min(3).max(24).regex(/^[a-zA-Z0-9_]+$/),
  email: z.string().email(),
});

export async function signupAction(formData: FormData) {
  const parsed = signupSchema.safeParse({
    email: formData.get("email"),
    username: formData.get("username"),
    displayName: formData.get("displayName"),
    password: formData.get("password"),
    redirectTo: formData.get("redirectTo"),
  });

  if (!parsed.success) {
    redirect(`/signup?error=${encodeURIComponent("Enter a valid email, username, and password.")}`);
  }

  const { email, username, displayName, password, redirectTo } = parsed.data;
  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ email }, { username }],
    },
    select: { id: true, email: true, username: true },
  });

  if (existing) {
    const field = existing.email === email ? "email" : "username";
    redirect(`/signup?error=${encodeURIComponent(`That ${field} is already in use.`)}`);
  }

  const user = await prisma.user.create({
    data: {
      email,
      username,
      displayName,
      passwordHash: await hashPassword(password),
    },
  });

  await createSession(user.id);
  revalidatePath("/", "layout");
  redirect(safeRedirectPath(redirectTo));
}

export async function loginAction(formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    redirectTo: formData.get("redirectTo"),
  });

  if (!parsed.success) {
    redirect(`/login?error=${encodeURIComponent("Enter a valid email and password.")}`);
  }

  const { email, password, redirectTo } = parsed.data;
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    redirect(`/login?error=${encodeURIComponent("Incorrect email or password.")}&next=${encodeURIComponent(safeRedirectPath(redirectTo))}`);
  }

  await createSession(user.id);
  revalidatePath("/", "layout");
  redirect(safeRedirectPath(redirectTo));
}

export async function logoutAction() {
  await clearSession();
  revalidatePath("/", "layout");
  redirect("/");
}

export async function updateProfileAction(formData: FormData) {
  const currentUser = await requireCurrentUser();
  const parsed = profileSchema.safeParse({
    displayName: formData.get("displayName"),
    username: formData.get("username"),
    email: formData.get("email"),
  });

  if (!parsed.success) {
    redirect(`/profile?error=${encodeURIComponent("Profile updates must include a valid display name, username, and email.")}`);
  }

  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ email: parsed.data.email }, { username: parsed.data.username }],
      NOT: { id: currentUser.id },
    },
    select: { id: true },
  });

  if (existing) {
    redirect(`/profile?error=${encodeURIComponent("That email or username already belongs to another account.")}`);
  }

  await prisma.user.update({
    where: { id: currentUser.id },
    data: parsed.data,
  });

  revalidatePath("/", "layout");
  redirect(`/profile?success=${encodeURIComponent("Profile updated.")}`);
}
