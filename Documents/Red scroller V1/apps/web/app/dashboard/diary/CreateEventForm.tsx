"use client"
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { fetchApi } from '@/utils/api'

export default function CreateEventForm({ matters, token }: { matters: any[], token: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [form, setForm] = useState({ title: '', description: '', date: '', type: 'meeting' as 'meeting' | 'court_date' | 'filing_deadline', matterId: '' })
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    try {
      await fetchApi('/diary', token, {
        method: 'POST',
        body: JSON.stringify(form),
      })
      setOpen(false)
      setForm({ title: '', description: '', date: '', type: 'meeting', matterId: '' })
      router.refresh()
    } catch (e: any) {
      setError(e.message)
    }
    setLoading(false)
  }

  if (!open) return (
    <button onClick={() => setOpen(true)} className="rs-button rs-button-primary">
      + New Event
    </button>
  )

  return (
    <div className="rs-modal-overlay">
      <div className="rs-modal-content">
        <h3 className="rs-modal-title">Add to Diary</h3>
        
        {error && <p className="rs-form-error">{error}</p>}
        
        <form onSubmit={handleSubmit} className="rs-form">
          <div className="rs-form-group">
            <label className="rs-form-label">Event Title *</label>
            <input 
              type="text" 
              required 
              value={form.title} 
              onChange={e => setForm(f => ({...f, title: e.target.value}))} 
              disabled={loading}
              className="rs-form-input"
              placeholder="e.g. Court Hearing" 
            />
          </div>
          
          <div className="rs-form-group">
            <label className="rs-form-label">Event Type *</label>
            <select 
              value={form.type} 
              onChange={e => setForm(f => ({...f, type: e.target.value as any}))} 
              disabled={loading}
              className="rs-form-select"
            >
              <option value="meeting">Meeting</option>
              <option value="court_date">Court Date</option>
              <option value="filing_deadline">Filing Deadline</option>
            </select>
          </div>
          
          <div className="rs-form-group">
            <label className="rs-form-label">Date & Time *</label>
            <input 
              type="datetime-local" 
              required 
              value={form.date} 
              onChange={e => setForm(f => ({...f, date: e.target.value}))} 
              disabled={loading}
              className="rs-form-input"
            />
          </div>

          <div className="rs-form-group">
            <label className="rs-form-label">Related Matter (Optional)</label>
            <select 
              value={form.matterId} 
              onChange={e => setForm(f => ({...f, matterId: e.target.value}))} 
              disabled={loading}
              className="rs-form-select"
            >
              <option value="">-- None --</option>
              {matters.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
            </select>
          </div>

          <div className="rs-form-group">
            <label className="rs-form-label">Description (Optional)</label>
            <textarea 
              rows={2} 
              value={form.description} 
              onChange={e => setForm(f => ({...f, description: e.target.value}))} 
              disabled={loading}
              className="rs-form-textarea"
              placeholder="Notes..." 
            />
          </div>
          
          <div className="rs-form-actions">
            <button type="button" onClick={() => setOpen(false)} disabled={loading} className="rs-button rs-button-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="rs-button rs-button-primary">
              {loading ? 'Saving...' : 'Save Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
