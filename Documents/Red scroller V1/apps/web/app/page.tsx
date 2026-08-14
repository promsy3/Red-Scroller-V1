import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { fetchApi } from '@/utils/api'

export default async function Home() {
  const supabase = await createClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return redirect('/login')
  }

  // Fetch the user from NestJS API (which creates the stub if needed).
  // Keep redirects outside the catch: Next implements redirect() by throwing
  // a NEXT_REDIRECT control-flow error.
  let user: { firmId: string | null };
  try {
    user = await fetchApi('/auth/me', session.access_token);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to authenticate with the backend API.';
    console.error('Failed to fetch user:', error);
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-gray-50">
        <div className="bg-red-50 p-6 rounded text-center text-red-600 max-w-md">
          <h2 className="font-bold text-lg mb-2">Connection Error</h2>
          <p>{message} Ensure NestJS is running on port 3001.</p>
        </div>
      </div>
    );
  }

  if (!user.firmId) {
    redirect('/onboarding');
  }

  redirect('/dashboard');
}
