import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export interface AuthState {
  user: User | null;
  session: Session | null;
  accessToken: string | null;
  loading: boolean;
  guestMode: boolean;
}

interface AuthContextType extends AuthState {
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  enterGuestMode: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const IS_TEST =
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.MODE === 'test') ||
    (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test');
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(!IS_TEST);
  const [guestMode, setGuestMode] = useState<boolean>(() => {
    return localStorage.getItem('clade-guest-mode') === 'true';
  });

  useEffect(() => {
    if (IS_TEST) return;
    let mounted = true;

    const bootstrap = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const nextSession = sessionData.session ?? null;
        const { data: userRes } = await supabase.auth.getUser();

        if (!mounted) return;
        setSession(nextSession);
        setUser(userRes.user ?? nextSession?.user ?? null);
        setAccessToken(nextSession?.access_token ?? null);

        // If no authenticated session exists, preserve guest mode for demo access
        if (!nextSession) {
          setGuestMode((prev) => {
            const persisted = localStorage.getItem('clade-guest-mode') === 'true';
            return prev || persisted;
          });
        } else {
          // Clear guest flag when a real session is present
          localStorage.removeItem('clade-guest-mode');
          setGuestMode(false);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    bootstrap();

    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession ?? null);
      setUser(nextSession?.user ?? null);
      setAccessToken(nextSession?.access_token ?? null);

      if (event === 'SIGNED_OUT') {
        localStorage.removeItem('lastAuthTime');
        // Keep guest mode available after sign-out so users can continue exploring
        setGuestMode(true);
        localStorage.setItem('clade-guest-mode', 'true');
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        localStorage.setItem('lastAuthTime', Date.now().toString());
        localStorage.removeItem('clade-guest-mode');
        setGuestMode(false);
      }
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, displayName?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          display_name: displayName || email.split('@')[0],
        },
      },
    });
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    // Exiting guest mode on sign-in intent to avoid stale guest flags
    localStorage.removeItem('clade-guest-mode');
    setGuestMode(false);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error && data.session) {
      setSession(data.session as Session);
      setUser(data.session.user);
      setAccessToken(data.session.access_token);
      localStorage.setItem('lastAuthTime', Date.now().toString());
      localStorage.removeItem('clade-guest-mode');
      setGuestMode(false);
    }
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setAccessToken(null);
    localStorage.removeItem('lastAuthTime');
    // Continue offering demo access after sign-out
    setGuestMode(true);
    localStorage.setItem('clade-guest-mode', 'true');
  };

  const enterGuestMode = () => {
    setGuestMode(true);
    setUser(null);
    setSession(null);
    setAccessToken(null);
    localStorage.setItem('clade-guest-mode', 'true');
    setLoading(false);
  };

  const value = useMemo(
    () => ({ user, session, loading, accessToken, guestMode, signUp, signIn, signOut, enterGuestMode }),
    [user, session, loading, accessToken, guestMode]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
