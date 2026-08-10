export type AuthUser = {
  id: string
  email: string
  fullName: string
  avatarUrl?: string
  createdAt?: string
}

type AuthSession = {
  token: string
  user: AuthUser
}

const TOKEN_KEY = 'token'
const USER_KEY = 'user'

function readJson<T>(key: string): T | null {
  const rawValue = localStorage.getItem(key)
  if (!rawValue) {
    return null
  }

  try {
    return JSON.parse(rawValue) as T
  } catch {
    return null
  }
}

function writeJson(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value))
}

export function getCurrentSession() {
  const token = localStorage.getItem(TOKEN_KEY)
  const user = readJson<AuthUser>(USER_KEY)

  if (!token || !user) {
    return null
  }

  return { token, user } satisfies AuthSession
}

export function saveSession(session: AuthSession) {
  localStorage.setItem(TOKEN_KEY, session.token)
  writeJson(USER_KEY, session.user)
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export function setSession(session: AuthSession) {
  saveSession(session)
}

export function getInitials(fullName: string) {
  return fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export function getAvatarUrl(url?: string | null): string | undefined {
  if (!url) return undefined
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  return url.startsWith('/') ? `http://localhost:8080${url}` : `http://localhost:8080/${url}`
}

export function getCurrentUser(): AuthUser | null {
  return readJson<AuthUser>(USER_KEY)
}



