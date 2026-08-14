import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function CompliancePage() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  return (
    <div className="rs-compliance-page">
      <div className="rs-compliance-header">
        <div>
          <p className="rs-compliance-eyebrow">Security & Compliance</p>
          <h1 className="rs-compliance-title">Compliance Roadmap</h1>
          <p className="rs-compliance-subtitle">Our commitment to security, data protection, and regulatory compliance.</p>
        </div>
      </div>

      <div className="rs-compliance-content">
        <div className="rs-compliance-section">
          <h2 className="rs-compliance-section-title">Current Status</h2>
          <p className="rs-compliance-text">
            RedScroller is currently in pilot phase. We are building towards full compliance with industry standards for legal practice management systems.
          </p>
        </div>

        <div className="rs-compliance-section">
          <h2 className="rs-compliance-section-title">SOC 2 Type II</h2>
          <div className="rs-compliance-badge rs-compliance-badge-roadmap">
            <span className="rs-compliance-badge-label">On Roadmap</span>
          </div>
          <p className="rs-compliance-text">
            We are planning to pursue SOC 2 Type II certification to demonstrate our commitment to security, availability, and processing integrity. This includes:
          </p>
          <ul className="rs-compliance-list">
            <li>Annual independent third-party audit</li>
            <li>Documentation of security controls and processes</li>
            <li>Continuous monitoring of security posture</li>
            <li>Regular penetration testing</li>
          </ul>
        </div>

        <div className="rs-compliance-section">
          <h2 className="rs-compliance-section-title">Data Backup & Recovery</h2>
          <div className="rs-compliance-badge rs-compliance-badge-roadmap">
            <span className="rs-compliance-badge-label">On Roadmap</span>
          </div>
          <p className="rs-compliance-text">
            Our backup and disaster recovery strategy will include:
          </p>
          <ul className="rs-compliance-list">
            <li>Daily automated backups with point-in-time recovery</li>
            <li>Geographically distributed backup storage</li>
            <li>Regular backup integrity verification</li>
            <li>Documented recovery procedures with SLA guarantees</li>
            <li>Annual disaster recovery testing</li>
          </ul>
        </div>

        <div className="rs-compliance-section">
          <h2 className="rs-compliance-section-title">Data Security</h2>
          <div className="rs-compliance-badge rs-compliance-badge-implemented">
            <span className="rs-compliance-badge-label">Implemented</span>
          </div>
          <p className="rs-compliance-text">
            Security measures currently in place:
          </p>
          <ul className="rs-compliance-list">
            <li>End-to-end encryption for data in transit (TLS 1.3)</li>
            <li>Encryption at rest for all stored data</li>
            <li>Firm-level data isolation (multi-tenant architecture)</li>
            <li>Role-based access control with ethical wall enforcement</li>
            <li>Comprehensive audit logging for all data access</li>
            <li>Secure authentication via Clerk (SOC 2 compliant provider)</li>
          </ul>
        </div>

        <div className="rs-compliance-section">
          <h2 className="rs-compliance-section-title">Privacy & Data Protection</h2>
          <div className="rs-compliance-badge rs-compliance-badge-implemented">
            <span className="rs-compliance-badge-label">Implemented</span>
          </div>
          <p className="rs-compliance-text">
            Our privacy practices:
          </p>
          <ul className="rs-compliance-list">
            <li>Client and matter data is strictly isolated by firm</li>
            <li>No data sharing between tenants</li>
            <li>Users can only access data they are explicitly authorized to view</li>
            <li>Restricted matters require explicit access grants</li>
            <li>All access is logged for compliance auditing</li>
          </ul>
        </div>

        <div className="rs-compliance-section">
          <h2 className="rs-compliance-section-title">Contact</h2>
          <p className="rs-compliance-text">
            For security inquiries, compliance questions, or to request our security documentation, please contact our security team at security@redscroller.com.
          </p>
        </div>

        <div className="rs-compliance-footer">
          <p className="rs-compliance-footer-text">
            Last updated: {new Date().toLocaleDateString()} · This roadmap is subject to change as we evolve our security posture.
          </p>
        </div>
      </div>
    </div>
  )
}