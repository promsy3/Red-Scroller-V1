"use client"
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { fetchApi } from '@/utils/api'
import { redirect } from 'next/navigation'
import ApproveButton from './ApproveButton'
import DeclineButton from './DeclineButton'
import RemoveMemberButton from './RemoveMemberButton'
import InviteLinkGenerator from './InviteLinkGenerator'

export default function TeamSettings() {
  const [user, setUser] = useState<any>(null)
  const [requests, setRequests] = useState<any[]>([])
  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [sessionToken, setSessionToken] = useState<string | null>(null)

  const loadData = async () => {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      redirect('/login')
      return
    }

    setSessionToken(session.access_token)

    try {
      const userData = await fetchApi('/auth/me', session.access_token)
      setUser(userData)

      // Always fetch members (all users can view the roster)
      const membersData = await fetchApi('/firms/members', session.access_token)
      setMembers(membersData)

      // Only fetch requests if admin
      if (userData.role === 'admin') {
        const requestsData = await fetchApi('/firms/requests', session.access_token)
        setRequests(requestsData)
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleRequestUpdate = () => {
    // Refresh data after approve/decline
    loadData()
  }

  const handleMemberUpdate = () => {
    // Refresh data after member removal
    loadData()
  }

  if (loading) {
    return (
      <div className="rs-loading">
        <div className="rs-spinner"></div>
        <p>Loading team settings...</p>
      </div>
    )
  }

  if (!user) {
    redirect('/onboarding')
    return null
  }

  const roleStyles: Record<string, string> = {
    admin: 'rs-role-badge rs-role-admin',
    lawyer: 'rs-role-badge rs-role-lawyer',
    paralegal: 'rs-role-badge rs-role-paralegal',
  }

  const memberCount = members.length
  const adminCount = members.filter((member: any) => member.role === 'admin').length
  const isAdmin = user.role === 'admin'

  return (
    <div className="rs-team-page">
      <div className="rs-team-header">
        <div>
          <h2 className="rs-team-title">Team Settings</h2>
          <p className="rs-team-subtitle">
            {isAdmin 
              ? 'Manage your firm roster, approvals, and access roles.' 
              : 'View your firm roster and member roles.'}
          </p>
        </div>
        {isAdmin && (
          <div className="rs-team-stats">
            {memberCount} active member{memberCount === 1 ? '' : 's'} · {adminCount} admin{adminCount === 1 ? '' : 's'}
          </div>
        )}
      </div>

      {isAdmin && sessionToken && (
        <div className="rs-team-invite-section">
          <InviteLinkGenerator token={sessionToken} />
        </div>
      )}

      {/* Pending Join Requests - Admin only */}
      {isAdmin && (
        <div className="rs-card">
          <h3 className="rs-card-title">Pending Join Requests</h3>

          {requests.length === 0 ? (
            <p className="rs-empty-state">No pending join requests.</p>
          ) : (
            <div className="rs-request-list">
              {requests.map((req: any) => (
                <div key={req.id} className="rs-request-item">
                  <div className="rs-request-info">
                    <p className="rs-request-email">{req.user.email}</p>
                    <p className="rs-request-subtitle">Requested to join your firm</p>
                  </div>
                  <div className="rs-request-actions">
                    <DeclineButton requestId={req.id} onUpdate={handleRequestUpdate} />
                    <ApproveButton requestId={req.id} onUpdate={handleRequestUpdate} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Current Members - All users can view */}
      <div className="rs-card">
        <h3 className="rs-card-title">Current Members</h3>

        {members.length === 0 ? (
          <p className="rs-empty-state">No active members yet.</p>
        ) : (
          <div className="rs-member-list">
            {members.map((member: any) => (
              <div key={member.id} className="rs-member-item">
                <div className="rs-member-info">
                  <p className="rs-member-email">{member.name || member.email}</p>
                  <div className="rs-member-role">
                    <span className={roleStyles[member.role] || 'rs-role-badge'}>
                      {member.role}
                    </span>
                    {member.role === 'admin' ? <span className="rs-member-note">Can manage firm settings</span> : <span className="rs-member-note">Can work on matters</span>}
                  </div>
                </div>
                {/* Remove button - Admin only */}
                {isAdmin && member.id !== user.id && (
                  <RemoveMemberButton firmId={user.firm?.id || ''} userId={member.id} onUpdate={handleMemberUpdate} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
