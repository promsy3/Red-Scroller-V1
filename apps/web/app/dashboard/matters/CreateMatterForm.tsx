"use client"
import { useState, useEffect } from 'react'
import { fetchApi } from '@/utils/api'

export default function CreateMatterForm({ token, clients }: { token: string; clients: any[] }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ title: '', clientId: '', description: '', isRestricted: false })
  const [similarMatters, setSimilarMatters] = useState<any[]>([])

  useEffect(() => {
    const checkSimilar = async () => {
      if (form.title.length < 2) {
        setSimilarMatters([])
        return
      }
      try {
        const similar = await fetchApi(`/matters/similar?title=${encodeURIComponent(form.title)}`, token)
        setSimilarMatters(similar)
      } catch {
        setSimilarMatters([])
      }
    }
    const timeoutId = setTimeout(checkSimilar, 300)
    return () => clearTimeout(timeoutId)
  }, [form.title, token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!form.clientId) {
      setError('Please select a client')
      return
    }

    setLoading(true)
    setError(null)
    try {
      await fetchApi('/matters', token, {
        method: 'POST',
        body: JSON.stringify({
          title: form.title,
          clientId: form.clientId,
          description: form.description || undefined,
          isRestricted: form.isRestricted,
          status: 'pending', // Default to pending status
        }),
      })
      window.location.reload()
    } catch (e: any) {
      setError(e.message)
      setLoading(false)
    }
  }

  if (!open) return (
    <button onClick={() => setOpen(true)} className="rs-button rs-button-primary">
      + New Matter
    </button>
  )

  return (
    <div className="rs-form-card">
      <h3 className="rs-form-card-title">New Matter</h3>
      
      {error && <p className="rs-form-error">{error}</p>}

      {similarMatters.length > 0 && (
        <div className="rs-conflict-warning">
          <p className="rs-conflict-warning-title">Similar matters found:</p>
          <ul className="rs-conflict-warning-list">
            {similarMatters.map(m => (
              <li key={m.id}>
                <strong>{m.title}</strong> ({Math.round(m.similarity * 100)}% match)
              </li>
            ))}
          </ul>
          <p className="rs-conflict-warning-note">Please confirm this isn't a duplicate or conflict.</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="rs-form-grid">
        <div className="rs-form-field">
          <label className="rs-form-label">Title *</label>
          <input 
            type="text" 
            required 
            value={form.title} 
            onChange={e => setForm(f => ({...f, title: e.target.value}))} 
            disabled={loading}
            className="rs-form-input" 
            placeholder="Case title" 
          />
        </div>
        <div className="rs-form-field">
          <label className="rs-form-label">Client *</label>
          <select 
            required 
            value={form.clientId} 
            onChange={e => setForm(f => ({...f, clientId: e.target.value}))} 
            disabled={loading}
            className="rs-form-select"
          >
            <option value="">Select a client...</option>
            {clients.map(client => (
              <option key={client.id} value={client.id}>
                {client.name} ({client.type})
              </option>
            ))}
          </select>
        </div>
        <div className="rs-form-field full-width">
          <label className="rs-form-label">Description</label>
          <textarea 
            value={form.description} 
            onChange={e => setForm(f => ({...f, description: e.target.value}))} 
            disabled={loading}
            className="rs-form-textarea" 
            placeholder="Brief description of the matter..."
            rows={3}
          />
        </div>
        <div className="rs-form-field full-width">
          <label className="rs-checkbox-group">
            <input 
              type="checkbox" 
              checked={form.isRestricted} 
              onChange={e => setForm(f => ({...f, isRestricted: e.target.checked}))} 
              disabled={loading}
            />
            <div className="rs-checkbox-content">
              <span className="rs-checkbox-label">Enable Ethical Wall (Restricted Matter)</span>
              <span className="rs-checkbox-description">Restrict access to only assigned team members. Requires explicit access grants for others to view this matter.</span>
            </div>
          </label>
        </div>
        <div className="rs-form-actions">
          <button type="submit" disabled={loading} className="rs-button rs-button-primary">
            {loading ? 'Creating...' : 'Create Matter'}
          </button>
          <button type="button" onClick={() => { setOpen(false); setForm({title:'', clientId:'', description:'', isRestricted: false}); }} className="rs-button rs-button-secondary">Cancel</button>
        </div>
      </form>
    </div>
  )
}