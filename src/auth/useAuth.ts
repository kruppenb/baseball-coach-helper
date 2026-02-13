import { useContext } from 'react';
import { AuthContext } from './AuthContext.tsx';

/**
 * Convenience hook for accessing auth state.
 *
 * Returns `{ user, isLoading }` where `user` is a `ClientPrincipal` when
 * signed in, or `null` when not signed in / auth unavailable.
 */
export function useAuth() {
  return useContext(AuthContext);
}
