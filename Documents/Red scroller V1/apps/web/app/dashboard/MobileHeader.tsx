"use client"

import { useState } from 'react'

export default function MobileHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
    const sidebar = document.querySelector('.sidebar')
    const overlay = document.querySelector('.sidebar-overlay')
    
    if (sidebar) {
      sidebar.classList.toggle('mobile-open', !isMenuOpen)
    }
    if (overlay) {
      overlay.classList.toggle('active', !isMenuOpen)
    }
  }

  return (
    <>
      <div className="mobile-header">
        <button 
          className="mobile-menu-toggle" 
          onClick={toggleMenu}
          aria-label="Toggle menu"
        >
          <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="sidebar-logo-icon" style={{ width: '28px', height: '28px', fontSize: '14px' }}>
          ▤
        </div>
        <span className="sidebar-logo-text" style={{ fontSize: '14px' }}>
          Red<span style={{ color: 'var(--brand-primary-light)' }}>Scroller</span>
        </span>
      </div>
      <div className="sidebar-overlay" onClick={toggleMenu}></div>
    </>
  )
}
