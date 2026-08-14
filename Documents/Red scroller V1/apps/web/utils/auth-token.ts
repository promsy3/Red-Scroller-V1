type ClerkSession = {
  getToken: (options?: { skipCache?: boolean }) => Promise<string | null>
}

declare global {
  interface Window {
    Clerk?: { session?: ClerkSession }
  }
}

/**
 * Refreshes Clerk's short-lived session token immediately before a browser-side
 * API request. Server-side calls use the token from the verified request cookie.
 * 
 * Clerk tokens have a 1-minute TTL by default. We skip the cache to ensure
 * we always get a fresh token, which helps avoid edge cases where a token
 * expires between being fetched and used.
 */
export async function getFreshClientToken(fallbackToken?: string): Promise<string> {
  if (typeof window === 'undefined') return fallbackToken ?? ''

  try {
    const token = await window.Clerk?.session?.getToken({ skipCache: true })
    return token ?? fallbackToken ?? ''
  } catch (error) {
    // If Clerk token refresh fails, fall back to the provided token
    console.warn('Failed to refresh Clerk token, using fallback:', error instanceof Error ? error.message : error)
    return fallbackToken ?? ''
  }
}
