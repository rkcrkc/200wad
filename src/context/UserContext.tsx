"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

interface UserContextType {
  user: User | null;
  avatarUrl: string | null;
  isLoading: boolean;
  isGuest: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: ReactNode;
  /**
   * Server-prefetched user from the root layout. When provided, the client
   * skips its initial `supabase.auth.getUser()` round-trip on every page
   * hydration — middleware has already validated the session server-side,
   * so the duplicate client call is wasted work.
   */
  initialUser?: User | null;
  /** Server-prefetched avatar_url, paired with `initialUser`. */
  initialAvatarUrl?: string | null;
}

export function UserProvider({
  children,
  initialUser = null,
  initialAvatarUrl = null,
}: UserProviderProps) {
  const [user, setUser] = useState<User | null>(initialUser);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl);
  // We have the user from the server, so we're never in an indeterminate
  // loading state on first paint. The Header skeleton path becomes dead code
  // for hydrated routes, which is the desired UX.
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();

  // Tracks the user id we've already fetched a profile for, so the
  // `INITIAL_SESSION` event that `onAuthStateChange` fires on mount doesn't
  // trigger a duplicate avatar lookup when it surfaces the same user the
  // server already gave us.
  const lastFetchedUserIdRef = useRef<string | null>(initialUser?.id ?? null);

  const fetchProfile = useCallback(
    async (userId: string) => {
      if (lastFetchedUserIdRef.current === userId) return;
      lastFetchedUserIdRef.current = userId;
      const { data } = await supabase
        .from("users")
        .select("avatar_url")
        .eq("id", userId)
        .single();
      setAvatarUrl(data?.avatar_url ?? null);
    },
    [supabase]
  );

  const refreshUser = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setUser(user);
    if (user) {
      // Force re-fetch — the consumer asked for a refresh.
      lastFetchedUserIdRef.current = null;
      await fetchProfile(user.id);
    } else {
      lastFetchedUserIdRef.current = null;
      setAvatarUrl(null);
    }
  }, [supabase.auth, fetchProfile]);

  useEffect(() => {
    // Subscribe to auth changes only. The server already prefetched the
    // initial user into props, so we no longer kick off a redundant
    // `supabase.auth.getUser()` here. `onAuthStateChange` still fires an
    // `INITIAL_SESSION` event on mount, which reconciles any client-side
    // session changes that happened after the server response was built.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      if (nextUser) {
        fetchProfile(nextUser.id);
      } else {
        lastFetchedUserIdRef.current = null;
        setAvatarUrl(null);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase.auth, fetchProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setAvatarUrl(null);
    lastFetchedUserIdRef.current = null;
  }, [supabase.auth]);

  const value: UserContextType = {
    user,
    avatarUrl,
    isLoading,
    isGuest: !user,
    isAdmin: user?.user_metadata?.role === "admin",
    signOut,
    refreshUser,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
