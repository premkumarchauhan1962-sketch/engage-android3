import { api } from "@/convex/_generated/api";
import { useQuery, useMutation } from "convex/react";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

export function useAuth() {
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [supabaseId, setSupabaseId] = useState<string | null>(null);

  // Check existing Supabase session and listen for changes
  useEffect(() => {
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setSupabaseUser(session.user);
        setSupabaseId(session.user.id);
      }
      setIsLoading(false);
    };

    getInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          setSupabaseUser(session.user);
          setSupabaseId(session.user.id);
        } else {
          setSupabaseUser(null);
          setSupabaseId(null);
        }
        setIsLoading(false);
      },
    );

    return () => subscription.unsubscribe();
  }, []);

  // Sync Supabase user to Convex when supabaseId changes
  const syncUser = useMutation(api.users.syncSupabaseUser);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (supabaseId && supabaseUser && !syncing) {
      setSyncing(true);
      // Check for pending username (set during signup)
      const pendingUsername = localStorage.getItem("pendingUsername");
      if (pendingUsername) localStorage.removeItem("pendingUsername");

      syncUser({
        supabaseId,
        email: supabaseUser.email ?? undefined,
        name: supabaseUser.user_metadata?.full_name ?? supabaseUser.email?.split("@")[0] ?? undefined,
        username: pendingUsername || undefined,
        image: supabaseUser.user_metadata?.avatar_url ?? undefined,
      }).finally(() => setSyncing(false));
    }
  }, [supabaseId, supabaseUser?.email]);

  // Fetch Convex user data by supabaseId
  const convexUser = useQuery(
    api.users.currentUser,
    supabaseId ? { supabaseId } : "skip",
  );

  const signIn = useCallback(() => {
    window.location.href = "/auth";
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("engage_logged_in");
    setSupabaseUser(null);
    setSupabaseId(null);
    window.location.href = "/";
  }, []);

  const isAuthenticated = !!supabaseUser;

  return {
    isLoading: isLoading || (isAuthenticated && convexUser === undefined),
    isAuthenticated,
    user: convexUser ?? null,
    supabaseUser: supabaseUser ?? null,
    supabaseId,
    signIn,
    signOut,
  };
}
