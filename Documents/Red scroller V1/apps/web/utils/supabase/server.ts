import { auth } from '@clerk/nextjs/server'

// Compatibility adapter while feature pages are migrated off the former Supabase helper.
export async function createClient() {
  return {
    auth: {
      async getSession() {
        const { userId, getToken } = await auth()
        return { data: { session: userId ? { access_token: (await getToken()) || '' } : null } }
      },
      async signOut() { return { error: null } },
      async exchangeCodeForSession(_code: string) { return { error: null } },
    },
  }
}
