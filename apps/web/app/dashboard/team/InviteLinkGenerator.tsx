"use client"
import { useState } from 'react'
import { fetchApi } from '@/utils/api'

export default function InviteLinkGenerator({ token }: { token: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleGenerate = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchApi('/firms/invites', token, {
        method: 'POST',
        body: JSON.stringify({ expiresInDays: 7 }),
      })
      setInviteUrl(result.inviteUrl)
    } catch (e: any) {
      setError(e.message || 'Failed to generate invite link')
    }
    setLoading(false)
  }

  const handleCopy = () => {
    if (inviteUrl) {
      navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (!open) return (
    <button onClick={() => setOpen(true)} className="rs-button rs-button-primary">
      Generate Invite Link
    </button>
  )

  return (
    <div className="rs-form-card">
      <h3 className="rs-form-card-title">Generate Invite Link</h3>
      
      {error && <p className="rs-form-error">{error}</p>}

      {!inviteUrl ? (
        <div className="rs-form-actions">
          <button onClick={handleGenerate} disabled={loading} className="rs-button rs-button-primary">
            {loading ? 'Generating...' : 'Generate 7-Day Invite Link'}
          </button>
          <button onClick={() => setOpen(false)} className="rs-button rs-button-secondary">Cancel</button>
        </div>
      ) : (
        <div className="rs-invite-result">
          <p className="rs-invite-label">Share this link with new team members:</p>
          <div className="rs-invite-url-container">
            <input 
              type="text" 
              readOnly 
              value={inviteUrl} 
              className="rs-invite-url-input"
            />
            <button onClick={handleCopy} className="rs-button rs-button-secondary">
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <p className="rs-invite-note">This link expires in 7 days and can be used unlimited times.</p>
          <button onClick={() => { setOpen(false); setInviteUrl(null); }} className="rs-button rs-button-secondary">
            Done
          </button>
        </div>
      )}
    </div>
  )
}