import { useAuthStore } from '../stores/auth'
import { useFeaturesStore } from '../stores/features'

// A API existe apenas em produção — dev e prod apontam para o mesmo host.
// (Pode sobrescrever via EXPO_PUBLIC_API_URL, se necessário.)
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.alianutri.com.br'

class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message)
    this.name = 'ApiError'
  }
}

/** Timeouts de rede (ms). Uploads (foto) usam um limite maior. */
const REQUEST_TIMEOUT_MS = 15000
const UPLOAD_TIMEOUT_MS = 30000

async function fetchWithTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Trata respostas de erro HTTP de forma semântica:
 *  - captura `code` do corpo (ex.: PATIENT_OVER_LIMIT, ACCESS_DISABLED);
 *  - excedente (403 PATIENT_OVER_LIMIT) → reflete read-only na UI imediatamente.
 * Sempre lança ApiError.
 */
async function throwHttpError(res: Response): Promise<never> {
  let message = 'Erro inesperado'
  let code: string | undefined
  try {
    const data = await res.json()
    message = data.message || data.error || message
    code = typeof data.code === 'string' ? data.code : undefined
  } catch {}
  if (res.status === 403 && code === 'PATIENT_OVER_LIMIT') {
    useFeaturesStore.getState().setCanWrite(false)
  }
  throw new ApiError(res.status, message, code)
}

/**
 * Patient portal API: all requests go to /p/:accessCode/...
 * No JWT — the access code in the URL IS the authentication.
 */
/** Header de sessão device-bound (S-2). Ausente até o pareamento concluir. */
function sessionHeader(): Record<string, string> {
  const token = useAuthStore.getState().sessionToken
  return token ? { 'X-Patient-Session': token } : {}
}

/**
 * 401 semântico: `PAIRING_REQUIRED` (sessão revogada/ausente — ex.: reset do
 * nutri) mantém o código e roteia para o re-pareamento; qualquer outro 401
 * (código inválido) faz logout completo. Sempre lança ApiError.
 */
async function handle401(res: Response): Promise<never> {
  let code: string | undefined
  try {
    const data = await res.json()
    code = typeof data?.code === 'string' ? data.code : undefined
  } catch {}
  if (code === 'PAIRING_REQUIRED') {
    useAuthStore.getState().requirePairing()
    throw new ApiError(401, 'Pareie este dispositivo para continuar.', 'PAIRING_REQUIRED')
  }
  useAuthStore.getState().logout()
  throw new ApiError(401, 'Código de acesso inválido')
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const accessCode = useAuthStore.getState().accessCode
  if (!accessCode) {
    throw new ApiError(401, 'Código de acesso não encontrado')
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...sessionHeader(),
  }

  const url = `${API_BASE_URL}/p/${accessCode}${path}`

  const res = await fetchWithTimeout(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  }, REQUEST_TIMEOUT_MS)

  if (res.status === 401) {
    // 401 → handle401 decide entre re-pareamento e logout
    return handle401(res)
  }

  if (!res.ok) return throwHttpError(res)

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
    const res = await fetchWithTimeout(`${API_BASE_URL}/p/${code}/home`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', ...sessionHeader() },
    }, REQUEST_TIMEOUT_MS)
    if (res.status === 401) return { valid: false, error: 'Código de acesso inválido ou expirado' }
    if (!res.ok) {
      let error = 'Erro ao validar código'
      try {
        const data = await res.json()
        if (typeof data?.message === 'string') error = data.message
      } catch {}
      return { valid: false, error }
    }
    const data = await res.json() as {
      patient: { id: string; name: string; photo_url: string | null }
      nutritionist: { name: string; photo_url: string | null } | null
    }
    return { valid: true, patient: data.patient, nutritionist: data.nutritionist }
  } catch {
    return { valid: false, error: 'Erro de conexão. Verifique sua internet.' }
  }
}

// ═══ S-2/S-3: pareamento do dispositivo (device-bound session) ═══
// Isento do header de sessão (o paciente ainda não pareou). A cascata de
// identidade é decidida/validada no servidor.

export type PairingMethod = 'birth_date' | 'cpf' | 'phone' | 'collect'

export interface PairingStartResult {
  status: 'ok' | 'conflict' | 'invalid_code' | 'error'
  method?: PairingMethod
  hint?: string | null
  message?: string
}

/** Passo 1: descobre qual dado de identidade pedir (sem revelar o valor). */
export async function startPairing(code: string, deviceId: string): Promise<PairingStartResult> {
  try {
    const res = await fetchWithTimeout(`${API_BASE_URL}/p/${code}/session/pairing/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_id: deviceId }),
    }, REQUEST_TIMEOUT_MS)
    if (res.status === 409) return { status: 'conflict' }
    if (res.status === 401 || res.status === 404) return { status: 'invalid_code' }
    if (!res.ok) {
      let message = 'Erro ao iniciar o pareamento'
      try { const d = await res.json(); if (typeof d?.message === 'string') message = d.message } catch {}
      return { status: 'error', message }
    }
    const data = await res.json() as { method: PairingMethod; hint: string | null }
    return { status: 'ok', method: data.method, hint: data.hint }
  } catch {
    return { status: 'error', message: 'Erro de conexão. Verifique sua internet.' }
  }
}

export interface PairingVerifyResult {
  status: 'ok' | 'invalid' | 'conflict' | 'bad_request' | 'error'
  token?: string
  message?: string
}

/** Passo 2: valida a resposta de identidade e recebe o token de sessão. */
export async function verifyPairing(code: string, deviceId: string, answer: string): Promise<PairingVerifyResult> {
  try {
    const res = await fetchWithTimeout(`${API_BASE_URL}/p/${code}/session/pairing/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_id: deviceId, answer }),
    }, REQUEST_TIMEOUT_MS)
    if (res.status === 409) return { status: 'conflict' }
    if (res.status === 400) {
      let message = 'Dados inválidos'
      try { const d = await res.json(); if (typeof d?.message === 'string') message = d.message } catch {}
      return { status: 'bad_request', message }
    }
    if (res.status === 401) return { status: 'invalid' }
    if (!res.ok) {
      let message = 'Erro ao confirmar sua identidade'
      try { const d = await res.json(); if (typeof d?.message === 'string') message = d.message } catch {}
      return { status: 'error', message }
    }
    const data = await res.json() as { token: string }
    return { status: 'ok', token: data.token }
  } catch {
    return { status: 'error', message: 'Erro de conexão. Verifique sua internet.' }
  }
}

async function uploadFormData<T>(path: string, formData: FormData): Promise<T> {
  const accessCode = useAuthStore.getState().accessCode
  if (!accessCode) throw new ApiError(401, 'Código de acesso não encontrado')

  const url = `${API_BASE_URL}/p/${accessCode}${path}`

  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: sessionHeader(),
    body: formData,
    // Content-Type is set automatically by fetch with multipart boundary
  }, UPLOAD_TIMEOUT_MS)

  if (res.status === 401) {
    // 401 → handle401 decide entre re-pareamento e logout
    return handle401(res)
  }

  if (!res.ok) return throwHttpError(res)

  return res.json() as Promise<T>
}

export const portalApi = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
  upload: <T>(path: string, formData: FormData) => uploadFormData<T>(path, formData),
}

export { ApiError }
