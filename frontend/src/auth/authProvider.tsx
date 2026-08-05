import { useEffect, useState, type ReactNode } from 'react'
import {
  clearSession,
  getCurrentSession,
  resolveRole,
  setSession,
  rememberRole,
  type AuthUser,
} from './authStorage'
import { AuthContext, type AuthContextValue } from './authContext'
import { loginRequest, meRequest, registerRequest, toAuthUser } from './authApi'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => getCurrentSession()?.user ?? null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const bootstrap = async () => {
      const session = getCurrentSession()

      if (!session?.token) {
        setIsReady(true)
        return
      }

      try {
        const backendUser = await meRequest(session.token)
        const nextUser = toAuthUser(backendUser, session.user.role ?? resolveRole(backendUser.email))
        setSession({ token: session.token, user: nextUser })
        setUser(nextUser)
      } catch {
        clearSession()
        setUser(null)
      } finally {
        setIsReady(true)
      }
    }

    void bootstrap()
  }, [])

  const value: AuthContextValue = {
    user,
    isReady,
    login: async (input) => {
      const response = await loginRequest(input)
      const nextUser = toAuthUser(response.user, resolveRole(response.user.email))
      rememberRole(nextUser.email, nextUser.role)
      setSession({ token: response.token, user: nextUser })
      setUser(nextUser)
      return nextUser
    },
    register: async (input) => {
      const response = await registerRequest({
        fullName: input.fullName,
        email: input.email,
        password: input.password,
      })
      const nextUser = toAuthUser(response.user, input.role)
      rememberRole(nextUser.email, nextUser.role)
      setSession({ token: response.token, user: nextUser })
      setUser(nextUser)
      return nextUser
    },
    logout: () => {
      clearSession()
      setUser(null)
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}