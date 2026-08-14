export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="rs-onboarding-page">
      <section className="rs-onboarding-panel">
        <div className="rs-onboarding-brand">
          <BrandMark />
          <span>Red<span>Scroller</span></span>
        </div>
        {children}
      </section>
    </main>
  );
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
