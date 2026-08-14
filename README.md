# RedScroller

A multi-tenant legal case management SaaS for law firms — case/client/matter management, secure document storage, and role-based ethical-wall access control, built to replace fragmented legacy systems.

## Overview

RedScroller gives law firms a single, secure workspace for:
- **Diary/Calendar** — court dates, filing deadlines, client meetings
- **Client Registry** — a searchable directory of clients, with conflict-of-interest checking on new entries
- **Matters Ledger** — case tracking with optional **ethical wall (restricted matter)** access control, so sensitive matters are only visible to explicitly assigned team members and Firm Admins
- **Secure Vault** — document storage scoped to matter-level access, with full audit logging
- **Team Management** — invite-link-based onboarding, admin approval workflow, and role-based permissions (Admin / Lawyer / Paralegal)
- **Audit Log** — a compliance-facing record of every write action and document access, exportable to CSV

The app is built mobile-first — every page is designed to be fully usable on a phone, not just desktop.

## Tech Stack

- **Frontend:** Next.js (React), Tailwind CSS, TanStack Query
- **Backend:** NestJS — REST APIs, guards, JWT verification
- **Database:** PostgreSQL (Supabase-hosted), Prisma ORM
- **Auth:** Clerk (JWT via JWKS), with Organizations mapping to Firms
- **Storage:** S3-backed Secure Vault with signed, time-limited URLs
- **Monorepo:** Turborepo, with a shared types package for a future React Native mobile client

## Security Model

RedScroller enforces access control in two layers, per the project's Technical Requirements Document:

1. **Application-level (NestJS guards/interceptors):** every request derives `firmId` and role from the verified Clerk JWT — never from client-supplied input. Restricted matters are gated by an explicit `MatterAccess` grant.
2. **Database-level (PostgreSQL Row Level Security):** RLS policies on all tenant-scoped tables (`Client`, `Matter`, `Document`, `DiaryEvent`, `AuditLog`) as defense-in-depth, filtering on the session's `firmId` claim.

Every write action, and every document view/download, is recorded in an immutable audit log.

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment variables
# apps/web/.env.local — NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
# apps/api/.env — CLERK_SECRET_KEY, DATABASE_URL, DIRECT_URL

# Run database migrations
cd packages/database
npx prisma migrate deploy

# Start the backend
cd apps/api
npm run dev

# Start the frontend (separate terminal)
cd apps/web
npm run dev
```

The app runs at `http://localhost:3000`.

## Project Documentation

Full project documentation lives in `/docs`:
- `PRD.md` — Product Requirements Document
- `TRD.md` — Technical Requirements Document
- `dev-plan.md` — Phased development plan

## Project Status

RedScroller is currently in **pilot phase**. Core MVP features (auth, team management, clients, matters with ethical walls, diary, secure vault, conflict-of-interest checking) are built and under active testing. See the in-app Compliance page for current security/certification roadmap status.

## License

Proprietary — all rights reserved.
