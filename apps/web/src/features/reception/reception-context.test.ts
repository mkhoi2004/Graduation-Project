import { describe, expect, it } from 'vitest'
import { calculateIntakeTotal } from './reception-data'
import { receptionReducer, initialReceptionState } from './reception-context'

describe('reception workflow state', () => {
  it('stores patients, creates multiple intakes and transfers one to a doctor', () => {
    const patient = {
      id: 'MBN20261610/0001', fullName: 'Nguyễn Văn An', dateOfBirth: '1990-01-01',
      gender: 'Nam' as const, phone: '0901234567', address: '', note: '',
      createdAt: '2026-10-16T00:00:00.000Z', updatedAt: '2026-10-16T00:00:00.000Z',
    }
    const intake = {
      id: 'TNK20261610/0001', patientId: patient.id, symptoms: 'Đau răng', priority: 'Thường' as const,
      services: [], roomId: '', doctorId: '', status: 'DRAFT' as const,
      createdAt: '2026-10-16T00:00:00.000Z',
    }
    let state = receptionReducer(initialReceptionState, { type: 'UPSERT_PATIENT', patient })
    state = receptionReducer(state, { type: 'ADD_INTAKE', intake })
    state = receptionReducer(state, { type: 'ADD_INTAKE', intake: { ...intake, id: 'TNK20261610/0002' } })
    state = receptionReducer(state, { type: 'UPDATE_INTAKE', intake: { ...intake, status: 'PAID', payment: { method: 'CASH', status: 'PAID' } } })
    state = receptionReducer(state, { type: 'TRANSFER_INTAKE', intakeId: intake.id, transferredAt: '2026-10-16T01:00:00.000Z' })

    expect(state.patients).toHaveLength(1)
    expect(state.intakes).toHaveLength(2)
    expect(state.intakes[0].status).toBe('TRANSFERRED')
  })

  it('does not reopen an intake after it has been transferred', () => {
    const transferred = {
      id: 'TNK20261610/0001', patientId: 'MBN20261610/0001', symptoms: 'Đau răng', priority: 'Thường' as const,
      services: [{ serviceId: 'filling', quantity: 1 }], roomId: 'room-01', doctorId: 'doctor-minh',
      status: 'TRANSFERRED' as const, createdAt: '2026-10-16T00:00:00.000Z', transferredAt: '2026-10-16T01:00:00.000Z',
    }
    const state = receptionReducer({ patients: [], intakes: [transferred] }, {
      type: 'UPDATE_INTAKE', intake: { ...transferred, status: 'DRAFT', roomId: 'room-02' },
    })

    expect(state.intakes[0]).toEqual(transferred)
  })

  it('saves services, room and doctor before completing the transfer', () => {
    const intake = {
      id: 'TNK20261610/0001', patientId: 'MBN20261610/0001', symptoms: 'Đau răng', priority: 'Thường' as const,
      services: [], roomId: '', doctorId: '', status: 'DRAFT' as const, createdAt: '2026-10-16T00:00:00.000Z',
    }
    let state = receptionReducer(initialReceptionState, { type: 'ADD_INTAKE', intake })
    state = receptionReducer(state, { type: 'UPDATE_INTAKE', intake: {
      ...intake, services: [{ serviceId: 'filling', quantity: 2 }], roomId: 'room-01', doctorId: 'doctor-minh', status: 'READY',
    } })
    expect(calculateIntakeTotal(state.intakes[0].services)).toBe(600_000)
    expect(state.intakes[0]).toMatchObject({ roomId: 'room-01', doctorId: 'doctor-minh', status: 'READY' })

    state = receptionReducer(state, { type: 'UPDATE_INTAKE', intake: { ...state.intakes[0], status: 'PAID', payment: { method: 'CASH', status: 'PAID' } } })
    state = receptionReducer(state, { type: 'TRANSFER_INTAKE', intakeId: intake.id, transferredAt: '2026-10-16T01:00:00.000Z' })
    expect(state.intakes[0].status).toBe('TRANSFERRED')
  })

  it('refuses to transfer an intake that has not been paid', () => {
    const ready = {
      id: 'TNK1', patientId: 'MBN1', symptoms: 'Đau răng', priority: 'Thường' as const,
      services: [{ serviceId: 'filling', quantity: 1 }], roomId: 'room-01', doctorId: 'doctor-minh',
      status: 'READY' as const, createdAt: '2026-10-17T00:00:00.000Z',
    }
    const state = receptionReducer({ patients: [], intakes: [ready] }, {
      type: 'TRANSFER_INTAKE', intakeId: ready.id, transferredAt: '2026-10-17T01:00:00.000Z',
    })
    expect(state.intakes[0].status).toBe('READY')
  })
})
