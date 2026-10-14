"use client"
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { fetchApi } from '@/utils/api'

type DeleteClientButtonProps = {
  clientId: string
  clientName: string
  token: string
  mattersCount?: number
  onDeleted?: () => void
}

export default function DeleteClientButton(props: DeleteClientButtonProps) {
  const { clientId, clientName, token, mattersCount = 0, onDeleted } = props
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const openConfirm = () => {
    setError(null)
    setOpen(true)
  }
  const close = () => {
    if (loading) return
    setOpen(false)
    setError(null)
  }

  const handleConfirmDelete = async () => {
    if (!token) {
      setError('Your session is not ready. Please refresh and try again.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const response = await fetchApi(`/clients/${clientId}`, token, {
        method: 'DELETE',
      })
      if (onDeleted) onDeleted()
      setOpen(false)
      router.push('/dashboard/clients')
      router.refresh()
    } catch (e: any) {
      const message = e?.message || 'Unable to delete client. Please try again.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openConfirm}
        className="rs-button rs-button-danger"
      >
        Delete Client
      </button>

      {open && (
        <div className="rs-modal-overlay" role="presentation" onMouseDown={() => !loading && close()}>
          <section className="rs-modal-content" role="dialog" aria-modal="true" aria-labelledby="delete-client-title" onMouseDown={event => event.stopPropagation()}>
            <div className="rs-modal-header">
              <div>
                <p className="rs-modal-eyebrow">Delete client</p>
                <h2 id="delete-client-title" className="rs-modal-title">Delete &ldquo;{clientName}&rdquo;?</h2>
              </div>
              <button type="button" className="rs-modal-close" onClick={close} disabled={loading} aria-label="Close dialog">×</button>
            </div>

            {error && <p className="rs-form-error">{error}</p>}

            <p style={{ margin: '12px 0 12px 0', color: 'var(--text-primary)' }}>
              This action cannot be undone.
            </p>

            {mattersCount > 0 && (
              <div className="rs-conflict-warning" style={{ marginBottom: '12px' }}>
                <p className="rs-conflict-warning-title">This client has {mattersCount} linked matter{mattersCount !== 1 ? 's' : ''}.</p>
                <p className="rs-conflict-warning-note">
                  You must remove or reassign linked matters before this client can be deleted.
                </p>
              </div>
            )}

            <div className="rs-form-actions">
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={loading || mattersCount > 0}
                className="rs-button rs-button-danger"
              >
                {loading ? 'Deleting...' : 'Confirm Delete'}
              </button>
              <button type="button" onClick={close} disabled={loading} className="rs-button rs-button-secondary">
                Cancel
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  )
}
