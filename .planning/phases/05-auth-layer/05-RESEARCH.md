# Phase 5: Auth Layer - Research

**Researched:** 2026-02-12
**Domain:** Azure Static Web Apps EasyAuth with Entra ID, client-side auth state management in React
**Confidence:** HIGH

## Summary

Phase 5 adds optional Microsoft sign-in to the existing v1.0 app using Azure Static Web Apps (SWA) EasyAuth -- a platform-level authentication mechanism that requires zero client-side auth libraries. The app must remain fully functional without signing in (AUTH-04), meaning auth is purely additive: a React context provides user state, the header gains a sign-in/sign-out button, and route configuration in `staticwebapp.config.json` handles the underlying OAuth redirect flow.

SWA EasyAuth handles the entire OAuth2/OIDC flow at the platform edge. The client interacts with three built-in endpoints: `/.auth/login/aad` (triggers sign-in redirect), `/.auth/logout` (ends session), and `/.auth/me` (returns user profile as JSON). No tokens are exposed to the client; session state is managed via an HTTP-only cookie set by the platform. To restrict access to a specific Entra ID tenant (not "any Microsoft account"), a custom Entra ID provider registration is required in `staticwebapp.config.json`, which means the SWA Standard plan ($9/mo) is mandatory.

The assignment-required restriction (AUTH-02) is configured entirely in Azure Portal on the Enterprise Application, not in app code. When "Assignment required?" is set to Yes, only users explicitly assigned in the portal can authenticate. Unassigned users receive an error from Entra ID before ever reaching the app. The app should handle this gracefully with a 403 response override page.

**Primary recommendation:** Use SWA EasyAuth with a custom Entra ID v2.0 registration (Standard plan), `/.auth/me` for user info, a React `AuthContext` for state, and the SWA CLI for local auth emulation during development.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| SWA EasyAuth (platform) | N/A | OAuth2 sign-in/sign-out flow | Zero client-side code; platform handles token management, session cookies, OIDC flow |
| `@azure/static-web-apps-cli` | ^2.0.x | Local dev emulator with auth mock | Official Microsoft tool; emulates `/.auth/*` endpoints locally |
| `staticwebapp.config.json` | N/A | Route protection, auth provider config, SPA fallback | SWA's declarative config file; no server code needed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| React Context API | (built-in) | Share auth state across components | Wrap `AppShell` with `AuthProvider`; consumed by header and future sync engine |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| SWA EasyAuth | MSAL.js (@azure/msal-browser) | Full token management in client; 30KB+ bundle; complex config; overkill when EasyAuth handles it at platform level |
| React Context | Zustand/Jotai | Unnecessary for simple user-state; Context is sufficient for auth info that rarely changes |

**Installation:**
```bash
npm install -D @azure/static-web-apps-cli
```

No runtime dependencies needed. EasyAuth is platform-level, not a library.

## Architecture Patterns

### Recommended Project Structure
```
src/
  auth/
    AuthContext.tsx        # React context + provider for auth state
    useAuth.ts            # Hook: useContext(AuthContext) convenience wrapper
    types.ts              # ClientPrincipal type definition
  components/
    app-shell/
      AppShell.tsx        # Wraps content in AuthProvider
      AppHeader.tsx       # New: displays user name + sign-out (extracted from header)
      TabBar.tsx          # Existing (unchanged)
  pages/
    AccessDenied.tsx      # Shown for 403 response override (optional SPA page)
staticwebapp.config.json  # Root: SWA config with auth, routes, navigation fallback
```

### Pattern 1: AuthContext with Lazy Fetch
**What:** A React context that fetches `/.auth/me` on mount to determine if the user is signed in. Stores `clientPrincipal` (or null) in state.
**When to use:** Always -- this is the single source of auth truth for the client.
**Example:**
```typescript
// Source: https://learn.microsoft.com/en-us/azure/static-web-apps/user-information
interface ClientPrincipal {
  identityProvider: string;
  userId: string;
  userDetails: string;
  userRoles: string[];
  claims: Array<{ typ: string; val: string }>;
}

interface AuthState {
  user: ClientPrincipal | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthState>({ user: null, isLoading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, isLoading: true });

  useEffect(() => {
    fetch('/.auth/me')
      .then(res => res.json())
      .then(data => setState({ user: data.clientPrincipal, isLoading: false }))
      .catch(() => setState({ user: null, isLoading: false }));
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
```

### Pattern 2: Display Name Extraction from Claims
**What:** The user's display name is in the `claims` array returned by `/.auth/me`, not in `userDetails` (which contains email for Entra ID v2.0).
**When to use:** When displaying the coach's name in the header (AUTH-03).
**Example:**
```typescript
// Source: https://learn.microsoft.com/en-us/azure/static-web-apps/authentication-custom
// Entra ID v2.0 returns claims including { typ: "name", val: "Coach Smith" }
function getDisplayName(user: ClientPrincipal): string {
  const nameClaim = user.claims?.find(c => c.typ === 'name');
  return nameClaim?.val ?? user.userDetails ?? 'Coach';
}
```

### Pattern 3: SWA Config for Optional Auth (No Forced Login)
**What:** The `staticwebapp.config.json` does NOT force authentication on all routes. All pages remain accessible to anonymous users. Auth is opt-in via the sign-in button.
**When to use:** AUTH-04 requires the app to work without signing in.
**Example:**
```json
{
  "auth": {
    "identityProviders": {
      "azureActiveDirectory": {
        "registration": {
          "openIdIssuer": "https://login.microsoftonline.com/<TENANT_ID>/v2.0",
          "clientIdSettingName": "AZURE_CLIENT_ID",
          "clientSecretSettingName": "AZURE_CLIENT_SECRET"
        }
      }
    }
  },
  "routes": [
    {
      "route": "/.auth/login/github",
      "statusCode": 404
    },
    {
      "route": "/api/*",
      "allowedRoles": ["authenticated"]
    }
  ],
  "navigationFallback": {
    "rewrite": "/index.html",
    "exclude": ["/images/*.{png,jpg,gif,svg}", "/assets/*"]
  },
  "responseOverrides": {
    "401": {
      "redirect": "/.auth/login/aad?post_login_redirect_uri=.referrer",
      "statusCode": 302
    },
    "403": {
      "rewrite": "/index.html"
    }
  },
  "platform": {
    "apiRuntime": "node:20"
  }
}
```

### Pattern 4: Local Development with SWA CLI + Vite Proxy
**What:** Use SWA CLI for auth emulation but proxy `/.auth` through Vite for faster HMR.
**When to use:** During development. SWA CLI runs on port 4280, Vite on 5180.
**Example (vite.config.ts):**
```typescript
// Source: https://johnnyreilly.com/static-web-apps-cli-improve-performance-with-vite-server-proxy
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5180,
    proxy: {
      '/.auth': {
        target: 'http://127.0.0.1:4280',
        changeOrigin: true,
      },
      '/api': {
        target: 'http://127.0.0.1:7071',
        changeOrigin: true,
      },
    },
  },
});
```

### Anti-Patterns to Avoid
- **Forcing auth on all routes:** Do NOT use `"route": "/*", "allowedRoles": ["authenticated"]`. This breaks AUTH-04 (app must work without signing in).
- **Using MSAL.js alongside EasyAuth:** EasyAuth manages the full OAuth flow. Adding MSAL.js creates conflicting token/session management.
- **Storing tokens in localStorage:** EasyAuth uses HTTP-only cookies. Never store auth tokens client-side.
- **Fetching `/.auth/me` on every render:** Fetch once on mount in the AuthProvider. The session cookie handles persistence.
- **Hardcoding tenant ID in client code:** The tenant ID goes in `staticwebapp.config.json` which is a deployment config, not a secret. But use application settings for `AZURE_CLIENT_ID` and `AZURE_CLIENT_SECRET`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| OAuth2/OIDC flow | Custom redirect handling, token exchange | SWA EasyAuth (`/.auth/login/aad`) | OAuth has dozens of edge cases (PKCE, nonce, state, token refresh); platform handles all |
| Session management | Custom JWT/cookie handling | SWA session cookie (automatic) | HTTP-only, secure, platform-managed |
| User info endpoint | Custom API to decode tokens | `/.auth/me` built-in endpoint | Always returns current session state; no token parsing needed |
| Access control enforcement | Middleware in React Router | SWA route rules (`allowedRoles`) | Server-side enforcement; client-side can be bypassed |
| Auth emulation for dev | Mock service worker | SWA CLI auth emulator | Emulates exact production behavior including `/.auth/*` endpoints |
| Tenant restriction | Custom token validation | Entra ID `openIdIssuer` with tenant ID | Platform rejects wrong-tenant tokens before they reach the app |
| User assignment enforcement | Custom user database + allow list | Entra ID "Assignment required" flag | Portal-managed; no code needed; enforced before token issuance |

**Key insight:** The entire auth layer for this phase requires zero runtime dependencies. SWA EasyAuth, route configuration, and Entra ID enterprise app settings handle everything at the platform level. The only client code is a React context that fetches `/.auth/me` and a UI for sign-in/sign-out buttons.

## Common Pitfalls

### Pitfall 1: Free Plan Cannot Restrict Tenant
**What goes wrong:** Developer configures custom Entra ID provider in `staticwebapp.config.json` but SWA is on Free plan. Custom auth silently fails or falls back to pre-configured provider that allows any Microsoft account.
**Why it happens:** Custom authentication (including tenant-specific Entra ID registration) requires SWA Standard plan ($9/mo). Free plan only supports pre-configured providers that accept any Microsoft account.
**How to avoid:** Deploy to SWA Standard plan from the start. Verify in Azure Portal under Hosting plan.
**Warning signs:** Users from unexpected tenants can sign in; `staticwebapp.config.json` auth section seems ignored.

### Pitfall 2: Redirect Loop on 401 Override
**What goes wrong:** A `401` response override redirects to `/.auth/login/aad`, which redirects back to the app, which triggers another 401, creating an infinite loop.
**Why it happens:** When ALL routes require authentication AND the 401 override redirects to login, the login callback itself may trigger the rule.
**How to avoid:** For this app, do NOT protect all routes. Only protect `/api/*` routes. The SPA itself is accessible to everyone. This sidesteps the problem entirely.
**Warning signs:** Browser shows "too many redirects" error.

### Pitfall 3: Expecting userDetails to Contain Display Name
**What goes wrong:** Developer uses `clientPrincipal.userDetails` to show the coach's name, but it contains their email address instead.
**Why it happens:** For Entra ID v2.0, `userDetails` contains the email/UPN. The display name is in the `claims` array under `typ: "name"`.
**How to avoid:** Extract display name from `claims.find(c => c.typ === 'name')?.val` with fallback to `userDetails`.
**Warning signs:** Header shows "coach@example.com" instead of "Coach Smith".

### Pitfall 4: Not Blocking Other Auth Providers
**What goes wrong:** Users can sign in with GitHub (pre-configured provider) which doesn't go through the Entra ID tenant restriction.
**Why it happens:** When you register a custom Entra ID provider, all pre-configured providers are disabled. However, if the custom registration is misconfigured, the pre-configured `aad` provider (which accepts any Microsoft account) might still be active.
**How to avoid:** Explicitly block GitHub provider in routes: `{ "route": "/.auth/login/github", "statusCode": 404 }`. Using custom registrations automatically disables pre-configured providers, but the explicit block is defense-in-depth.
**Warning signs:** Users can access `/.auth/login/github` and sign in.

### Pitfall 5: SWA CLI Auth Emulator Not Running
**What goes wrong:** During local development, `/.auth/me` returns 404 or network error because SWA CLI is not running.
**Why it happens:** Developer runs `npm run dev` (Vite only) instead of through SWA CLI, so `/.auth/*` endpoints don't exist.
**How to avoid:** Add npm script: `"dev:swa": "swa start http://localhost:5180 --run \"npm run dev\""` and use it for auth-related development. Also configure Vite proxy for `/.auth` as a fallback.
**Warning signs:** AuthContext always shows `user: null` even after attempting to sign in.

### Pitfall 6: Forgetting navigationFallback for SPA
**What goes wrong:** Direct navigation to SPA routes (e.g., bookmarked URL) returns 404.
**Why it happens:** SWA serves static files; client-side routes don't map to files.
**How to avoid:** Add `navigationFallback: { rewrite: "/index.html" }` to `staticwebapp.config.json`.
**Warning signs:** Page refresh on any tab returns a 404 error.

## Code Examples

Verified patterns from official sources:

### Fetching User Info from /.auth/me
```typescript
// Source: https://learn.microsoft.com/en-us/azure/static-web-apps/user-information
async function getUserInfo(): Promise<ClientPrincipal | null> {
  try {
    const response = await fetch('/.auth/me');
    const payload = await response.json();
    return payload.clientPrincipal;  // null if not signed in
  } catch {
    return null;
  }
}
```

### Sign-In / Sign-Out Links
```tsx
// Source: https://learn.microsoft.com/en-us/azure/static-web-apps/authentication-authorization
function AuthButtons() {
  const { user, isLoading } = useAuth();

  if (isLoading) return null;

  if (user) {
    return (
      <div>
        <span>{getDisplayName(user)}</span>
        <a href="/.auth/logout?post_logout_redirect_uri=/">Sign out</a>
      </div>
    );
  }

  return <a href="/.auth/login/aad">Sign in with Microsoft</a>;
}
```

### Complete staticwebapp.config.json for This App
```json
{
  "auth": {
    "identityProviders": {
      "azureActiveDirectory": {
        "registration": {
          "openIdIssuer": "https://login.microsoftonline.com/<TENANT_ID>/v2.0",
          "clientIdSettingName": "AZURE_CLIENT_ID",
          "clientSecretSettingName": "AZURE_CLIENT_SECRET"
        }
      }
    }
  },
  "routes": [
    {
      "route": "/.auth/login/github",
      "statusCode": 404
    },
    {
      "route": "/api/*",
      "allowedRoles": ["authenticated"]
    }
  ],
  "navigationFallback": {
    "rewrite": "/index.html",
    "exclude": ["/assets/*"]
  },
  "responseOverrides": {
    "401": {
      "redirect": "/.auth/login/aad?post_login_redirect_uri=.referrer",
      "statusCode": 302
    },
    "403": {
      "rewrite": "/index.html"
    }
  },
  "platform": {
    "apiRuntime": "node:20"
  }
}
```

### SWA CLI Local Dev Script (package.json)
```json
{
  "scripts": {
    "dev": "vite",
    "dev:swa": "swa start http://localhost:5180 --run \"npm run dev\"",
    "build": "tsc -b && vite build",
    "test": "vitest run"
  }
}
```

### Vite Config with Auth Proxy
```typescript
// Source: https://johnnyreilly.com/static-web-apps-cli-improve-performance-with-vite-server-proxy
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5180,
    proxy: {
      '/.auth': {
        target: 'http://127.0.0.1:4280',
        changeOrigin: true,
      },
      '/api': {
        target: 'http://127.0.0.1:7071',
        changeOrigin: true,
      },
    },
  },
});
```

### Decoding x-ms-client-principal in API Functions (Phase 6 Preview)
```typescript
// Source: https://learn.microsoft.com/en-us/azure/static-web-apps/user-information
// This is for Phase 6 but shown here to demonstrate how auth flows to the API
function getClientPrincipal(req: Request): ClientPrincipal | null {
  const header = req.headers.get('x-ms-client-principal');
  if (!header) return null;
  const decoded = atob(header);
  return JSON.parse(decoded);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| MSAL.js in browser | SWA EasyAuth (platform-level) | SWA GA 2021 | Zero client auth code; no token management |
| Azure Active Directory (AAD) | Microsoft Entra ID | July 2023 (rename) | Config key is still `azureActiveDirectory` and URL alias is `aad` |
| Pre-configured providers only | Custom provider registration (Standard plan) | SWA Standard plan launch | Tenant restriction possible; single-tenant sign-in |
| SWA CLI v1 | SWA CLI v2.0.2+ | Jan 2025 (breaking change) | Security improvements; must use latest version |
| routes.json | staticwebapp.config.json | Deprecated 2022+ | routes.json ignored when staticwebapp.config.json exists |
| Entra ID v1 endpoints | Entra ID v2.0 endpoints | Current standard | v2.0 returns user info by default; no need for explicit `userDetailsClaim` |

**Deprecated/outdated:**
- `routes.json`: Replaced by `staticwebapp.config.json`. Ignored if config.json exists.
- MSAL.js for SWA apps: Not needed when using EasyAuth. Only use if you need direct Graph API access with user tokens (out of scope for Phase 5).
- SWA CLI v1.x: Must use v2.0.2+ due to security breaking change (Jan 2025).

## Open Questions

1. **Entra ID App Registration: Does it need to exist before Phase 5 code is written?**
   - What we know: The `staticwebapp.config.json` references `AZURE_CLIENT_ID` and `AZURE_CLIENT_SECRET` which are application settings in the SWA resource. The tenant ID goes in the config file.
   - What's unclear: Whether to create the Entra ID app registration as part of this phase or defer to deployment.
   - Recommendation: Include Azure Portal setup steps as a plan task (documentation + manual steps), since the config file references these values. Code can be written/tested locally using SWA CLI mock auth without real Azure resources.

2. **403 Handling for Unassigned Users**
   - What we know: When "Assignment required" is Yes and an unassigned user tries to sign in, Entra ID blocks them before redirecting back. The user sees an Entra ID error page, not the app's page.
   - What's unclear: Whether SWA surfaces this as a 403 to the app or if Entra ID handles it entirely.
   - Recommendation: Add a 403 response override in `staticwebapp.config.json` that rewrites to `index.html` where the React app can show an appropriate message. Also test this behavior during integration testing. The Entra ID error page may be sufficient without custom handling in the app.

3. **Session Duration and Refresh**
   - What we know: SWA EasyAuth manages session cookies automatically.
   - What's unclear: Default session timeout duration; whether `/.auth/me` returns null after session expires or triggers a re-auth.
   - Recommendation: For Phase 5, accept default session behavior. The AuthContext should handle `user: null` gracefully (which it already does -- app works without sign-in). Long-running sessions can be addressed in a future phase if needed.

## Sources

### Primary (HIGH confidence)
- [Microsoft Learn: Authenticate and authorize Static Web Apps](https://learn.microsoft.com/en-us/azure/static-web-apps/authentication-authorization) - EasyAuth endpoints, provider routes, blocking providers (updated 2026-01-23)
- [Microsoft Learn: Configure Azure Static Web Apps](https://learn.microsoft.com/en-us/azure/static-web-apps/configuration) - staticwebapp.config.json full schema, routes, responseOverrides, navigationFallback (updated 2026-01-23)
- [Microsoft Learn: Custom authentication in Azure Static Web Apps](https://learn.microsoft.com/en-us/azure/static-web-apps/authentication-custom) - Custom Entra ID provider registration, Standard plan requirement, v1 vs v2 config (updated 2026-01-23)
- [Microsoft Learn: Accessing user information](https://learn.microsoft.com/en-us/azure/static-web-apps/user-information) - `/.auth/me` endpoint, `clientPrincipal` structure, x-ms-client-principal header (updated 2026-01-23)
- [Microsoft Learn: Restrict Entra app to set of users](https://learn.microsoft.com/en-us/entra/identity-platform/howto-restrict-your-app-to-a-set-of-users) - Assignment required flag, user/group assignment
- [Microsoft Learn: Azure Static Web Apps hosting plans](https://learn.microsoft.com/en-us/azure/static-web-apps/plans) - Free vs Standard feature comparison (updated 2026-01-23)
- [Microsoft Learn: Set up local development for Azure Static Web Apps](https://learn.microsoft.com/en-us/azure/static-web-apps/local-development) - SWA CLI auth emulator, local dev setup

### Secondary (MEDIUM confidence)
- [Anthony Chu: Restrict AD Login with SWA Custom Auth](https://anthonychu.ca/post/static-web-apps-restrict-aad-users/) - End-to-end walkthrough of custom Entra ID + assignment required
- [Johnny Reilly: SWA CLI improve performance with Vite server proxy](https://johnnyreilly.com/static-web-apps-cli-improve-performance-with-vite-server-proxy) - Vite proxy config for `/.auth` and `/api` endpoints
- [SWA CLI documentation: Local Authentication](https://azure.github.io/static-web-apps-cli/docs/cli/local-auth/) - Auth emulator mock login page details

### Tertiary (LOW confidence)
- None. All findings verified with official Microsoft documentation.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All based on official Microsoft Learn docs for SWA EasyAuth, verified Jan 2026
- Architecture: HIGH - React Context pattern is standard; SWA config schema verified against official docs
- Pitfalls: HIGH - Multiple sources confirm each pitfall (plan requirements, redirect loops, name claims)
- Local dev: MEDIUM - Vite proxy approach verified from community blog + SWA CLI docs; not in official Microsoft Learn

**Research date:** 2026-02-12
**Valid until:** 2026-03-12 (SWA auth is stable; unlikely to change significantly)
