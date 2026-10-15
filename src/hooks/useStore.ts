import { useState, useEffect } from 'react';
import { store, AppState } from '../services/store.ts';
import { fetchDmaProfile, isSupabaseConfigured, supabase } from '../services/supabase.ts';

export function useStore(): AppState {
  const [state, setState] = useState<AppState>(store.getState());

  useEffect(() => {
    const unsubscribeStore = store.subscribe(() => setState(store.getState()));
    if (!isSupabaseConfigured || !supabase) return unsubscribeStore;

    let active = true;
    const hydrateSession = async () => {
      try {
        const { data, error } = await supabase!.auth.getSession();
        if (!active) return;
        if (error || !data.session?.user) {
          // Never resurrect a cached localStorage/demo identity when Supabase Auth is enabled.
          store.logout();
          if (error) console.error('Could not read Supabase session:', error);
          return;
        }
        const profile = await fetchDmaProfile(data.session.user);
        if (profile.status === 'suspended') {
          await supabase!.auth.signOut();
          if (active) store.logout();
          return;
        }
        if (active) store.setAuthenticatedUser(profile);
      } catch (profileError) {
        if (active) store.logout();
        console.error('Could not load Supabase profile:', profileError);
      }
    };
    void hydrateSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        store.logout();
        return;
      }
      if (!session?.user) return;
      // Avoid awaiting Supabase queries inside the auth callback to prevent lock contention.
      const authUser = session.user;
      queueMicrotask(() => {
        if (!active || !supabase) return;
        void fetchDmaProfile(authUser).then(async (profile) => {
          if (profile.status === 'suspended') {
            await supabase!.auth.signOut();
            if (active) store.logout();
            return;
          }
          if (active) store.setAuthenticatedUser(profile);
        }).catch((error) => {
          if (active) store.logout();
          console.error('Could not load Supabase profile:', error);
        });
      });
    });

    return () => {
      active = false;
      unsubscribeStore();
      authListener.subscription.unsubscribe();
    };
  }, []);

  return state;
}
