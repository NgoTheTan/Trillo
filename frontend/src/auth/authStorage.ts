export type Role = 'PM' | 'User'

export type AuthUser = {
  id: string
  email: string
  fullName: string
  role: Role
  avatarUrl?: string
  createdAt?: string
}

type AuthSession = {
  token: string
  user: AuthUser
}

const TOKEN_KEY = 'token'
const USER_KEY = 'user'
const ROLE_MAP_KEY = 'trillo-role-map'

type RoleMap = Record<string, Role>

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

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

export function resolveRole(email: string): Role {
  const normalizedEmail = normalizeEmail(email)
  const roleMap = readJson<RoleMap>(ROLE_MAP_KEY) ?? {}

  return roleMap[normalizedEmail] ?? (normalizedEmail === 'pm@trillo.app' ? 'PM' : 'User')
}

export function rememberRole(email: string, role: Role) {
  const normalizedEmail = normalizeEmail(email)
  const roleMap = readJson<RoleMap>(ROLE_MAP_KEY) ?? {}
  roleMap[normalizedEmail] = role
  writeJson(ROLE_MAP_KEY, roleMap)
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

export function enrichUser(user: Omit<AuthUser, 'role'> & Partial<Pick<AuthUser, 'role'>>): AuthUser {
  return {
    ...user,
    role: user.role ?? resolveRole(user.email),
  }
}

export function getInitials(fullName: string) {
  return fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}
