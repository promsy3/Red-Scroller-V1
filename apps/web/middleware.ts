import { clerkMiddleware } from '@clerk/nextjs/server'

// Clerk needs to run for request context. Access control intentionally lives
// in the server layouts that own protected application areas; auth.protect()
// can rewrite a missing Clerk development-browser handshake to an internal
// URL, which Next then renders as a misleading 404.
export default clerkMiddleware()

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
