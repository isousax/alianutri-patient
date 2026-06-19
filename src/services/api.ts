import { useAuthStore } from '../stores/auth'

// A API existe apenas em produção — dev e prod apontam para o mesmo host.
// (Pode sobrescrever via EXPO_PUBLIC_API_URL, se necessário.)
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.alianutri.com.br'

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * Patient portal API: all requests go to /p/:accessCode/...
 * No JWT — the access code in the URL IS the authentication.
 */
async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const accessCode = useAuthStore.getState().accessCode
  if (!accessCode) {
    throw new ApiError(401, 'Código de acesso não encontrado')
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  const url = `${API_BASE_URL}/p/${accessCode}${path}`

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (res.status === 401) {
    useAuthStore.getState().logout()
    throw new ApiError(401, 'Código de acesso inválido')
  }

  if (!res.ok) {
    let message = 'Erro inesperado'
    try {
      const data = await res.json()
      message = data.message || data.error || message
    } catch {}
    throw new ApiError(res.status, message)
  }

  if (res.status === 204) return undefined as T

  return res.json() as Promise<T>
}

/**
 * Validate access code by calling GET /p/:code/home.
 * Returns patient + nutritionist info on success so we can persist it.
 */
export async function validateAccessCode(code: string): Promise<{
  valid: boolean
  error?: string
  patient?: { id: string; name: string; photo_url: string | null }
  nutritionist?: { name: string; photo_url: string | null } | null
}> {
  try {
    const res = await fetch(`${API_BASE_URL}/p/${code}/home`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })
    if (res.status === 401) return { valid: false, error: 'Código de acesso inválido ou expirado' }
    if (!res.ok) return { valid: false, error: 'Erro ao validar código' }
    const data = await res.json() as {
      patient: { id: string; name: string; photo_url: string | null }
      nutritionist: { name: string; photo_url: string | null } | null
    }
    return { valid: true, patient: data.patient, nutritionist: data.nutritionist }
  } catch {
    return { valid: false, error: 'Erro de conexão. Verifique sua internet.' }
  }
}

async function uploadFormData<T>(path: string, formData: FormData): Promise<T> {
  const accessCode = useAuthStore.getState().accessCode
  if (!accessCode) throw new ApiError(401, 'Código de acesso não encontrado')

  const url = `${API_BASE_URL}/p/${accessCode}${path}`

  const res = await fetch(url, {
    method: 'POST',
    body: formData,
    // Content-Type is set automatically by fetch with multipart boundary
  })

  if (res.status === 401) {
    useAuthStore.getState().logout()
    throw new ApiError(401, 'Código de acesso inválido')
  }

  if (!res.ok) {
    let message = 'Erro inesperado'
    try {
      const data = await res.json()
      message = data.message || data.error || message
    } catch {}
    throw new ApiError(res.status, message)
  }

  return res.json() as Promise<T>
}

export const portalApi = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
  upload: <T>(path: string, formData: FormData) => uploadFormData<T>(path, formData),
}

export { ApiError }
