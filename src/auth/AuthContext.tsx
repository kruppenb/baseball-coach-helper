import { createContext, useState, useEffect, type ReactNode } from 'react';
import type { AuthState, ClientPrincipal } from './types.ts';

export const AuthContext = createContext<AuthState>({
  user: null,
  isLoading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
  });

  useEffect(() => {
    let cancelled = false;

    async function fetchAuth() {
      try {
        const response = await fetch('/.auth/me');
        if (!response.ok) {
          throw new Error(`Auth endpoint returned ${response.status}`);
        }
        const data = (await response.json()) as {
          clientPrincipal: ClientPrincipal | null;
        };
        if (!cancelled) {
          if (data.clientPrincipal) {
            localStorage.setItem('has-authed', 'true');
          }
          setState({ user: data.clientPrincipal, isLoading: false });
        }
      } catch {
        // Network failure, 404 during local dev without SWA CLI, etc.
        // App must not break when auth endpoints are unavailable (AUTH-04).
        if (!cancelled) {
          setState({ user: null, isLoading: false });
        }
      }
    }

    fetchAuth();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AuthContext.Provider value={state}>{children}</AuthContext.Provider>
  );
}
