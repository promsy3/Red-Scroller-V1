import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher(['/login(.*)', '/sign-up(.*)'])

export default clerkMiddleware((auth, req) => {
  if (isPublicRoute(req)) {
    return
  }
  auth().protect()
})

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
}
