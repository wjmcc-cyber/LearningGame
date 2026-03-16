import { createClassroomAction } from "@/lib/actions/classrooms";
import { requireCurrentUser } from "@/lib/auth/session";
import { SubmitButton } from "@/components/submit-button";

type NewClassroomPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function NewClassroomPage({ searchParams }: NewClassroomPageProps) {
  await requireCurrentUser();
  const params = await searchParams;
  const error = getParam(params.error);

  return (
    <div className="mx-auto max-w-2xl">
      <section className="card px-6 py-8 sm:px-8">
        <h1 className="display-title text-3xl font-bold">Create a classroom</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Managers can promote a replacement, remove members, delete any classroom document, and moderate classroom chat.
        </p>
        {error ? (
          <div className="alert-error mt-5 rounded-2xl px-4 py-3 text-sm">
            {error}
          </div>
        ) : null}
        <form action={createClassroomAction} className="mt-6 space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-semibold">Classroom name</span>
            <input name="name" placeholder="BIO101 Midterm Prep" required />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-semibold">Short description</span>
            <textarea
              name="description"
              rows={4}
              placeholder="Shared notes, quiz prep, and class chat for the semester."
            />
          </label>
          <SubmitButton pendingLabel="Creating classroom...">Create classroom</SubmitButton>
        </form>
      </section>
    </div>
  );
}
