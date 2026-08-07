import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Calendar, LogOut, ShieldCheck, Users } from 'lucide-react'
import { useAuth } from '../auth/authContext'
import { getInitials } from '../auth/authStorage'

export function AppShell() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="app-shell">
      <header className="app-topbar">
        <Link className="brand-mark" to="/app">
          <span className="brand-mark__icon">T</span>
          <span>Trillo</span>
        </Link>
        <div className="app-topbar__actions">
          <span className="role-pill">
            <ShieldCheck size={16} />
            {user?.role === 'PM' ? 'PM workspace' : 'User workspace'}
          </span>
          <span className="status-pill">
            <Users size={16} />
            {user?.fullName}
          </span>
          <button type="button" className="ghost-button" onClick={handleLogout}>
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </header>

      <main className="app-main">
        <div className="dashboard-grid">
          <div className="panel">
            <p className="panel__title">Welcome, {user?.fullName}</p>
            <p className="panel__subtitle">
              You are signed in as {user?.role}. Route access is protected in the frontend and
              the PM-only zone stays locked for other users.
            </p>

            <div className="stats-grid">
              <article className="stat-card">
                <p className="stat-card__value">12</p>
                <p className="stat-card__label">active tasks</p>
              </article>
              <article className="stat-card">
                <p className="stat-card__value">5</p>
                <p className="stat-card__label">in review</p>
              </article>
              <article className="stat-card">
                <p className="stat-card__value">2</p>
                <p className="stat-card__label">blocked items</p>
              </article>
            </div>
            
            <div className="task-list">
              <div className="task-item">
                <div>
                  <p className="task-item__title">PM board overview</p>
                  <p className="task-item__meta">Only PM role can access planning and approvals.</p>
                </div>
                <span className="task-item__badge task-item__badge--pm">PM only</span>
              </div>
              <div className="task-item">
                <div>
                  <p className="task-item__title">Team workspace</p>
                  <p className="task-item__meta">User role covers Dev, Tester, Designer, and other contributors.</p>
                </div>
                <span className="task-item__badge task-item__badge--user">User</span>
              </div>
              <div className="task-item">
                <div>
                  <p className="task-item__title">Secure routes</p>
                  <p className="task-item__meta">Unauthenticated users are redirected to login.</p>
                </div>
                <span className="task-item__badge task-item__badge--secure">Protected</span>
              </div>
            </div>
          </div>

          <div className="panel">
            <p className="panel__title">Current profile</p>
            <p className="panel__subtitle">
              This session is authenticated by the backend and cached locally for refreshes.
            </p>

            <div className="sample-accounts">
              <div className="sample-account">
                <p className="sample-account__title">{getInitials(user?.fullName ?? 'Trillo')}</p>
                <p className="sample-account__meta">{user?.email}</p>
              </div>
              <div className="sample-account">
                <p className="sample-account__title">Role</p>
                <p className="sample-account__meta">
                  {user?.role === 'PM'
                    ? 'PM can access planning, approvals, and sensitive routes.'
                    : 'User can access execution and collaboration routes.'}
                </p>
              </div>
            </div>

            <div className="divider" style={{ marginTop: '24px' }}>
              Trillo is ready
            </div>

            <div className="form-actions" style={{ marginTop: '18px' }}>
              <NavLink className="secondary-button" to="/app/team">
                Team area
              </NavLink>
              <NavLink className="secondary-button" to="/app/pm">
                PM area
              </NavLink>
            </div>
          </div>
        </div>
        <NavLink to="/app/schedule">
        <div>
          <Calendar />
        <span>Schedule</span>
        </div>
        </NavLink>
        <NavLink to="/app/settings">
          <div>
            <span>Settings</span>
          </div>
        </NavLink>
        <Outlet />
      </main>
    </div>
  )
}