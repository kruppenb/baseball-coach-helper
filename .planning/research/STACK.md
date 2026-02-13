# Technology Stack

**Project:** Baseball Coach Helper -- Azure Cloud Sync Milestone
**Researched:** 2026-02-12
**Confidence:** HIGH (core auth/hosting), MEDIUM (sync patterns, MSAL v5 stability)

## Context

This document covers ONLY the stack additions needed for the Azure cloud sync milestone. The existing validated stack (Vite 7.3.1, React 19.2.0, TypeScript 5.9.3, Vitest 4.0.18, CSS Modules, ESLint 9.39.1) is not re-evaluated here.

The milestone adds: Azure authentication (Microsoft Entra ID), cloud storage (Cosmos DB), offline-first sync with localStorage fallback, and Azure Static Web Apps deployment.

---

## Critical Architecture Decision: SWA EasyAuth, NOT MSAL.js

**Use Azure Static Web Apps built-in authentication (EasyAuth) instead of @azure/msal-react.**

| Factor | SWA EasyAuth | MSAL.js (@azure/msal-react) |
|--------|-------------|----------------------------|
| npm packages needed | 0 | 2 (@azure/msal-browser, @azure/msal-react) |
| Bundle size impact | 0 KB | ~45 KB gzipped |
| Configuration | staticwebapp.config.json | App registration + React provider + token management |
| Tenant restriction | Built-in via openIdIssuer URL | Manual tenant validation |
| Invite-only users | Built-in Role Management in Azure Portal | Must implement separately |
| Token management | Automatic (server-side cookies) | Manual (token cache, refresh, expiry) |
| API auth | Automatic (/.auth headers forwarded to Functions) | Manual Bearer token attachment |
| React 19 compatibility | N/A (no client library) | v5.0.4 just released, v4-to-v5 migration guide not yet published, earlier v5 releases had issues (GitHub #8254) |
| Offline support | Cookie persists, graceful degradation | Requires careful cache configuration |

**Why EasyAuth wins for this project:**
1. This app calls its own Azure Functions API, not external APIs like Microsoft Graph. EasyAuth passes auth context automatically to Functions via headers -- no client-side token management needed.
2. Invite-only access for coaches is built into SWA Role Management (Azure Portal). With MSAL.js you would need to build this yourself.
3. Zero client-side auth code means zero auth-related bugs in the React layer.
4. MSAL.js v5 was released Feb 10, 2026 with a rocky launch (GitHub issue #8254 reported it was "done haphazardly" with missing migration guides). The v3/v4 branch supports React 19, but choosing between v3 and v5 adds unnecessary decision complexity.

**When you WOULD need MSAL.js instead:** If the app needed to call Microsoft Graph directly from the browser, or needed fine-grained token scopes for external APIs. This app does not.

---

## Recommended Stack Additions

### Authentication (Client-Side)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| SWA EasyAuth | N/A (platform feature) | Microsoft Entra ID authentication | Zero npm packages. Configure in staticwebapp.config.json. Automatic cookie-based auth with tenant restriction, role management, and API header forwarding. |

No npm packages needed. Auth is configured declaratively:

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
    { "route": "/.auth/login/github", "statusCode": 404 },
    { "route": "/api/*", "allowedRoles": ["authenticated"] }
  ],
  "responseOverrides": {
    "401": {
      "redirect": "/.auth/login/aad?post_login_redirect_uri=.referrer",
      "statusCode": 302
    }
  }
}
```

User info is available client-side via `fetch('/.auth/me')` -- no library needed.

### API Backend (Azure Functions -- Managed)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| @azure/functions | ^4.6.x | Azure Functions v4 Node.js programming model | TypeScript-first, code-centric function definitions, HTTP trigger handlers. Managed functions in SWA require zero separate deployment. |
| @azure/cosmos | ^4.9.0 | Cosmos DB NoSQL SDK | Server-side only. Direct SDK access from Functions (not bindings, since managed functions only support HTTP triggers). TypeScript types included. |

**Why managed functions (not "bring your own"):**
- Managed functions deploy automatically with the SWA -- single deployment pipeline.
- HTTP triggers are the only trigger type needed (React app calls API endpoints).
- Managed functions on the free plan are sufficient for a small coaching app.
- No need for Durable Functions, Cosmos DB triggers, or managed identity (moderate pitfalls in PITFALLS.md explain the tradeoffs).

**Why @azure/cosmos SDK directly (not Cosmos DB bindings):**
- Managed functions only support HTTP triggers -- Cosmos DB input/output bindings are NOT available.
- Direct SDK gives full control over queries, error handling, and connection reuse.
- The SDK is TypeScript-native with full type definitions.

### Offline / PWA Support

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| vite-plugin-pwa | ^1.2.0 | Service worker generation via Workbox | Zero-config PWA support for Vite. Handles precaching of app shell, offline fallback, and update notifications. v1.0.1+ supports Vite 7. |

**Why vite-plugin-pwa (not manual service worker):**
- Integrates directly with Vite build pipeline.
- Uses Workbox under the hood (Google's production-grade service worker toolkit).
- Provides `useRegisterSW` React hook from `virtual:pwa-register/react` for update notifications.
- Handles cache versioning and cleanup automatically.
- Supports both `generateSW` (zero-config) and `injectManifest` (custom logic) strategies.

**Offline sync strategy requires NO additional library.** The existing `useLocalStorage` hook remains the local data layer. A custom sync service (plain TypeScript, no library) handles:
1. Write to localStorage immediately (optimistic, existing behavior preserved)
2. Queue cloud sync operations when online
3. Replay queued operations when connectivity returns

This is simpler and more appropriate than heavy offline-sync libraries (RxDB, PouchDB, WatermelonDB) because:
- Data volume is tiny (roster of 12-15 kids, a few game configs)
- Conflict resolution is simple (last-write-wins per user is fine for single-coach-per-team)
- The existing localStorage abstraction already works

### Deployment / DevOps

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| @azure/static-web-apps-cli | ^2.0.7 | Local development emulator | Emulates SWA auth, API routing, and static file serving locally. Essential for testing auth flows without deploying. Dev dependency only. |
| GitHub Actions (SWA deploy) | N/A | CI/CD | SWA generates the GitHub Actions workflow automatically when you connect a repo. Zero manual config. |

### Database

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Azure Cosmos DB for NoSQL | N/A (cloud service) | Cloud document storage | JSON document store that maps directly to the existing localStorage JSON structure. Serverless pricing = pay per request with no minimum. Free tier available with provisioned throughput (1000 RU/s, 25 GB lifetime free). |

**Why Cosmos DB for NoSQL (not Table Storage, not SQL Database):**
- Data is already JSON (rosters, game configs, lineup history) -- zero schema translation.
- Serverless mode means zero cost when coaches are not actively using the app.
- Partition key = userId, which gives automatic data isolation per coach.
- Global distribution not needed now but available if app grows.

**Pricing recommendation:** Use **serverless** mode for development and small-scale use. No free tier for serverless, but costs will be pennies/month for this usage pattern. Switch to provisioned throughput with free tier (1000 RU/s lifetime free) if usage becomes predictable.

---

## Complete Package Changes

### New Dependencies (production)

```bash
# API packages (used in /api folder, not in React app)
# These go in a separate package.json inside the /api directory
npm install @azure/functions@^4.6.0 @azure/cosmos@^4.9.0
```

### New Dev Dependencies (root project)

```bash
npm install -D vite-plugin-pwa@^1.2.0 @azure/static-web-apps-cli@^2.0.7
```

### NOT Added to React App Dependencies

The React app gets ZERO new production dependencies for auth. This is intentional:
- No @azure/msal-browser (EasyAuth handles auth server-side)
- No @azure/msal-react (no client auth library needed)
- No offline-sync library (custom TypeScript sync service)
- No @azure/cosmos in the client (SDK runs server-side in Functions only)

---

## Project Structure Changes

```
baseball-coach-helper/
  src/                          # Existing React app (unchanged)
    hooks/
      useLocalStorage.ts        # KEEP -- becomes local cache layer
      useSync.ts                # NEW -- offline sync orchestration
    services/
      sync-service.ts           # NEW -- queue + replay cloud operations
      api-client.ts             # NEW -- typed fetch wrapper for /api/*
  api/                          # NEW -- Azure Functions directory
    package.json                # Separate package.json for Functions
    tsconfig.json               # Separate TS config targeting Node.js
    host.json                   # Azure Functions host configuration
    src/
      functions/
        sync-roster.ts          # HTTP function: GET/PUT roster data
        sync-games.ts           # HTTP function: GET/PUT game data
        sync-history.ts         # HTTP function: GET/PUT game history
      shared/
        cosmos-client.ts        # Shared Cosmos DB client (reused across functions)
        auth-helpers.ts         # Extract user info from SWA auth headers
  staticwebapp.config.json      # NEW -- SWA routing, auth, API config
  swa-cli.config.json           # NEW -- Local dev configuration
```

### API Directory package.json

```json
{
  "name": "baseball-coach-helper-api",
  "version": "1.0.0",
  "type": "module",
  "main": "dist/src/functions/*.js",
  "scripts": {
    "build": "tsc",
    "watch": "tsc -w"
  },
  "dependencies": {
    "@azure/functions": "^4.6.0",
    "@azure/cosmos": "^4.9.0"
  },
  "devDependencies": {
    "typescript": "~5.9.3"
  }
}
```

### API Directory tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "dist",
    "rootDir": ".",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "lib": ["ES2022"]
  },
  "include": ["src/**/*.ts"]
}
```

---

## Vite Config Changes

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',        // Prompt user before updating (not auto)
      includeAssets: ['favicon.ico'], // Static assets to precache
      manifest: {
        name: 'Baseball Coach Helper',
        short_name: 'CoachHelper',
        description: 'Little League lineup builder',
        theme_color: '#1a5276',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.azurestaticapps\.net\/api\/.*/i,
            handler: 'NetworkFirst',        // Try network, fall back to cache
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 86400 }
            }
          }
        ]
      }
    })
  ],
  server: {
    port: 5180,
  },
})
```

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Auth | SWA EasyAuth | @azure/msal-react v5.0.4 + @azure/msal-browser v5.2.0 | Adds 2 packages, ~45KB bundle, complex token management. MSAL v5 just launched (Feb 10, 2026) with rocky release (GitHub #8254). EasyAuth gives same result with zero client code for this use case. |
| Auth | SWA EasyAuth | @azure/msal-react v3.0.26 + @azure/msal-browser v4.28.2 | Same complexity as v5 but on older branch. Only justified if calling external APIs directly from browser. |
| Database | Cosmos DB for NoSQL (serverless) | Azure Table Storage | Cheaper but no JSON document model, limited querying, no partition-level auth isolation. Would require schema translation from existing JSON. |
| Database | Cosmos DB for NoSQL (serverless) | Azure SQL Database | Relational overhead for what is inherently document data. Requires ORM or query builder. More expensive at low scale. |
| Database | Cosmos DB for NoSQL (serverless) | Cosmos DB for NoSQL (provisioned + free tier) | Free tier gives 1000 RU/s lifetime free, but provisioned throughput means paying even when idle if you exceed free tier. Serverless is better fit for sporadic usage patterns (games on weekends). |
| API | SWA Managed Functions | SWA Bring Your Own Functions | Separate deployment pipeline, requires Standard plan, more operational complexity. Managed functions are sufficient since only HTTP triggers needed. |
| API | SWA Managed Functions | Standalone Azure Functions app | Separate deployment, separate CORS config, separate auth setup. SWA managed functions give all of this for free. |
| Offline sync | Custom sync service | RxDB | 150KB+ library for a sync problem that involves <50KB of data. Massive overkill. |
| Offline sync | Custom sync service | PouchDB + CouchDB | Wrong database pairing (we use Cosmos DB, not CouchDB). Would require running CouchDB server separately. |
| Offline sync | Custom sync service | TanStack Query (offline mutations) | Good library but adds dependency for what can be 100 lines of custom TypeScript. Consider if sync logic grows complex. |
| PWA | vite-plugin-pwa | Manual service worker | Error-prone cache management, no Workbox integration, manual versioning. Plugin handles all of this. |
| Deployment | SWA (GitHub Actions) | Azure App Service | SWA is purpose-built for SPAs with APIs. App Service is for server-rendered apps. SWA has a free tier, automatic HTTPS, global CDN. |
| Deployment | SWA (GitHub Actions) | Vercel / Netlify | Not Azure-native. Would require separate Azure Functions deployment, separate auth setup, no integrated EasyAuth. |

---

## SWA Configuration Reference

### staticwebapp.config.json (complete)

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
    "exclude": ["/api/*", "/.auth/*", "/assets/*"]
  },
  "responseOverrides": {
    "401": {
      "redirect": "/.auth/login/aad?post_login_redirect_uri=.referrer",
      "statusCode": 302
    }
  },
  "platform": {
    "apiRuntime": "node:20"
  },
  "mimeTypes": {
    ".js": "application/javascript"
  }
}
```

### swa-cli.config.json (local development)

```json
{
  "configurations": {
    "baseball-coach-helper": {
      "appLocation": ".",
      "apiLocation": "api",
      "outputLocation": "dist",
      "appBuildCommand": "npm run build",
      "apiBuildCommand": "cd api && npm run build",
      "run": "npm run dev",
      "appDevserverUrl": "http://localhost:5180"
    }
  }
}
```

---

## Version Compatibility Matrix

| Package | Compatible With | Verified | Notes |
|---------|----------------|----------|-------|
| vite-plugin-pwa 1.2.0 | Vite 7.x | HIGH | v1.0.1 added Vite 7 support explicitly (GitHub releases) |
| @azure/functions 4.6.x | Node.js 20.x | HIGH | v4 model is GA, designed for Node 18+ |
| @azure/cosmos 4.9.0 | Node.js 18+ | HIGH | TypeScript native, full async/await |
| SWA Managed Functions | Node.js 20, 22 | HIGH | apiRuntime "node:20" and "node:22" both supported, no end-of-support date listed |
| SWA EasyAuth + Entra ID v2 | Custom provider config | HIGH | Verified in official docs (updated Jan 2026) |
| @azure/static-web-apps-cli 2.0.7 | Node.js 18+ | MEDIUM | Last published 5 months ago, stable |

---

## What NOT to Add

| Package | Why Avoid |
|---------|-----------|
| @azure/msal-browser | Not needed. SWA EasyAuth handles auth server-side. Adding MSAL would create two competing auth systems. |
| @azure/msal-react | Not needed. See above. |
| @azure/identity | For server-to-server auth with managed identity. Managed functions do not support managed identity. Use connection string for Cosmos DB. |
| @azure/cosmos (in client) | NEVER put Cosmos DB SDK in the browser. Keys would be exposed. Always access via Functions API. |
| rxdb / pouchdb / watermelondb | Offline-sync libraries designed for large datasets with complex conflict resolution. This app has <50KB of data per user. Custom sync is simpler. |
| @tanstack/react-query | Good library but premature. The API surface is 3-4 simple endpoints. Add later if sync logic grows complex. |
| workbox-* (direct) | vite-plugin-pwa wraps Workbox. Do not install Workbox packages separately. |
| express / koa / hono | No server framework needed. Azure Functions v4 model handles HTTP routing natively. |

---

## Confidence Assessment

| Technology | Confidence | Reason |
|------------|------------|--------|
| SWA EasyAuth with Entra ID | HIGH | Official Microsoft Learn docs verified Jan 2026. Well-documented custom provider config. Built-in role management matches invite-only requirement. |
| @azure/cosmos 4.9.0 | HIGH | GA SDK, verified on npm, TypeScript native, v4 announced as stable. |
| @azure/functions 4.6.x | HIGH | v4 programming model is GA, Node.js 20 supported in SWA managed functions (official docs). |
| SWA Managed Functions | HIGH | Official docs confirm HTTP-only trigger limitation and Node.js 20/22 support. Updated Jan 2026. |
| vite-plugin-pwa 1.2.0 | HIGH | GitHub releases confirm Vite 7 support since v1.0.1. Active maintenance. |
| @azure/static-web-apps-cli 2.0.7 | MEDIUM | Last npm publish was 5 months ago. Functional but release cadence is slow. |
| Custom offline sync (no library) | MEDIUM | Pattern is well-established but implementation is custom. Needs careful testing. Verified that data volume is small enough (<50KB per user). |
| Cosmos DB serverless pricing | MEDIUM | Pricing page confirms no minimum cost, but exact RU costs for this workload are estimated, not measured. |
| MSAL v5 stability (if ever needed) | LOW | v5.0.4 released Feb 10, 2026. GitHub #8254 reported half-baked release. Migration guide not found. Avoid unless specifically needed. |

---

## Sources

### Official Documentation (HIGH confidence)
- [SWA Authentication and Authorization](https://learn.microsoft.com/en-us/azure/static-web-apps/authentication-authorization) -- Built-in auth, EasyAuth, role management
- [SWA Custom Authentication (Entra ID)](https://learn.microsoft.com/en-us/azure/static-web-apps/authentication-custom) -- Custom provider configuration with azureActiveDirectory
- [SWA API Support with Azure Functions](https://learn.microsoft.com/en-us/azure/static-web-apps/apis-functions) -- Managed vs BYO functions, HTTP-only limitation
- [SWA Supported Languages and Runtimes](https://learn.microsoft.com/en-us/azure/static-web-apps/languages-runtimes) -- Node.js 20/22 for managed functions, apiRuntime config
- [Azure Cosmos DB Lifetime Free Tier](https://learn.microsoft.com/en-us/azure/cosmos-db/free-tier) -- 1000 RU/s, 25 GB, provisioned only
- [Azure Cosmos DB Serverless Pricing](https://azure.microsoft.com/en-us/pricing/details/cosmos-db/serverless/) -- Pay per request, no minimum
- [Azure Cosmos DB JS SDK](https://learn.microsoft.com/en-us/javascript/api/overview/azure/cosmos-readme) -- v4 GA, TypeScript native
- [Azure Cosmos DB Security](https://learn.microsoft.com/en-us/azure/cosmos-db/security) -- Middle-tier architecture recommended, never expose keys to browser

### npm / GitHub (HIGH confidence)
- [@azure/msal-react npm](https://www.npmjs.com/package/@azure/msal-react) -- v5.0.4 (Feb 10, 2026), v3.0.26 (Feb 10, 2026)
- [@azure/msal-browser npm](https://www.npmjs.com/package/@azure/msal-browser) -- v5.2.0 (Feb 11, 2026), v4.28.2 (Feb 10, 2026)
- [@azure/cosmos npm](https://www.npmjs.com/package/@azure/cosmos) -- v4.9.0 (Dec 2025)
- [@azure/functions npm](https://www.npmjs.com/package/@azure/functions) -- v4.6.x
- [vite-plugin-pwa GitHub releases](https://github.com/vite-pwa/vite-plugin-pwa/releases) -- v1.2.0 (Nov 2024), Vite 7 support confirmed
- [@azure/static-web-apps-cli npm](https://www.npmjs.com/package/@azure/static-web-apps-cli) -- v2.0.7 (Sep 2025)
- [MSAL v5 release issue #8254](https://github.com/AzureAD/microsoft-authentication-library-for-js/issues/8254) -- Half-released v5 concerns

### Architecture Decisions (MEDIUM confidence)
- [SWA EasyAuth vs MSAL.js Q&A](https://learn.microsoft.com/en-us/answers/questions/1328883/what-service-to-choose-to-authorize-resource-acces) -- When to use which
- [SWA /.auth/me access token limitation #794](https://github.com/Azure/static-web-apps/issues/794) -- Access token not exposed (confirms EasyAuth is for own-API-only pattern)
- [Offline-first frontend apps 2025](https://blog.logrocket.com/offline-first-frontend-apps-2025-indexeddb-sqlite/) -- localStorage vs IndexedDB for offline
- [vite-plugin-pwa documentation](https://vite-pwa-org.netlify.app/guide/) -- React integration, workbox config

---
*Stack research for: Baseball Coach Helper -- Azure Cloud Sync Milestone*
*Researched: 2026-02-12*
*Overall confidence: HIGH -- Critical decision (EasyAuth over MSAL.js) well-supported by official docs. All package versions verified. Architecture aligned with Microsoft's recommended patterns.*
