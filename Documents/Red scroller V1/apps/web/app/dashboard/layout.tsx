import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { fetchApi } from '@/utils/api'
import { redirect } from 'next/navigation'
import SidebarClient from './SidebarClient'
import ThemeToggle from './ThemeToggle'
import MobileHeader from './MobileHeader'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  let user: any = null
  try {
    user = await fetchApi('/auth/me', session.access_token)
  } catch (e) {}

  return (
    <div className="app-shell">
      <MobileHeader />
      
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">▤</div>
          <span className="sidebar-logo-text">Red<span style={{ color: 'var(--brand-primary-light)' }}>Scroller</span></span>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Overview</div>
          <SidebarClient href="/dashboard" label="Dashboard" icon={
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>
          } />
          <SidebarClient href="/dashboard/diary" label="Diary" icon={
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          } />

          <div className="sidebar-section-label">Work</div>
          <SidebarClient href="/dashboard/clients" label="Clients" icon={
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          } />
          <SidebarClient href="/dashboard/matters" label="Matters" icon={
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          } />

          <div className="sidebar-section-label">Firm</div>
          <SidebarClient href="/dashboard/team" label="Team" icon={
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
          } />
          <SidebarClient href="/dashboard/compliance" label="Compliance" icon={
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
          } />
          {user?.role === 'admin' && (
            <SidebarClient href="/dashboard/audit" label="Audit Log" icon={
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
            } />
          )}
        </nav>

        <div className="sidebar-footer">
          <ThemeToggle />
          <div className="sidebar-user">
            <div className="sidebar-avatar">
              {user?.email?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-email" title={user?.email}>{user?.email}</div>
              <div className="sidebar-user-role">{user?.role} · {user?.firm?.name}</div>
            </div>
          </div>
          <form action="/auth/signout" method="post" style={{ marginTop: '4px' }}>
            <button className="sidebar-link" style={{ width: '100%' }}>
              <svg className="sidebar-link-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              Sign Out
            </button>
          </form>
        </div>
      </aside>

      <div className="app-main">
        <main className="app-content animate-in">
          {children}
        </main>
      </div>
    </div>
  )
}
