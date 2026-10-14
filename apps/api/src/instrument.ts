// NOTE: must load .env BEFORE Sentry.init — main.ts imports this file
// before 'dotenv/config', so without this SENTRY_DSN is undefined at
// init time and the SDK silently disables itself (enabled: false).
import "dotenv/config";
import * as Sentry from "@sentry/nestjs";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || "development",
  enabled: !!process.env.SENTRY_DSN,
  integrations: [nodeProfilingIntegration()],
  // Tracing - lower in production to control costs
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  // Profiling - only sampled when tracing
  profileSessionSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  profileLifecycle: "trace",
  // Send PII only if explicitly needed; keep defaults safe
  // Uncomment to disable user/IP collection:
  // sendDefaultPii: false,
});