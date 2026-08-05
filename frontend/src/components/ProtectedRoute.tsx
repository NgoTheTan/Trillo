import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/authContext'
import type { Role } from '../auth/authStorage'

export function ProtectedRoute({
  allowedRoles,
  children,
}: {
  allowedRoles?: Role[]
  children: React.ReactNode
}) {
  const { user, isReady } = useAuth()
  const location = useLocation()

  if (!isReady) {
    return null
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/access-denied" replace />
  }

  return <>{children}</>
}