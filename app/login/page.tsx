import Link from "next/link";
import { redirect } from "next/navigation";
import { loginAction } from "@/lib/actions/auth";
import { getCurrentUser } from "@/lib/auth/session";
import { safeRedirectPath } from "@/lib/utils";
import { SubmitButton } from "@/components/submit-button";

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const error = getParam(params.error);
  const next = safeRedirectPath(getParam(params.next));

  return (
    <div className="mx-auto max-w-xl">
      <section className="card px-6 py-8 sm:px-8">
        <h1 className="display-title text-3xl font-bold">Log in</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Sign in with your email and password to get back to your classrooms.
        </p>
        {error ? (
          <div className="alert-error mt-5 rounded-2xl px-4 py-3 text-sm">
            {error}
          </div>
        ) : null}
        <form action={loginAction} className="mt-6 space-y-4">
          <input type="hidden" name="redirectTo" value={next} />
          <label className="block space-y-2">
            <span className="text-sm font-semibold">Email</span>
            <input name="email" type="email" placeholder="you@school.edu" required />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-semibold">Password</span>
            <input name="password" type="password" placeholder="Minimum 8 characters" required />
          </label>
          <SubmitButton pendingLabel="Logging in...">Log in</SubmitButton>
        </form>
        <p className="mt-5 text-sm text-[var(--muted)]">
          Need an account?{" "}
          <Link href="/signup" className="font-semibold text-[var(--accent)]">
            Create one
          </Link>
        </p>
      </section>
    </div>
  );
}
