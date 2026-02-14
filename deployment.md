# Deployment

## How it deploys

Push to `main` triggers the GitHub Actions workflow (`.github/workflows/azure-static-web-apps-lemon-hill-0d4d7521e.yml`). The workflow deploys two things independently:

1. **API** — built (`npm ci && npm run build` in `api/`) then deployed to the standalone Azure Functions app via `Azure/functions-action@v2`
2. **Frontend** — built and deployed to Azure Static Web Apps via `Azure/static-web-apps-deploy@v1` (frontend only, no `api_location`)

PR branches get a SWA preview environment for the frontend. The API always deploys to the single Functions app (no staging slots on consumption plan).

## CI authentication

The workflow uses **GitHub OIDC** federated credentials — no stored secrets for Azure auth.

1. `azure/login@v2` authenticates with OIDC using the app registration `119945b4-76dc-4cb3-9dc4-d95837965082`
2. The SWA deployment token is fetched dynamically via `az staticwebapp secrets list`
3. A GitHub ID token is obtained for the SWA provider

The OIDC app registration needs **Contributor** on the `CoachingAppV2` resource group to deploy both the Functions app and fetch the SWA token.

## Why a linked backend (not SWA managed functions)

SWA managed functions run in a sandboxed environment that **does not support `DefaultAzureCredential` / managed identity from code**. Since Cosmos DB is configured RBAC-only (`disableLocalAuth: true`), we need real managed identity support. A standalone Functions app linked to the SWA provides this.

The SWA proxies `/api/*` to the linked Functions app. Auth rules in `staticwebapp.config.json` (requiring the `authenticated` role for `/api/*`) are still enforced at the SWA edge before proxying.

## Azure resources

All resources live in resource group **CoachingAppV2** (West US 2).

| Resource | Type | Name | Purpose |
|----------|------|------|---------|
| Static Web App | `Microsoft.Web/staticSites` | `coaching-app-v2` | Frontend hosting, Entra ID auth, route rules |
| Functions App | `Microsoft.Web/sites` | `coaching-app-v2-api` | API backend (linked to SWA) |
| Cosmos DB | `Microsoft.DocumentDB/databaseAccounts` | `coaching-app-v2-cosmos` | Data store, RBAC-only |
| Storage Account | `Microsoft.Storage/storageAccounts` | `coachingappv2func` | Required by Functions runtime |
| App Insights | `Microsoft.Insights/components` | `coaching-app-v2-insights` | Logging/diagnostics |

## Functions app configuration

App settings on `coaching-app-v2-api`:

| Setting | Value |
|---------|-------|
| `COSMOSDB_ENDPOINT` | `https://coaching-app-v2-cosmos.documents.azure.com:443/` |
| `APPLICATIONINSIGHTS_CONNECTION_STRING` | Points to `coaching-app-v2-insights` |
| `FUNCTIONS_WORKER_RUNTIME` | `node` |
| `FUNCTIONS_EXTENSION_VERSION` | `~4` |

Cosmos DB access uses the Functions app's **system-assigned managed identity** with the **Cosmos DB Built-in Data Contributor** role. No connection strings or keys in production.

## SWA configuration

App settings on `coaching-app-v2` (only auth-related settings remain):

| Setting | Purpose |
|---------|---------|
| `AAD_CLIENT_ID` | Entra ID app registration for user login |
| `AAD_CLIENT_SECRET` | Entra ID client secret |

Route rules and auth config are in `staticwebapp.config.json`:
- `/api/*` requires the `authenticated` role
- `/.auth/login/github` is blocked (Entra ID only)
- 401 responses redirect to Entra ID login

## Local development

1. Start the Cosmos DB emulator (or set a real connection string)
2. `api/local.settings.json` has the emulator connection string by default
3. Run `cd api && npm start` for the API
4. Run `npm run dev` for the frontend (Vite dev server proxies `/api` to the local Functions host)
