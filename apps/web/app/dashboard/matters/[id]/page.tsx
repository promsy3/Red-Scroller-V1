import { createClient } from '@/utils/supabase/server'
import { fetchApi } from '@/utils/api'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import MatterActions from './MatterActions'
import ManageAccess from './ManageAccess'
import UploadDocumentForm from './UploadDocumentForm'
import DocumentActions from './DocumentActions'

async function getMatterHistory(token: string, matterId: string) {
  try {
    return await fetchApi(`/audit/entity?entityType=MATTER&entityId=${matterId}`, token)
  } catch {
    return []
  }
}

export default async function MatterDetail({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { id } = await params

  let matter: any = null
  let history: any[] = []
  try {
    matter = await fetchApi(`/matters/${id}`, session.access_token)
    history = await getMatterHistory(session.access_token, id)
  } catch (e) {
    notFound()
  }

  return (
    <div className="rs-matter-detail-page">
      <div className="rs-matter-detail-header">
        <Link href="/dashboard/matters" className="rs-breadcrumb">← Matters</Link>
        <span className="rs-breadcrumb-separator">/</span>
        <h2 className="rs-matter-detail-title">{matter.title}</h2>
        {matter.isRestricted && (
          <span className="rs-restricted-badge">
            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
            Restricted
          </span>
        )}
        <span className={`rs-status-badge ${matter.status === 'active' ? 'rs-status-active' : matter.status === 'pending' ? 'rs-status-pending' : 'rs-status-closed'}`}>{matter.status}</span>
      </div>

      <div className="rs-matter-info-grid">
        <div className="rs-info-card">
          <p className="rs-info-label">Client</p>
          <Link href={`/dashboard/clients/${matter.client?.id}`} className="rs-info-link">
            {matter.client?.name}
          </Link>
        </div>
        <div className="rs-info-card">
          <p className="rs-info-label">Assigned To</p>
          <p className="rs-info-value">
            {matter.assignee?.name || matter.assignee?.email || '—'}
          </p>
        </div>
        <div className="rs-info-card">
          <p className="rs-info-label">Opened</p>
          <p className="rs-info-value">{new Date(matter.createdAt).toLocaleDateString()}</p>
        </div>
      </div>

      {matter.description && (
        <div className="rs-info-card full-width">
          <p className="rs-info-label">Description</p>
          <p className="rs-info-description">{matter.description}</p>
        </div>
      )}

      <MatterActions matterId={matter.id} currentStatus={matter.status} token={session.access_token} />

      <ManageAccess matterId={matter.id} isRestricted={matter.isRestricted} initialAccess={matter.matterAccess || []} token={session.access_token} />

      <div className="rs-documents-section">
        <div className="rs-documents-header">
          <h3 className="rs-documents-title">Documents</h3>
          <span className="rs-documents-count">{matter.documents.length} file{matter.documents.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="rs-documents-upload">
          <UploadDocumentForm matterId={matter.id} token={session.access_token} />
        </div>
        {matter.documents.length === 0 ? (
          <div className="rs-documents-empty">No documents uploaded yet.</div>
        ) : (
          <div className="rs-documents-list">
            {matter.documents.map((doc: any) => (
              <div key={doc.id} className="rs-document-item">
                <div className="rs-document-info">
                  <p className="rs-document-name">{doc.name}</p>
                  <p className="rs-document-meta">
                    {doc.mimeType || 'Unknown type'} · {doc.sizeBytes ? `${(doc.sizeBytes / 1024).toFixed(1)} KB` : '—'} · Uploaded by {doc.uploader?.name || doc.uploader?.email || 'Unknown'}
                  </p>
                </div>
                <div className="rs-document-actions-container">
                  <DocumentActions doc={doc} token={session.access_token} />
                  <span className="rs-document-date">{new Date(doc.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {history.length > 0 && (
        <div className="rs-activity-section">
          <div className="rs-activity-header">
            <h3 className="rs-activity-title">Recent Matter Activity</h3>
          </div>
          <div className="rs-activity-list">
            {history.slice(0, 6).map((entry: any) => (
              <div key={entry.id} className="rs-activity-item">
                <div className="rs-activity-content">
                  <div>
                    <p className="rs-activity-action">{entry.action}</p>
                    <p className="rs-activity-meta">{entry.actor?.name || entry.actor?.email || 'System'} · {new Date(entry.createdAt).toLocaleString()}</p>
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
