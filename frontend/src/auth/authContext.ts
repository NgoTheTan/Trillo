import { createContext, useContext } from 'react'
import type { AuthUser, Role } from './authStorage'

export type AuthContextValue = {
  user: AuthUser | null
  isReady: boolean
  login: (input: { email: string; password: string }) => Promise<AuthUser>
  register: (input: { fullName: string; email: string; password: string; role: Role }) => Promise<AuthUser>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }

  return context
}