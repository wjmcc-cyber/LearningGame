import { clampText, normalizeWhitespace, sha256Hex, shuffleDeterministic } from "@/lib/utils";
import type { GeneratedQuizQuestion } from "@/types/quiz";

type QuizSourceDocument = {
  id: string;
  originalName: string;
  textContent: string;
};

const STOP_WORDS = new Set([
  "about",
  "after",
  "again",
  "being",
  "below",
  "could",
  "every",
  "first",
  "found",
  "their",
  "there",
  "these",
  "those",
  "through",
  "which",
  "while",
  "where",
  "would",
]);

function splitIntoSentences(input: string) {
  return input
    .split(/(?<=[.!?])\s+/)
    .map((value) => normalizeWhitespace(value))
    .filter((value) => value.length >= 50 && value.length <= 220);
}

function extractFocusWords(input: string) {
  return Array.from(
    new Set(
      input
        .toLowerCase()
        .match(/[a-z][a-z-]{5,}/g)
        ?.filter((word) => !STOP_WORDS.has(word)) ?? [],
    ),
  );
}

function pickFocusWord(sentence: string) {
  const candidates = extractFocusWords(sentence).sort((a, b) => b.length - a.length);
  return candidates[0];
}

export async function generateFallbackQuiz(
  documents: QuizSourceDocument[],
  questionCount = 5,
): Promise<GeneratedQuizQuestion[]> {
  const entries = documents.flatMap((document) =>
    splitIntoSentences(document.textContent).map((sentence, index) => ({
      documentId: document.id,
      originalName: document.originalName,
      sentence,
      seed: `${document.id}:${index}:${sha256Hex(sentence)}`,
      focusWord: pickFocusWord(sentence),
    })),
  );

  const focusWordPool = Array.from(
    new Set(entries.flatMap((entry) => (entry.focusWord ? [entry.focusWord] : []))),
  );

  const sortedEntries = [...entries]
    .filter((entry) => entry.focusWord)
    .sort((a, b) => a.seed.localeCompare(b.seed));

  const questions: GeneratedQuizQuestion[] = [];

  for (const entry of sortedEntries) {
    if (questions.length >= questionCount || !entry.focusWord) {
      break;
    }

    const distractors = focusWordPool.filter((word) => word !== entry.focusWord).slice(0, 12);

    if (distractors.length < 3) {
      continue;
    }

    const uniqueDistractors = shuffleDeterministic(distractors, entry.seed).slice(0, 3);
    const maskedSentence = entry.sentence.replace(new RegExp(entry.focusWord, "i"), "_____");
    const options = shuffleDeterministic(
      [entry.focusWord, ...uniqueDistractors].map((value) => value.toLowerCase()),
      entry.seed,
    );

    questions.push({
      prompt: `Fill in the missing term from the study material:\n\n"${maskedSentence}"`,
      options,
      correctIndex: options.indexOf(entry.focusWord.toLowerCase()),
      explanation: clampText(
        `This answer comes directly from ${entry.originalName}: ${entry.sentence}`,
        220,
      ),
    });
  }

  if (questions.length > 0) {
    return questions.slice(0, questionCount);
  }

  const combinedText = normalizeWhitespace(documents.map((document) => document.textContent).join(" "));
  const fallbackToken = extractFocusWords(combinedText)[0] ?? "concept";
  const genericOptions = shuffleDeterministic(
    [fallbackToken, "theory", "hypothesis", "summary"],
    fallbackToken,
  );

  return [
    {
      prompt: "Which term is explicitly emphasized in the selected study material?",
      options: genericOptions,
      correctIndex: genericOptions.indexOf(fallbackToken),
      explanation: "The fallback generator uses repeated course vocabulary from the selected documents.",
    },
  ];
}
