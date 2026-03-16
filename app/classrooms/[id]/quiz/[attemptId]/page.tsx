import Link from "next/link";
import { answerQuestionAction, saveQuestionFeedbackAction } from "@/lib/actions/quiz";
import { requireCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
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
  const prisma = await getDb();
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
        <div className="alert-error rounded-2xl px-4 py-3 text-sm">
          {error}
        </div>
      ) : null}
      <section className="card px-6 py-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="pill accent-chip">
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
          <div className="paper-card rounded-[1.75rem] px-5 py-5">
            <div className={`text-sm font-semibold ${lastResponse.isCorrect ? "status-positive" : "status-negative"}`}>
              {lastResponse.isCorrect ? "Correct: +100 points" : "Incorrect"}
            </div>
            <h2 className="mt-3 text-xl font-bold text-[var(--ink)]">{lastQuestion.prompt}</h2>
            <div className="mt-5 space-y-3">
              {JSON.parse(lastQuestion.optionsJson).map((option: string, index: number) => {
                const isCorrect = index === lastQuestion.correctIndex;
                const isSelected = index === lastResponse.selectedIndex;

                return (
                  <div
                    key={option}
                    className={`rounded-2xl border px-4 py-3 text-sm font-medium ${
                      isCorrect
                        ? "border-[rgba(139,223,54,0.42)] bg-[rgba(139,223,54,0.18)] text-[var(--ink)]"
                        : isSelected
                          ? "border-[rgba(255,107,99,0.42)] bg-[rgba(255,107,99,0.14)] text-[var(--ink)]"
                          : "paper-card text-[var(--ink)]"
                    }`}
                  >
                    {option}
                  </div>
                );
              })}
            </div>
            <p className="paper-muted mt-4 text-sm">{lastQuestion.explanation}</p>
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
              <div className="mt-5 text-sm font-semibold text-[var(--success)]">Quiz complete.</div>
            )}
          </div>
        </section>
      ) : null}

      {!lastResponse && currentQuestion ? (
        <section className="card px-6 py-6">
          <div className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
            Question {currentQuestion.position + 1}
          </div>
          <div className="paper-card mt-4 rounded-[2rem] px-6 py-8">
            <h2 className="text-2xl font-bold text-[var(--ink)]">{currentQuestion.prompt}</h2>
            <form action={answerQuestionAction} className="mt-6 space-y-4">
              <input type="hidden" name="attemptId" value={attempt.id} />
              <input type="hidden" name="questionId" value={currentQuestion.id} />
              {JSON.parse(currentQuestion.optionsJson).map((option: string, index: number) => (
                <label
                  key={option}
                  className="paper-card flex items-center gap-3 rounded-2xl px-4 py-4"
                >
                  <input type="radio" name="selectedIndex" value={index} required className="h-4 w-4" />
                  <span className="text-sm font-medium text-[var(--ink)]">{option}</span>
                </label>
              ))}
              <SubmitButton pendingLabel="Checking answer...">Submit answer</SubmitButton>
            </form>
          </div>
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
                <div key={question.id} className="paper-card rounded-[1.75rem] px-5 py-4">
                  <div className="font-semibold text-[var(--ink)]">{question.prompt}</div>
                  <div className={`mt-2 text-sm font-semibold ${response?.isCorrect ? "status-positive" : "status-negative"}`}>
                    {response?.isCorrect ? "Correct" : "Incorrect"}
                  </div>
                  <p className="paper-muted mt-2 text-sm">{question.explanation}</p>
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
