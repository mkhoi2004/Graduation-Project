import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { PatientsPage } from './patients-page'
import { ReceiptPage } from './receipt-page'
import { ReceptionProvider } from './reception-context'

const { downloadReceiptWorkbook } = vi.hoisted(() => ({ downloadReceiptWorkbook: vi.fn().mockResolvedValue(undefined) }))
vi.mock('./receipt-excel', () => ({ downloadReceiptWorkbook }))

describe('reception pages', () => {
  beforeEach(() => window.localStorage.clear())
  afterEach(cleanup)

  it('creates a patient from the form and shows the generated MBN code', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter><ReceptionProvider><PatientsPage /></ReceptionProvider></MemoryRouter>)

    await user.type(screen.getByLabelText(/họ và tên/i), 'Nguyễn Văn An')
    await user.type(screen.getByLabelText(/ngày sinh/i), '1990-01-01')
    await user.type(screen.getByLabelText(/số điện thoại/i), '0901234567')
    await user.click(screen.getByRole('button', { name: /lưu hồ sơ bệnh nhân/i }))

    expect(screen.getByRole('status')).toHaveTextContent(/đã tạo bệnh nhân MBN\d{8}\/0001/i)
    expect(screen.getByText('Nguyễn Văn An')).toBeInTheDocument()
  })

  it('downloads a populated Excel receipt from the print action', async () => {
    const user = userEvent.setup()
    window.localStorage.setItem('dental-erp.reception-workspace', JSON.stringify({
      patients: [{ id: 'MBN20261610/0001', fullName: 'Nguyễn Văn An', dateOfBirth: '1990-01-01', gender: 'Nam', phone: '0901', address: '', note: '', createdAt: '2026-10-16T00:00:00.000Z', updatedAt: '2026-10-16T00:00:00.000Z' }],
      intakes: [{ id: 'TNK20261610/0001', patientId: 'MBN20261610/0001', symptoms: 'Đau răng', priority: 'Thường', services: [{ serviceId: 'filling', quantity: 1 }], roomId: 'room-01', doctorId: 'doctor-minh', status: 'READY', createdAt: '2026-10-16T00:00:00.000Z' }],
    }))
    render(<MemoryRouter><ReceptionProvider><ReceiptPage /></ReceptionProvider></MemoryRouter>)

    await user.click(screen.getByRole('button', { name: /in phiếu/i }))
    expect(downloadReceiptWorkbook).toHaveBeenCalledOnce()
    expect(screen.getByRole('status')).toHaveTextContent(/đã tạo file Excel/i)
  })
})
