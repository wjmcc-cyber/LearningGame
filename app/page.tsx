import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";

export default async function HomePage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.35fr_0.9fr]">
      <section className="card overflow-hidden px-6 py-10 sm:px-10">
        <div className="accent-chip inline-flex rounded-full px-4 py-2 text-sm font-semibold">
          Student-run study game MVP
        </div>
        <h1 className="display-title mt-6 max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
          Create course spaces, upload notes, spin up quizzes, and compete on points.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--muted)]">
          Study League combines classroom collaboration with a light game loop: shared documents,
          AI-backed quizzes, friend messaging, and leaderboards that reward real study activity.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/signup" className="button-primary">
            Start your account
          </Link>
          <Link href="/login" className="button-secondary">
            Log in
          </Link>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {[
            { label: "Document uploads", value: "+200 pts" },
            { label: "Correct quiz answers", value: "+100 pts" },
            { label: "Invite flow", value: "Permanent links" },
          ].map((item) => (
            <div key={item.label} className="paper-card rounded-3xl p-5">
              <div className="paper-muted text-sm font-semibold uppercase tracking-[0.16em]">
                {item.label}
              </div>
              <div className="mt-2 text-2xl font-bold text-[var(--ink)]">{item.value}</div>
            </div>
          ))}
        </div>
      </section>
      <section className="grid gap-4">
        {[
          {
            title: "Classrooms",
            body: "Each classroom has a manager, one permanent invite link, member chat, and a semester-style leaderboard.",
          },
          {
            title: "Quiz Engine",
            body: "Choose one document, many documents, or Select All. OpenAI is used when configured, with a deterministic fallback otherwise.",
          },
          {
            title: "Social Layer",
            body: "Students can add friends, compare total points, and send direct messages without needing realtime infrastructure.",
          },
        ].map((feature) => (
          <article key={feature.title} className="paper-card rounded-[1.75rem] px-6 py-5">
            <h2 className="section-title text-[var(--ink)]">{feature.title}</h2>
            <p className="paper-muted mt-3 text-sm leading-7">{feature.body}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
