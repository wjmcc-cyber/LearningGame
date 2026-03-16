export type StudyLeagueCloudflareEnv = CloudflareEnv & {
  DB?: D1Database;
  STUDY_DOCUMENTS_BUCKET?: R2Bucket;
};

export async function getCloudflareEnv(): Promise<StudyLeagueCloudflareEnv | null> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const context = await getCloudflareContext({ async: true });
    return context.env as StudyLeagueCloudflareEnv;
  } catch {
    return null;
  }
}

export async function isCloudflareRuntime() {
  const env = await getCloudflareEnv();
  return Boolean(env?.DB || env?.STUDY_DOCUMENTS_BUCKET);
}
