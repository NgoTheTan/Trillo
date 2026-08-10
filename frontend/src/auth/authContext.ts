import { createContext, useContext } from 'react'
import type { AuthUser } from './authStorage'

export type AuthContextValue = {
  user: AuthUser | null
  isReady: boolean
  login: (input: { email: string; password: string }) => Promise<AuthUser>
  loginWithGoogle: (idToken: string) => Promise<AuthUser>
  register: (input: { fullName: string; email: string; password: string }) => Promise<AuthUser>
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