import { describe, expect, it } from 'vitest'
import { formatCurrency, formatDate, debtTypeLabel } from './accounting-format'

describe('accounting formatting', () => {
  it('formats Vietnamese currency and dates consistently', () => {
    expect(formatCurrency(1250000)).toContain('1.250.000')
    expect(formatDate('2026-10-19T00:00:00.000Z')).toBe('19/10/2026')
  })

  it('uses clear Vietnamese debt labels', () => {
    expect(debtTypeLabel('PATIENT_RECEIVABLE')).toBe('Bệnh nhân phải thu')
    expect(debtTypeLabel('SUPPLIER_PAYABLE')).toBe('Nhà cung cấp phải trả')
  })
})
