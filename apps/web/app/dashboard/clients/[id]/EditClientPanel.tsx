"use client"
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { fetchApi } from '@/utils/api'

type EditClientPanelProps = {
  clientId: string
  token: string
  initialName: string
  initialType: 'corporate' | 'individual'
  initialVerificationStatus: 'pending' | 'verified' | 'rejected'
  onSaved?: (updated: any) => void
  onCancel?: () => void
  autoOpen?: boolean
}

export default function EditClientPanel(props: EditClientPanelProps) {
  const { clientId, token, initialName, initialType, initialVerificationStatus, onSaved, onCancel, autoOpen } = props
  const router = useRouter()

  const [open, setOpen] = useState(Boolean(autoOpen))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: initialName,
    type: initialType as 'corporate' | 'individual',
    verificationStatus: initialVerificationStatus as 'pending' | 'verified' | 'rejected'
  })

  const openPanel = () => {
    setForm({ name: initialName, type: initialType, verificationStatus: initialVerificationStatus })
    setError(null)
    setSuccess(null)
    setOpen(true)
  }

  const closePanel = () => {
    setOpen(false)
    setError(null)
    setSuccess(null)
    if (onCancel) onCancel()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) {
      setError('Your session is not ready. Please refresh and try again.')
      return
    }
    if (!form.name.trim()) {
      setError('Client name is required.')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      const body: any = {
        name: form.name.trim(),
        type: form.type,
        verificationStatus: form.verificationStatus,
      }
      const updated = await fetchApi(`/clients/${clientId}`, token, {
        method: 'PATCH',
        body: JSON.stringify(body),
      })
      setSuccess('Client updated successfully.')
      if (onSaved) {
        onSaved(updated)
      } else {
        router.refresh()
      }
      setOpen(false)
      setSuccess(null)
    } catch (e: any) {
      setError(e?.message || 'Unable to update client. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button type="button" onClick={openPanel} className="rs-button rs-button-secondary">
        Edit Client
      </button>

      {open && (
        <div className="rs-modal-overlay" role="presentation" onMouseDown={() => !loading && closePanel()}>
          <section className="rs-modal-content" role="dialog" aria-modal="true" aria-labelledby="edit-client-title" onMouseDown={event => event.stopPropagation()}>
            <div className="rs-modal-header">
              <div>
                <p className="rs-modal-eyebrow">Client</p>
                <h2 id="edit-client-title" className="rs-modal-title">Edit Client</h2>
              </div>
              <button type="button" className="rs-modal-close" onClick={closePanel} disabled={loading} aria-label="Close edit dialog">×</button>
            </div>

            {error && <p className="rs-form-error">{error}</p>}
            {success && <p className="rs-conflict-warning-note" style={{ color: '#047857' }}>{success}</p>}

            <form onSubmit={handleSubmit} className="rs-form-grid">
              <div className="rs-form-field">
                <label className="rs-form-label">Name *</label>
                <input
                  type="text"
                  required
                  className="rs-form-input"
                  value={form.name}
                  disabled={loading}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="rs-form-field">
                <label className="rs-form-label">Type *</label>
                <select
                  required
                  className="rs-form-select"
                  value={form.type}
                  disabled={loading}
                  onChange={e => setForm(f => ({ ...f, type: e.target.value as 'corporate' | 'individual' }))}
                >
                  <option value="individual">Individual</option>
                  <option value="corporate">Corporate</option>
                </select>
              </div>
              <div className="rs-form-field full-width">
                <label className="rs-form-label">Verification Status</label>
                <select
                  className="rs-form-select"
                  value={form.verificationStatus}
                  disabled={loading}
                  onChange={e => setForm(f => ({ ...f, verificationStatus: e.target.value as any }))}
                >
                  <option value="pending">Pending</option>
                  <option value="verified">Verified</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div className="rs-form-actions">
                <button type="submit" disabled={loading} className="rs-button rs-button-primary">
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
                <button type="button" onClick={closePanel} disabled={loading} className="rs-button rs-button-secondary">
                  Cancel
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  )
}
