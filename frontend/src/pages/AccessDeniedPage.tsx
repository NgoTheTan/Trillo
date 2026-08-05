import { AlertTriangle, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

export function AccessDeniedPage() {
  return (
    <div className="access-denied">
      <div className="access-denied__card">
        <div className="role-pill" style={{ justifyContent: 'center', marginBottom: '18px' }}>
          <AlertTriangle size={16} />
          Access restricted
        </div>
        <h1 className="auth-card__title" style={{ marginBottom: '12px' }}>
          You do not have permission for this route.
        </h1>
        <p className="auth-card__subtitle">
          The current account is signed in, but the selected role cannot open this workspace.
        </p>

        <div className="form-actions" style={{ marginTop: '24px' }}>
          <Link to="/app" className="secondary-button">
            <ArrowLeft size={16} />
            Back to dashboard
          </Link>
          <Link to="/login" className="secondary-button">
            Switch account
          </Link>
        </div>
      </div>
    </div>
  )
}