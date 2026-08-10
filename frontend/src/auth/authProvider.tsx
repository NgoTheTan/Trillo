import { useEffect, useState, type ReactNode } from 'react'
import {
  clearSession,
  getCurrentSession,
  setSession,
  type AuthUser,
} from './authStorage'
import { AuthContext, type AuthContextValue } from './authContext'
import { loginRequest, googleLoginRequest, meRequest, registerRequest, toAuthUser } from './authApi'

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
        const nextUser = toAuthUser(backendUser)
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

  useEffect(() => {
    const handleProfileUpdated = (event: CustomEvent) => {
      const updatedData = event.detail
      if (updatedData) {
        setUser((prevUser) => {
          if (!prevUser) return null
          const nextUser: AuthUser = {
            ...prevUser,
            fullName: updatedData.displayName || updatedData.fullName || prevUser.fullName,
            avatarUrl: updatedData.avatarUrl !== undefined ? (updatedData.avatarUrl ?? undefined) : prevUser.avatarUrl,
          }
          const session = getCurrentSession()
          if (session?.token) {
            setSession({ token: session.token, user: nextUser })
          }
          return nextUser
        })
      }
    }

    window.addEventListener('profileUpdated', handleProfileUpdated as EventListener)
    return () => window.removeEventListener('profileUpdated', handleProfileUpdated as EventListener)
  }, [])

  const value: AuthContextValue = {
    user,
    isReady,
    login: async (input) => {
      const response = await loginRequest(input)
      const nextUser = toAuthUser(response.user)
      setSession({ token: response.token, user: nextUser })
      setUser(nextUser)
      return nextUser
    },
    loginWithGoogle: async (idToken: string) => {
      const response = await googleLoginRequest({ idToken })
      const nextUser = toAuthUser(response.user)
      setSession({ token: response.token, user: nextUser })
      setUser(nextUser)
      return nextUser
    },
    register: async (input) => {
      await registerRequest({
        fullName: input.fullName,
        email: input.email,
        password: input.password,
      })
      const loginRes = await loginRequest({ email: input.email, password: input.password })
      const nextUser = toAuthUser(loginRes.user)
      setSession({ token: loginRes.token, user: nextUser })
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