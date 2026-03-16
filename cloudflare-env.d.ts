declare global {
  interface CloudflareEnv {
    DB: D1Database;
    STUDY_DOCUMENTS_BUCKET: R2Bucket;
    OPENAI_API_KEY?: string;
    OPENAI_MODEL?: string;
    SESSION_COOKIE_NAME?: string;
    SESSION_TTL_DAYS?: string;
    SITE_URL?: string;
  }
}

export {};
