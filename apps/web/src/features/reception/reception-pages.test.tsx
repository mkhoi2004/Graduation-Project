import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { PatientsPage } from './patients-page'
import { ReceiptPage } from './receipt-page'
import { ReceptionProvider } from './reception-context'
import { NewIntakePage } from './new-intake-page'
import { ServicesPage } from './services-page'
import * as receptionApi from './reception-api'

const { downloadReceiptWorkbook } = vi.hoisted(() => ({ downloadReceiptWorkbook: vi.fn().mockResolvedValue(undefined) }))
vi.mock('./receipt-excel', () => ({ downloadReceiptWorkbook }))

describe('reception pages', () => {
  beforeEach(() => window.localStorage.clear())
  afterEach(() => { cleanup(); vi.restoreAllMocks() })

  it('offers only Thường and Ưu tiên and requires a reason for priority intake', async () => {
    const user = userEvent.setup()
    window.localStorage.setItem('dental-erp.reception-workspace', JSON.stringify({
      patients: [{ id: 'MBN1', fullName: 'Nguyễn Văn An', dateOfBirth: '1990-01-01', gender: 'Nam', phone: '0901', address: '', note: '', createdAt: '', updatedAt: '' }],
      intakes: [],
    }))
    render(<MemoryRouter initialEntries={['/reception/intakes/new']}><ReceptionProvider><Routes>
      <Route path="/reception/intakes/new" element={<NewIntakePage />} />
      <Route path="/reception/services" element={<h1>Chọn dịch vụ</h1>} />
    </Routes></ReceptionProvider></MemoryRouter>)

    expect(screen.getByRole('option', { name: 'Thường' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Ưu tiên' })).toBeInTheDocument()
    expect(screen.queryByText(/Cao|Khẩn cấp/)).not.toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText(/mức độ ưu tiên/i), 'Ưu tiên')
    expect(screen.getByLabelText(/lý do ưu tiên/i)).toHaveAttribute('aria-required', 'true')
    await user.type(screen.getByLabelText(/triệu chứng/i), 'Đau răng')
    await user.click(screen.getByRole('button', { name: /tạo phiếu/i }))
    expect(screen.getByRole('alert')).toHaveTextContent(/lý do ưu tiên/i)
  })

  it('auto-fills an on-duty doctor room and locks assignment after STT is issued', async () => {
    vi.spyOn(receptionApi, 'fetchMasterData').mockResolvedValue({
      businessDate: '2026-10-21',
      rooms: [{ id: 'room-01', name: 'Phòng 01' }],
      services: [{ id: 'filling', category: 'Cơ bản', name: 'Trám răng', price: 300000, unit: 'răng' }],
      doctors: [{ id: 'doctor-minh', name: 'BS. Minh', specialty: 'Nha khoa', isOnDuty: true, assignedRoom: { id: 'room-01', name: 'Phòng 01' } }],
    })
    window.localStorage.setItem('dental-erp.reception-workspace', JSON.stringify({
      patients: [{ id: 'MBN1', fullName: 'Nguyễn Văn An', dateOfBirth: '1990-01-01', gender: 'Nam', phone: '0901', address: '', note: '', createdAt: '', updatedAt: '' }],
      intakes: [{ id: 'TNK1', patientId: 'MBN1', symptoms: 'Đau răng', priority: 'Thường', services: [{ serviceId: 'filling', quantity: 1 }], roomId: 'room-01', doctorId: 'doctor-minh', status: 'READY', queueNumber: '0005', createdAt: '' }],
    }))
    render(<MemoryRouter initialEntries={['/reception/services?intake=TNK1']}><ReceptionProvider><ServicesPage /></ReceptionProvider></MemoryRouter>)

    expect(await screen.findByDisplayValue('BS. Minh · Nha khoa')).toBeDisabled()
    expect(screen.getByDisplayValue('Phòng 01')).toBeDisabled()
    expect(screen.getAllByText(/STT 0005/)).toHaveLength(2)
    expect(screen.getByRole('button', { name: /thêm trám răng/i })).toBeDisabled()
  })

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
      intakes: [{ id: 'TNK20261610/0001', patientId: 'MBN20261610/0001', patientName: 'Nguyễn Văn An', symptoms: 'Đau răng', priority: 'Thường', services: [{ serviceId: 'filling', quantity: 1 }], roomId: 'room-01', roomName: 'Phòng 01', doctorId: 'doctor-minh', doctorName: 'BS. Minh', queueNumber: '0005', queueDate: '2026-10-21', queueStatus: 'WAITING', currentCallingNumber: '0003', status: 'PAID', payment: { method: 'CASH', status: 'PAID', paidAt: '2026-10-16T00:10:00.000Z' }, createdAt: '2026-10-16T00:00:00.000Z' }],
    }))
    render(<MemoryRouter><ReceptionProvider><ReceiptPage /></ReceptionProvider></MemoryRouter>)

    await user.click(screen.getByRole('button', { name: /xuất excel/i }))
    expect(downloadReceiptWorkbook).toHaveBeenCalledOnce()
    expect(screen.getByRole('status')).toHaveTextContent(/tải xuống file Excel/i)

    expect(screen.getByText('STT')).toBeInTheDocument()
    expect(screen.getAllByText('Mức ưu tiên')).toHaveLength(2)
    expect(screen.getByText(/STT đang gọi: 0003/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^in phiếu$/i }))
    expect(screen.getByRole('heading', { level: 1, name: /phiếu tiếp nhận & thu tiền/i })).toBeInTheDocument()
  })

  it('allows printing a reception ticket before payment once STT exists', () => {
    window.localStorage.setItem('dental-erp.reception-workspace', JSON.stringify({
      patients: [{ id: 'MBN1', fullName: 'Nguyễn Văn An', dateOfBirth: '1990-01-01', gender: 'Nam', phone: '0901', address: '', note: '', createdAt: '', updatedAt: '' }],
      intakes: [{ id: 'TNK1', patientId: 'MBN1', symptoms: 'Đau răng', priority: 'Thường', services: [{ serviceId: 'filling', quantity: 1 }], roomId: 'room-01', doctorId: 'doctor-minh', queueNumber: '0001', queueStatus: 'WAITING', status: 'READY', createdAt: '' }],
    }))
    render(<MemoryRouter><ReceptionProvider><ReceiptPage /></ReceptionProvider></MemoryRouter>)
    expect(screen.getByRole('button', { name: /^in phiếu$/i })).toBeInTheDocument()
    expect(screen.getAllByText('0001').length).toBeGreaterThan(0)
  })
})
