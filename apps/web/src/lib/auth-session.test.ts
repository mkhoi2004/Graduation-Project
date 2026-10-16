import { beforeEach, describe, expect, it } from 'vitest'
import { getSession, saveSession, type AuthSession } from './auth-session'

function tokenWithExpiry(exp: number): string {
  const payload = btoa(JSON.stringify({ exp }))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '')
  return `header.${payload}.signature`
}

function createSession(role = 'DOCTOR', exp = Math.floor(Date.now() / 1000) + 3600): AuthSession {
  return {
    accessToken: tokenWithExpiry(exp),
    tokenType: 'Bearer',
    expiresIn: 3600,
    user: {
      id: 1,
      username: 'doctor',
      fullName: 'Bác sĩ Demo',
      role,
      roleName: 'Bác sĩ thực hiện',
    },
  }
}

describe('auth session storage', () => {
  beforeEach(() => window.localStorage.clear())

  it('loads a valid unexpired session', () => {
    const session = createSession()
    saveSession(session)
    expect(getSession()).toEqual(session)
  })

  it('clears expired sessions', () => {
    saveSession(createSession('DOCTOR', Math.floor(Date.now() / 1000) - 1))
    expect(getSession()).toBeNull()
    expect(window.localStorage.length).toBe(0)
  })

  it('clears malformed or unknown-role sessions', () => {
    window.localStorage.setItem('dental-erp.session', JSON.stringify({ user: {} }))
    expect(getSession()).toBeNull()

    saveSession(createSession('UNKNOWN_ROLE'))
    expect(getSession()).toBeNull()
  })
})
