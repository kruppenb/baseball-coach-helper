# Technology Stack

**Project:** Little League Baseball Lineup Builder
**Researched:** 2026-02-09
**Confidence:** HIGH

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| React | 19.1.x | UI component framework | Stable release (Dec 2024) with Actions, new hooks (useActionState, useOptimistic), no forwardRef needed, better hydration. Existing app already uses React 19. |
| TypeScript | 5.9.x | Type safety | Latest stable (5.9.3). Provides compile-time error detection, better IDE support, self-documenting code. Existing app proven with TS. |
| Vite | 7.3.x | Build tool & dev server | 10x faster than CRA, instant HMR, native ESM, TypeScript/JSX built-in, Rollup for optimized production builds. Industry standard for new React apps in 2026. CRA is deprecated in practice. |

### State Management & Storage

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| React useState + useEffect | (built-in) | Local state + localStorage sync | For simple client-only apps with localStorage persistence, built-in hooks are sufficient. No external state library needed. |
| Custom useLocalStorage hook | N/A | Reusable localStorage abstraction | Standard pattern: returns [value, setValue, removeValue], handles JSON serialization, checks window availability for SSR safety. |

### Styling

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| CSS Modules | (via Vite) | Component-scoped CSS | Built into Vite with zero config. Scoped by default, prevents conflicts, native CSS syntax, no runtime overhead, better for print media queries than utility-first frameworks. |
| @media print | (native CSS) | Print-specific styles | Use @media print {} in CSS Modules for dugout card export. Allows full control over page breaks, margins, font sizes without affecting screen layout. |

### Testing

| Technology | Version | Purpose | When to Use |
|------------|---------|---------|-------------|
| Vitest | 4.0.x | Test runner | 10-20x faster than Jest, native ESM/TypeScript, 95% Jest-compatible API, stable Browser Mode for DOM testing. Perfect fit with Vite. |
| @testing-library/react | 16.x | Component testing | User-centric testing philosophy, works with Vitest. Existing app uses 16.3.0. Test behavior not implementation. |
| @testing-library/user-event | 14.x | User interaction simulation | More realistic than fireEvent. Simulates actual user behavior (typing, clicking). |
| @testing-library/jest-dom | 6.x | DOM matchers | Custom matchers like toBeDisabled(), toHaveClass(). Makes assertions more readable. |

### Development Tools

| Tool | Version | Purpose | Notes |
|------|---------|---------|-------|
| ESLint | 9.x | Code linting | Flat config (default in v9), typescript-eslint v8+ for ESLint 9 support. React rules via eslint-plugin-react. |
| Prettier | 3.x | Code formatting | Use eslint-config-prettier to prevent conflicts. Prettier formats, ESLint catches bugs. "prettier" must be last in extends array. |
| @vitejs/plugin-react | 4.x | React + Vite integration | Enables React Fast Refresh, JSX transform. Included in Vite React template. |

## Installation

### Project Setup

```bash
# Create new Vite + React + TypeScript app
npm create vite@latest baseball-coach-helper -- --template react-ts

cd baseball-coach-helper
```

### Core Dependencies

```bash
npm install react@19 react-dom@19
```

### Dev Dependencies

```bash
npm install -D typescript@5.9 \
  vite@7 \
  @vitejs/plugin-react@4 \
  vitest@4 \
  @testing-library/react@16 \
  @testing-library/user-event@14 \
  @testing-library/jest-dom@6 \
  eslint@9 \
  @typescript-eslint/parser@8 \
  @typescript-eslint/eslint-plugin@8 \
  eslint-plugin-react@7 \
  eslint-plugin-react-hooks@5 \
  eslint-config-prettier@9 \
  prettier@3
```

### TypeScript Configuration

Use Vite's default `tsconfig.json` with:
- `"strict": true` for maximum type safety
- `"jsx": "react-jsx"` (no need to import React in every file)
- `"lib": ["ES2020", "DOM", "DOM.Iterable"]`

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Build Tool | Vite | Create React App (CRA) | CRA is effectively deprecated. Slow dev server, slow builds, requires ejecting for customization. React team recommends frameworks (Next.js) or Vite. |
| Build Tool | Vite | Webpack | Manual config complexity. Vite provides faster DX with simpler config. Webpack appropriate for legacy/enterprise with existing setup. |
| Testing | Vitest | Jest | Jest is slower, experimental ESM support, heavier configuration. Use Jest only for React Native or large legacy codebases. |
| Styling | CSS Modules | Tailwind CSS | Tailwind faster for prototyping but CSS Modules better for print media queries, animations, and native CSS features. Small app doesn't benefit from Tailwind's design system enforcement. |
| Styling | CSS Modules | CSS-in-JS (styled-components, emotion) | Runtime overhead. CSS Modules have zero runtime cost, better for print CSS. |
| State | useState + useLocalStorage | Zustand, Jotai, Redux | Overkill for client-only app with localStorage. No shared state across routes, no complex async, no server sync. Built-in hooks sufficient. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Create React App | De facto deprecated, slow, poor DX, requires ejecting | Vite (or Next.js if SSR needed) |
| react-scripts | Tied to CRA, outdated Webpack config | Vite directly |
| forwardRef | No longer needed in React 19 | Pass ref as regular prop |
| defaultProps | Deprecated in React 19 function components | Default parameter syntax: function Component({ value = 'default' }) |
| Class components | Outdated pattern, no hooks | Function components with hooks |

## Stack Patterns by Variant

### If backend/database is added later:

- Keep localStorage for roster data (fast, simple, works offline)
- Add optional cloud sync: POST to API endpoint, store server ID alongside local data
- React Query (TanStack Query) for server state management
- LocalStorage becomes "optimistic UI" layer with server as source of truth

### If print quality requires finer control:

- Consider @media print breakpoints for different paper sizes
- CSS `page-break-before`, `page-break-after`, `page-break-inside` for multi-page layouts
- `window.print()` API with beforeprint/afterprint events
- Potential: react-to-print library (if window.print() insufficient)

### If complexity grows significantly:

- Then consider: React Router for multi-page navigation
- Then consider: Form library (React Hook Form) if forms become complex
- Then consider: State library (Zustand, lightest option) if shared state becomes painful

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| React 19.x | TypeScript 5.9+ | React 19 requires TS 5.x for proper types. Avoid TS 4.x. |
| Vitest 4.x | Vite 7.x | Vitest and Vite versions should align major versions. |
| @testing-library/react 16.x | React 19.x | RTL 16 is React 19 compatible. Do not use RTL 15 or older. |
| ESLint 9.x | typescript-eslint 8.x+ | ESLint 9 requires typescript-eslint v8.0.0-alpha.10 or higher. |
| eslint-config-prettier 9.x | ESLint 9.x, Prettier 3.x | v9+ supports ESLint 9 flat config. Must be last in extends array. |

## Confidence Assessment

| Technology | Confidence | Source |
|------------|------------|--------|
| React 19 | HIGH | Official React blog (Dec 5, 2024), stable release, existing app uses 19.1.0 |
| Vite | HIGH | Official Vite docs (v7.3.1 stable), industry consensus in 2026 vs CRA |
| TypeScript 5.9 | HIGH | Official TypeScript releases, npm registry (5.9.3 stable) |
| Vitest | HIGH | Official Vitest blog (4.0.18 stable), VoidZero announcements, performance benchmarks |
| CSS Modules | MEDIUM | Built into Vite, standard pattern, multiple sources confirm suitability for print |
| localStorage pattern | MEDIUM | Multiple React tutorials, common pattern, no official React docs but widely adopted |

## Sources

### Official Documentation
- [React v19 Official Release](https://react.dev/blog/2024/12/05/react-19) - React 19 stable announcement
- [Vite Official Site](https://vite.dev/) - Vite 7.3.1 current version
- [TypeScript 5.9 Release Notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-9.html)
- [Vitest 4.0 Announcement](https://vitest.dev/blog/vitest-4)
- [MDN: Printing with CSS](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Media_queries/Printing)

### Ecosystem Research
- [React 19 Best Practices 2025](https://medium.com/@CodersWorld99/react-19-typescript-best-practices-the-new-rules-every-developer-must-follow-in-2025-3a74f63a0baf)
- [Vite vs Create React App 2026](https://dev.to/simplr_sh/why-you-should-stop-using-create-react-app-and-start-using-vite-react-in-2025-4d21)
- [Vitest vs Jest 2026](https://medium.com/@ruverd/jest-vs-vitest-which-test-runner-should-you-use-in-2025-5c85e4f2bda9)
- [React Testing Library Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [localStorage with React Hooks](https://blog.logrocket.com/using-localstorage-react-hooks/)
- [CSS Modules vs Tailwind](https://medium.com/@ignatovich.dm/css-modules-vs-css-in-js-vs-tailwind-css-a-comprehensive-comparison-24e7cb6f48e9)
- [ESLint 9 Migration Guide](https://eslint.org/docs/latest/use/migrate-to-9.0.0)
- [Prettier + ESLint Configuration 2026](https://medium.com/@osmion/prettier-eslint-configuration-that-actually-works-without-the-headaches-a8506b710d21)

---
*Stack research for: Little League Baseball Lineup Builder*
*Researched: 2026-02-09*
*Overall confidence: HIGH — All core technologies verified with official sources, versions confirmed via official releases/docs, existing app provides validation baseline*
