# RedScroller

[![CI](https://github.com/promsy3/Red-Scroller-V1/actions/workflows/ci.yml/badge.svg)](https://github.com/promsy3/Red-Scroller-V1/actions/workflows/ci.yml)

A modern legal practice management system built with NestJS, Next.js, and PostgreSQL.

## Features

- **Multi-tenant Architecture**: Complete tenant isolation with Row-Level Security (RLS)
- **User Management**: Role-based access control (Admin, Lawyer, Paralegal)
- **Client Management**: Track clients with verification status
- **Matter Management**: Full case/matter tracking with restricted access support
- **Document Vault**: Secure document storage with access controls
- **Diary/Calendar**: Track court dates, filing deadlines, and meetings
- **Audit Logging**: Complete audit trail of all system actions
- **Email Notifications**: Automated notifications for key events
- **Real-time Search**: Fuzzy search across clients and matters

## Tech Stack

- **Backend**: NestJS, PostgreSQL, Prisma ORM
- **Frontend**: Next.js, React, Clerk Authentication
- **Storage**: Supabase (PostgreSQL + Storage)
- **Email**: Resend API

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Clerk account for authentication
- Resend account for email (optional)

### Installation

```bash
# Install dependencies
npm install

# Setup environment variables
# Copy .env.example files and configure them

# Run database migrations
cd packages/database
npx prisma db push

# Start development servers
npm run dev
```

### Environment Variables

See `.env.example` files in each app directory for required environment variables.

## Testing

```bash
# Run backend tests
cd apps/api
npm test

# Run e2e tests (including RLS access control)
npm run test:e2e

# Run frontend type check
cd apps/web
npm run check-types
```

## CI/CD

This project uses GitHub Actions for continuous integration. The CI pipeline:

- Runs on every push to `main` and every pull request
- Sets up a PostgreSQL test database
- Runs database migrations
- Executes backend unit tests
- Executes e2e tests including RLS access control tests
- Runs frontend TypeScript type checking
- Fails if any test fails

## Project Structure

```
apps/
  api/          # NestJS backend
  web/          # Next.js frontend
packages/
  database/     # Prisma schema and migrations
```

## License

UNLICENSED
