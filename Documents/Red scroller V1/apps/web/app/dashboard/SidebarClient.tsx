"use client"
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function SidebarClient({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  const pathname = usePathname()
  const isActive = href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)

  const handleClick = () => {
    // Close mobile menu when link is clicked
    const sidebar = document.querySelector('.sidebar')
    const overlay = document.querySelector('.sidebar-overlay')
    
    if (sidebar) {
      sidebar.classList.remove('mobile-open')
    }
    if (overlay) {
      overlay.classList.remove('active')
    }
  }

  return (
    <Link href={href} className={`sidebar-link ${isActive ? 'active' : ''}`} onClick={handleClick}>
      <span className="sidebar-link-icon">{icon}</span>
      {label}
    </Link>
  )
}
