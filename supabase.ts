// Supabase Client Configuration
// Provides Supabase database, auth, and storage access
// See /integrations.md for usage documentation

import { createClient, SupabaseClient } from "@supabase/supabase-js";

// These env vars should be set in the project's Keys/API keys tab
// Read Supabase credentials from env vars (set in Keys tab or .env.local)
// Fallback to hardcoded values if env vars are empty (for deployment convenience)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  || import.meta.env.VITE_SUPABASE_PROJECT_URL
  || import.meta.env.SUPABASE_URL
  || "https://gujxrmrkspqpqmlmqyer.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  || import.meta.env.VITE_SUPABASE_KEY
  || import.meta.env.SUPABASE_ANON_KEY
  || import.meta.env.SUPABASE_KEY
  || "sb_publishable_gjYsmXdoyRT5pTkrY70o6g_w3qIWQss";

const hasKeys = !!supabaseUrl && !!supabaseAnonKey;

if (!hasKeys) {
  console.warn(
    "[Supabase] Missing Supabase URL or Anon Key. Check your Keys tab for VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
  );
}

/** Create a mock supabase client for when env vars are missing */
function createMockClient(): SupabaseClient {
  const noop = () => Promise.resolve({ data: null, error: new Error("Supabase not configured") });
  return {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signOut: () => Promise.resolve({ error: null }),
      signInWithPassword: () => Promise.resolve({ data: { user: null, session: null }, error: new Error("Supabase URL and Anon Key not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the Keys tab.") }),
      signUp: () => Promise.resolve({ data: { user: null, session: null }, error: new Error("Supabase not configured") }),
      signInWithOAuth: () => Promise.resolve({ data: null, error: new Error("Supabase not configured") }),
    },
    storage: {
      from: () => ({
        upload: noop,
        getPublicUrl: () => ({ data: { publicUrl: "" } }),
        list: noop,
      }),
    },
  } as unknown as SupabaseClient;
}

export const supabase: SupabaseClient = hasKeys
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
      },
    })
  : createMockClient();

// Helper: Upload a file to Supabase Storage
// Usage: const { data, error } = await uploadFile("posts", file, "my-image.jpg");
export async function uploadFile(
  bucket: string,
  file: File | Blob,
  path: string,
) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: true,
    });
  return { data, error };
}

// Helper: Get a public URL for a stored file
export function getPublicUrl(bucket: string, path: string) {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

// Helper: List all files in a bucket folder
export async function listFiles(bucket: string, folder?: string) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .list(folder ?? "");
  return { data, error };
}
