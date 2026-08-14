"use client"
import { useState, useEffect, use } from 'react'
import { createClient } from '@/utils/supabase/client'
import { fetchApi } from '@/utils/api'
import Link from 'next/link'
import JoinFirmButton from './JoinFirmButton'
import { redirect } from 'next/navigation'

export default function JoinFirm({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const resolvedParams = use(searchParams)
  const [sessionToken, setSessionToken] = useState<string | null>(null)
  const [firms, setFirms] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [inviteStatus, setInviteStatus] = useState<'loading' | 'success' | 'error' | null>(null)
  const [inviteData, setInviteData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        redirect('/login')
        return
      }

      setSessionToken(session.access_token)

      // Handle invite token
      if (resolvedParams.token) {
        try {
          const data = await fetchApi(`/firms/invites/${resolvedParams.token}`, session.access_token);
          
          // Auto-join the firm via invite
          await fetchApi(`/firms/${data.firmId}/join`, session.access_token, {
            method: 'POST',
          });
          
          // Increment use count
          await fetchApi(`/firms/invites/${resolvedParams.token}/use`, session.access_token, {
            method: 'POST',
          });
          
          setInviteData(data)
          setInviteStatus('success')
          
          // Start polling for approval
          pollForApproval(session.access_token, data.firmId)
        } catch (error) {
          setInviteStatus('error')
        }
      } else {
        // Load available firms
        try {
          const firmsData = await fetchApi('/firms', session.access_token);
          setFirms(firmsData)
        } catch (error) {
          console.error(error);
        }
      }
      
      setLoading(false)
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
    }, 3000) // Poll every 3 seconds

    // Cleanup on unmount
    return () => clearInterval(interval)
  }

  const filteredFirms = firms.filter(firm =>
    firm.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
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

  return (
    <div className="rs-onboarding-content">
      <div>
        <p className="rs-onboarding-eyebrow">Join a Firm</p>
        <h1>Request access to an existing firm</h1>
        <p className="rs-onboarding-subtitle">An admin will approve your membership and assign your role.</p>
      </div>

      <div className="rs-search-container">
        <input
          type="text"
          placeholder="Search firms by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="rs-form-input"
        />
      </div>

      {filteredFirms.length === 0 ? (
        <div className="rs-empty-state">
          {searchQuery ? 'No firms match your search.' : 'No firms are available yet. Ask your practice lead to create the workspace first.'}
        </div>
      ) : (
        <div className="rs-firm-list">
          {filteredFirms.map((firm: any) => (
            <div key={firm.id} className="rs-firm-card">
              <div className="rs-firm-card-content">
                <h3 className="rs-firm-card-name">{firm.name}</h3>
                <p className="rs-firm-card-status">Status: {firm.status}</p>
              </div>
              <JoinFirmButton firmId={firm.id} />
            </div>
          ))}
        </div>
      )}

      <div className="rs-form-actions">
        <Link href="/onboarding" className="rs-button rs-button-secondary">Back</Link>
      </div>
    </div>
  )
}
