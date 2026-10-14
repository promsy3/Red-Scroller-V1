'use client'

import { SignIn } from '@clerk/nextjs'
import Link from 'next/link'

const clerkAppearance = {
  variables: {
    colorPrimary: '#f20d1a',
    colorBackground: '#090909',
    colorInputBackground: '#1a1a1a',
    colorInputText: '#ffffff',
    colorText: '#ffffff',
    colorTextSecondary: '#a3a3a3',
    borderRadius: '10px',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
  },
  elements: {
    rootBox: 'rs-clerk-root',
    cardBox: 'rs-clerk-card-box',
    card: 'rs-clerk-card',
    headerTitle: 'rs-clerk-header-title',
    headerSubtitle: 'rs-clerk-header-subtitle',
    socialButtonsBlock: 'rs-clerk-social-buttons',
    socialButtonsBlockButton: 'rs-clerk-social-button',
    socialButtonsBlockButtonText: 'rs-clerk-social-button-text',
    dividerRow: 'rs-clerk-divider-row',
    dividerLine: 'rs-clerk-divider-line',
    dividerText: 'rs-clerk-divider-text',
    formFieldRow: 'rs-clerk-form-row',
    formFieldLabel: 'rs-clerk-label',
    formFieldInput: 'rs-clerk-input',
    formFieldInputShowPasswordButton: 'rs-clerk-eye-button',
    formButtonPrimary: 'rs-clerk-primary-button',
    footer: 'rs-clerk-footer',
    footerAction: 'rs-clerk-footer-action',
    footerActionText: 'rs-clerk-footer-text',
    footerActionLink: 'rs-clerk-footer-link',
    identityPreviewText: 'rs-clerk-identity',
    identityPreviewEditButton: 'rs-clerk-footer-link',
    formResendCodeLink: 'rs-clerk-footer-link',
    otpCodeFieldInput: 'rs-clerk-otp-input',
    formFieldErrorText: 'rs-clerk-error-text',
    alert: 'rs-clerk-alert',
    alertText: 'rs-clerk-alert-text',
  },
} as const

export default function LoginPage() {
  return (
    <main className="rs-login-page">
      <section className="rs-login-panel" aria-label="RedScroller sign in">
        {/* Brand */}
        <div className="rs-login-brand">
          <BrandMark />
          <span>Red<span>Scroller</span></span>
        </div>

        {/* Header */}
        <p className="rs-login-eyebrow">Welcome back</p>
        <h1>Sign in to<br />RedScroller</h1>
        <p className="rs-login-subtitle">
          Enter your firm credentials to continue to your workspace.
        </p>

        {/* Clerk Built-in SignIn Component */}
        <SignIn
          routing="path"
          path="/login"
          signUpUrl="/sign-up"
          forceRedirectUrl="/dashboard"
          appearance={clerkAppearance}
        />

        {/* Footer */}
        <p className="rs-login-footer-text">
          New to RedScroller?{' '}
          <Link href="/sign-up" className="rs-login-footer-link">
            Create an account
          </Link>
        </p>
      </section>
    </main>
  )
}

function BrandMark() {
  return (
    <span className="rs-brand-mark" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2h8l4 4v16H6z" />
        <path d="M14 2v5h5M9 11h6M9 15h6M9 19h4" />
      </svg>
    </span>
  )
}
