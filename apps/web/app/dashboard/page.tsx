import { createClient } from '@/utils/supabase/server'
import { fetchApi } from '@/utils/api'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import UpcomingEventsList from './UpcomingEventsList'

async function safeFetch(path: string, token: string) {
  try { return await fetchApi(path, token) } catch { return [] }
}

export default async function Dashboard() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  let user: any = null
  try { user = await fetchApi('/auth/me', session.access_token) } catch {}
  if (!user || !user.firmId) redirect('/onboarding')

  const [clients, matters, diaryEvents, me] = await Promise.all([
    safeFetch('/clients', session.access_token),
    safeFetch('/matters', session.access_token),
    safeFetch('/diary', session.access_token),
    safeFetch('/auth/me', session.access_token),
  ])

  const openMatters    = matters.filter((m: any) => m.status === 'open').length
  const closedMatters  = matters.filter((m: any) => m.status === 'closed').length
  const upcomingEvents = diaryEvents.filter((e: any) => new Date(e.date) >= new Date())
  const recentMatters  = [...matters].sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 5)
  const nextEvents     = upcomingEvents.slice(0, 3)
  const recentActivity = me?.recentActivity || []

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const displayName = user.name || user.email?.split('@')[0] || 'Counselor'

  return (
    <div className="rs-dashboard-page">
      {/* Page Header */}
      <div className="rs-dashboard-header">
        <div>
          <h1 className="rs-dashboard-title">{greeting}, {displayName} 👋</h1>
          <p className="rs-dashboard-subtitle">{user.firm?.name} · {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        <Link href="/dashboard/matters/new" className="rs-button rs-button-primary">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          New Matter
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="rs-stats-grid">
        <div className="stat-card stat-card-indigo">
          <div className="stat-icon">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          </div>
          <div className="stat-value">{openMatters}</div>
          <div className="stat-label">Open Matters</div>
        </div>
        <div className="stat-card stat-card-emerald">
          <div className="stat-icon">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </div>
          <div className="stat-value">{clients.length}</div>
          <div className="stat-label">Total Clients</div>
        </div>
        <div className="stat-card stat-card-amber">
          <div className="stat-icon">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          </div>
          <div className="stat-value">{upcomingEvents.length}</div>
          <div className="stat-label">Upcoming Events</div>
        </div>
        <div className="stat-card stat-card-red">
          <div className="stat-icon">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
          </div>
          <div className="stat-value">{closedMatters}</div>
          <div className="stat-label">Closed Matters</div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="rs-dashboard-content-grid">
        {/* Recent Matters */}
        <div className="card">
          <div className="card-header">
            <h3>Recent Matters</h3>
            <Link href="/dashboard/matters" className="btn btn-ghost btn-sm">View all →</Link>
          </div>
          {recentMatters.length === 0 ? (
            <div className="empty-state">
              <h3>No matters yet</h3>
              <p>Create your first matter to get started</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Matter</th>
                  <th>Client</th>
                  <th>Status</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {recentMatters.map((m: any) => (
                  <tr key={m.id}>
                    <td className="font-medium">
                      <Link href={`/dashboard/matters/${m.id}`} style={{ color: '#6366f1', fontWeight: 600 }}>
                        {m.title}
                        {m.isRestricted && <span className="badge badge-red" style={{ marginLeft: '6px', fontSize: '10px' }}>🔒</span>}
                      </Link>
                    </td>
                    <td>{m.client?.name ?? '—'}</td>
                    <td><span className={`badge badge-${m.status}`}>{m.status}</span></td>
                    <td>{new Date(m.updatedAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Upcoming Diary Events */}
        <div className="card">
          <div className="card-header">
            <h3>Upcoming Events</h3>
            <Link href="/dashboard/diary" className="btn btn-ghost btn-sm">View all →</Link>
          </div>
          {nextEvents.length === 0 ? (
            <div className="empty-state" style={{ padding: '32px 20px' }}>
              <h3>No upcoming events</h3>
              <p>Add diary entries to track deadlines</p>
            </div>
          ) : (
            <UpcomingEventsList events={nextEvents} />
          )}
        </div>
      </div>

      {recentActivity.length > 0 && (
        <div className="card" style={{ marginTop: '20px' }}>
          <div className="card-header">
            <h3>Recent Activity</h3>
            <Link href="/dashboard/audit" className="btn btn-ghost btn-sm">View full log →</Link>
          </div>
          <div style={{ padding: '8px 4px' }}>
            {recentActivity.map((entry: any) => (
              <div key={entry.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 8px', borderBottom: '1px solid #f3f4f6' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--text-primary)' }}>{entry.action} · {entry.entityType}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{entry.actor?.name || entry.actor?.email || 'System'} · {new Date(entry.createdAt).toLocaleString()}</div>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'right' }}>
                  {entry.details ? JSON.stringify(entry.details) : '—'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
