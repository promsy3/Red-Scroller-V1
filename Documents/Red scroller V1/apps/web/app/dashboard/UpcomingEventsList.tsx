"use client"

export default function UpcomingEventsList({ events }: { events: any[] }) {
  return (
    <div style={{ padding: '12px' }}>
      {events.map((ev: any) => (
        <div key={ev.id} style={{ display: 'flex', gap: '12px', padding: '10px 8px', borderRadius: '8px', transition: 'background 0.1s' }}
          onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          <div className="diary-date-badge">
            <div className="month">{new Date(ev.date).toLocaleDateString('en-US', { month: 'short' })}</div>
            <div className="day">{new Date(ev.date).getDate()}</div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.title}</div>
            {ev.matter && <div style={{ fontSize: '12px', color: '#6366f1', marginTop: '2px' }}>{ev.matter.title}</div>}
            {ev.description && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.description}</div>}
          </div>
        </div>
      ))}
    </div>
  )
}