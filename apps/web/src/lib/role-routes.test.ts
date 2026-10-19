import { describe, expect, it } from 'vitest'
import { getRoleRoute } from './role-routes'

describe('getRoleRoute', () => {
  it.each([
    ['ADMIN', '/admin'],
    ['RECEPTION_STAFF', '/reception'],
    ['DOCTOR', '/doctor'],
    ['WAREHOUSE_MANAGEMENT', '/warehouse'],
    ['ACCOUNTING_STAFF', '/accounting'],
    ['HR', '/hr'],
    ['MANAGER', '/hr'],
  ])('maps %s to %s', (role, expectedRoute) => {
    expect(getRoleRoute(role)).toBe(expectedRoute)
  })

  it('falls back to the login screen for an unknown role', () => {
    expect(getRoleRoute('UNKNOWN')).toBe('/login')
  })
})
