import Link from 'next/link';

export default function Onboarding() {
  return (
    <div className="rs-onboarding-content">
      <div className="rs-onboarding-header">
        <p className="rs-onboarding-eyebrow">Welcome to RedScroller</p>
        <h1>Choose how you want to start</h1>
        <p className="rs-onboarding-subtitle">
          RedScroller works inside a firm workspace. Create your own firm to get started, or join an existing one if your practice already uses the platform.
        </p>
      </div>

      <div className="rs-onboarding-cards">
        <Link
          href="/onboarding/create"
          className="rs-onboarding-card rs-onboarding-card-primary"
        >
          <div className="rs-onboarding-card-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </div>
          <h2>Create a Firm</h2>
          <p>You'll become the first admin and can start inviting colleagues and setting up matters immediately.</p>
          <div className="rs-onboarding-card-tag">Best for: firm owners, partners, or operations leads</div>
        </Link>

        <Link
          href="/onboarding/join"
          className="rs-onboarding-card"
        >
          <div className="rs-onboarding-card-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <h2>Join a Firm</h2>
          <p>Request access to an existing firm and wait for an admin to approve your membership.</p>
          <div className="rs-onboarding-card-tag">Best for: lawyers, paralegals, or staff joining an existing team</div>
        </Link>
      </div>
    </div>
  );
}