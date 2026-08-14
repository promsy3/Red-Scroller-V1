"use client"
import { useState, useEffect } from 'react'
import { fetchApi } from '@/utils/api'

export default function CreateClientForm({ token }: { token: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', type: 'individual' as 'corporate' | 'individual' })
  
  const [similarClients, setSimilarClients] = useState<any[]>([])
  const [conflictWarning, setConflictWarning] = useState(false)
  
  // Check for similar clients debounced
  useEffect(() => {
    if (form.name.length < 2) {
      setSimilarClients([])
      return
    }
    const timer = setTimeout(async () => {
      try {
        const similar = await fetchApi(`/clients/similar?name=${encodeURIComponent(form.name)}`, token)
        setSimilarClients(similar)
      } catch (e) {
        setSimilarClients([])
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [form.name, token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (similarClients.length > 0 && !conflictWarning) {
      setConflictWarning(true)
      return
    }

    setLoading(true)
    setError(null)
    try {
      await fetchApi('/clients', token, {
        method: 'POST',
        body: JSON.stringify(form),
      })
      window.location.reload()
    } catch (e: any) {
      setError(e.message)
      setLoading(false)
    }
  }

  if (!open) return (
    <button onClick={() => setOpen(true)} className="rs-button rs-button-primary">
      + Add Client
    </button>
  )

  return (
    <div className="rs-form-card">
      <h3 className="rs-form-card-title">New Client</h3>
      
      {error && <p className="rs-form-error">{error}</p>}
      
      {similarClients.length > 0 && (
        <div className="rs-conflict-warning">
          <p className="rs-conflict-warning-title">Similar clients found:</p>
          <ul className="rs-conflict-warning-list">
            {similarClients.map(c => (
              <li key={c.id}>
                <strong>{c.name}</strong> ({Math.round(c.similarity * 100)}% match)
              </li>
            ))}
          </ul>
          <p className="rs-conflict-warning-note">Please confirm this isn't a duplicate or conflict.</p>
          {conflictWarning && (
            <p className="rs-conflict-warning-confirm">⚠️ Click "Save Client" again to confirm and proceed anyway.</p>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="rs-form-grid">
        <div className="rs-form-field">
          <label className="rs-form-label">Name *</label>
          <input type="text" required value={form.name} onChange={e => {
            setForm(f => ({...f, name: e.target.value}))
            setConflictWarning(false)
          }} disabled={loading}
            className="rs-form-input" placeholder="Acme Corp" />
        </div>
        <div className="rs-form-field">
          <label className="rs-form-label">Type *</label>
          <select 
            required 
            value={form.type} 
            onChange={e => setForm(f => ({...f, type: e.target.value as 'corporate' | 'individual'}))} 
            disabled={loading}
            className="rs-form-select"
          >
            <option value="individual">Individual</option>
            <option value="corporate">Corporate</option>
          </select>
        </div>
        <div className="rs-form-actions">
          <button type="submit" disabled={loading} className="rs-button rs-button-primary">
            {loading ? 'Saving...' : (conflictWarning ? 'Confirm Save Client' : 'Save Client')}
          </button>
          <button type="button" onClick={() => { setOpen(false); setForm({name:'', type: 'individual'}); setSimilarClients([]); setConflictWarning(false); }} className="rs-button rs-button-secondary">Cancel</button>
        </div>
      </form>
    </div>
  )
}