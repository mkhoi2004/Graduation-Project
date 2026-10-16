export interface AuthSession {
  accessToken: string
  tokenType: 'Bearer'
  expiresIn: number
  user: {
    id: number
    username: string
    fullName: string
    role: string
    roleName: string
  }
}

const storageKey = 'dental-erp.session'
const allowedRoles = new Set([
  'ADMIN',
  'RECEPTION_STAFF',
  'DOCTOR',
  'WAREHOUSE_MANAGEMENT',
  'ACCOUNTING_STAFF',
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isValidSession(value: unknown): value is AuthSession {
  if (!isRecord(value) || !isRecord(value.user)) return false

  const { user } = value
  if (
    typeof value.accessToken !== 'string' ||
    value.tokenType !== 'Bearer' ||
    typeof value.expiresIn !== 'number' ||
    typeof user.id !== 'number' ||
    typeof user.username !== 'string' ||
    typeof user.fullName !== 'string' ||
    typeof user.role !== 'string' ||
    !allowedRoles.has(user.role) ||
    typeof user.roleName !== 'string'
  ) {
    return false
  }

  try {
    const payloadPart = value.accessToken.split('.')[1]
    if (!payloadPart) return false
    const payload = JSON.parse(atob(payloadPart.replaceAll('-', '+').replaceAll('_', '/'))) as unknown
    return isRecord(payload) && typeof payload.exp === 'number' && payload.exp > Date.now() / 1000
  } catch {
    return false
  }
}

export function getSession(): AuthSession | null {
  const rawSession = window.localStorage.getItem(storageKey)
  if (!rawSession) return null

  try {
    const session: unknown = JSON.parse(rawSession)
    if (isValidSession(session)) return session
  } catch {
    // Invalid persisted data is cleared below.
  }

  window.localStorage.removeItem(storageKey)
  return null
}

export function saveSession(session: AuthSession): void {
  window.localStorage.setItem(storageKey, JSON.stringify(session))
}

export function clearSession(): void {
  window.localStorage.removeItem(storageKey)
}
