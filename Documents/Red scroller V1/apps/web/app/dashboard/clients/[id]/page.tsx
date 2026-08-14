import { createClient } from '@/utils/supabase/server'
import { fetchApi } from '@/utils/api'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'

async function getClientHistory(token: string, clientId: string) {
  try {
    return await fetchApi(`/audit/entity?entityType=CLIENT&entityId=${clientId}`, token)
  } catch {
    return []
  }
}

export default async function ClientDetail({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { id } = await params

  let client: any = null
  let history: any[] = []
  try {
    client = await fetchApi(`/clients/${id}`, session.access_token)
    history = await getClientHistory(session.access_token, id)
  } catch (e) {
    notFound()
  }

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

      <div className="rs-client-info-grid">
        <div className="rs-info-card">
          <p className="rs-info-label">Type</p>
          <p className="rs-info-value capitalize">{client.type}</p>
        </div>
        <div className="rs-info-card">
          <p className="rs-info-label">Client Type</p>
          <p className="rs-info-value">{client.clientType || '—'}</p>
        </div>
        <div className="rs-info-card">
          <p className="rs-info-label">Added</p>
          <p className="rs-info-value">{new Date(client.createdAt).toLocaleDateString()}</p>
        </div>
      </div>

      {client.address && (
        <div className="rs-info-card full-width">
          <p className="rs-info-label">Address</p>
          <p className="rs-info-description">{client.address}</p>
        </div>
      )}

      {client.phone && (
        <div className="rs-info-card">
          <p className="rs-info-label">Phone</p>
          <p className="rs-info-value">{client.phone}</p>
        </div>
      )}

      {client.email && (
        <div className="rs-info-card">
          <p className="rs-info-label">Email</p>
          <p className="rs-info-value">{client.email}</p>
        </div>
      )}

      <div className="rs-client-matters-section">
        <div className="rs-section-header">
          <h3 className="rs-section-title">Associated Matters</h3>
          <span className="rs-section-count">{client.matters?.length || 0} matter{(client.matters?.length || 0) !== 1 ? 's' : ''}</span>
        </div>
        {(!client.matters || client.matters.length === 0) ? (
          <div className="rs-empty-state">No matters associated with this client yet.</div>
        ) : (
          <div className="rs-matters-list">
            {client.matters.map((matter: any) => (
              <Link key={matter.id} href={`/dashboard/matters/${matter.id}`} className="rs-matter-card">
                <div className="rs-matter-card-content">
                  <h4 className="rs-matter-card-title">{matter.title}</h4>
                  <p className="rs-matter-card-status">{matter.status}</p>
                </div>
                <span className="rs-matter-card-arrow">→</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {history.length > 0 && (
        <div className="rs-activity-section">
          <div className="rs-activity-header">
            <h3 className="rs-activity-title">Recent Client Activity</h3>
          </div>
          <div className="rs-activity-list">
            {history.slice(0, 6).map((entry: any) => (
              <div key={entry.id} className="rs-activity-item">
                <div className="rs-activity-content">
                  <div>
                    <p className="rs-activity-action">{entry.action}</p>
                    <p className="rs-activity-meta">{entry.actor?.email || 'System'} · {new Date(entry.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="rs-activity-details" title={JSON.stringify(entry.details)}>
                    {JSON.stringify(entry.details)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
