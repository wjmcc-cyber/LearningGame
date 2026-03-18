import { createClient, type SupabaseClient } from "@supabase/supabase-js";

declare global {
  var __studyLeagueSupabaseAdmin: SupabaseClient | undefined;
}

export function getSupabaseStorageBucket() {
  return process.env.SUPABASE_STORAGE_BUCKET || "study-documents";
}

export function getSupabaseAdmin() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  if (global.__studyLeagueSupabaseAdmin) {
    return global.__studyLeagueSupabaseAdmin;
  }

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  if (process.env.NODE_ENV !== "production") {
    global.__studyLeagueSupabaseAdmin = client;
  }

  return client;
}
