export async function getRuntimeConfig() {
  return {
    openAiApiKey: process.env.OPENAI_API_KEY || "",
    openAiModel: process.env.OPENAI_MODEL || "gpt-5-mini",
    sessionCookieName: process.env.SESSION_COOKIE_NAME || "study_league_session",
    sessionTtlDays: Number(process.env.SESSION_TTL_DAYS || 30),
  };
}
