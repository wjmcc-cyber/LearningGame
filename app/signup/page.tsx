import Link from "next/link";
import { redirect } from "next/navigation";
import { signupAction } from "@/lib/actions/auth";
import { getCurrentUser } from "@/lib/auth/session";
import { SubmitButton } from "@/components/submit-button";

type SignupPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const error = getParam(params.error);

  return (
    <div className="mx-auto max-w-xl">
      <section className="card px-6 py-8 sm:px-8">
        <h1 className="display-title text-3xl font-bold">Create your account</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Use email, username, and password only. Social auth is intentionally out of scope for V1.
        </p>
        {error ? (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
        <form action={signupAction} className="mt-6 space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-semibold">Display name</span>
            <input name="displayName" placeholder="Alex Carter" required />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-semibold">Username</span>
            <input name="username" placeholder="alexcarter" required />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-semibold">Email</span>
            <input name="email" type="email" placeholder="you@school.edu" required />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-semibold">Password</span>
            <input name="password" type="password" placeholder="Minimum 8 characters" required />
          </label>
          <SubmitButton pendingLabel="Creating account...">Sign up</SubmitButton>
        </form>
        <p className="mt-5 text-sm text-[var(--muted)]">
          Already signed up?{" "}
          <Link href="/login" className="font-semibold text-[var(--accent)]">
            Log in
          </Link>
        </p>
      </section>
    </div>
  );
}
