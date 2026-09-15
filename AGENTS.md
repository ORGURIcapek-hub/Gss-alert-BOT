# AGENTS.md

Next.js 14 (App Router) + TypeScript + Tailwind + Supabase OKR tracker for Suan Dusit University. `src/app/page.tsx` is `'use client'` and renders everything behind `RoleProvider`; unauthenticated users get `<LoginPage />`. No RSC data fetching.

## Verify

- `npx tsc --noEmit` — the check.
- `npm test` — `node --test test/*.test.mjs` (dependency-free node:test suites, no Next/jest needed). Single suite: `node --test test/<name>.test.mjs`.
- `npm run build` — full check. No ESLint config or CI exists; `npm run lint` prompts for setup, so don't run it non-interactively.
- Shell is Windows PowerShell 5.1: no `&&` or `head`; chain with `;` / `if ($?)`, page output with `Select-Object -First`.

## Architecture

- `@/*` maps to `src/*`. Role workspaces live in `src/components/workspaces/*`, switched by `useRole()` from `src/components/RoleContext.tsx`.
- Data layer is `src/lib/services/*` (barrel `index.ts`). `service-helpers.ts` owns `fetchWithDeduplication`, `invalidateApiCache`, and `typeof window`-guarded storage helpers — reuse them, don't hand-roll fetch/cache.
- API routes (`src/app/api/*/route.ts`) persist to committed `data/*.json` files and mirror to Supabase when env keys exist. Every route sets `export const dynamic = 'force-dynamic'` (+ `revalidate = 0`) — keep that on new fs-backed routes or `next build` may prerender them and bake empty data.
- File uploads go to Supabase Storage bucket `OKR-files` only: clients use `uploadFileToStorage` / `deleteFileFromStorage` from `src/lib/services/storage-service.ts`, which call `src/app/api/storage/route.ts` (service-role key, auto-creates the bucket). Never write uploads to `public/` or local disk.
- Supabase clients: `src/lib/supabase/client.ts` (browser, anon), `server.ts` (cookie-based), `admin.ts` (service-role, throws in browser — server only). API routes currently hand-roll their own `getSafeSupabaseClient()`; never import the admin client into client components.
- SQL source of truth is `supabase/`: `schema.sql` (tables + `OKR-files` bucket/policies) and `seed.sql`. The bucket DDL is duplicated in `supabase/migrations/20260915_create_okr_files_bucket.sql` — keep the two in sync.

## Gotchas

- `data/*.json` are committed AND mutated at runtime (registering a user dirties `persisted-users.json`). Don't hand-edit; don't commit the churn unintentionally. `next.config.mjs` ignores `data/**` in webpack watch, so JSON edits don't hot-reload.
- On Vercel the filesystem is ephemeral: the `projects`/`users` routes skip `data/*.json` writes entirely (`if (process.env.VERCEL) return`) and rely on Supabase. Don't assume local JSON persistence in production.
- No `.env.local` in repo. Without `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` (see `.env.example`), Supabase paths no-op and everything falls back to `data/*.json` + `src/lib/mock-data.ts`.
- `fetchWithDeduplication(url, { ttl, forceRefresh, ...fetchInit })`: `ttl`/`forceRefresh` are cache policy, stripped before `fetch`. Server-side cannot fetch relative URLs (set `NEXT_PUBLIC_APP_URL` or pass absolute). Invalidation bumps a generation — in-flight GETs still resolve to their caller but never repopulate cache; `forceRefresh` starts fresh instead of joining in-flight.
- Auth is client-side only: `RoleContext` compares passwords in the browser against cached/in-memory users; session lives in web storage. `src/middleware.ts` does no auth (only blocks `.well-known/`). No server session exists — don't assume one.
- `optionalDependencies` pins `@next/swc-win32-x64-msvc` to `npm:null@*`. On Windows, if `next dev`/`build` fails with "Failed to load SWC binary", that stub is why — install the real `14.2.33` binary locally.
- `old_/` is legacy code excluded from `tsconfig.json` — leave it alone.
- UI copy is Thai (`<html lang="th">`); write user-facing strings in Thai.
- Repo convention: no code comments (`//`, `/* */`, `{/* */}`, JSDoc). Don't add them.
