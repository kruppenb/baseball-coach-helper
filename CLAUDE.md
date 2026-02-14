# CLAUDE.md

## Project overview

Baseball coach helper — a web app for managing youth baseball team rosters, batting orders, and game lineups. React frontend (Vite) deployed to Azure Static Web Apps, with an Azure Functions API backend using Cosmos DB.

## Key commands

- **Frontend dev:** `npm run dev` (from repo root)
- **API dev:** `cd api && npm start` (requires local Cosmos emulator or connection string in `api/local.settings.json`)
- **API type-check:** `cd api && npx tsc --noEmit`
- **Build all:** `npm run build` (root) and `cd api && npm run build`

## Architecture

- **Frontend:** React + TypeScript + Vite, deployed to Azure Static Web Apps
- **API:** Azure Functions v4 (Node 20, TypeScript), deployed as a standalone Functions app linked to SWA
- **Auth:** Entra ID via SWA built-in auth, `x-ms-client-principal` header parsed in `api/src/lib/auth.ts`
- **Data:** Cosmos DB (RBAC-only), accessed via `@azure/cosmos` + `DefaultAzureCredential` in `api/src/lib/cosmos.ts`

## Deployment

See [deployment.md](./deployment.md) for:
- CI/CD workflow (GitHub Actions with OIDC)
- Why we use a linked backend instead of SWA managed functions
- Azure resource inventory and app settings
- Local development setup

## Troubleshooting

See [troubleshooting_guide.md](./troubleshooting_guide.md) for:
- **First step for any API 500:** query Application Insights (not guessing)
- Known SWA managed functions limitations (no managed identity from code)
- Azure CLI quirks on Git Bash (MSYS_NO_PATHCONV)
- Infrastructure resource inventory

## API structure

- `api/src/functions/` — HTTP-triggered functions (roster, batting, game-config, game-history, lineup-state)
- `api/src/lib/cosmos.ts` — Cosmos DB client singleton (managed identity with connection-string fallback)
- `api/src/lib/auth.ts` — SWA client principal parsing
- `api/src/lib/validation.ts` — Zod v4 request body schemas
- `api/src/lib/logging.ts` — Structured error logging for App Insights
