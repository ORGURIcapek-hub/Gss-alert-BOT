# AGENTS.md

Next.js 14 (App Router) + TypeScript + Tailwind + Supabase OKR tracker for Suan Dusit University. `src/app/page.tsx` is `'use client'` and renders everything behind `RoleProvider` (`src/app/layout.tsx`); unauthenticated users get `<LoginPage />` (`page.tsx:159-160`). No RSC data fetching.

## Verify

- `npx tsc --noEmit` — the check. No test runner, ESLint config, or CI exists.
- `npm run build` — full check.
- Shell is Windows PowerShell 5.1: no `&&` or `head`; chain with `;` / `if ($?)`, page output with `Select-Object -First`.

## Architecture

- `@/*` maps to `src/*` (`tsconfig.json`). Role workspaces live in `src/components/workspaces/*`, switched by `useRole()` from `src/components/RoleContext.tsx`.
- Data layer is `src/lib/services/*` (barrel `index.ts`). `service-helpers.ts` owns `fetchWithDeduplication`, `invalidateApiCache`, and `typeof window`-guarded storage helpers — reuse them, don't hand-roll fetch/cache.
- API routes (`src/app/api/*/route.ts`) persist to committed `data/*.json` files and mirror to Supabase when env keys exist.

## Gotchas

- `data/*.json` are committed AND mutated at runtime (registering a user dirties `persisted-users.json`). Don't hand-edit; don't commit the churn unintentionally.
- No `.env.local` in repo. Without `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` (see `.env.example`), Supabase paths no-op and everything falls back to `data/*.json` + `src/lib/mock-data.ts`.
- Only `src/app/api/users/route.ts` sets `export const dynamic = 'force-dynamic'` (+ `revalidate = 0`). New fs-backed routes need the same or `next build` may prerender them and bake empty data.
- `fetchWithDeduplication(url, { ttl, forceRefresh, ...fetchInit })`: `ttl`/`forceRefresh` are cache policy, stripped before `fetch`. Server-side cannot fetch relative URLs (set `NEXT_PUBLIC_APP_URL` or pass absolute). Invalidation bumps a generation — in-flight GETs still resolve to their caller but never repopulate cache; `forceRefresh` starts fresh instead of joining in-flight.
- Auth is client-side only: `RoleContext.tsx:260` compares passwords in the browser against cached/in-memory users; session lives in web storage. `src/middleware.ts` does no auth. No server session exists — don't assume one.
- `optionalDependencies` pins `@next/swc-win32-x64-msvc` to `npm:null@*`. On Windows, if `next dev`/`build` fails with "Failed to load SWC binary", that stub is why — install the real `14.2.33` binary locally.
- `old_/` is legacy code excluded from `tsconfig.json` — leave it alone.
- UI copy is Thai (`<html lang="th">`); write user-facing strings in Thai.
- Repo convention: no code comments (`//`, `/* */`, `{/* */}`, JSDoc). Don't add them.
