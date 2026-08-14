import { createClient } from '@/utils/supabase/server'
import { fetchApi } from '@/utils/api'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import CreateMatterForm from './CreateMatterForm'

export default async function MattersPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  let matters: any[] = []
  let clients: any[] = []
  try {
    matters = await fetchApi('/matters', session.access_token)
    clients = await fetchApi('/clients/list', session.access_token)
  } catch (e) {
    console.error(e)
  }

  return (
    <div className="rs-matters-page">
      <div className="rs-matters-header">
        <h2>Matters</h2>
        <CreateMatterForm token={session.access_token} clients={clients} />
      </div>

      <div className="rs-matters-table-container">
        {matters.length === 0 ? (
          <div className="rs-matters-empty">No matters yet. Create your first matter above.</div>
        ) : (
          <>
            {/* Desktop Table View */}
            <table className="rs-matters-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Client</th>
                  <th>Status</th>
                  <th>Restricted</th>
                  <th>Updated</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {matters.map((matter: any) => (
                  <tr key={matter.id}>
                    <td className="rs-matters-title">{matter.title}</td>
                    <td className="rs-matters-client">{matter.client?.name || '—'}</td>
                    <td className="rs-matters-status">
                      <span className={`rs-status-badge ${matter.status === 'active' ? 'rs-status-active' : matter.status === 'pending' ? 'rs-status-pending' : 'rs-status-closed'}`}>
                        {matter.status}
                      </span>
                    </td>
                    <td className="rs-matters-restricted">
                      {matter.isRestricted ? (
                        <span className="rs-restricted-badge">🔒 Restricted</span>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </td>
                    <td className="rs-matters-date">{new Date(matter.updatedAt).toLocaleDateString()}</td>
                    <td className="rs-matters-action">
                      <Link href={`/dashboard/matters/${matter.id}`} className="rs-matters-link">
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile Card View */}
            <div className="rs-matters-mobile-list">
              {matters.map((matter: any) => (
                <div key={matter.id} className="rs-matter-mobile-card">
                  <div className="rs-mobile-card-header">
                    <div>
                      <h3 className="rs-mobile-card-title">{matter.title}</h3>
                      <div className="rs-mobile-card-subtitle">{matter.client?.name || '—'}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <span className={`rs-status-badge ${matter.status === 'active' ? 'rs-status-active' : matter.status === 'pending' ? 'rs-status-pending' : 'rs-status-closed'}`}>
                        {matter.status}
                      </span>
                      {matter.isRestricted && (
                        <span className="rs-restricted-badge">🔒</span>
                      )}
                    </div>
                  </div>
                  <div className="rs-mobile-card-meta">
                    <div className="rs-mobile-card-meta-item">
                      Updated: {new Date(matter.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="rs-mobile-card-action">
                    <Link href={`/dashboard/matters/${matter.id}`} className="rs-matters-link">
                      View →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
