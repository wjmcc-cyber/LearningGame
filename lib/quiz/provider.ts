import { clampText, normalizeWhitespace } from "@/lib/utils";
import { generateFallbackQuiz } from "@/lib/quiz/fallback";
import { generateOpenAIQuiz } from "@/lib/quiz/openai";
import type { GeneratedQuizQuestion } from "@/types/quiz";

type QuizSourceDocument = {
  id: string;
  originalName: string;
  textContent: string;
};

function normalizeQuestions(questions: GeneratedQuizQuestion[]) {
  const seenPrompts = new Set<string>();

  return questions
    .map((question) => ({
      prompt: normalizeWhitespace(question.prompt),
      options: question.options.map((option) => normalizeWhitespace(option)),
      correctIndex: question.correctIndex,
      explanation: clampText(normalizeWhitespace(question.explanation), 240),
    }))
    .filter((question) => {
      if (
        question.options.length !== 4 ||
        question.correctIndex < 0 ||
        question.correctIndex > 3 ||
        seenPrompts.has(question.prompt)
      ) {
        return false;
      }

      seenPrompts.add(question.prompt);
      return true;
    });
}

export async function generateQuizQuestions(documents: QuizSourceDocument[]) {
  const questionCount = Math.min(5, Math.max(3, documents.length * 2));

  if (process.env.OPENAI_API_KEY) {
    try {
      const questions = normalizeQuestions(await generateOpenAIQuiz(documents, questionCount));

      if (questions.length > 0) {
        return questions;
      }
    } catch {
      // Fall through to the deterministic generator when OpenAI is unavailable.
    }
  }

  return normalizeQuestions(await generateFallbackQuiz(documents, questionCount));
}
