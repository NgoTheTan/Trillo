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
          <h1 className="auth-hero-title">Điều hành công việc một cách chính xác và hiệu quả.</h1>
          <p className="auth-hero-copy">
            Không gian làm việc tập trung dành cho Quản lý dự án và các thành viên để lập kế hoạch, theo dõi và triển khai công việc với phân quyền rõ ràng.
          </p>

          <div className="auth-highlight-row" aria-hidden="true">
            <span className="auth-highlight">Xác thực</span>
            <span className="auth-highlight">Phân quyền</span>
            <span className="auth-highlight">Bảo mật tuyến đường</span>
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