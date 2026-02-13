import { HttpRequest } from '@azure/functions';

export interface ClientPrincipal {
  identityProvider: string;
  userId: string;
  userDetails: string;
  userRoles: string[];
}

/**
 * Parse the x-ms-client-principal header injected by Azure Static Web Apps.
 * Returns null if the header is missing or malformed.
 */
export function parseClientPrincipal(
  request: HttpRequest,
): ClientPrincipal | null {
  try {
    const header = request.headers.get('x-ms-client-principal');
    if (!header) {
      return null;
    }
    const decoded = Buffer.from(header, 'base64').toString('utf-8');
    return JSON.parse(decoded) as ClientPrincipal;
  } catch {
    return null;
  }
}
