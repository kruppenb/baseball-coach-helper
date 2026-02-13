export interface ClientPrincipal {
  identityProvider: string;
  userId: string;
  userDetails: string;
  userRoles: string[];
  claims: Array<{ typ: string; val: string }>;
}

export interface AuthState {
  user: ClientPrincipal | null;
  isLoading: boolean;
}

/**
 * Extract display name from a ClientPrincipal.
 *
 * Priority:
 * 1. The "name" claim from Entra ID token claims
 * 2. userDetails (often the email in Entra ID v2.0 -- not ideal, but usable)
 * 3. Fallback to "Coach"
 */
export function getDisplayName(user: ClientPrincipal): string {
  const nameClaim = user.claims.find((c) => c.typ === 'name');
  if (nameClaim?.val) {
    return nameClaim.val;
  }
  if (user.userDetails) {
    return user.userDetails;
  }
  return 'Coach';
}
