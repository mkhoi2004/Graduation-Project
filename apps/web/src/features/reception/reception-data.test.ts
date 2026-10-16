import { describe, expect, it } from 'vitest'
import {
  calculateIntakeTotal,
  createDailyCode,
  upsertPatient,
  type Patient,
} from './reception-data'

describe('reception business rules', () => {
  const now = new Date(2026, 9, 16, 9, 30)

  it('creates daily patient and intake codes matching the documented format', () => {
    expect(createDailyCode('MBN', [], now)).toBe('MBN20261610/0001')
    expect(createDailyCode('TNK', ['TNK20261610/0001'], now)).toBe('TNK20261610/0002')
  })

  it('updates a patient when the normalized phone number already exists', () => {
    const patients: Patient[] = [{
      id: 'MBN20261610/0001',
      fullName: 'Nguyễn Văn An',
      dateOfBirth: '1990-01-01',
      gender: 'Nam',
      phone: '0901 234 567',
      address: 'Quận 1',
      note: '',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    }]

    const result = upsertPatient(patients, {
      fullName: 'Nguyễn Văn An cập nhật',
      dateOfBirth: '1990-01-01',
      gender: 'Nam',
      phone: '0901234567',
      address: 'Quận 3',
      note: 'Dị ứng thuốc',
    }, now)

    expect(result.created).toBe(false)
    expect(result.patients).toHaveLength(1)
    expect(result.patient.id).toBe('MBN20261610/0001')
    expect(result.patient.address).toBe('Quận 3')
  })

  it('keeps the original MBN when an explicitly selected patient changes phone number', () => {
    const patients: Patient[] = [{
      id: 'MBN20261610/0001', fullName: 'Nguyễn Văn An', dateOfBirth: '1990-01-01', gender: 'Nam',
      phone: '0901234567', address: '', note: '', createdAt: now.toISOString(), updatedAt: now.toISOString(),
    }]
    const result = upsertPatient(patients, { ...patients[0], phone: '0987654321' }, now, patients[0].id)

    expect(result.created).toBe(false)
    expect(result.patients).toHaveLength(1)
    expect(result.patient.id).toBe('MBN20261610/0001')
    expect(result.patient.phone).toBe('0987654321')
  })

  it('rejects changing a patient phone to one already used by another patient', () => {
    const patients: Patient[] = [
      { id: 'MBN20261610/0001', fullName: 'An', dateOfBirth: '1990-01-01', gender: 'Nam', phone: '0901', address: '', note: '', createdAt: now.toISOString(), updatedAt: now.toISOString() },
      { id: 'MBN20261610/0002', fullName: 'Bình', dateOfBirth: '1991-01-01', gender: 'Nam', phone: '0902', address: '', note: '', createdAt: now.toISOString(), updatedAt: now.toISOString() },
    ]

    expect(() => upsertPatient(patients, { ...patients[0], phone: '0902' }, now, patients[0].id)).toThrow(/số điện thoại/i)
  })

  it('calculates the selected service total using quantity', () => {
    expect(calculateIntakeTotal([
      { serviceId: 'cleaning', quantity: 1 },
      { serviceId: 'filling', quantity: 2 },
    ])).toBe(1_000_000)
  })
})
