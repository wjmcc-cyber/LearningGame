import { getCloudflareEnv } from "@/lib/cloudflare";

export async function getRuntimeConfig() {
  const cloudflareEnv = await getCloudflareEnv();

  return {
    openAiApiKey: cloudflareEnv?.OPENAI_API_KEY || process.env.OPENAI_API_KEY || "",
    openAiModel: cloudflareEnv?.OPENAI_MODEL || process.env.OPENAI_MODEL || "gpt-5-mini",
    sessionCookieName:
      cloudflareEnv?.SESSION_COOKIE_NAME || process.env.SESSION_COOKIE_NAME || "study_league_session",
    sessionTtlDays: Number(cloudflareEnv?.SESSION_TTL_DAYS || process.env.SESSION_TTL_DAYS || 30),
  };
}
