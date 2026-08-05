import { ArrowRight, Grid2x2, Lock, Rocket } from 'lucide-react'

export function DashboardPage({
  variant = 'overview',
}: {
  variant?: 'overview' | 'pm' | 'team'
}) {
  return (
    <section className="panel" style={{ marginTop: '24px' }}>
      <div className="helper-row">
        <div>
          <p className="panel__title">
            {variant === 'pm' ? 'PM control center' : variant === 'team' ? 'Team workspace' : 'Trillo dashboard'}
          </p>
          <p className="panel__subtitle">
            {variant === 'pm'
              ? 'This route is accessible only to PM role.'
              : variant === 'team'
                ? 'This route is available to PM and User roles.'
                : 'Signed-in users land here after auth, then route guards handle their access.'}
          </p>
        </div>
        <button type="button" className="secondary-button">
          Continue <ArrowRight size={16} />
        </button>
      </div>

      <div className="stats-grid" style={{ marginTop: '24px' }}>
        <article className="stat-card">
          <p className="stat-card__value">04</p>
          <p className="stat-card__label">protected routes</p>
        </article>
        <article className="stat-card">
          <p className="stat-card__value">02</p>
          <p className="stat-card__label">roles supported</p>
        </article>
        <article className="stat-card">
          <p className="stat-card__value">100%</p>
          <p className="stat-card__label">frontend auth flow</p>
        </article>
      </div>

      <div className="task-list" style={{ marginTop: '24px' }}>
        <div className="task-item">
          <div>
            <p className="task-item__title">Login + register ready</p>
            <p className="task-item__meta">Built with React Hook Form and Zod validation.</p>
          </div>
          <Grid2x2 size={18} />
        </div>
        <div className="task-item">
          <div>
            <p className="task-item__title">Role based protection</p>
            <p className="task-item__meta">PM-only and shared user routes are enforced on the client.</p>
          </div>
          <Lock size={18} />
        </div>
        <div className="task-item">
          <div>
            <p className="task-item__title">Ready for backend wiring</p>
            <p className="task-item__meta">Swap the local auth store with the backend /api/auth endpoints later.</p>
          </div>
          <Rocket size={18} />
        </div>
      </div>
    </section>
  )
}