import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export default async function Home() {
  const { userId } = await auth()
  
  if (!userId) {
    redirect('/login')
  }
  
  // Authenticated users should be on dashboard or onboarding
  // Clerk's forceRedirectUrl handles this, but provide fallback
  redirect('/dashboard')
}
