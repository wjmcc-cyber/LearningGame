import Link from "next/link";
import { answerQuestionAction, saveQuestionFeedbackAction } from "@/lib/actions/quiz";
import { requireCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import { SubmitButton } from "@/components/submit-button";

type QuizAttemptPageProps = {
  params: Promise<{ id: string; attemptId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function QuizAttemptPage({ params, searchParams }: QuizAttemptPageProps) {
  const user = await requireCurrentUser();
  const { id, attemptId } = await params;
  const paramsData = await searchParams;
  const answered = getParam(paramsData.answered);
  const error = getParam(paramsData.error);
  const attempt = await prisma.quizAttempt.findUniqueOrThrow({
    where: { id: attemptId },
    include: {
      quiz: {
        include: {
          classroom: true,
          questions: {
            orderBy: {
              position: "asc",
            },
            include: {
              feedback: {
                where: {
                  userId: user.id,
                },
              },
            },
          },
          documentLinks: {
            include: {
              document: true,
            },
          },
        },
      },
      responses: {
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  if (attempt.userId !== user.id || attempt.quiz.classroomId !== id) {
    throw new Error("Quiz attempt not found.");
  }

  const responseMap = new Map(attempt.responses.map((response) => [response.questionId, response]));
  const currentQuestion = attempt.quiz.questions.find((question) => !responseMap.has(question.id));
  const lastResponse = answered ? responseMap.get(answered) : undefined;
  const lastQuestion = answered
    ? attempt.quiz.questions.find((question) => question.id === answered)
    : undefined;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      <section className="card px-6 py-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="pill bg-[var(--accent-soft)] text-[var(--accent)]">
              {attempt.responses.length}/{attempt.quiz.questions.length} answered
            </div>
            <h1 className="display-title mt-4 text-3xl font-bold">{attempt.quiz.title}</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Built from {attempt.quiz.documentLinks.length} selected documents inside {attempt.quiz.classroom.name}.
            </p>
          </div>
          <Link href={`/classrooms/${id}`} className="button-secondary">
            Back to classroom
          </Link>
        </div>
      </section>

      {lastResponse && lastQuestion ? (
        <section className="card px-6 py-6">
          <div
            className={`rounded-3xl px-5 py-5 ${
              lastResponse.isCorrect ? "bg-emerald-50" : "bg-red-50"
            }`}
          >
            <div className={`text-sm font-semibold ${lastResponse.isCorrect ? "status-positive" : "status-negative"}`}>
              {lastResponse.isCorrect ? "Correct: +100 points" : "Incorrect"}
            </div>
            <h2 className="mt-3 text-xl font-bold">{lastQuestion.prompt}</h2>
            <div className="mt-5 space-y-3">
              {JSON.parse(lastQuestion.optionsJson).map((option: string, index: number) => {
                const isCorrect = index === lastQuestion.correctIndex;
                const isSelected = index === lastResponse.selectedIndex;

                return (
                  <div
                    key={option}
                    className={`rounded-2xl border px-4 py-3 text-sm font-medium ${
                      isCorrect
                        ? "border-emerald-200 bg-emerald-100 text-emerald-900"
                        : isSelected
                          ? "border-red-200 bg-red-100 text-red-900"
                          : "border-[var(--border)] bg-white"
                    }`}
                  >
                    {option}
                  </div>
                );
              })}
            </div>
            <p className="mt-4 text-sm text-[var(--muted)]">{lastQuestion.explanation}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {(["LIKE", "DISLIKE"] as const).map((value) => (
                <form key={value} action={saveQuestionFeedbackAction}>
                  <input type="hidden" name="questionId" value={lastQuestion.id} />
                  <input
                    type="hidden"
                    name="redirectTo"
                    value={`/classrooms/${id}/quiz/${attemptId}?answered=${lastQuestion.id}`}
                  />
                  <button
                    type="submit"
                    name="value"
                    value={value}
                    className={`button-secondary ${
                      lastQuestion.feedback[0]?.value === value ? "border-[var(--accent)] text-[var(--accent)]" : ""
                    }`}
                  >
                    {value === "LIKE" ? "Like question" : "Dislike question"}
                  </button>
                </form>
              ))}
            </div>
            {currentQuestion ? (
              <Link href={`/classrooms/${id}/quiz/${attemptId}`} className="button-primary mt-5 inline-flex">
                Next question
              </Link>
            ) : (
              <div className="mt-5 text-sm font-semibold text-[var(--accent)]">Quiz complete.</div>
            )}
          </div>
        </section>
      ) : null}

      {!lastResponse && currentQuestion ? (
        <section className="card px-6 py-6">
          <div className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
            Question {currentQuestion.position + 1}
          </div>
          <h2 className="mt-3 text-2xl font-bold">{currentQuestion.prompt}</h2>
          <form action={answerQuestionAction} className="mt-6 space-y-4">
            <input type="hidden" name="attemptId" value={attempt.id} />
            <input type="hidden" name="questionId" value={currentQuestion.id} />
            {JSON.parse(currentQuestion.optionsJson).map((option: string, index: number) => (
              <label
                key={option}
                className="flex items-center gap-3 rounded-2xl border border-[var(--border)] px-4 py-4"
              >
                <input type="radio" name="selectedIndex" value={index} required className="h-4 w-4" />
                <span className="text-sm font-medium">{option}</span>
              </label>
            ))}
            <SubmitButton pendingLabel="Checking answer...">Submit answer</SubmitButton>
          </form>
        </section>
      ) : null}

      {!currentQuestion && attempt.responses.length === attempt.quiz.questions.length ? (
        <section className="card px-6 py-6">
          <h2 className="section-title">Attempt summary</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Completed {attempt.completedAt ? formatDate(attempt.completedAt) : "just now"}.
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {attempt.quiz.questions.map((question) => {
              const response = responseMap.get(question.id);
              const feedback = question.feedback[0]?.value;

              return (
                <div key={question.id} className="rounded-3xl border border-[var(--border)] px-5 py-4">
                  <div className="font-semibold">{question.prompt}</div>
                  <div className={`mt-2 text-sm font-semibold ${response?.isCorrect ? "status-positive" : "status-negative"}`}>
                    {response?.isCorrect ? "Correct" : "Incorrect"}
                  </div>
                  <p className="mt-2 text-sm text-[var(--muted)]">{question.explanation}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {(["LIKE", "DISLIKE"] as const).map((value) => (
                      <form key={value} action={saveQuestionFeedbackAction}>
                        <input type="hidden" name="questionId" value={question.id} />
                        <input type="hidden" name="redirectTo" value={`/classrooms/${id}/quiz/${attemptId}`} />
                        <button
                          type="submit"
                          name="value"
                          value={value}
                          className={`button-secondary ${
                            feedback === value ? "border-[var(--accent)] text-[var(--accent)]" : ""
                          }`}
                        >
                          {value === "LIKE" ? "Like" : "Dislike"}
                        </button>
                      </form>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}
