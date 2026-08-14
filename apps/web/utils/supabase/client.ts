import { getFreshClientToken } from '@/utils/auth-token'

// Compatibility adapter for existing client components during the Clerk migration.
export function createClient() {
  return {
    auth: {
      async getSession() {
        const token = await getFreshClientToken()
        return { data: { session: token ? { access_token: token } : null } }
      },
    },
  }
}
