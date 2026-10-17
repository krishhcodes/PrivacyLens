// Sign-in with Supabase (Google or an email link). Only active when VITE_SUPABASE_URL and
// VITE_SUPABASE_PUBLISHABLE_KEY are set; otherwise the website runs in local mode with no accounts.
// Supabase only proves who you are; all data still goes through the ConsentScope backend.
import { createClient, type Session } from '@supabase/supabase-js';
import { useSyncExternalStore } from 'react';

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const authEnabled = Boolean(URL && KEY);
const supabase = authEnabled ? createClient(URL!, KEY!) : null;

type AuthState = { ready: boolean; session: Session | null };
let state: AuthState = { ready: !authEnabled, session: null };
const listeners = new Set<() => void>();
const set = (next: AuthState) => { state = next; listeners.forEach(l => l()); };

if (supabase) {
  supabase.auth.getSession().then(({ data }) => set({ ready: true, session: data.session }));
  supabase.auth.onAuthStateChange((_event, session) => set({ ready: true, session }));
}

export function useAuth(): AuthState {
  return useSyncExternalStore(
    l => { listeners.add(l); return () => { listeners.delete(l); }; },
    () => state,
  );
}

/** Current access token for `Authorization: Bearer`, refreshed by Supabase when close to expiry. */
export async function accessToken(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

const redirectTo = () => window.location.origin + window.location.pathname;

export async function signInWithGoogle(): Promise<void> {
  const { error } = await supabase!.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirectTo() } });
  if (error) throw error;
}

export async function signInWithEmail(email: string): Promise<void> {
  const { error } = await supabase!.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo() } });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  await supabase?.auth.signOut();
}
