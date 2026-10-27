import { getFreshClientToken } from './auth-token'

// Custom error class for service unavailability (503)
export class ServiceUnavailableError extends Error {
  constructor(message: string = 'Service temporarily unavailable. Please retry.') {
    super(message);
    this.name = 'ServiceUnavailableError';
  }
}

// Waking state for cold starts
export interface FetchApiOptions extends RequestInit {
  onWaking?: () => void;
}

// How long to wait before telling the user the demo is waking up. The
// request keeps running; this only flips the UI into the "waking" state.
export const WAKING_DELAY_MS = 5_000;
// Hard timeout for a single API request (covers a full cold start).
export const REQUEST_TIMEOUT_MS = 60_000;

export const WAKING_MESSAGE =
  'Waking up the demo, this can take up to a minute on first load. Please wait...';
export const TIMEOUT_MESSAGE =
  'The demo did not respond within 60 seconds. The server may still be waking up - please refresh the page and try again.';

export async function fetchApi(endpoint: string, token: string, options: FetchApiOptions = {}) {
  const url = `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}${endpoint}`;

  const makeRequest = async (authToken: string): Promise<Response> => {
    // Use AbortController + setTimeout (instead of AbortSignal.timeout) so the
    // 60s deadline is driven by the same timer machinery as the 5s waking
    // delay, and so tests can control it deterministically.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort(new DOMException('The request timed out.', 'TimeoutError'));
    }, REQUEST_TIMEOUT_MS);
    try {
      return await fetch(url, {
        ...options,
        cache: 'no-store',
        signal: options.signal ?? controller.signal,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });
    } finally {
      clearTimeout(timeoutId);
    }
  };

  let response: Response;
  let authorizationToken: string;

  // Use the token directly for server-side calls (token already fresh from @clerk/nextjs/server)
  // Only attempt client-side refresh for browser calls
  if (typeof window !== 'undefined') {
    authorizationToken = await getFreshClientToken(token);
  } else {
    authorizationToken = token;
  }

  // Set up the "waking up" timer (5 seconds). This runs for both client and
  // server environments: on the client the callback flips component state,
  // on the server it lets callers (or the loading.tsx fallback) observe it.
  let wakingTimer: NodeJS.Timeout | null = null;
  if (options.onWaking) {
    wakingTimer = setTimeout(() => {
      options.onWaking!();
    }, WAKING_DELAY_MS);
  }

  try {
    response = await makeRequest(authorizationToken);
  } catch (error) {
    if (wakingTimer) clearTimeout(wakingTimer);
    const message = error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')
      ? TIMEOUT_MESSAGE
      : 'Unable to reach the backend API.';
    throw new Error(message, { cause: error });
  }

  if (wakingTimer) clearTimeout(wakingTimer);

  // If we get a 401 (unauthorized), try once more with a fresh token
  // This handles the edge case where a token expires between being fetched and used
  if (response.status === 401 && typeof window !== 'undefined') {
    try {
      const freshToken = await getFreshClientToken(token);
      if (freshToken !== authorizationToken) {
        response = await makeRequest(freshToken);
      }
    } catch (retryError) {
      // If retry fails, proceed with original error
    }
  }

  if (!response.ok) {
    const rawBody = await response.text();
    console.error(`[fetchApi ERROR] ${response.status} ${response.statusText} at ${url}`);
    console.error(`[fetchApi ERROR BODY]`, rawBody);
    let error: any = {};
    try {
      error = JSON.parse(rawBody);
    } catch (e) {}

    // Special handling for 503 Service Unavailable
    if (response.status === 503) {
      throw new ServiceUnavailableError(error.message || 'Service temporarily unavailable. Please retry.');
    }

    throw new Error(error.message || 'API Error');
  }
  return response.json();
}
