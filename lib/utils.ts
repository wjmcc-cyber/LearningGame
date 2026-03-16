import { createHash } from "crypto";

export function formatDate(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;

  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatPoints(points: number) {
  return `${points.toLocaleString()} pts`;
}

export function safeRedirectPath(input?: string | null) {
  if (!input || !input.startsWith("/") || input.startsWith("//")) {
    return "/dashboard";
  }

  return input;
}

export function normalizeWhitespace(input: string) {
  return input.replace(/\s+/g, " ").trim();
}

export function sha256Hex(input: Buffer | string) {
  return createHash("sha256").update(input).digest("hex");
}

export function buildPairKey(a: string, b: string) {
  return [a, b].sort().join(":");
}

export function shuffleDeterministic<T>(items: T[], seed: string) {
  const result = [...items];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const hash = sha256Hex(`${seed}:${index}`);
    const swapIndex = Number.parseInt(hash.slice(0, 8), 16) % (index + 1);
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }

  return result;
}

export function clampText(input: string, maxLength: number) {
  return input.length > maxLength ? `${input.slice(0, maxLength)}...` : input;
}
