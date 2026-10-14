import { AuthenticateWithRedirectCallback } from '@clerk/nextjs'

export default function SSOCallbackPage() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <div style={{ textAlign: 'center' }}>
        <p>Completing sign in...</p>
        <AuthenticateWithRedirectCallback
          signInForceRedirectUrl="/dashboard"
          signUpForceRedirectUrl="/dashboard"
        />
      </div>
    </div>
  )
}
