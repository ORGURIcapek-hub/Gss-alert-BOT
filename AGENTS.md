# AGENTS.md

Next.js 14 (App Router) + TypeScript + Tailwind + Supabase OKR tracker for Suan Dusit University. `src/app/page.tsx` is `'use client'` and renders everything behind `RoleProvider`; unauthenticated users get `<LoginPage />`. No RSC data fetching.

## Typography — Google Sans everywhere (mandatory)

The whole app uses **Google Sans** for Latin/digits and **Noto Sans Thai** for Thai script. Google Sans ships no Thai glyphs, so both faces must stay in the stack or Thai text silently falls back to a system serif.

Load and wire:

- The only font import is the `@import` on line 1 of `src/app/globals.css`: `Google Sans` (wght 400–700, `opsz 17..18`) + `Noto Sans Thai` (wght 300–900). Add or remove faces there, nowhere else.
- The stack lives in `:root { --font-sans }`, is applied globally by `* { font-family: var(--font-sans) }`, and is mirrored in `tailwind.config.ts` → `theme.extend.fontFamily.sans`. Both files must agree — Tailwind's `font-sans` is what new components use.
- Do **not** set `font-family` anywhere else (no inline styles, no per-component stacks, no second `@import`). Do not reintroduce `Prompt` / `Sarabun` / `Kanit`, and do not add a competing family.
- Do **not** migrate to `next/font/google`: this Next version's font manifest predates Google Sans, so the build fails on an unknown font. The CSS `@import` is intentional.
- Chart.js cannot read CSS: pass the literal stack `"'Google Sans', 'Noto Sans Thai', sans-serif"` to every `font.family`, `titleFont`, `bodyFont`, and `ticks.font` (see `src/components/ExecutiveAnalytics.tsx`). New charts must do the same.
- Google Sans has only 400/500/600/700 — `font-extrabold`/`font-black` render Thai in Noto Sans Thai (real 800/900) but Latin snaps down to 700, which looks mismatched. Prefer `font-bold`/`font-semibold` for new Latin-heavy headings.
- The OTP email template (`src/app/api/auth/send-otp-email/route.ts`) renders outside the app shell and keeps its own email-safe stack — leave it alone.

## Mobile & responsive UX conventions

- Breakpoints that matter: `sm` = 640px (sheet becomes a centered dialog), `lg` = 1024px (sidebar docks / undocks). Tailwind defaults; no custom screens.
- **Modals are bottom sheets on phones.** Overlay: `fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-…/60 backdrop-blur-sm overflow-y-auto animate-in fade-in`. Panel: `w-full sm:max-w-<size> rounded-t-3xl sm:rounded-3xl mobile-modal-sheet animate-slide-up max-h-[92dvh] overflow-y-auto custom-scrollbar`. `.mobile-modal-sheet` (globals.css, ≤768px) caps height at `calc(100dvh - 32px)`, squares the bottom corners, and pads `env(safe-area-inset-bottom)`.
- Use `dvh` (not `vh`) for full-height surfaces so iOS browser chrome does not clip them. Sidebar and body use `100dvh`.
- Never put `overflow-hidden` and `overflow-y-auto` on the same element — Tailwind class order decides the winner and the content silently clips.
- Touch sizing is global: `@media (pointer: coarse)` forces `min-height: 44px` on buttons/links/selects and removes tap highlights. Don't fight it with fixed smaller heights.
- Inputs: `@media (max-width: 640px)` forces `input, select, textarea { font-size: 16px }` (via `!important`) because iOS Safari auto-zooms below 16px. Don't design sub-16px mobile form fields.
- Mobile drawer: `fixed lg:sticky h-[100dvh] lg:h-screen w-[86vw] max-w-[320px] sm:w-80`, toggled with `-translate-x-full lg:translate-x-0`, scroll-locked through `body.sheet-open`, closable with Escape and a backdrop click.
- Keep `min-w-0` on flex children that hold `<select>`/long text (header filter pills) or they overflow the viewport instead of shrinking.
- Motion: `tailwindcss-animate` is **not** installed. `.animate-in`, `.fade-in`, `.animate-slide-up` are hand-written keyframes in `globals.css`; add new motion there rather than assuming plugin classes exist.
- Wide tables → wrap in `overflow-x-auto custom-scrollbar`. Mobile-first paddings: `p-4 sm:p-6 lg:p-8`.

## Verify

Run in this order; the last two share `.next` (see below).

1. `npm test` — `node --test test/*.test.mjs`, 115 tests across 13 dependency-free node:test suites (core utils, auth/storage semantics, cache engine, and real Next route handlers). Single suite: `node --test test/<name>.test.mjs`.
2. `npx tsc --noEmit` — typecheck.
3. `npm run build` — full production check. **Stop the dev server first.**
4. `npm run dev` — boot smoke test, then `curl` the health checks below.

Test conventions:
- Two import styles coexist. Modules with no `@/` value imports (`password-utils.ts`, `project-status.ts`, `atomic-storage.ts`) are imported **directly from source** — `await import('../src/lib/<name>.ts')` — because Node 24 strips TS types natively; tests tagged `[real source]` exercise the real implementation. Everything else (anything importing `@/types`, `lucide-react`, or browser globals) mirrors the logic inline in the test file — keep the mirror byte-identical to the source and note in a test name that it mirrors.
- Don't add a test runner dependency (no jest/vitest) — `package.json` `"test": "node --test test/*.test.mjs"` is the contract; write plain `.mjs` files.
- Tests that touch the filesystem use `os.tmpdir()` scratch dirs (see `test/atomic-storage-source.test.mjs`) and always clean up in the same test; don't write into the repo (`scratch_test/` from the old suite is the pattern to avoid).
- Browser-dependent modules are tested with globalThis stubs (`window`, `sessionStorage`, `localStorage`) installed/uninstalled per test — see `test/auth-storage.test.mjs`.
- **API routes are tested through their real handlers** (no server, no supertest): `test/helpers/api-env.mjs` installs `node:module` `registerHooks` (rewrites `@/*` → `src/*.ts`, maps `next/server` to `node_modules/next/server.js`, shims `lucide-react` icons and appends type-only exports like `DashboardReport` as `undefined` so type-only imports link), then `createApiTestEnv()` mkdtemps a fixture root with a `data/` dir, `process.chdir()`s into it **before any route import** (route `FILE_PATH` constants bind at import time — that is what isolates tests from the committed `data/`), and deletes the Supabase env vars so handlers take the local-store path. Call `env.importRoute('app/api/okrs/route.ts')` — it appends `?epoch=N` so **each env gets its own route module instance** (route modules keep module-level memory caches that would otherwise bleed between tests; never reuse one instance across two envs). Build requests with `new NextRequest('http://localhost' + url, { method, body: JSON.stringify(...) , headers: {'content-type': 'application/json'}, duplex: 'half' })` and call `route.GET(req)` / `POST` / `PUT` / `DELETE` directly. Assert on `res.status` + `await res.json()` and on the fixture files via `env.read('persisted-*.json')`. If a run crashes at module load, stale `okr-api-*` dirs in `$TEMP` are left behind — `rm -rf "$TEMP"/okr-api-*` (clean runs leak nothing).
- Behavior locked by the users-route tests worth knowing: an **empty `users` array in the store falls back to `mockUsers`** (10 accounts) — seed at least one user to test against a controlled store; `DELETE` **both** removes the user from the array **and** appends the id to `deletedUserIds`; POST re-registration over a `pending` account updates it in place (`isPendingUpdated: true`) instead of erroring.

`npm run lint` prompts to create an ESLint config, so don't run it non-interactively; there is no ESLint config or CI in this repo.

**Bug hunt: build and dev share `.next`.** Running `npm run build` while `next dev` is alive overwrites/deletes dev chunks. The page then 404s `/_next/static/chunks/main-app.js`, `app-pages-internals.js`, and `app/not-found.js`, never hydrates, and hangs on the Thai "กำลังโหลดข้อมูลระบบและเชื่อมต่อเซสชัน..." splash. Symptom-check both URLs after any build:

```bash
curl -s -o /dev/null -w "root:%{http_code}\n" http://localhost:3000/
curl -s -o /dev/null -w "chunk:%{http_code}\n" http://localhost:3000/_next/static/chunks/main-app.js
```

Both must be `200`. Recovery: kill the dev server, `rm -rf .next`, start dev again.

Shell: this agent runs **Git Bash on Windows** (`grep`, `head`, `&&`, `curl` all work). Inside native PowerShell 5.1 use `;` instead of `&&` and `Select-Object -First` instead of `head`. Kill a process from Git Bash with `taskkill //F //PID <pid> //T` (double slashes; `//T` also kills children).

## Run & preview

- `npm run dev` → `next dev -H 0.0.0.0`, default http://localhost:3000 (listens on all interfaces).
- `.env.local` is gitignored and present locally; copy it from the main checkout when starting a fresh worktree. Without Supabase keys the app falls back to `data/*.json` + `src/lib/mock-data.ts`, which is what local dev uses.
- Detached start (survives the conversation) — PowerShell, stdout and stderr to **different** files, log under `.freebuff/`:
  ```powershell
  (Start-Process -FilePath 'npm.cmd' -ArgumentList 'run','dev' -RedirectStandardOutput '.freebuff\preview-<id>.log' -RedirectStandardError '.freebuff\preview-<id>.log.err' -WindowStyle Hidden -PassThru).Id
  ```
  Name the executable exactly (`npm.cmd`; `Start-Process` does not resolve shell shims) and confirm the pid is alive a few seconds later.
- Port 3000: right after killing a dev server Windows keeps the port in `TIME_WAIT` (~2 min) and Next silently binds a random port instead. Check `netstat -ano | grep ':3000'` is empty, or pass `-p 3000` explicitly so it fails loudly instead of wandering.
- Only ever run **one** dev server per checkout — two instances corrupt each other's `.next` chunks. Never load the app inside an iframe of itself: two `RoleProvider`s echo on the `sdu_okr_sync_channel` `BroadcastChannel` and livelock the main thread.
- Preview/QA: the preview pane width follows the user's window (verify with `preview_evaluate` → `window.innerWidth`), so assert phone behaviour with computed styles rather than assuming a narrow viewport. Font sanity check: `document.fonts.check('16px "Google Sans"')` and `document.fonts.check('16px "Noto Sans Thai"', 'ก')`.
- Run doc: `.freebuff/run.md`.

## Architecture

- `@/*` maps to `src/*`. Role workspaces live in `src/components/workspaces/*`, switched by `useRole()` from `src/components/RoleContext.tsx`.
- Data layer is `src/lib/services/*` (barrel `index.ts`). `service-helpers.ts` owns `fetchWithDeduplication`, `invalidateApiCache`, and `typeof window`-guarded storage helpers — reuse them, don't hand-roll fetch/cache.
- API routes (`src/app/api/*/route.ts`) persist to committed `data/*.json` files and mirror to Supabase when env keys exist. Every route sets `export const dynamic = 'force-dynamic'` (+ `revalidate = 0`) — keep that on new fs-backed routes or `next build` may prerender them and bake empty data.
- File uploads go to Supabase Storage bucket `OKR-files` only: clients use `uploadFileToStorage` / `deleteFileFromStorage` from `src/lib/services/storage-service.ts`, which call `src/app/api/storage/route.ts` (service-role key, auto-creates the bucket). Never write uploads to `public/` or local disk.
- Supabase clients: `src/lib/supabase/client.ts` (browser, anon), `server.ts` (cookie-based), `admin.ts` (service-role, throws in browser — server only). API routes currently hand-roll their own `getSafeSupabaseClient()`; never import the admin client into client components.
- SQL source of truth is `supabase/`: `schema.sql` (tables + `OKR-files` bucket/policies) and `seed.sql`. The bucket DDL is duplicated in `supabase/migrations/20260915_create_okr_files_bucket.sql` — keep the two in sync.
- `src/app/layout.tsx` owns metadata **and** the `viewport` export (`width=device-width`, `initialScale: 1`, `maximumScale: 1`, `viewportFit: 'cover'`, `themeColor: '#003B71'`). `viewportFit: 'cover'` is why safe-area insets are usable — don't drop it.

## Gotchas

- `data/*.json` are committed AND mutated at runtime (registering a user dirties `persisted-users.json`; logging in through the UI touches several). Don't hand-edit; don't commit the churn unintentionally. `next.config.mjs` ignores `data/**` in webpack watch, so JSON edits don't hot-reload.
- On Vercel the filesystem is ephemeral: the `projects`/`users` routes skip `data/*.json` writes entirely (`if (process.env.VERCEL) return`) and rely on Supabase. Don't assume local JSON persistence in production.
- No `.env.local` in the repo. Without `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` (see `.env.example`), Supabase paths no-op and everything falls back to `data/*.json` + `src/lib/mock-data.ts`.
- Login is client-side against the fetched user list: accounts come from `data/persisted-users.json` (not the `mockUsers` in `src/lib/mock-data.ts`, which is only a fallback when the store is empty). Don't assume `admin`/`password123` exists.
- `fetchWithDeduplication(url, { ttl, forceRefresh, ...fetchInit })`: `ttl`/`forceRefresh` are cache policy, stripped before `fetch`. Server-side cannot fetch relative URLs (set `NEXT_PUBLIC_APP_URL` or pass absolute). Invalidation bumps a generation — in-flight GETs still resolve to their caller but never repopulate cache; `forceRefresh` starts fresh instead of joining in-flight.
- Auth is client-side only: `RoleContext` compares passwords in the browser against cached/in-memory users; session lives in sessionStorage (`sdu_okr_user_id`, `sdu_okr_cached_user`). `src/middleware.ts` does no auth (only blocks `.well-known/`). No server session exists — don't assume one, and restoring a session for QA means writing those two sessionStorage keys.
- `optionalDependencies` pins `@next/swc-win32-x64-msvc` to `npm:null@*`. On Windows, if `next dev`/`build` fails with "Failed to load SWC binary", that stub is why — install the real `14.2.33` binary locally.
- `old_/` is legacy code excluded from `tsconfig.json` — leave it alone. It still references the old `Prompt` font; it is not part of the redesign.

## Conventions

- UI copy is Thai (`<html lang="th">`); write user-facing strings in Thai.
- No code comments (`//`, `/* */`, `{/* */}`, JSDoc). Don't add them.
