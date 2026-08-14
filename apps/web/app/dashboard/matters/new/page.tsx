"use client"
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { fetchApi } from '@/utils/api'

function NewMatterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedClientId = searchParams.get('clientId') || ''

  const [clients, setClients] = useState<any[]>([])
  const [form, setForm] = useState({ title: '', description: '', clientId: preselectedClientId, isRestricted: false })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [conflicts, setConflicts] = useState<any[]>([])
  const [conflictWarning, setConflictWarning] = useState(false)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const clients = await fetchApi('/clients', session.access_token)
      if (clients) setClients(clients)
    }
    load()
  }, [])

  // Check for conflicts debounced
  useEffect(() => {
    if (form.title.length < 3) {
      setConflicts([])
      return
    }
    const timer = setTimeout(async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      try {
        const data = await fetchApi(`/clients/conflicts?q=${encodeURIComponent(form.title)}`, session.access_token)
        if (data) setConflicts(data)
      } catch (error) {
        // Silently fail conflict check - non-blocking
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [form.title])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (conflicts.length > 0 && !conflictWarning) {
      setConflictWarning(true)
      return
    }

    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    try {
      const matter = await fetchApi('/matters', session.access_token, {
        method: 'POST',
        body: JSON.stringify(form),
      })
      router.push(`/dashboard/matters/${matter.id}`)
    } catch (e: any) {
      setError(e.message)
      setLoading(false)
    }
  }

  return (
    <>
      {error && <div className="rs-form-error">{error}</div>}
      
      {conflicts.length > 0 && (
        <div className="rs-conflict-banner">
          <h4 className="rs-conflict-banner-title">
            <svg className="w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            Potential Conflict of Interest Found
          </h4>
          <p className="rs-conflict-banner-text">We found {conflicts.length} similar record(s) in your firm registry:</p>
          <ul className="rs-conflict-banner-list">
            {conflicts.map((c, i) => <li key={i}>{c.name} ({c.type === 'client' ? c.clientType : 'matter'})</li>)}
          </ul>
          {conflictWarning && (
            <p className="rs-conflict-banner-confirm">⚠️ Please review the above. Click "Create Matter" again to confirm and proceed anyway.</p>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="rs-form-card rs-form-card-full">
        <div className="rs-form-field">
          <label className="rs-form-label">Client *</label>
          <select required value={form.clientId} onChange={e => setForm(f => ({...f, clientId: e.target.value}))} disabled={loading}
            className="rs-form-select">
            <option value="">Select a client...</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="rs-form-field">
          <label className="rs-form-label">Matter Title *</label>
          <input type="text" required value={form.title} onChange={e => {
            setForm(f => ({...f, title: e.target.value}))
            setConflictWarning(false)
            setConflicts([])
          }} disabled={loading}
            className="rs-form-input"
            placeholder="e.g. Property Purchase — 12 High St" />
        </div>
        <div className="rs-form-field full-width">
          <label className="rs-form-label">Description</label>
          <textarea rows={3} value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} disabled={loading}
            className="rs-form-textarea"
            placeholder="Optional notes about this matter..." />
        </div>
        
        <div className="rs-form-field full-width">
          <label className="rs-checkbox-group">
            <input type="checkbox" id="isRestricted" checked={form.isRestricted} onChange={e => setForm(f => ({...f, isRestricted: e.target.checked}))} />
            <div className="rs-checkbox-content">
              <span className="rs-checkbox-label">Enable Ethical Wall (Restricted Matter)</span>
              <span className="rs-checkbox-description">If enabled, this matter will only be visible to you and Firm Admins until you grant access to others.</span>
            </div>
          </label>
        </div>

        <div className="rs-form-actions">
          <button type="submit" disabled={loading} className="rs-button rs-button-primary">
            {loading ? 'Creating...' : (conflictWarning ? 'Confirm Create Matter' : 'Create Matter')}
          </button>
          <button type="button" onClick={() => router.back()} className="rs-button rs-button-secondary">Cancel</button>
        </div>
      </form>
    </>
  )
}

export default function NewMatter() {
  return (
    <div className="rs-new-matter-page">
      <h2 className="rs-page-title">New Matter</h2>
      <Suspense fallback={<div className="rs-loading">Loading form...</div>}>
        <NewMatterForm />
      </Suspense>
    </div>
  )
}
