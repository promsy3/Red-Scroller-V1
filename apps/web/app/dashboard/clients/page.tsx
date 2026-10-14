"use client"
import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { fetchApi } from '@/utils/api'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import CreateClientForm from './CreateClientForm'

export default function ClientsPage() {
  const { getToken } = useAuth()
  const [sessionToken, setSessionToken] = useState<string | null>(null)
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'corporate' | 'individual'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'verified' | 'rejected'>('all')
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 })

  const loadClients = async (override: { page?: number } = {}) => {
    if (!sessionToken) return

    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (typeFilter !== 'all') params.append('type', typeFilter)
      if (statusFilter !== 'all') params.append('verificationStatus', statusFilter)
      const page = typeof override.page === 'number' ? override.page : pagination.page
      params.append('page', page.toString())
      params.append('limit', pagination.limit.toString())

      const response = await fetchApi(`/clients?${params.toString()}`, sessionToken)
      const nextClients = Array.isArray(response?.data) ? response.data : []
      const nextMeta = response?.meta || pagination
      setClients(nextClients)
      setPagination({
        page: Number(nextMeta.page ?? page),
        limit: Number(nextMeta.limit ?? pagination.limit),
        total: Number(nextMeta.total ?? 0),
        totalPages: Number(nextMeta.totalPages ?? 0),
      })
    } catch (e: any) {
      setError(e?.message || 'Unable to load clients. Please refresh and try again.')
      setClients([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const init = async () => {
      const token = await getToken()
      if (!token) {
        redirect('/login')
        return
      }
      setSessionToken(token)
    }
    init()
  }, [])

  useEffect(() => {
    if (!sessionToken) return
    setPagination(prev => ({ ...prev, page: 1 }))
    loadClients({ page: 1 })
  }, [sessionToken])

  useEffect(() => {
    if (!sessionToken) return
    const page = 1
    setPagination(prev => ({ ...prev, page }))
    loadClients({ page })
  }, [search, typeFilter, statusFilter])

  useEffect(() => {
    if (!sessionToken) return
    loadClients({ page: pagination.page })
  }, [pagination.page])

  const handlePageChange = (newPage: number) => {
    if (loading) return
    if (newPage < 1 || (pagination.totalPages > 0 && newPage > pagination.totalPages)) return
    setPagination(prev => ({ ...prev, page: newPage }))
  }

  return (
    <div className="rs-clients-page">
      <div className="rs-clients-header">
        <h2>Clients</h2>
        <CreateClientForm token={sessionToken || ''} onCreated={() => loadClients({ page: 1 })} />
      </div>

      <div className="rs-clients-filters">
        <input
          type="text"
          placeholder="Search clients by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rs-form-input"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as any)}
          className="rs-form-select"
        >
          <option value="all">All Types</option>
          <option value="corporate">Corporate</option>
          <option value="individual">Individual</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="rs-form-select"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="verified">Verified</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {error && <div className="rs-form-error" style={{ margin: '12px 0' }}>{error}</div>}

      <div className="rs-clients-table-container">
        {loading ? (
          <div className="rs-loading">
            <div className="rs-spinner"></div>
            <p>Loading clients...</p>
          </div>
        ) : clients.length === 0 ? (
          <div className="rs-clients-empty">
            {search || typeFilter !== 'all' || statusFilter !== 'all'
              ? 'No clients match your filters. Try clearing search/filters.'
              : 'No clients yet. Add your first client using the button above.'}
          </div>
        ) : (
          <>
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
                    <td className="rs-clients-date">{client.createdAt ? new Date(client.createdAt).toLocaleDateString() : '—'}</td>
                    <td className="rs-clients-action">
                      <Link href={`/dashboard/clients/${client.id}`} className="rs-clients-link">
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

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
                      Added: {client.createdAt ? new Date(client.createdAt).toLocaleDateString() : '—'}
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

            {pagination.totalPages > 1 && (
              <div className="rs-pagination">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1 || loading}
                  className="rs-button rs-button-secondary rs-button-sm"
                >
                  Previous
                </button>
                <span className="rs-pagination-info">
                  Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
                </span>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.totalPages > 0 && pagination.page === pagination.totalPages || loading}
                  className="rs-button rs-button-secondary rs-button-sm"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
