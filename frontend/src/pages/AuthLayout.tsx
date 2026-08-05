export function AuthLayout({
  title,
  subtitle,
  children,
  compact = false,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
  compact?: boolean
}) {
  return (
    <div className="auth-frame">
      <aside className="auth-visual">
        <div className="auth-visual__inner">
          <div className="auth-brand">
            <span className="auth-brand__icon">T</span>
            <span>Trillo</span>
          </div>
          <h1 className="auth-hero-title">Orchestrate work with calm precision.</h1>
          <p className="auth-hero-copy">
            A focused workspace for PMs and contributors to plan, track, and ship with clear
            role boundaries and protected routes.
          </p>

          <div className="auth-highlight-row" aria-hidden="true">
            <span className="auth-highlight">Authentication</span>
            <span className="auth-highlight">Roles</span>
            <span className="auth-highlight">Protected routes</span>
          </div>
        </div>
      </aside>

      <section className="auth-panel">
        <div className={`auth-card${compact ? ' auth-card--wide' : ''}`}>
          <p className="auth-card__eyebrow">Trillo auth</p>
          <h2 className="auth-card__title">{title}</h2>
          <p className="auth-card__subtitle">{subtitle}</p>
          {children}
        </div>
      </section>
    </div>
  )
}