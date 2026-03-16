"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { Prisma } from "@prisma/client";
import { getDb } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { clearSession, createSession, requireCurrentUser } from "@/lib/auth/session";
import { safeRedirectPath } from "@/lib/utils";

const signupSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters.")
    .max(24, "Username must be 24 characters or less.")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only use letters, numbers, and underscores."),
  displayName: z
    .string()
    .trim()
    .min(2, "Display name must be at least 2 characters.")
    .max(60, "Display name must be 60 characters or less."),
  password: z.string().min(8).max(100),
  redirectTo: z.string().trim().optional(),
});

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(8).max(100),
  redirectTo: z.string().trim().optional(),
});

const profileSchema = z.object({
  displayName: z.string().trim().min(2).max(60),
  username: z.string().trim().min(3).max(24).regex(/^[a-zA-Z0-9_]+$/),
  email: z.string().trim().email(),
});

function authErrorRedirect(path: "/signup" | "/login" | "/profile", message: string, next?: string) {
  const suffix =
    next && path === "/login" ? `&next=${encodeURIComponent(safeRedirectPath(next))}` : "";
  redirect(`${path}?error=${encodeURIComponent(message)}${suffix}`);
}

function getTextValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value : "";
}

function getValidationMessage(error: z.ZodError) {
  return error.issues.map((issue) => issue.message).join(" ");
}

export async function signupAction(formData: FormData) {
  const prisma = await getDb();
  const parsed = signupSchema.safeParse({
    email: getTextValue(formData.get("email")),
    username: getTextValue(formData.get("username")),
    displayName: getTextValue(formData.get("displayName")),
    password: getTextValue(formData.get("password")),
    redirectTo: getTextValue(formData.get("redirectTo")) || undefined,
  });

  if (!parsed.success) {
    return authErrorRedirect("/signup", getValidationMessage(parsed.error));
  }

  const { email, username, displayName, password, redirectTo } = parsed.data;

  try {
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
      select: { id: true, email: true, username: true },
    });

    if (existing) {
      const field = existing.email === email ? "email" : "username";
      authErrorRedirect("/signup", `That ${field} is already in use.`);
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
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      authErrorRedirect("/signup", "That email or username is already in use.");
    }

    authErrorRedirect(
      "/signup",
      "Account creation failed. Confirm the database was initialized with `npm run db:push` and try again.",
    );
  }
}

export async function loginAction(formData: FormData) {
  const prisma = await getDb();
  const parsed = loginSchema.safeParse({
    email: getTextValue(formData.get("email")),
    password: getTextValue(formData.get("password")),
    redirectTo: getTextValue(formData.get("redirectTo")) || undefined,
  });

  if (!parsed.success) {
    return authErrorRedirect("/login", getValidationMessage(parsed.error), undefined);
  }

  const { email, password, redirectTo } = parsed.data;

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return authErrorRedirect("/login", "Incorrect email or password.", redirectTo);
    }

    await createSession(user.id);
    revalidatePath("/", "layout");
    redirect(safeRedirectPath(redirectTo));
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    authErrorRedirect(
      "/login",
      "Login failed. Confirm the database was initialized with `npm run db:push` and try again.",
      redirectTo,
    );
  }
}

export async function logoutAction() {
  await clearSession();
  revalidatePath("/", "layout");
  redirect("/");
}

export async function updateProfileAction(formData: FormData) {
  const prisma = await getDb();
  const currentUser = await requireCurrentUser();
  const parsed = profileSchema.safeParse({
    displayName: getTextValue(formData.get("displayName")),
    username: getTextValue(formData.get("username")),
    email: getTextValue(formData.get("email")),
  });

  if (!parsed.success) {
    return authErrorRedirect(
      "/profile",
      "Profile updates must include a valid display name, username, and email.",
    );
  }

  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ email: parsed.data.email }, { username: parsed.data.username }],
      NOT: { id: currentUser.id },
    },
    select: { id: true },
  });

  if (existing) {
    authErrorRedirect("/profile", "That email or username already belongs to another account.");
  }

  await prisma.user.update({
    where: { id: currentUser.id },
    data: parsed.data,
  });

  revalidatePath("/", "layout");
  redirect(`/profile?success=${encodeURIComponent("Profile updated.")}`);
}
