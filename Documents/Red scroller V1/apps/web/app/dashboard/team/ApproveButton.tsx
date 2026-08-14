"use client"
import { useState } from 'react'
import { approveRequestAction } from './actions'

export default function ApproveButton({ requestId, onUpdate }: { requestId: string; onUpdate?: () => void }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'approved' | 'error'>('idle');

  const handleApprove = async () => {
    setStatus('loading');
    const res = await approveRequestAction(requestId);
    if (res.error) {
      alert(res.error);
      setStatus('error');
    } else {
      setStatus('approved');
      if (onUpdate) onUpdate();
    }
  }

  if (status === 'approved') return <span className="rs-status-badge rs-status-verified">Approved</span>

  return (
    <button 
      onClick={handleApprove}
      disabled={status === 'loading'}
      className="rs-button rs-button-primary rs-button-sm"
    >
      {status === 'loading' ? 'Approving...' : 'Approve'}
    </button>
  )
}
