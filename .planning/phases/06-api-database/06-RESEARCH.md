# Phase 6: API + Database - Research

**Researched:** 2026-02-12
**Domain:** Azure Functions (SWA Managed) + Azure Cosmos DB (Serverless) + SWA EasyAuth API Integration
**Confidence:** HIGH

## Summary

Phase 6 builds a server-side API layer using Azure Functions (managed by Azure Static Web Apps) that stores and retrieves coach data from Azure Cosmos DB. The API must authenticate requests via the `x-ms-client-principal` header injected by SWA's reverse proxy, and scope all data to the requesting coach's `userId` partition in Cosmos DB.

The project already has: (1) SWA EasyAuth configured with Entra ID, (2) a `staticwebapp.config.json` with `/api/*` routes restricted to `authenticated` role, (3) Vite proxy to port 7071 for local API development, and (4) complete data types for roster (`Player[]`), game config (`GameConfig`), lineup state (`LineupState`), batting order state (`BattingOrderState`), game history (`GameHistoryEntry[]`), and batting history (`BattingHistoryEntry[]`). The `api/` folder does not yet exist.

The Azure Functions v4 programming model for Node.js/TypeScript is the current standard. It uses a code-centric approach (`app.http()`) instead of `function.json` files. The `@azure/cosmos` SDK v4 provides the Cosmos DB client. SWA managed functions only support HTTP triggers, which is sufficient for this CRUD API. A critical deployment detail: SWA's Oryx builder runs `npm run build` in the `api/` folder and expects compiled JS at the root level, so the TypeScript `outDir` must be configured carefully.

**Primary recommendation:** Create an `api/` folder with its own `package.json`, `tsconfig.json`, and `host.json`. Use `@azure/functions` v4 programming model with TypeScript. Use `@azure/cosmos` v4 with connection string from `process.env`. Design 4-5 HTTP endpoints (GET/PUT per data type) with a shared auth middleware that parses `x-ms-client-principal` and extracts `userId`.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@azure/functions` | ^4.11.x | Azure Functions v4 programming model | Official SDK, required for v4 model registration via `app.http()` |
| `@azure/cosmos` | ^4.9.x | Cosmos DB NoSQL client | Official Azure SDK, only supported client for Cosmos DB NoSQL API |
| `typescript` | ~5.9.x | TypeScript compiler for API code | Match frontend project version for consistency |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `azure-functions-core-tools` | ^4.x | Local Functions runtime (globally or devDep) | Already globally available via `@azure/static-web-apps-cli` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Managed functions | Bring-your-own Functions | More features (Durable Functions, managed identity, Key Vault refs) but requires separate deployment and hosting plan -- overkill for simple CRUD |
| Connection string auth | DefaultAzureCredential (AAD) | AAD auth for Cosmos is more secure but requires managed identity which is NOT available in SWA managed functions |
| Cosmos DB serverless | Cosmos DB provisioned throughput | Serverless is pay-per-request, ideal for low-traffic hobby app -- provisioned has minimum cost |

**Installation (in api/ folder):**
```bash
npm init -y
npm install @azure/functions @azure/cosmos
npm install -D typescript @types/node
```

## Architecture Patterns

### Recommended Project Structure
```
api/
  src/
    functions/
      roster.ts          # GET/PUT /api/roster
      game-config.ts     # GET/PUT /api/game-config
      lineup-state.ts    # GET/PUT /api/lineup-state
      game-history.ts    # GET/PUT /api/game-history
      batting.ts         # GET/PUT /api/batting (order state + history)
    lib/
      auth.ts            # parseClientPrincipal() helper
      cosmos.ts          # singleton CosmosClient + container refs
      types.ts           # API-specific types (shared with frontend later)
  host.json
  local.settings.json    # .gitignored, holds COSMOSDB_CONNECTION_STRING
  package.json
  tsconfig.json
  .funcignore
```

### Pattern 1: SWA Auth Header Parsing
**What:** Extract userId from the base64-encoded `x-ms-client-principal` header that SWA injects into every request routed to `/api/*`.
**When to use:** Every API function must call this to identify the requesting coach.
**Example:**
```typescript
// Source: https://learn.microsoft.com/en-us/azure/static-web-apps/user-information
import { HttpRequest } from '@azure/functions';

interface ClientPrincipal {
  identityProvider: string;
  userId: string;
  userDetails: string;
  userRoles: string[];
}

export function parseClientPrincipal(request: HttpRequest): ClientPrincipal | null {
  const header = request.headers.get('x-ms-client-principal');
  if (!header) return null;

  const decoded = Buffer.from(header, 'base64').toString('utf-8');
  return JSON.parse(decoded) as ClientPrincipal;
}
```

### Pattern 2: Singleton Cosmos Client
**What:** Create one `CosmosClient` instance at module scope, reused across all function invocations within the same Functions host process.
**When to use:** Always. Creating a new client per invocation wastes connections and hits cold-start latency.
**Example:**
```typescript
// Source: https://learn.microsoft.com/en-us/azure/azure-functions/manage-connections
// Source: https://learn.microsoft.com/en-us/javascript/api/overview/azure/cosmos-readme
import { CosmosClient, Container } from '@azure/cosmos';

const connectionString = process.env.COSMOSDB_CONNECTION_STRING!;
const client = new CosmosClient(connectionString);
const database = client.database('baseball-coach');
const container = database.container('coach-data');

export { container };
```

### Pattern 3: Per-User Partition with Document Type Discrimination
**What:** Store all of a coach's data in a single Cosmos container partitioned by `userId`, with a `docType` field to distinguish roster, config, lineup, history, etc.
**When to use:** When a single user's total data is well under 20 GB (which it will be -- a coach has at most dozens of games).
**Example:**
```typescript
// Document shapes stored in Cosmos
interface CosmosDocument {
  id: string;          // unique document ID
  userId: string;      // partition key
  docType: string;     // discriminator: 'roster' | 'gameConfig' | 'lineupState' | 'battingOrderState' | 'gameHistory' | 'battingHistory'
  data: unknown;       // the actual payload
  updatedAt: string;   // ISO timestamp for sync
  _etag?: string;      // Cosmos-managed, used for conflict detection in Phase 7
}
```

### Pattern 4: Azure Functions v4 HTTP Handler (TypeScript)
**What:** Register HTTP-triggered functions using the v4 programming model's `app.http()` API.
**When to use:** Every function in this project.
**Example:**
```typescript
// Source: https://learn.microsoft.com/en-us/azure/azure-functions/functions-reference-node
import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { parseClientPrincipal } from '../lib/auth';
import { container } from '../lib/cosmos';

async function getRoster(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const principal = parseClientPrincipal(request);
  if (!principal) {
    return { status: 401, jsonBody: { error: 'Not authenticated' } };
  }

  const { resource } = await container.item(`roster-${principal.userId}`, principal.userId).read();
  if (!resource) {
    return { status: 200, jsonBody: { data: [] } };
  }

  return { status: 200, jsonBody: { data: resource.data, _etag: resource._etag } };
}

app.http('getRoster', {
  methods: ['GET'],
  authLevel: 'anonymous', // SWA handles auth at the platform level
  route: 'roster',
  handler: getRoster,
});
```

### Pattern 5: API Build Configuration for SWA Deployment
**What:** Configure TypeScript compilation so the compiled JS ends up where SWA's Oryx builder expects it.
**When to use:** Required for deployment to work correctly.
**Key insight:** SWA's Oryx builder looks for function definitions at the root of `api_location`. With TypeScript, `tsc` outputs to `dist/` by default. The `main` field in `package.json` must point to the compiled output, and the build must produce files at the right location.
**Example tsconfig.json:**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": false
  },
  "include": ["src"]
}
```
**Example package.json (key fields):**
```json
{
  "main": "dist/functions/*.js",
  "scripts": {
    "build": "tsc",
    "prestart": "npm run build",
    "start": "func start"
  },
  "dependencies": {
    "@azure/functions": "^4.11.0",
    "@azure/cosmos": "^4.9.0"
  },
  "devDependencies": {
    "typescript": "~5.9.3",
    "@types/node": "^22.0.0"
  }
}
```

### Anti-Patterns to Avoid
- **Creating CosmosClient per request:** Wastes connections, causes cold-start latency. Use a module-level singleton.
- **Relying on `authLevel: 'function'` or API keys:** SWA managed functions should use `authLevel: 'anonymous'` because SWA handles auth at the platform level via `staticwebapp.config.json` route rules. The `x-ms-client-principal` header is the auth mechanism.
- **Storing Cosmos credentials in client code:** The connection string must only exist in `local.settings.json` (local) and Azure Application Settings (deployed). Never in the frontend Vite bundle.
- **Putting all data in one document:** Game history entries should be separate documents to avoid the 2 MB Cosmos document size limit. Each game is its own document.
- **Using `function.json` files:** That is the v3 model. The v4 model uses `app.http()` registration and ignores any `function.json` files.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Auth header parsing | Custom JWT validation | `x-ms-client-principal` header from SWA | SWA already validates auth at the edge; the header is injected by the platform only for authenticated requests |
| Cosmos DB client | Raw HTTP calls to Cosmos REST API | `@azure/cosmos` SDK | Handles auth signing, retries, connection pooling, serialization |
| Route protection | Custom auth middleware checking tokens | `staticwebapp.config.json` `allowedRoles` | Platform-level enforcement before the request reaches your function |
| ID generation | Custom UUID function | `crypto.randomUUID()` (Node 19+) or deterministic IDs like `${docType}-${userId}` | For singleton docs (roster, config), a deterministic ID is simpler; for collections (game history), UUID works |
| API local proxy | Custom Express proxy | Vite `server.proxy` config (already done) + SWA CLI | Vite proxy to 7071 already configured; SWA CLI provides full local emulation |

**Key insight:** SWA's managed functions platform handles most infrastructure concerns (routing, CORS, auth enforcement, HTTPS). The function code only needs to parse the identity header and talk to Cosmos DB.

## Common Pitfalls

### Pitfall 1: TypeScript Output Location for SWA Deployment
**What goes wrong:** SWA's Oryx builder runs `npm install` and `npm run build` in the `api/` folder, but then looks for function entry points at the api root level. If `tsc` outputs to `dist/` and `package.json` `main` doesn't correctly point there, functions aren't discovered.
**Why it happens:** The v4 model discovers functions via the `main` field glob pattern in `package.json`. If this glob doesn't match the actual output, zero functions are registered.
**How to avoid:** Set `"main": "dist/functions/*.js"` in `package.json` and ensure `tsconfig.json` has `"outDir": "dist"` and `"rootDir": "src"`. Verify locally with `npm run build && func start` that functions are discovered.
**Warning signs:** `func start` says "No job functions found" or "0 functions loaded".

### Pitfall 2: Missing `x-ms-client-principal` in Local Development
**What goes wrong:** When developing locally without SWA CLI, the `x-ms-client-principal` header is not present on requests to `http://localhost:7071`.
**Why it happens:** Only the SWA CLI or the actual SWA platform injects this header. Direct calls to the Functions runtime skip this.
**How to avoid:** Use `swa start` for local development, which emulates the auth header injection. For unit testing, manually inject the header in test requests.
**Warning signs:** Auth parsing returns `null` for every request locally.

### Pitfall 3: Cosmos DB Emulator Does Not Support Serverless
**What goes wrong:** Developers try to use the Cosmos DB local emulator for testing but it only supports provisioned throughput, not serverless.
**Why it happens:** The local emulator is a different runtime than the serverless cloud service.
**How to avoid:** For local development, either (a) use the emulator with provisioned throughput (the SDK calls are identical), or (b) create an Azure Cosmos DB serverless account for dev/test (free tier available). The @azure/cosmos SDK works identically regardless of throughput mode.
**Warning signs:** Emulator errors about throughput configuration.

### Pitfall 4: Forgetting `authLevel: 'anonymous'` in Managed Functions
**What goes wrong:** Setting `authLevel: 'function'` requires a function key for invocation, but SWA managed functions don't expose function keys. Requests fail with 401.
**Why it happens:** Confusion between Functions-level auth and SWA platform-level auth.
**How to avoid:** Always use `authLevel: 'anonymous'` for SWA managed functions. Auth is enforced by SWA via `staticwebapp.config.json` route rules (already configured: `"/api/*"` requires `"authenticated"` role).
**Warning signs:** 401 errors even when authenticated; requests work in local `func start` but fail in deployed SWA.

### Pitfall 5: Document Size Limit (2 MB) for Game History
**What goes wrong:** Storing all game history as a single array in one document. As games accumulate, the document exceeds 2 MB.
**Why it happens:** The frontend currently stores `gameHistory` as a single localStorage key with an array of entries.
**How to avoid:** Store each `GameHistoryEntry` as its own Cosmos document with `docType: 'gameHistory'` and a unique `id` like `game-${gameId}`. Query by `userId` partition + `docType` filter to retrieve all games.
**Warning signs:** Cosmos DB returns 413 or write failures after many games.

### Pitfall 6: Not Including `host.json` and Extension Bundle
**What goes wrong:** The Functions runtime doesn't start properly or extensions aren't loaded.
**Why it happens:** Missing or misconfigured `host.json`.
**How to avoid:** Include a minimal `host.json` with the extension bundle configuration.
**Example:**
```json
{
  "version": "2.0",
  "extensionBundle": {
    "id": "Microsoft.Azure.Functions.ExtensionBundle",
    "version": "[4.*, 5.0.0)"
  }
}
```

## Code Examples

Verified patterns from official sources:

### Complete Function: PUT Roster (Upsert)
```typescript
// Source: https://learn.microsoft.com/en-us/azure/azure-functions/functions-reference-node
// Source: https://learn.microsoft.com/en-us/javascript/api/overview/azure/cosmos-readme
import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { parseClientPrincipal } from '../lib/auth';
import { container } from '../lib/cosmos';

async function putRoster(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const principal = parseClientPrincipal(request);
  if (!principal) {
    return { status: 401, jsonBody: { error: 'Not authenticated' } };
  }

  const body = await request.json() as { data: unknown };
  const docId = `roster-${principal.userId}`;

  const doc = {
    id: docId,
    userId: principal.userId,
    docType: 'roster',
    data: body.data,
    updatedAt: new Date().toISOString(),
  };

  const { resource } = await container.items.upsert(doc);
  return {
    status: 200,
    jsonBody: { data: resource?.data, _etag: resource?._etag },
  };
}

app.http('putRoster', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'roster',
  handler: putRoster,
});
```

### Complete Function: GET Game History (Multiple Documents)
```typescript
import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { parseClientPrincipal } from '../lib/auth';
import { container } from '../lib/cosmos';

async function getGameHistory(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const principal = parseClientPrincipal(request);
  if (!principal) {
    return { status: 401, jsonBody: { error: 'Not authenticated' } };
  }

  const querySpec = {
    query: 'SELECT * FROM c WHERE c.userId = @userId AND c.docType = @docType',
    parameters: [
      { name: '@userId', value: principal.userId },
      { name: '@docType', value: 'gameHistory' },
    ],
  };

  const { resources } = await container.items.query(querySpec).fetchAll();
  return {
    status: 200,
    jsonBody: { data: resources.map(r => r.data) },
  };
}

app.http('getGameHistory', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'game-history',
  handler: getGameHistory,
});
```

### PUT Game History (Single Entry)
```typescript
import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { parseClientPrincipal } from '../lib/auth';
import { container } from '../lib/cosmos';

async function putGameHistoryEntry(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const principal = parseClientPrincipal(request);
  if (!principal) {
    return { status: 401, jsonBody: { error: 'Not authenticated' } };
  }

  const body = await request.json() as { data: { id: string; [key: string]: unknown } };
  const gameId = body.data.id; // use the frontend-generated game UUID

  const doc = {
    id: `game-${principal.userId}-${gameId}`,
    userId: principal.userId,
    docType: 'gameHistory',
    data: body.data,
    updatedAt: new Date().toISOString(),
  };

  const { resource } = await container.items.upsert(doc);
  return {
    status: 200,
    jsonBody: { data: resource?.data, _etag: resource?._etag },
  };
}

app.http('putGameHistoryEntry', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'game-history',
  handler: putGameHistoryEntry,
});
```

### local.settings.json Template
```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "COSMOSDB_CONNECTION_STRING": "AccountEndpoint=https://localhost:8081/;AccountKey=<emulator-key>"
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Functions v3 model (`function.json`) | Functions v4 model (`app.http()`) | 2023 (GA) | No more function.json files; code-centric registration |
| `@azure/cosmos` v3 | `@azure/cosmos` v4 | 2023 | Improved bulk operations, diagnostics, TypeScript support |
| `module.exports` (CommonJS) | ES modules + TypeScript supported | v4 model | Can use `import/export` syntax natively |
| `context.res = { body }` (v3) | `return { jsonBody }` (v4) | v4 model | Cleaner return-based response pattern |
| `authLevel: 'function'` with keys | `authLevel: 'anonymous'` + SWA platform auth | SWA managed functions | Platform handles auth; function keys not available in managed functions |

**Deprecated/outdated:**
- `function.json` based function definitions (v3 model): Replaced by v4 code-centric model
- `@azure/cosmos` v3.x: Superseded by v4 with breaking changes
- `context.done()` callback pattern: Replaced by async/await with return values

## Open Questions

1. **Cosmos DB Database and Container Provisioning**
   - What we know: The API code references `client.database('baseball-coach').container('coach-data')` but these must exist first
   - What's unclear: Whether to create them via Azure Portal/CLI manually, via an infrastructure-as-code template, or via SDK at app startup
   - Recommendation: For this phase, document the manual creation steps (Azure Portal). Infrastructure-as-code (Bicep/ARM) can be added in Phase 9 (deployment). The SDK can check-and-create at startup but this adds cold-start latency.

2. **Batting Order State vs Batting History Separation**
   - What we know: Frontend stores `battingOrderState` (current order, isConfirmed) separately from `battingHistory` (array of past orders). Both use localStorage.
   - What's unclear: Whether to merge these into a single API endpoint or keep them separate
   - Recommendation: Keep them as separate document types in Cosmos (`battingOrderState` as singleton, `battingHistory` entries as per-game documents, similar to `gameHistory`). Use a single `/api/batting` endpoint with GET returning both, and PUT accepting either type via a `docType` discriminator.

3. **Exact SWA Deployment Build Configuration**
   - What we know: SWA Oryx builder runs `npm run build` in `api/` folder and discovers functions via `package.json` `main` field
   - What's unclear: Whether `"main": "dist/functions/*.js"` works correctly with SWA's function discovery, or if the compiled JS needs to be at the api root
   - Recommendation: Test locally with `func start` first. If SWA deployment fails, add `api_build_command: "npm run build"` to the GitHub Actions workflow. Worst case, post-build script can copy dist contents to root.

## Sources

### Primary (HIGH confidence)
- [Azure Static Web Apps - API with Azure Functions](https://learn.microsoft.com/en-us/azure/static-web-apps/apis-functions) - Managed functions constraints, features, limitations
- [Add API to SWA](https://learn.microsoft.com/en-us/azure/static-web-apps/add-api) - Project structure, v4 model example, local development
- [SWA User Information / x-ms-client-principal](https://learn.microsoft.com/en-us/azure/static-web-apps/user-information) - Auth header format, parsing code, available fields
- [Node.js Developer Reference for Azure Functions](https://learn.microsoft.com/en-us/azure/azure-functions/functions-reference-node) - v4 programming model, TypeScript setup, folder structure, HTTP handlers
- [Azure Cosmos DB Quickstart - Node.js](https://learn.microsoft.com/en-us/azure/cosmos-db/nosql/quickstart-nodejs) - SDK usage, CRUD operations, query patterns
- [SWA Build Configuration](https://learn.microsoft.com/en-us/azure/static-web-apps/build-configuration) - api_location, api_build_command, Oryx build process
- [Azure Cosmos DB client library for JavaScript](https://learn.microsoft.com/en-us/javascript/api/overview/azure/cosmos-readme) - SDK v4 API reference

### Secondary (MEDIUM confidence)
- [Migrating to v4 Azure Functions Node.js with TypeScript](https://johnnyreilly.com/migrating-azure-functions-node-js-v4-typescript) - package.json main field, TypeScript compilation setup (verified against official docs)
- [Cosmos DB Partition Key Best Practices](https://learn.microsoft.com/en-us/azure/cosmos-db/partitioning-overview) - 20 GB partition limit, per-user partition pattern
- [Cosmos DB Emulator](https://learn.microsoft.com/en-us/azure/cosmos-db/emulator) - Local emulator does NOT support serverless mode

### Tertiary (LOW confidence)
- `@azure/functions` npm: v4.11.2 latest (verified via WebSearch, npm page returned 403)
- `@azure/cosmos` npm: v4.9.0 latest (verified via WebSearch, npm page returned 403)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official Microsoft docs confirm all library choices, versions verified via npm search
- Architecture: HIGH - Patterns directly from official SWA + Functions + Cosmos DB documentation
- Pitfalls: HIGH - Multiple sources confirm the TypeScript build issue, auth header parsing, and document size limits
- API design: MEDIUM - Document-per-type-per-user pattern is standard for Cosmos DB but specific endpoint design is project-specific

**Research date:** 2026-02-12
**Valid until:** 2026-03-14 (30 days - stable Azure services, low churn)
