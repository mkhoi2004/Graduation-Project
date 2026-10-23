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
      citizenId: '001090123789',
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
      citizenId: '001090123789',
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
      phone: '0901234567', citizenId: '001090123789', address: '', note: '', createdAt: now.toISOString(), updatedAt: now.toISOString(),
    }]
    const result = upsertPatient(patients, { ...patients[0], phone: '0987654321' }, now, patients[0].id)

    expect(result.created).toBe(false)
    expect(result.patients).toHaveLength(1)
    expect(result.patient.id).toBe('MBN20261610/0001')
    expect(result.patient.phone).toBe('0987654321')
  })

  it('rejects changing a patient phone to one already used by another patient', () => {
    const patients: Patient[] = [
      { id: 'MBN20261610/0001', fullName: 'An', dateOfBirth: '1990-01-01', gender: 'Nam', phone: '0901111222', citizenId: '001090123789', address: '', note: '', createdAt: now.toISOString(), updatedAt: now.toISOString() },
      { id: 'MBN20261610/0002', fullName: 'Bình', dateOfBirth: '1991-01-01', gender: 'Nam', phone: '0902222333', citizenId: '001091234567', address: '', note: '', createdAt: now.toISOString(), updatedAt: now.toISOString() },
    ]

    expect(() => upsertPatient(patients, { ...patients[0], phone: '0902222333' }, now, patients[0].id)).toThrow(/số điện thoại/i)
  })

  it('enforces Vietnamese 12-digit legal CCCD validation and rejects invalid format or duplicate', () => {
    const patients: Patient[] = [
      { id: 'MBN20261610/0001', fullName: 'An', dateOfBirth: '1990-01-01', gender: 'Nam', phone: '0901111222', citizenId: '001090123789', address: '', note: '', createdAt: now.toISOString(), updatedAt: now.toISOString() },
    ]

    // Missing CCCD
    expect(() => upsertPatient(patients, {
      fullName: 'Thiếu CCCD', dateOfBirth: '1995-05-10', gender: 'Nam', phone: '0933444555', citizenId: '', address: '', note: '',
    }, now)).toThrow(/CCCD là bắt buộc/i)

    // Invalid length
    expect(() => upsertPatient(patients, {
      fullName: 'Sai độ dài', dateOfBirth: '1995-05-10', gender: 'Nam', phone: '0933444555', citizenId: '001095123', address: '', note: '',
    }, now)).toThrow(/đúng 12 chữ số/i)

    // Dummy all zeroes
    expect(() => upsertPatient(patients, {
      fullName: 'Nhập đại 0', dateOfBirth: '1995-05-10', gender: 'Nam', phone: '0933444555', citizenId: '000000000000', address: '', note: '',
    }, now)).toThrow(/không hợp lệ/i)

    // Invalid province code (> 096)
    expect(() => upsertPatient(patients, {
      fullName: 'Sai mã tỉnh', dateOfBirth: '1995-05-10', gender: 'Nam', phone: '0933444555', citizenId: '099095123789', address: '', note: '',
    }, now)).toThrow(/mã tỉnh/i)

    // Invalid 4th digit (gender/century mismatch: female 1 for male born 1995)
    expect(() => upsertPatient(patients, {
      fullName: 'Sai giới tính', dateOfBirth: '1995-05-10', gender: 'Nam', phone: '0933444555', citizenId: '079195123789', address: '', note: '',
    }, now)).toThrow(/Chữ số thứ 4 của CCCD/i)

    // Invalid 5th-6th digits (year mismatch: 92 != 95)
    expect(() => upsertPatient(patients, {
      fullName: 'Sai năm sinh', dateOfBirth: '1995-05-10', gender: 'Nam', phone: '0933444555', citizenId: '079092123789', address: '', note: '',
    }, now)).toThrow(/2 số cuối của năm sinh/i)

    // Dummy random part (000000)
    expect(() => upsertPatient(patients, {
      fullName: 'Sai random 0', dateOfBirth: '1995-05-10', gender: 'Nam', phone: '0933444555', citizenId: '079095000000', address: '', note: '',
    }, now)).toThrow(/000000/i)

    // Duplicate CCCD with existing patient
    expect(() => upsertPatient(patients, {
      fullName: 'Trùng CCCD', dateOfBirth: '1990-01-01', gender: 'Nam', phone: '0988777666', citizenId: '001090123789', address: '', note: '',
    }, now)).toThrow(/Số CCCD đã được sử dụng/i)
  })

  it('calculates the selected service total using quantity', () => {
    expect(calculateIntakeTotal([
      { serviceId: 'cleaning', quantity: 1 },
      { serviceId: 'filling', quantity: 2 },
    ])).toBe(1_000_000)
  })
})
