import { SignIn } from '@clerk/nextjs'

const clerkAppearance = {
  variables: {
    colorPrimary: '#f20d1a',
    colorBackground: '#101010',
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
    socialButtonsBlock: 'rs-clerk-social-buttons',
    socialButtonsBlockButton: 'rs-clerk-social-button',
    dividerLine: 'rs-clerk-divider-line',
    dividerText: 'rs-clerk-divider-text',
    formFieldLabel: 'rs-clerk-label',
    formFieldInput: 'rs-clerk-input',
    formButtonPrimary: 'rs-clerk-primary-button',
    footer: 'rs-clerk-footer',
    footerActionText: 'rs-clerk-footer-text',
    footerActionLink: 'rs-clerk-footer-link',
    identityPreviewText: 'rs-clerk-identity',
    formResendCodeLink: 'rs-clerk-footer-link',
  },
} as const

export default function Login() {
  return (
    <main className="rs-login-page">
      <section className="rs-login-panel" aria-label="RedScroller sign in">
        <div className="rs-login-brand">
          <BrandMark />
          <span>Red<span>Scroller</span></span>
        </div>

        <p className="rs-login-eyebrow">Welcome back</p>
        <h1>Sign in to RedScroller</h1>
        <p className="rs-login-subtitle">Enter your firm credentials to continue to your workspace.</p>

        <SignIn
          routing="hash"
          forceRedirectUrl="/"
          signUpUrl="/sign-up"
          appearance={clerkAppearance}
        />
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
