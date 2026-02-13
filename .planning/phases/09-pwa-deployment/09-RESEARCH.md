# Phase 9: PWA + Deployment - Research

**Researched:** 2026-02-13
**Domain:** Progressive Web App (service worker, manifest, offline caching) + Azure Static Web Apps CI/CD deployment
**Confidence:** HIGH

## Summary

Phase 9 bridges two concerns: (1) making the app installable as a PWA with full offline support at the baseball field, and (2) setting up CI/CD deployment to Azure Static Web Apps via GitHub Actions. The app is already built with Vite 7.3 + React 19 and has an `api/` folder with Azure Functions (Node 20). A `staticwebapp.config.json` already exists with auth routes, API proxy, and navigation fallback configured.

For PWA, the standard approach is `vite-plugin-pwa` v1.2.0 (confirmed Vite 7 support since v1.0.1). It wraps Google Workbox and handles manifest generation, service worker creation, and precache manifest injection with zero-config defaults. The `generateSW` strategy with `registerType: 'autoUpdate'` is the right choice for this app -- it auto-generates the service worker from Workbox configuration without requiring a custom service worker file.

For deployment, Azure Static Web Apps uses the `Azure/static-web-apps-deploy@v1` GitHub Action. The workflow needs `app_location: "/"`, `api_location: "api"`, and `output_location: "dist"`. The critical detail is that `output_location` is relative to `app_location`, so `"dist"` is correct for Vite's default output. The existing `staticwebapp.config.json` must be in the repo root (which it already is) and the SWA build process copies it to the output.

**Primary recommendation:** Use `vite-plugin-pwa` with `generateSW` strategy and `autoUpdate` registration, add a GitHub Actions workflow for Azure Static Web Apps CI/CD, and ensure the service worker excludes `/.auth` and `/api` routes via `navigateFallbackDenylist`.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vite-plugin-pwa | ^1.2.0 | PWA manifest + service worker generation | Only maintained Vite PWA plugin; wraps Workbox; zero-config defaults; confirmed Vite 7 support |
| Azure/static-web-apps-deploy | v1 | GitHub Actions deployment to SWA | Official Microsoft action for SWA deployments |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| workbox (bundled) | 7.x (via vite-plugin-pwa) | Service worker precaching + runtime caching | Comes bundled with vite-plugin-pwa; no separate install needed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| vite-plugin-pwa generateSW | Hand-written service worker | Full control but must manually maintain precache manifest, handle updates, manage Workbox integration -- massive complexity for no benefit here |
| vite-plugin-pwa generateSW | injectManifest strategy | Only needed for custom service worker logic (background sync, push notifications); this app only needs offline caching of static assets |
| Azure deployment token auth | OIDC / identity token auth | OIDC is more secure but requires additional Azure AD setup; deployment token is simpler and sufficient for a single-developer project |

**Installation:**
```bash
npm install -D vite-plugin-pwa
```

No other packages needed. Workbox is bundled within vite-plugin-pwa.

## Architecture Patterns

### PWA File Structure
```
public/
  pwa-192x192.png          # App icon (192x192)
  pwa-512x512.png          # App icon (512x512)
  apple-touch-icon.png      # iOS home screen icon (180x180)
  favicon.ico               # Browser tab icon
.github/
  workflows/
    azure-static-web-apps.yml  # CI/CD workflow
index.html                  # Updated with PWA meta tags
vite.config.ts              # Updated with VitePWA plugin
staticwebapp.config.json    # Already exists, may need minor updates
```

### Pattern 1: VitePWA Plugin Configuration (generateSW)
**What:** Configure vite-plugin-pwa to generate the service worker, manifest, and registration script automatically.
**When to use:** Always -- this is the primary PWA integration point.
**Example:**
```typescript
// Source: https://vite-pwa-org.netlify.app/guide/
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallbackDenylist: [/^\/\.auth/, /^\/api/],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
      },
      manifest: {
        name: 'Lineup Builder',
        short_name: 'Lineup',
        description: 'Baseball lineup builder for youth coaches',
        theme_color: '#1a5d1a',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  // ... existing server config
})
```

### Pattern 2: GitHub Actions Workflow for SWA
**What:** CI/CD workflow that builds and deploys on push to main.
**When to use:** Required for DEPL-01.
**Example:**
```yaml
# Source: https://learn.microsoft.com/en-us/azure/static-web-apps/build-configuration
name: Azure Static Web Apps CI/CD

on:
  push:
    branches:
      - main
  pull_request:
    types: [opened, synchronize, reopened, closed]
    branches:
      - main

permissions:
  issues: write
  contents: read
  pull-requests: write

jobs:
  build_and_deploy:
    if: github.event_name == 'push' || (github.event_name == 'pull_request' && github.event.action != 'closed')
    runs-on: ubuntu-latest
    name: Build and Deploy
    steps:
      - uses: actions/checkout@v4
        with:
          submodules: true
      - name: Build And Deploy
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
          repo_token: ${{ secrets.GITHUB_TOKEN }}
          action: "upload"
          app_location: "/"
          api_location: "api"
          output_location: "dist"

  close_pull_request:
    if: github.event_name == 'pull_request' && github.event.action == 'closed'
    runs-on: ubuntu-latest
    name: Close Pull Request
    steps:
      - name: Close Pull Request
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
          action: "close"
```

### Pattern 3: HTML Meta Tags for PWA
**What:** Required meta tags in index.html for PWA compliance.
**When to use:** Must be added to index.html for installability.
**Example:**
```html
<!-- Source: https://vite-pwa-org.netlify.app/guide/pwa-minimal-requirements.html -->
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="Baseball lineup builder for youth coaches" />
  <meta name="theme-color" content="#1a5d1a" />
  <link rel="icon" href="/favicon.ico" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
  <title>Lineup Builder</title>
</head>
```

### Pattern 4: Updated staticwebapp.config.json
**What:** Add navigationFallback excludes for service worker and manifest files.
**When to use:** The existing config already has `navigationFallback` with `exclude: ["/assets/*"]`. This should be extended to include service worker files.
**Example:**
```json
{
  "navigationFallback": {
    "rewrite": "/index.html",
    "exclude": ["/assets/*", "/sw.js", "/workbox-*.js", "/*.webmanifest"]
  }
}
```

### Anti-Patterns to Avoid
- **Caching auth routes in service worker:** The `/.auth/*` routes are managed by Azure SWA platform. If the service worker intercepts these, auth flows break. Always denylist `/.auth` and `/api` in `navigateFallbackDenylist`.
- **Using injectManifest when generateSW suffices:** This app only needs offline caching of static assets. injectManifest adds complexity for custom push notifications or background sync that this app does not need.
- **Precaching API responses:** API responses are user-specific and auth-gated. The service worker should only precache the static app shell (JS, CSS, HTML, images). API data is already handled by the sync engine's localStorage-first approach.
- **Putting staticwebapp.config.json in dist:** SWA's build process handles this. The file lives in the repo root and is automatically included. Do NOT add a build step to copy it.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Service worker generation | Custom service worker with manual precache manifest | vite-plugin-pwa with generateSW | Workbox handles cache versioning, stale cache cleanup, update flow, and precache manifest hashing -- hundreds of edge cases |
| Web app manifest | Manual manifest.json file | vite-plugin-pwa manifest option | Plugin generates the manifest, injects the link tag, and handles scope/start_url correctly |
| Service worker registration | Manual navigator.serviceWorker.register() | vite-plugin-pwa auto-registration | Plugin handles dev vs prod paths, update detection, and framework integration |
| CI/CD pipeline | Custom build scripts + Azure CLI deploy | Azure/static-web-apps-deploy action | Official action handles build detection, API deployment, staging environments, and PR previews |
| Icon generation | Manual resizing in image editor | Any PWA icon generator tool (e.g., realfavicongenerator.net) | Need multiple sizes (192, 512, 180 for apple-touch-icon, favicon) with correct format |

**Key insight:** The entire PWA setup is configuration-driven, not code-driven. The service worker, manifest, and registration are all generated by the plugin from vite.config.ts settings. The deployment is handled by a declarative YAML workflow. There should be minimal custom code in this phase.

## Common Pitfalls

### Pitfall 1: Service Worker Caches Auth Routes
**What goes wrong:** The service worker intercepts `/.auth/login/aad` or `/.auth/me` requests, serving a cached HTML page instead of the auth redirect. Login breaks completely.
**Why it happens:** Default Workbox navigateFallback catches all navigation requests, including auth routes.
**How to avoid:** Set `navigateFallbackDenylist: [/^\/\.auth/, /^\/api/]` in the workbox config. This excludes auth and API routes from service worker interception.
**Warning signs:** Auth redirects show the app shell instead of the Microsoft login page.

### Pitfall 2: output_location Relative Path Confusion
**What goes wrong:** SWA deploys an empty site or 404s on all routes.
**Why it happens:** `output_location` in the GitHub Action is relative to `app_location`, not the repo root. If `app_location` is `/` and you set `output_location: "/dist"`, it looks for `//dist`.
**How to avoid:** Set `output_location: "dist"` (no leading slash) when `app_location` is `"/"`.
**Warning signs:** Deployment succeeds in GitHub Actions but the site shows default SWA 404.

### Pitfall 3: Stale Service Worker After Deploy
**What goes wrong:** Users see old cached version of the app indefinitely after a new deployment.
**Why it happens:** The service worker serves precached assets and never checks for updates, or the update check fails silently.
**How to avoid:** Use `registerType: 'autoUpdate'` which automatically activates the new service worker. Also set `skipWaiting: true` and `clientsClaim: true` for immediate activation. And `cleanupOutdatedCaches: true` to remove old precache entries.
**Warning signs:** Users report seeing old UI after you deployed changes.

### Pitfall 4: Missing PWA Icons
**What goes wrong:** "Add to Home Screen" prompt never appears, or the installed app shows a generic icon.
**Why it happens:** Missing or incorrectly sized icon files in public/. The manifest references icons that don't exist.
**How to avoid:** Create actual PNG files at 192x192 and 512x512 pixels and place them in `public/`. Also create a 180x180 apple-touch-icon.png. Verify with Chrome DevTools > Application > Manifest.
**Warning signs:** Lighthouse PWA audit shows "Manifest doesn't have a maskable icon" or "Does not provide a valid apple-touch-icon".

### Pitfall 5: SWA Config File Not Deployed
**What goes wrong:** Auth routes, API proxy, and navigation fallback stop working in production.
**Why it happens:** `staticwebapp.config.json` must be present in the build output. SWA's Oryx build system normally copies it from `app_location`, but if the build process somehow excludes JSON files it can be lost.
**How to avoid:** The file already exists at the repo root (which is `app_location: "/"`). SWA's build process handles this automatically. Do NOT delete `*.json` in build scripts.
**Warning signs:** API calls return 404, auth redirects don't work, direct URL navigation returns 404.

### Pitfall 6: API Build Failure in CI
**What goes wrong:** The API (Azure Functions in `api/`) fails to build during the SWA deployment action.
**Why it happens:** The `api/` folder has its own `package.json` with TypeScript compilation. The SWA build action auto-detects and builds it, but may use a different Node version or fail on type errors.
**How to avoid:** The `api/package.json` already has `"build": "tsc"` and the `host.json` plus `staticwebapp.config.json` already specify `node:20`. Ensure the API builds cleanly locally with `cd api && npm run build` before pushing.
**Warning signs:** GitHub Actions build step shows TypeScript errors from the api/ folder.

## Code Examples

Verified patterns from official sources:

### Complete vite.config.ts with PWA
```typescript
// Source: https://vite-pwa-org.netlify.app/guide/
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallbackDenylist: [/^\/\.auth/, /^\/api/],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
      },
      manifest: {
        name: 'Lineup Builder',
        short_name: 'Lineup',
        description: 'Baseball lineup builder for youth coaches',
        theme_color: '#1a5d1a',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
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
})
```

### Complete GitHub Actions Workflow
```yaml
# Source: https://learn.microsoft.com/en-us/azure/static-web-apps/build-configuration
# File: .github/workflows/azure-static-web-apps.yml
name: Azure Static Web Apps CI/CD

on:
  push:
    branches:
      - main
  pull_request:
    types: [opened, synchronize, reopened, closed]
    branches:
      - main

permissions:
  issues: write
  contents: read
  pull-requests: write

jobs:
  build_and_deploy:
    if: github.event_name == 'push' || (github.event_name == 'pull_request' && github.event.action != 'closed')
    runs-on: ubuntu-latest
    name: Build and Deploy
    steps:
      - uses: actions/checkout@v4
        with:
          submodules: true
      - name: Build And Deploy
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
          repo_token: ${{ secrets.GITHUB_TOKEN }}
          action: "upload"
          app_location: "/"
          api_location: "api"
          output_location: "dist"

  close_pull_request:
    if: github.event_name == 'pull_request' && github.event.action == 'closed'
    runs-on: ubuntu-latest
    name: Close Pull Request
    steps:
      - name: Close Pull Request
        uses: Azure/static-web-apps-deploy@v1
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
          action: "close"
```

### Updated index.html with PWA Meta Tags
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="Baseball lineup builder for youth coaches" />
    <meta name="theme-color" content="#1a5d1a" />
    <link rel="icon" href="/favicon.ico" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
    <title>Lineup Builder</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

### Updated staticwebapp.config.json
```json
{
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
    "exclude": ["/assets/*", "/sw.js", "/workbox-*.js"]
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

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual service worker + workbox-cli | vite-plugin-pwa wrapping Workbox | Stable since 2022 | Zero-config PWA for Vite projects |
| workbox v6 | workbox v7.3 (via vite-plugin-pwa v1.x) | vite-plugin-pwa v0.21.0 (Nov 2023) | Breaking change if upgrading from older plugin versions |
| Vite 5/6 only | Vite 7 support | vite-plugin-pwa v1.0.1 (Jun 2024) | Confirmed compatibility with project's Vite 7.3 |
| routes.json (SWA) | staticwebapp.config.json | Deprecated 2022+ | routes.json ignored if config.json exists; project already uses config.json |
| SWA Free plan | SWA Standard plan ($9/mo) | Decision from Phase 5 | Required for custom auth provider restriction; already decided |

**Deprecated/outdated:**
- `routes.json` for SWA: replaced by `staticwebapp.config.json` (already using correct format)
- `injectRegister` before v0.12.2: had a bug with `clientsClaim`/`skipWaiting`; current v1.2.0 is well past this

## Open Questions

1. **Icon Design**
   - What we know: PWA requires 192x192 and 512x512 PNG icons, plus 180x180 apple-touch-icon
   - What's unclear: The app currently uses `vite.svg` as its favicon. There is no baseball-themed icon designed yet.
   - Recommendation: Create simple placeholder icons (solid color with "LB" text) for initial deployment. Replace with proper baseball-themed icons later. Can use any online SVG-to-PNG tool or PWA icon generator.

2. **Azure SWA Resource Creation**
   - What we know: The GitHub Action needs an `AZURE_STATIC_WEB_APPS_API_TOKEN` secret. This comes from creating the SWA resource in Azure Portal.
   - What's unclear: Whether the Azure resource has already been provisioned. This is an infrastructure step outside of code.
   - Recommendation: Include a manual step in the plan for creating the SWA resource and adding the deployment token to GitHub secrets. This is a one-time setup that cannot be automated in code.

3. **Theme Color Choice**
   - What we know: theme_color and background_color are required in manifest and meta tags. They affect the splash screen and status bar color on mobile.
   - What's unclear: The exact brand colors for the app.
   - Recommendation: Use `#1a5d1a` (dark green, baseball-field themed) as a reasonable default. Can be changed later without breaking anything.

## Sources

### Primary (HIGH confidence)
- [vite-plugin-pwa official guide](https://vite-pwa-org.netlify.app/guide/) - installation, configuration, service worker strategies
- [vite-plugin-pwa PWA minimal requirements](https://vite-pwa-org.netlify.app/guide/pwa-minimal-requirements.html) - HTML meta tags, icon requirements
- [vite-plugin-pwa generateSW workbox options](https://vite-pwa-org.netlify.app/workbox/generate-sw) - navigateFallbackDenylist, runtimeCaching
- [Azure SWA build configuration](https://learn.microsoft.com/en-us/azure/static-web-apps/build-configuration) - workflow YAML, app/api/output locations
- [Azure SWA configuration reference](https://learn.microsoft.com/en-us/azure/static-web-apps/configuration) - staticwebapp.config.json schema, routes, headers, navigationFallback
- [GitHub Actions SWA deployment](https://docs.github.com/en/actions/how-tos/deploy/deploy-to-third-party-platforms/azure-static-web-app) - workflow template, secrets
- [vite-plugin-pwa GitHub releases](https://github.com/vite-pwa/vite-plugin-pwa/releases) - v1.2.0 latest, v1.0.1 added Vite 7 support

### Secondary (MEDIUM confidence)
- [Hosting PWA on SWA blog post](https://www.azurestaticwebapps.dev/blog/pwa-on-swa) - SWA-specific PWA gotchas, auth route exclusion, build ordering
- [MDN PWA manifest reference](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest) - manifest field definitions
- [MDN Making PWAs installable](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable) - installability requirements

### Tertiary (LOW confidence)
- None. All findings verified with primary or secondary sources.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - vite-plugin-pwa v1.2.0 confirmed on npm with Vite 7 support; Azure SWA deploy action is official Microsoft tooling
- Architecture: HIGH - Configuration patterns verified against official docs; project structure already matches expected layout
- Pitfalls: HIGH - Auth route exclusion and output_location pitfalls documented in multiple official and community sources

**Research date:** 2026-02-13
**Valid until:** 2026-03-15 (30 days -- stable technologies, unlikely to change)
