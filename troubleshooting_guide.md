# Troubleshooting Guide

## First steps for any API error (500, unexpected behavior)

1. **Check Application Insights first.** Do not guess at root causes.
   ```bash
   az monitor app-insights query \
     --app coaching-app-v2-insights \
     --resource-group CoachingAppV2 \
     --analytics-query "traces | where timestamp > ago(1h) and message contains 'Failed' | project timestamp, message | order by timestamp desc | take 10"
   ```
   The `logError()` helper in `api/src/lib/logging.ts` writes structured error details (name, message, stack, Cosmos status code) to the `traces` table.

2. **Check exceptions table** for unhandled crashes:
   ```bash
   az monitor app-insights query \
     --app coaching-app-v2-insights \
     --resource-group CoachingAppV2 \
     --analytics-query "exceptions | where timestamp > ago(1h) | project timestamp, outerMessage, innermostMessage | order by timestamp desc | take 10"
   ```

3. **Check Functions app logs** directly:
   ```bash
   az functionapp log tail --name coaching-app-v2-api --resource-group CoachingAppV2
   ```

## Known issues and solutions

### SWA managed functions do NOT support managed identity from code

**Symptom:** `AggregateAuthenticationError: ChainedTokenCredential authentication failed` with `ManagedIdentityCredential: Cannot read properties of undefined (reading 'expires_on')`.

**Root cause:** Azure Static Web Apps' built-in managed API runs in a sandboxed environment that does not expose the managed identity token endpoint to function code. Even though the SWA resource has a system-assigned managed identity, `DefaultAzureCredential` (or `ManagedIdentityCredential`) cannot acquire tokens from within managed functions. The SWA managed identity is only usable for:
- Key Vault secret references in SWA app settings
- SWA infrastructure operations (deployment, etc.)

**Solution:** Use a standalone Azure Functions app linked as a SWA backend ("bring your own functions"). The standalone Functions app properly supports managed identity from code. This is the architecture we use — see the CI/CD workflow and infrastructure section below.

### Git Bash path mangling with Azure CLI

**Symptom:** Azure CLI commands with `/subscriptions/...` paths fail with garbled paths containing `C:/Program Files/Git/subscriptions/...`.

**Fix:** Prefix the command with `MSYS_NO_PATHCONV=1`:
```bash
MSYS_NO_PATHCONV=1 az cosmosdb sql role assignment create --scope "/subscriptions/..."
```

### Microsoft.Storage provider not registered

**Symptom:** `SubscriptionNotFound` error when creating storage accounts even though the subscription exists and is enabled.

**Fix:** Register the resource provider:
```bash
az provider register --namespace Microsoft.Storage --wait
```

## Architecture

### API hosting: linked backend (bring your own Functions)

The API runs on a standalone Azure Functions app (`coaching-app-v2-api`) linked to the SWA (`coaching-app-v2`). This was chosen over SWA managed functions because managed functions do not support `DefaultAzureCredential` / managed identity from code.

**How it works:**
- SWA proxies all `/api/*` requests to the linked Functions app at the same path
- SWA still enforces route-level auth rules from `staticwebapp.config.json` before proxying
- The `x-ms-client-principal` header is forwarded to the backend

**Key resources:**
| Resource | Name | Purpose |
|----------|------|---------|
| Static Web App | `coaching-app-v2` | Frontend hosting, auth, route rules |
| Functions App | `coaching-app-v2-api` | API backend with managed identity |
| Cosmos DB | `coaching-app-v2-cosmos` | Data store (RBAC-only, local auth disabled) |
| Storage Account | `coachingappv2func` | Required by Functions runtime |
| App Insights | `coaching-app-v2-insights` | Logging and diagnostics |

### Cosmos DB authentication

Cosmos DB uses RBAC-only (`disableLocalAuth: true`). The Functions app's system-assigned managed identity has the **Cosmos DB Built-in Data Contributor** role. The code in `api/src/lib/cosmos.ts` uses `DefaultAzureCredential` with a connection-string fallback for local development.
