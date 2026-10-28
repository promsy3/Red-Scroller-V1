# HOSTING.md — Proven Deploy Settings

Everything in this file was proven from a **clean clone** of this repository
(branch `demo/deploy-prep`, 380 tracked files, no `.env`, no `node_modules`)
cloned into a temp folder outside the project, so no local-only file could help.

Proof environment: **Node v24.14.1, npm 11.11.0**, 2026-10-28.
No command in this repo was ever run against the production database; all local
API runs used a dummy `DATABASE_URL` pointing at localhost.

---

## Node version

- **Worked with:** Node `v24.14.1` / npm `11.11.0` (every command below).
- **Declared in the repo:** `.nvmrc` → `24.14.1` (repo root) and root
  `package.json` `engines.node` → `>=24`.
- Render reads `.nvmrc` from the repo root. For Vercel, select Node 24.x in
  project settings (or rely on `engines`/`.nvmrc` detection).

---

## Render — API (NestJS)

| Setting | Value |
|---|---|
| Service type | **Web Service** (Node runtime) |
| Root directory | *(empty — repository root)* |
| Build command | `npm ci && npm run generate --workspace packages/database && npm run build --workspace apps/api` |
| Start command | `npm run start:prod --workspace apps/api` (runs `node dist/main`) |
| Health check path | `/health` — returns HTTP 200 `{"status":"ok"}`, unauthenticated, does not touch the database |

### Environment variables (names only — values never committed)

Required:

- `DATABASE_URL`
- `WEB_URL`
- `CLERK_SECRET_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Optional:

- `PORT` (Render injects it; app default `3001`)
- `CLERK_AUTHORIZED_PARTY` (defaults to `WEB_URL`)
- `RESEND_API_KEY` (email disabled with a log warning if unset)
- `RESEND_FROM_EMAIL`
- `SENTRY_DSN`
- `NODE_ENV`

Full details in `DEPLOY.md`.

### Proven (real output)

- `npm ci` → exit 0
- `npm run generate --workspace packages/database` → exit 0 (Prisma client
  v7.9.1 generated)
- `npm run build --workspace apps/api` → exit 0 (`nest build`, 97 files,
  entry `apps/api/dist/main.js`)
- The three commands chained exactly as written in the build-command cell above
  → exit 0
- Start with `PORT=4010` + dummy `DATABASE_URL` + `WEB_URL` +
  `CLERK_SECRET_KEY` + `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` →
  Nest started, all routes mapped, `GET http://localhost:4010/health` →
  **HTTP 200 `{"status":"ok"}`**

---

## Vercel — Web (Next.js 16)

| Setting | Value |
|---|---|
| Framework | **Next.js** |
| Root directory | `apps/web` |
| Install command | `npm ci` (the lockfile `package-lock.json` lives at the repo root; install must happen there) |
| Build command | `npm run build` (runs `next build` in `apps/web`) |
| Start command | none — Vercel serves the build output |

### Environment variables (names only — values never committed)

Required at **build time**:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`

Strongly recommended at **build time** (inlined into the client bundle):

- `NEXT_PUBLIC_API_URL` (production value: the Render API URL)
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL`
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL`

Optional:

- `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL`
- `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL`
- `NEXT_PUBLIC_SENTRY_DSN`
- `SENTRY_DSN`
- `SENTRY_ORG` / `SENTRY_PROJECT` (defaults exist in `next.config.js`)
- `NODE_ENV` / `CI`

Full details in `DEPLOY.md`.

### Proven (real output)

- Root `npm ci` installs web workspace dependencies → exit 0
- Web build with Clerk development keys loaded from the local env file (values
  never printed) and `NEXT_PUBLIC_API_URL` set → exit 0
  (Next.js 16.2.0 / Turbopack, 19 routes incl. `/login/[[...rest]]`)
- `npm run start --workspace apps/web` → ready in 869 ms
- `GET http://localhost:3000/login` → **HTTP 200** (Clerk publishable key
  embedded in the page), `GET /` → **HTTP 200**

---

## Deploy breakers and findings

1. **FIXED in this commit — start command was broken.**
   `apps/api/package.json` had `"start:prod": "node dist/src/main"`, but
   `nest build` emits `apps/api/dist/main.js` (no `src/` segment). Proven
   failure: `Error: Cannot find module '...dist\src\main'` / `MODULE_NOT_FOUND`,
   exit 1. Now `"start:prod": "node dist/main"`.
2. **FIXED in this commit — no generate script.** `packages/database` had no
   `generate` script, so a single root-level Render build command was
   impossible. Added `"generate": "prisma generate"`.
3. **FIXED in this commit — Node version undeclared.** The repo only declared
   `engines.node >= 18` (no `.nvmrc`), which does not reflect the version this
   stack actually runs on. Added `.nvmrc` (`24.14.1`) and tightened `engines`
   to `>=24`.
4. **Web build needs Clerk keys at build time.** `next build` prerendered
   pages with Clerk loaded; the build was proven with the development keys
   present. A Vercel deploy without `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` /
   `CLERK_SECRET_KEY` will fail (or emit a broken build).
5. **No lockfile problem.** `package-lock.json` exists at the repo root;
   `npm ci` exits 0 on a clean clone.
6. **npm audit: 34 vulnerabilities** (9 low, 1 moderate, 20 high, 4 critical)
   reported by `npm ci`. Not a deploy blocker, but flagged.
7. **Next 16 deprecation:** the `middleware` file convention is deprecated in
   favor of `proxy` (`middleware-to-proxy` warning during build). Not failing
   today; will break when Next removes the convention.
8. **CI Node mismatch (left unchanged):** `.github/workflows/ci.yml` pins
   `node-version: "20"` while the repo now declares Node 24. CI was out of
   scope for this slice and was not modified.
9. **Warnings only if unset:** `RESEND_API_KEY` (seen in the real API startup
   log: "RESEND_API_KEY not set. Email functionality will be disabled.") and
   `SENTRY_DSN` — the API starts and `/health` responds regardless.

---

## What was deliberately NOT done

- No command was run against the production database; `apps/api/.env` and
  `packages/database/.env` (production Supabase credentials) were never read.
- No secrets are stored in this file — environment variable **names only**.
- The API was not started from the local (non-clone) working copy, because
  `dotenv` would have loaded the production `.env` there.
