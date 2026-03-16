import { z } from "zod";
import { getRuntimeConfig } from "@/lib/runtime-config";
import type { GeneratedQuizQuestion } from "@/types/quiz";

type QuizSourceDocument = {
  originalName: string;
  textContent: string;
};

const responseSchema = z.object({
  questions: z
    .array(
      z.object({
        prompt: z.string().min(12),
        options: z.array(z.string().min(1)).length(4),
        correctIndex: z.number().int().min(0).max(3),
        explanation: z.string().min(1),
      }),
    )
    .min(1)
    .max(5),
});

function extractOutputText(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    throw new Error("Unexpected OpenAI response payload.");
  }

  const record = payload as Record<string, unknown>;

  if (typeof record.output_text === "string" && record.output_text.trim()) {
    return record.output_text;
  }

  const output = Array.isArray(record.output) ? record.output : [];

  for (const item of output) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const content = Array.isArray((item as Record<string, unknown>).content)
      ? ((item as Record<string, unknown>).content as unknown[])
      : [];

    for (const part of content) {
      if (!part || typeof part !== "object") {
        continue;
      }

      const text =
        typeof (part as Record<string, unknown>).text === "string"
          ? ((part as Record<string, unknown>).text as string)
          : typeof (part as Record<string, unknown>).output_text === "string"
            ? ((part as Record<string, unknown>).output_text as string)
            : null;

      if (text?.trim()) {
        return text;
      }
    }
  }

  throw new Error("OpenAI did not return structured quiz output.");
}

export async function generateOpenAIQuiz(
  documents: QuizSourceDocument[],
  questionCount = 5,
): Promise<GeneratedQuizQuestion[]> {
  const runtimeConfig = await getRuntimeConfig();
  const apiKey = runtimeConfig.openAiApiKey;

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY.");
  }

  const model = runtimeConfig.openAiModel;
  const context = documents
    .map(
      (document, index) =>
        `Document ${index + 1}: ${document.originalName}\n${document.textContent.slice(0, 6000)}`,
    )
    .join("\n\n---\n\n");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: "You create concise university study quizzes. Return only valid JSON matching the requested schema, use exactly four answer options, avoid repeated questions, and stay grounded in the supplied study material.",
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `Generate ${questionCount} multiple-choice quiz questions from the following study material.\n\n${context}`,
            },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "quiz_questions",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              questions: {
                type: "array",
                minItems: 1,
                maxItems: questionCount,
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    prompt: { type: "string" },
                    options: {
                      type: "array",
                      minItems: 4,
                      maxItems: 4,
                      items: { type: "string" },
                    },
                    correctIndex: { type: "integer", minimum: 0, maximum: 3 },
                    explanation: { type: "string" },
                  },
                  required: ["prompt", "options", "correctIndex", "explanation"],
                },
              },
            },
            required: ["questions"],
          },
        },
      },
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    throw new Error(`OpenAI request failed with status ${response.status}.`);
  }

  const payload = await response.json();
  const parsed = responseSchema.parse(JSON.parse(extractOutputText(payload)));
  return parsed.questions;
}
