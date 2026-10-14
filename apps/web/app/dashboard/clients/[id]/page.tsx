import { auth } from '@clerk/nextjs/server'
import { fetchApi } from '@/utils/api'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import EditClientPanel from './EditClientPanel'
import DeleteClientButton from './DeleteClientButton'

type ActivityFallback = { ok: false; reason: 'forbidden' | 'error' } | { ok: true; entries: any[] }

async function getClientActivity(token: string, clientId: string): Promise<ActivityFallback> {
  try {
    const entries = await fetchApi(`/audit/entity?entityType=CLIENT&entityId=${clientId}`, token)
    return { ok: true, entries: Array.isArray(entries) ? entries : [] }
  } catch (e: any) {
    const status = Number(e?.cause?.status || e?.status || 0)
    if (status === 403 || String(e?.message || '').toLowerCase().includes('only admins')) {
      return { ok: false, reason: 'forbidden' }
    }
    return { ok: false, reason: 'error' }
  }
}

export default async function ClientDetail({ params }: { params: Promise<{ id: string }> }) {
  const { userId, getToken } = await auth()
  if (!userId) redirect('/login')
  const token = await getToken()
  if (!token) redirect('/login')

  const { id } = await params

  let client: any = null
  let activity: ActivityFallback = { ok: false, reason: 'error' as const }
  let loadError: string | null = null

  try {
    client = await fetchApi(`/clients/${id}`, token)
    activity = await getClientActivity(token, id)
  } catch (e: any) {
    const status = Number(e?.cause?.status || e?.status || 0)
    if (status === 404) {
      notFound()
    } else if (status === 403) {
      notFound()
    } else {
      loadError = e?.message || 'Unable to load client.'
    }
  }

  if (!client) {
    notFound()
  }

  const matters = Array.isArray(client?.matters) ? client.matters : []
  const mattersCount = matters.length

  return (
    <div className="rs-client-detail-page">
      <div className="rs-client-detail-header">
        <Link href="/dashboard/clients" className="rs-breadcrumb">← Clients</Link>
        <span className="rs-breadcrumb-separator">/</span>
        <h2 className="rs-client-detail-title">{client.name}</h2>
        <span className={`rs-status-badge rs-status-${client.verificationStatus}`}>
          {client.verificationStatus}
        </span>
      </div>

      {loadError && (
        <div className="rs-form-error" style={{ margin: '12px 0' }}>
          {loadError}
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
        <EditClientPanel
          clientId={client.id}
          token={token}
          initialName={client.name}
          initialType={client.type}
          initialVerificationStatus={client.verificationStatus}
        />
        <DeleteClientButton
          clientId={client.id}
          clientName={client.name}
          token={token}
          mattersCount={mattersCount}
        />
      </div>

      <div className="rs-client-info-grid">
        <div className="rs-info-card">
          <p className="rs-info-label">Name</p>
          <p className="rs-info-value">{client.name}</p>
        </div>
        <div className="rs-info-card">
          <p className="rs-info-label">Type</p>
          <p className="rs-info-value capitalize">{client.type}</p>
        </div>
        <div className="rs-info-card">
          <p className="rs-info-label">Verification</p>
          <p className="rs-info-value capitalize">{client.verificationStatus}</p>
        </div>
        <div className="rs-info-card">
          <p className="rs-info-label">Added</p>
          <p className="rs-info-value">{client.createdAt ? new Date(client.createdAt).toLocaleDateString() : '—'}</p>
        </div>
      </div>

      <div className="rs-client-matters-section">
        <div className="rs-section-header">
          <h3 className="rs-section-title">Associated Matters</h3>
          <span className="rs-section-count">{mattersCount} matter{mattersCount !== 1 ? 's' : ''}</span>
        </div>
        {mattersCount === 0 ? (
          <div className="rs-empty-state">No matters associated with this client yet.</div>
        ) : (
          <div className="rs-matters-list">
            {matters.map((matter: any) => (
              <Link key={matter.id} href={`/dashboard/matters/${matter.id}`} className="rs-matter-card">
                <div className="rs-matter-card-content">
                  <h4 className="rs-matter-card-title">{matter.title}</h4>
                  <p className="rs-matter-card-status">{matter.status}</p>
                  {matter?.assignee?.name && (
                    <p className="rs-matter-card-status" style={{ fontSize: '12px', opacity: 0.8 }}>
                      Assigned to: {matter.assignee.name}
                    </p>
                  )}
                </div>
                <span className="rs-matter-card-arrow">→</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="rs-activity-section">
        <div className="rs-activity-header">
          <h3 className="rs-activity-title">Recent Client Activity</h3>
        </div>
        {!activity.ok && activity.reason === 'forbidden' && (
          <div className="rs-empty-state">
            Activity history is available to Firm Admins only.
          </div>
        )}
        {!activity.ok && activity.reason === 'error' && (
          <div className="rs-empty-state">
            Activity history is unavailable right now.
          </div>
        )}
        {activity.ok && activity.entries.length === 0 && (
          <div className="rs-empty-state">
            No activity recorded for this client yet.
          </div>
        )}
        {activity.ok && activity.entries.length > 0 && (
          <div className="rs-activity-list">
            {activity.entries.slice(0, 6).map((entry: any) => (
              <div key={entry.id} className="rs-activity-item">
                <div className="rs-activity-content">
                  <div>
                    <p className="rs-activity-action">{entry.action}</p>
                    <p className="rs-activity-meta">
                      {entry.actor?.name || entry.actor?.email || 'System'} · {entry.createdAt ? new Date(entry.createdAt).toLocaleString() : ''}
                    </p>
                  </div>
                  <div className="rs-activity-details" title={entry.details ? JSON.stringify(entry.details) : ''}>
                    {entry.details ? JSON.stringify(entry.details) : '—'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
