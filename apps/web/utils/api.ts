import { getFreshClientToken } from '@/utils/auth-token'

export async function fetchApi(endpoint: string, token: string, options: RequestInit = {}) {
  const url = `http://localhost:3001${endpoint}`;
  
  const makeRequest = async (authToken: string): Promise<Response> => {
    return fetch(url, {
      ...options,
      cache: 'no-store',
      signal: options.signal ?? AbortSignal.timeout(10_000),
      headers: {
        ...options.headers,
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    });
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

  try {
    response = await makeRequest(authorizationToken);
  } catch (error) {
    const message = error instanceof Error && error.name === 'TimeoutError'
      ? 'The backend API did not respond within 10 seconds.'
      : 'Unable to reach the backend API.';
    throw new Error(message, { cause: error });
  }

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
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'API Error');
  }
  return response.json();
}
