"use client"
import { useState } from 'react'
import { declineRequestAction } from './actions'

export default function DeclineButton({ requestId, onUpdate }: { requestId: string; onUpdate?: () => void }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'declined' | 'error'>('idle');

  const handleDecline = async () => {
    setStatus('loading');
    const res = await declineRequestAction(requestId);
    if (res.error) {
      alert(res.error);
      setStatus('error');
    } else {
      setStatus('declined');
      if (onUpdate) onUpdate();
    }
  }

  if (status === 'declined') return <span className="rs-status-badge rs-status-rejected">Declined</span>

  return (
    <button
      onClick={handleDecline}
      disabled={status === 'loading'}
      className="rs-button rs-button-secondary rs-button-sm"
    >
      {status === 'loading' ? 'Declining...' : 'Decline'}
    </button>
  )
}
