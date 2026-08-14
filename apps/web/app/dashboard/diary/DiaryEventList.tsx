"use client"

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { fetchApi } from '@/utils/api'

type Matter = { id: string; title: string }
type DiaryEvent = {
  id: string
  title: string
  description?: string | null
  date: string
  type: 'meeting' | 'court_date' | 'filing_deadline'
  matterId?: string | null
  matter?: Matter | null
}

function toDateTimeLocal(value: string) {
  const date = new Date(value)
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

const eventTypeColors: Record<string, string> = {
  meeting: 'rs-event-type-meeting',
  court_date: 'rs-event-type-court',
  filing_deadline: 'rs-event-type-filing',
}

const eventTypeLabels: Record<string, string> = {
  meeting: 'Meeting',
  court_date: 'Court Date',
  filing_deadline: 'Filing Deadline',
}

export default function DiaryEventList({ events, matters, token }: { events: DiaryEvent[]; matters: Matter[]; token: string }) {
  const router = useRouter()
  const [editing, setEditing] = useState<DiaryEvent | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ title: '', description: '', date: '', type: 'meeting' as 'meeting' | 'court_date' | 'filing_deadline', matterId: '' })

  const { upcoming, past } = useMemo(() => {
    const now = new Date()
    return {
      upcoming: events.filter(event => new Date(event.date) >= now),
      past: events.filter(event => new Date(event.date) < now),
    }
  }, [events])

  function openEditor(event: DiaryEvent) {
    setEditing(event)
    setError(null)
    setForm({
      title: event.title,
      description: event.description || '',
      date: toDateTimeLocal(event.date),
      type: event.type,
      matterId: event.matterId || '',
    })
  }

  async function save(event: React.FormEvent) {
    event.preventDefault()
    if (!editing) return

    setLoading(true)
    setError(null)
    try {
      await fetchApi(`/diary/${editing.id}`, token, {
        method: 'PATCH',
        body: JSON.stringify({ ...form, matterId: form.matterId || null }),
      })
      setEditing(null)
      router.refresh()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to update this diary event')
    } finally {
      setLoading(false)
    }
  }

  function EventCard({ event, muted = false }: { event: DiaryEvent; muted?: boolean }) {
    const date = new Date(event.date)
    return (
      <article className={`rs-diary-event-card ${muted ? 'rs-diary-event-past' : ''}`}>
        <div className="rs-diary-date-badge" aria-label={date.toLocaleDateString()}>
          <span className="rs-diary-month">{date.toLocaleDateString('en-GB', { month: 'short' })}</span>
          <span className="rs-diary-day">{date.getDate()}</span>
          <span className="rs-diary-time">{date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div className="rs-diary-event-content">
          <div className="rs-diary-event-heading">
            <h3>{event.title}</h3>
            <span className={`rs-event-type-badge ${eventTypeColors[event.type]}`}>
              {eventTypeLabels[event.type]}
            </span>
            {event.matter && <span className="rs-diary-matter-tag">{event.matter.title}</span>}
          </div>
          {event.description && <p className="rs-diary-description">{event.description}</p>}
        </div>
        <button type="button" className="rs-diary-edit-button" onClick={() => openEditor(event)} aria-label={`Edit ${event.title}`}>
          Edit
        </button>
      </article>
    )
  }

  return (
    <>
      <section className="rs-card" aria-label="Diary events">
        <div className="rs-card-header">
          <div>
            <p className="rs-card-eyebrow">Schedule</p>
            <h2 className="rs-card-title">Upcoming events</h2>
          </div>
          <span className="rs-diary-event-count">{upcoming.length} scheduled</span>
        </div>
        {upcoming.length ? <div className="rs-diary-event-list">{upcoming.map(event => <EventCard key={event.id} event={event} />)}</div> : (
          <div className="rs-empty-state"><strong>No upcoming events</strong><span>Your diary is clear for now.</span></div>
        )}
      </section>

      {past.length > 0 && (
        <section className="rs-card rs-card-past" aria-label="Past diary events">
          <div className="rs-card-header"><div><p className="rs-card-eyebrow">History</p><h2 className="rs-card-title">Past events</h2></div></div>
          <div className="rs-diary-event-list">{past.map(event => <EventCard key={event.id} event={event} muted />)}</div>
        </section>
      )}

      {editing && (
        <div className="rs-modal-overlay" role="presentation" onMouseDown={() => !loading && setEditing(null)}>
          <section className="rs-modal-content" role="dialog" aria-modal="true" aria-labelledby="edit-diary-title" onMouseDown={event => event.stopPropagation()}>
            <div className="rs-modal-header">
              <div><p className="rs-modal-eyebrow">Diary event</p><h2 id="edit-diary-title" className="rs-modal-title">Edit event</h2></div>
              <button type="button" className="rs-modal-close" onClick={() => setEditing(null)} disabled={loading} aria-label="Close edit dialog">×</button>
            </div>
            <form onSubmit={save} className="rs-form">
              {error && <p className="rs-form-error">{error}</p>}
              <div className="rs-form-group">
                <label className="rs-form-label">Event title</label>
                <input 
                  required 
                  value={form.title} 
                  onChange={event => setForm(current => ({ ...current, title: event.target.value }))} 
                  disabled={loading}
                  className="rs-form-input"
                />
              </div>
              <div className="rs-form-group">
                <label className="rs-form-label">Event type</label>
                <select 
                  value={form.type} 
                  onChange={event => setForm(current => ({ ...current, type: event.target.value as any }))} 
                  disabled={loading}
                  className="rs-form-select"
                >
                  <option value="meeting">Meeting</option>
                  <option value="court_date">Court Date</option>
                  <option value="filing_deadline">Filing Deadline</option>
                </select>
              </div>
              <div className="rs-form-group">
                <label className="rs-form-label">Date and time</label>
                <input 
                  required 
                  type="datetime-local" 
                  value={form.date} 
                  onChange={event => setForm(current => ({ ...current, date: event.target.value }))} 
                  disabled={loading}
                  className="rs-form-input"
                />
              </div>
              <div className="rs-form-group">
                <label className="rs-form-label">Related matter</label>
                <select 
                  value={form.matterId} 
                  onChange={event => setForm(current => ({ ...current, matterId: event.target.value }))} 
                  disabled={loading}
                  className="rs-form-select"
                >
                  <option value="">No related matter</option>
                  {matters.map(matter => <option value={matter.id} key={matter.id}>{matter.title}</option>)}
                </select>
              </div>
              <div className="rs-form-group">
                <label className="rs-form-label">Description</label>
                <textarea 
                  rows={3} 
                  value={form.description} 
                  onChange={event => setForm(current => ({ ...current, description: event.target.value }))} 
                  disabled={loading}
                  className="rs-form-textarea"
                />
              </div>
              <div className="rs-form-actions">
                <button type="button" className="rs-button rs-button-secondary" onClick={() => setEditing(null)} disabled={loading}>Cancel</button>
                <button type="submit" className="rs-button rs-button-primary" disabled={loading}>{loading ? 'Saving…' : 'Save changes'}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  )
}
