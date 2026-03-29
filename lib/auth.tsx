import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { getMissingSupabaseEnv, getSupabaseBrowserClient, hasSupabaseConfig } from './supabase';

type AuthStatus = 'loading' | 'ready' | 'missing_config';

type AppProfile = {
  email: string;
  displayName: string;
};

type AuthContextValue = {
  status: AuthStatus;
  session: Session | null;
  user: User | null;
  profile: AppProfile | null;
  errorMessage: string | null;
  missingEnv: string[];
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, displayName: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  clearError: () => void;
};

const defaultValue: AuthContextValue = {
  status: hasSupabaseConfig ? 'loading' : 'missing_config',
  session: null,
  user: null,
  profile: null,
  errorMessage: null,
  missingEnv: getMissingSupabaseEnv(),
  isAuthenticated: false,
  signIn: async () => ({ error: 'Supabase is not configured.' }),
  signUp: async () => ({ error: 'Supabase is not configured.' }),
  signOut: async () => {},
  clearError: () => {},
};

const AuthContext = createContext<AuthContextValue>(defaultValue);

function getDisplayName(user: User | null): string {
  if (!user) return '';

  const metadataName = user.user_metadata?.display_name;
  if (typeof metadataName === 'string' && metadataName.trim()) {
    return metadataName.trim();
  }

  if (typeof user.email === 'string' && user.email.includes('@')) {
    return user.email.split('@')[0];
  }

  return 'FreshKeeper user';
}

function getProfile(user: User | null): AppProfile | null {
  if (!user?.email) return null;
  return {
    email: user.email,
    displayName: getDisplayName(user),
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<AuthStatus>(hasSupabaseConfig ? 'loading' : 'missing_config');
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setStatus('missing_config');
      return;
    }

    let active = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;

      if (error) {
        setErrorMessage(error.message);
      }

      setSession(data.session ?? null);
      setUser(data.session?.user ?? null);
      setStatus('ready');
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ?? null);
      setUser(nextSession?.user ?? null);
      setStatus('ready');
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const supabase = getSupabaseBrowserClient();

    return {
      status,
      session,
      user,
      profile: getProfile(user),
      errorMessage,
      missingEnv: getMissingSupabaseEnv(),
      isAuthenticated: Boolean(session?.user),
      clearError: () => setErrorMessage(null),
      signIn: async (email, password) => {
        if (!supabase) return { error: 'Supabase is not configured.' };

        setErrorMessage(null);
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          setErrorMessage(error.message);
          return { error: error.message };
        }
        return {};
      },
      signUp: async (email, password, displayName) => {
        if (!supabase) return { error: 'Supabase is not configured.' };

        setErrorMessage(null);
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: displayName,
            },
          },
        });

        if (error) {
          setErrorMessage(error.message);
          return { error: error.message };
        }

        if (!data.session) {
          const message = 'Sign up succeeded, but no active session was returned. Check Supabase Confirm Email settings.';
          setErrorMessage(message);
          return { error: message };
        }

        return {};
      },
      signOut: async () => {
        if (!supabase) return;

        setErrorMessage(null);
        await supabase.auth.signOut();
      },
    };
  }, [errorMessage, session, status, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth() {
  return useContext(AuthContext);
}
