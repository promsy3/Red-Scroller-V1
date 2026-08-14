import { createClient } from '@/utils/supabase/server'
import { fetchApi } from '@/utils/api'
import { redirect } from 'next/navigation'

type AuditLog = {
  id: string
  createdAt: string
  actor?: { email?: string }
  action: string
  entityType: string
  details?: unknown
}

export default async function AuditPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  let logs: AuditLog[] = []
  let error: string | null = null
  try {
    logs = await fetchApi('/audit?limit=100', session.access_token)
  } catch (e: unknown) {
    error = e instanceof Error ? e.message : 'Failed to load audit logs'
  }

  return (
    <div className="rs-audit-page">
      <div className="rs-audit-header">
        <div>
          <p className="rs-audit-eyebrow">Security & Compliance</p>
          <h2 className="rs-audit-title">Audit Logs</h2>
          <p className="rs-audit-subtitle">Track all data access and modifications across your firm.</p>
        </div>
        <form action="/api/audit/export" method="GET">
          <button
            type="submit"
            className="rs-button rs-button-primary"
          >
            Export CSV
          </button>
        </form>
      </div>

      {error ? (
        <div className="rs-form-error">{error}</div>
      ) : (
        <div className="rs-audit-table-container">
          <table className="rs-audit-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Entity Type</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="rs-empty-cell">No logs found.</td>
                </tr>
              ) : (
                logs.map((log: AuditLog) => (
                  <tr key={log.id}>
                    <td className="rs-audit-timestamp">{new Date(log.createdAt).toLocaleString()}</td>
                    <td className="rs-audit-actor">{log.actor?.email || 'System'}</td>
                    <td className="rs-audit-action">
                      <span className="rs-audit-action-badge">{log.action}</span>
                    </td>
                    <td className="rs-audit-entity">{log.entityType}</td>
                    <td className="rs-audit-details" title={JSON.stringify(log.details)}>
                      {JSON.stringify(log.details)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
