"use client"
import { useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { joinFirmAction } from '../actions'
import { fetchApi } from '@/utils/api'
import { redirect } from 'next/navigation'

export default function JoinFirmButton({ firmId }: { firmId: string }) {
  const { getToken } = useAuth()
  const [status, setStatus] = useState<'idle' | 'loading' | 'requested' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleJoin = async () => {
    setStatus('loading');
    const res = await joinFirmAction(firmId);
    if (res.error) {
      setErrorMsg(res.error);
      setStatus('error');
    } else {
      setStatus('requested');
      // Start polling for approval
      pollForApproval(firmId);
    }
  }

  const pollForApproval = (firmId: string) => {
    const interval = setInterval(async () => {
      try {
        const token = await getToken()
        if (!token) return

        const user = await fetchApi('/auth/me', token)
        if (user.firmId === firmId) {
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

  if (status === 'requested') return <span className="rs-status-success">Request Sent! Waiting for approval...</span>
  if (status === 'error') return <span className="rs-status-error">{errorMsg}</span>

  return (
    <button 
      onClick={handleJoin}
      disabled={status === 'loading'}
      className="rs-button rs-button-primary"
    >
      {status === 'loading' ? 'Requesting...' : 'Request to Join'}
    </button>
  )
}
