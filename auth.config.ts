import type { AuthConfig } from "convex/server";

// Auth is handled by Supabase (frontend).
// This file is kept minimal — Convex's built-in auth is not used,
// but the config file must exist for the Convex runtime.
export default {
  providers: [],
} satisfies AuthConfig;
