"use client"
import { useState } from 'react'
import { removeMemberAction } from './actions'

export default function RemoveMemberButton({ firmId, userId, onUpdate }: { firmId: string; userId: string; onUpdate?: () => void }) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'removed' | 'error'>('idle');

  const handleRemove = async () => {
    if (!confirm('Remove this member from the firm?')) return;
    setStatus('loading');
    const res = await removeMemberAction(firmId, userId);
    if (res.error) {
      alert(res.error);
      setStatus('error');
    } else {
      setStatus('removed');
      if (onUpdate) onUpdate();
    }
  }

  if (status === 'removed') return <span className="rs-status-badge rs-status-rejected">Removed</span>

  return (
    <button
      onClick={handleRemove}
      disabled={status === 'loading'}
      className="rs-button rs-button-danger rs-button-sm"
    >
      {status === 'loading' ? 'Removing...' : 'Remove'}
    </button>
  )
}
