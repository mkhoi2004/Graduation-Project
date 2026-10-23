import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider, useAuth } from './auth-context'
import type { AuthSession } from '@/lib/auth-session'

function createValidSession(role = 'DOCTOR'): AuthSession {
  const exp = Math.floor(Date.now() / 1000) + 3600
  const payload = btoa(JSON.stringify({ exp, role, sub: 1 }))
  return {
    accessToken: `header.${payload}.signature`,
    tokenType: 'Bearer',
    expiresIn: 3600,
    user: {
      id: 1,
      username: 'doctor-minh',
      fullName: 'BS. Nguyễn Hoàng Minh',
      role,
      roleName: 'Bác sĩ lâm sàng',
    },
  }
}

function TestConsumer() {
  const { user, isAuthenticated, isLoading, logout, login } = useAuth()
  return (
    <div>
      <div data-testid="loading">{String(isLoading)}</div>
      <div data-testid="authenticated">{String(isAuthenticated)}</div>
      <div data-testid="username">{user?.username ?? 'none'}</div>
      <button onClick={() => logout()}>Logout</button>
      <button onClick={() => login(createValidSession('ADMIN'))}>Login Admin</button>
    </div>
  )
}

describe('AuthContext and Persist Login', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('initializes as unauthenticated when localStorage has no session', () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    )

    expect(screen.getByTestId('authenticated')).toHaveTextContent('false')
    expect(screen.getByTestId('username')).toHaveTextContent('none')
    expect(screen.getByTestId('loading')).toHaveTextContent('false')
  })

  it('restores authentication state from localStorage token (persist login)', () => {
    const session = createValidSession('RECEPTION_STAFF')
    window.localStorage.setItem('dental-erp.session', JSON.stringify(session))

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    )

    expect(screen.getByTestId('authenticated')).toHaveTextContent('true')
    expect(screen.getByTestId('username')).toHaveTextContent('doctor-minh')
  })

  it('clears session on logout', async () => {
    const user = userEvent.setup()
    const session = createValidSession()
    window.localStorage.setItem('dental-erp.session', JSON.stringify(session))

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    )

    expect(screen.getByTestId('authenticated')).toHaveTextContent('true')

    await user.click(screen.getByRole('button', { name: /logout/i }))

    expect(screen.getByTestId('authenticated')).toHaveTextContent('false')
    expect(window.localStorage.getItem('dental-erp.session')).toBeNull()
  })

  it('saves token to localStorage and updates state on login', async () => {
    const user = userEvent.setup()
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    )

    expect(screen.getByTestId('authenticated')).toHaveTextContent('false')

    await user.click(screen.getByRole('button', { name: /login admin/i }))

    expect(screen.getByTestId('authenticated')).toHaveTextContent('true')
    expect(window.localStorage.getItem('dental-erp.session')).not.toBeNull()
  })
})
