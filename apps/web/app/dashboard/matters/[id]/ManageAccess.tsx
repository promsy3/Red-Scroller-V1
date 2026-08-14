"use client"
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { fetchApi } from '@/utils/api'

export default function ManageAccess({ matterId, isRestricted, initialAccess, token }: { matterId: string, isRestricted: boolean, initialAccess: any[], token: string }) {
  const [accessList, setAccessList] = useState(initialAccess)
  const [team, setTeam] = useState<any[]>([])
  const [selectedUser, setSelectedUser] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const loadTeam = async () => {
      try {
        const data = await fetchApi('/firms/members', token)
        setTeam(data || [])
      } catch (e) { }
    }
    if (isRestricted) loadTeam()
  }, [isRestricted, token])

  const handleGrant = async () => {
    if (!selectedUser) return
    setLoading(true)
    try {
      await fetchApi(`/matters/${matterId}/access`, token, {
        method: 'POST',
        body: JSON.stringify({ userId: selectedUser })
      })
      const user = team.find(u => u.id === selectedUser)
      setAccessList([...accessList, { userId: selectedUser, user }])
      setSelectedUser('')
    } catch (e) {
      alert("Failed to grant access")
    }
    setLoading(false)
  }

  const handleRevoke = async (userId: string) => {
    if (!confirm('Revoke access?')) return
    try {
      await fetchApi(`/matters/${matterId}/access/${userId}`, token, { method: 'DELETE' })
      setAccessList(accessList.filter(a => a.userId !== userId))
    } catch (e) {
      alert("Failed to revoke access")
    }
  }

  if (!isRestricted) return null

  return (
    <div className="rs-access-management">
      <h3 className="rs-access-management-title">
        <svg className="w-5 h-5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
        Ethical Wall: Restricted Matter
      </h3>
      <p className="rs-access-management-description">This matter is restricted. Only Firm Admins, the Assignee, and the following team members have access.</p>
      
      <div className="rs-access-list">
        {accessList.map(a => (
          <div key={a.userId} className="rs-access-item">
            <span className="rs-access-user-email">{a.user?.name || a.user?.email}</span>
            <button onClick={() => handleRevoke(a.userId)} className="rs-access-revoke-btn">Revoke</button>
          </div>
        ))}
        {accessList.length === 0 && <p className="rs-access-empty">No additional access granted.</p>}
      </div>

      <div className="rs-access-grant">
        <select 
          value={selectedUser} 
          onChange={e => setSelectedUser(e.target.value)} 
          disabled={loading} 
          className="rs-form-select"
        >
          <option value="">Select team member to grant access...</option>
          {team.filter(t => !accessList.some(a => a.userId === t.id)).map(t => (
            <option key={t.id} value={t.id}>{t.name || t.email} ({t.role})</option>
          ))}
        </select>
        <button 
          onClick={handleGrant} 
          disabled={!selectedUser || loading} 
          className="rs-button rs-button-primary"
        >
          Grant Access
        </button>
      </div>
    </div>
  )
}
