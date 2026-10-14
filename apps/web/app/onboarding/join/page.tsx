"use client"
import { useState, useEffect, use } from 'react'
import { useAuth } from '@clerk/nextjs'
import { fetchApi } from '@/utils/api'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export default function JoinFirm({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const resolvedParams = use(searchParams)
  const { getToken } = useAuth()
  const [sessionToken, setSessionToken] = useState<string | null>(null)
  const [inviteStatus, setInviteStatus] = useState<'loading' | 'success' | 'error' | 'no-token' | null>(null)
  const [inviteData, setInviteData] = useState<any>(null)

  useEffect(() => {
    const init = async () => {
      const token = await getToken()

      if (!token) {
        redirect('/login')
        return
      }

      setSessionToken(token)

      if (resolvedParams.token) {
        setInviteStatus('loading')
        try {
          const data = await fetchApi(`/firms/invites/${resolvedParams.token}`, token)

          // Auto-join the firm via invite
          await fetchApi(`/firms/${data.firmId}/join`, token, {
            method: 'POST',
          })

          // Increment use count
          await fetchApi(`/firms/invites/${resolvedParams.token}/use`, token, {
            method: 'POST',
          })

          setInviteData(data)
          setInviteStatus('success')

          // Start polling for approval
          pollForApproval(token, data.firmId)
        } catch (error) {
          setInviteStatus('error')
        }
      } else {
        // No invite token — direct the user to get one from their admin
        setInviteStatus('no-token')
      }
    }

    init()
  }, [resolvedParams.token])

  const pollForApproval = (token: string, firmId: string) => {
    const interval = setInterval(async () => {
      try {
        const user = await fetchApi('/auth/me', token)
        if (user.firmId) {
          clearInterval(interval)
          redirect('/dashboard')
        }
      } catch (error) {
        console.error('Polling error:', error)
      }
    }, 3000)

    return () => clearInterval(interval)
  }

  if (inviteStatus === 'loading' || inviteStatus === null) {
    return (
      <div className="rs-loading">
        <div className="rs-spinner"></div>
        <p>Loading...</p>
      </div>
    )
  }

  if (inviteStatus === 'success') {
    return (
      <div className="rs-onboarding-content">
        <div>
          <p className="rs-onboarding-eyebrow">Invite Accepted</p>
          <h1>Membership Requested</h1>
          <p className="rs-onboarding-subtitle">You've successfully requested to join <strong>{inviteData.firmName}</strong>. An admin will approve your membership shortly.</p>
        </div>
        <div className="rs-polling-indicator">
          <div className="rs-spinner"></div>
          <p>Waiting for approval...</p>
        </div>
      </div>
    )
  }

  if (inviteStatus === 'error') {
    return (
      <div className="rs-onboarding-content">
        <div>
          <p className="rs-onboarding-eyebrow">Invalid Invite</p>
          <h1>Invite Link Error</h1>
          <p className="rs-onboarding-subtitle">This invite link is invalid, expired, or has reached its maximum uses. Please contact your firm admin for a new invite.</p>
        </div>
        <div className="rs-form-actions">
          <Link href="/onboarding" className="rs-button rs-button-secondary">Back to Onboarding</Link>
        </div>
      </div>
    )
  }

  // no-token state — invite-only
  return (
    <div className="rs-onboarding-content">
      <div>
        <p className="rs-onboarding-eyebrow">Join a Firm</p>
        <h1>You need an invite link</h1>
        <p className="rs-onboarding-subtitle">
          Joining a firm requires an invite link from a firm admin. Ask your practice lead or firm administrator to generate one from their team settings.
        </p>
        <p className="rs-onboarding-subtitle" style={{ marginTop: '8px', opacity: 0.7, fontSize: '14px' }}>
          Once you have a link, open it directly and you'll be guided through the process automatically.
        </p>
      </div>
      <div className="rs-form-actions">
        <Link href="/onboarding" className="rs-button rs-button-secondary">Back</Link>
      </div>
    </div>
  )
}
