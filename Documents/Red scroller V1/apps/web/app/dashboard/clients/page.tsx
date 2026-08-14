import { createClient } from '@/utils/supabase/server'
import { fetchApi } from '@/utils/api'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import CreateClientForm from './CreateClientForm'

export default async function ClientsPage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  let clients = []
  try {
    clients = await fetchApi('/clients', session.access_token)
  } catch (e) {
    console.error(e)
  }

  return (
    <div className="rs-clients-page">
      <div className="rs-clients-header">
        <h2>Clients</h2>
        <CreateClientForm token={session.access_token} />
      </div>

      <div className="rs-clients-table-container">
        {clients.length === 0 ? (
          <div className="rs-clients-empty">No clients yet. Add your first client above.</div>
        ) : (
          <>
            {/* Desktop Table View */}
            <table className="rs-clients-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Verification Status</th>
                  <th>Added</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {clients.map((client: any) => (
                  <tr key={client.id}>
                    <td className="rs-clients-name">{client.name}</td>
                    <td className="rs-clients-type capitalize">{client.type}</td>
                    <td className="rs-clients-status">
                      <span className={`rs-status-badge rs-status-${client.verificationStatus}`}>
                        {client.verificationStatus}
                      </span>
                    </td>
                    <td className="rs-clients-date">{new Date(client.createdAt).toLocaleDateString()}</td>
                    <td className="rs-clients-action">
                      <Link href={`/dashboard/clients/${client.id}`} className="rs-clients-link">
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile Card View */}
            <div className="rs-clients-mobile-list">
              {clients.map((client: any) => (
                <div key={client.id} className="rs-client-mobile-card">
                  <div className="rs-mobile-card-header">
                    <div>
                      <h3 className="rs-mobile-card-title">{client.name}</h3>
                      <div className="rs-mobile-card-subtitle capitalize">{client.type}</div>
                    </div>
                    <span className={`rs-status-badge rs-status-${client.verificationStatus}`}>
                      {client.verificationStatus}
                    </span>
                  </div>
                  <div className="rs-mobile-card-meta">
                    <div className="rs-mobile-card-meta-item">
                      Added: {new Date(client.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="rs-mobile-card-action">
                    <Link href={`/dashboard/clients/${client.id}`} className="rs-clients-link">
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
