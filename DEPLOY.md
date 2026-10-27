# Deployment Environment Variables

This document lists all environment variables required for deploying the Red Scroller application to production (Vercel for web, Render for API).

## API Environment Variables (Render)

| Variable | Required | Default | Where Used | Example |
|----------|----------|---------|------------|---------|
| `DATABASE_URL` | Yes | - | `src/prisma/prisma.service.ts` - PostgreSQL connection string | `postgresql://user:pass@host:5432/dbname` |
| `WEB_URL` | Yes | - | `src/main.ts` - CORS allowed origin (single origin only) | `https://your-app.vercel.app` |
| `PORT` | No | `3001` | `src/main.ts` - Port to listen on (Render sets this automatically) | `3001` |
| `CLERK_SECRET_KEY` | Yes | - | `src/auth/clerk.guard.ts` - Clerk authentication | `sk_live_...` |
| `CLERK_AUTHORIZED_PARTY` | No | `WEB_URL` | `src/auth/clerk.guard.ts` - JWT authorized party | `https://your-app.vercel.app` |
| `RESEND_API_KEY` | No | - | `src/email/email.service.ts` - Email sending (logs warning if unset) | `re_...` |
| `RESEND_FROM_EMAIL` | No | `noreply@redscroller.com` | `src/email/email.service.ts` - From address for emails | `noreply@yourdomain.com` |
| `SENTRY_DSN` | No | - | `src/instrument.ts` - Sentry error tracking (disabled if unset) | `https://...@sentry.io/...` |
| `NODE_ENV` | No | `development` | `src/instrument.ts` - Environment name | `production` |
| `SUPABASE_URL` | Yes | - | `src/documents/documents.controller.ts` - Supabase storage URL | `https://your-project.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | - | `src/documents/documents.controller.ts` - Supabase admin key | `eyJ...` |

## Web App Environment Variables (Vercel)

| Variable | Required | Default | Where Used | Example |
|----------|----------|---------|------------|---------|
| `NEXT_PUBLIC_API_URL` | No | `http://localhost:3001` | `utils/api.ts` - API base URL | `https://your-api.onrender.com` |
| `NEXT_PUBLIC_SENTRY_DSN` | No | - | `sentry.server.config.ts`, `sentry.edge.config.ts`, `instrumentation-client.ts` - Sentry error tracking (disabled if unset) | `https://...@sentry.io/...` |
| `SENTRY_DSN` | No | - | `sentry.server.config.ts`, `sentry.edge.config.ts` - Fallback for Sentry DSN | `https://...@sentry.io/...` |
| `SENTRY_ORG` | No | `redscroller` | `next.config.js` - Sentry organization slug | `redscroller` |
| `SENTRY_PROJECT` | No | `javascript-nextjs` | `next.config.js` - Sentry project name | `javascript-nextjs` |
| `NODE_ENV` | No | `development` | Sentry configs - Environment name | `production` |
| `CI` | No | - | `next.config.js` - CI flag for Sentry | `true` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | - | Clerk authentication (Next.js) | `pk_live_...` |
| `CLERK_SECRET_KEY` | Yes | - | Clerk authentication (server-side) | `sk_live_...` |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | No | `/login` | `app/login/[[...rest]]/page.tsx` - Sign-in route (`<SignIn path="/login">`) | `/login` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | No | `/sign-up` | `app/sign-up/[[...sign-up]]/page.tsx` - Sign-up route (`<SignUp path="/sign-up">`) | `/sign-up` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | No | `/dashboard` | `app/login/[[...rest]]/page.tsx` - `forceRedirectUrl` after sign-in | `/dashboard` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | No | `/dashboard` | `app/sign-up/[[...sign-up]]/page.tsx` - `forceRedirectUrl` after sign-up | `/dashboard` |

## Notes

- **CORS**: The API only allows requests from a single origin specified in `WEB_URL`. For production, set this to your Vercel app URL.
- **Optional Services**: The API will start and run without `RESEND_API_KEY` or `SENTRY_DSN`. Email functionality will be disabled with a log warning, and Sentry will be disabled.
- **Cold Starts**: The web app has a 60-second timeout for API calls to handle cold starts on free-tier hosting. Users see a friendly message during this period.
- **Health Check**: The API exposes an unauthenticated `GET /health` endpoint that returns `{"status":"ok"}` without touching the database.
- **Database**: Never run commands against the production database during development or testing.
