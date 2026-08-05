import type { AuthUser } from './authStorage'

type BackendUserResponse = {
  id: string
  email: string
  fullName: string
  avatarUrl?: string | null
  createdAt?: string | null
}

type AuthResponse = {
  token: string
  user: BackendUserResponse
}

type BackendErrorResponse = {
  message?: string
  error?: string
  errors?: Record<string, string>
  status?: number
}

export type LoginRequest = {
  email: string
  password: string
}

export type RegisterRequest = {
  fullName: string
  email: string
  password: string
  avatarUrl?: string
}

export async function loginRequest(payload: LoginRequest) {
  const response = await authFetch('/api/auth/login', payload)

  return parseAuthResponse(response)
}

export async function registerRequest(payload: RegisterRequest) {
  const response = await authFetch('/api/auth/register', payload)

  return parseAuthResponse(response)
}

export async function meRequest(token: string) {
  const response = await fetch('/api/auth/me', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to load current user')
  }

  return (await response.json()) as BackendUserResponse
}

async function authFetch(url: string, payload: LoginRequest | RegisterRequest) {
  try {
    return await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
  } catch {
    throw new Error('Không kết nối được tới backend. Hãy kiểm tra server backend đã chạy ở port 8080 chưa.')
  }
}

function parseAuthResponse(response: Response) {
  if (!response.ok) {
    return response
      .json()
      .catch(() => null)
      .then((body: BackendErrorResponse | null) => {
        const validationMessage = body?.errors ? Object.values(body.errors).join(', ') : null
        throw new Error(
          validationMessage ?? body?.message ?? body?.error ?? 'Không thể đăng nhập hoặc tạo tài khoản.',
        )
      })
  }

  return response.json() as Promise<AuthResponse>
}

export function toAuthUser(user: BackendUserResponse, role: AuthUser['role']): AuthUser {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    avatarUrl: user.avatarUrl ?? undefined,
    createdAt: user.createdAt ?? undefined,
    role,
  }
}