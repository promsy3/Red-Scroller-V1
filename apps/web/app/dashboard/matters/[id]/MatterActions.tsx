"use client"
import { useState } from 'react'
import { fetchApi } from '@/utils/api'

type Status = 'active' | 'pending' | 'closed'

export default function MatterActions({ matterId, currentStatus, token }: { matterId: string; currentStatus: Status; token: string }) {
  const [status, setStatus] = useState<Status>(currentStatus)
  const [loading, setLoading] = useState(false)

  const updateStatus = async (newStatus: Status) => {
    if (newStatus === status) return
    setLoading(true)
    try {
      await fetchApi(`/matters/${matterId}`, token, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      })
      setStatus(newStatus)
    } finally {
      setLoading(false)
    }
  }

  const statuses: Status[] = ['active', 'pending', 'closed']

  return (
    <div className="rs-info-card">
      <p className="rs-info-label">Change Status</p>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {statuses.map(s => (
          <button 
            key={s} 
            onClick={() => updateStatus(s)} 
            disabled={loading}
            className={`rs-button rs-button-sm ${status === s ? 'rs-button-primary' : 'rs-button-secondary'}`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>
    </div>
  )
}
