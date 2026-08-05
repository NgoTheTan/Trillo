import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/authContext'

export function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, isReady } = useAuth()

  if (!isReady) {
    return null
  }

  if (user) {
    return <Navigate to="/app" replace />
  }

  return <>{children}</>
}