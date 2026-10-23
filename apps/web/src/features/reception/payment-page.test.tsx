import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { PaymentPage } from './payment-page'
import { ReceptionProvider } from './reception-context'

const {
  createMomoPayment,
  getMomoPaymentStatus,
  redirectToMomo,
  createVnpayPayment,
  getVnpayPaymentStatus,
  redirectToVnpay,
} = vi.hoisted(() => ({
  createMomoPayment: vi.fn(async () => ({ orderId: 'DENTAL-1', payUrl: 'https://test-payment.momo.vn/pay' })),
  getMomoPaymentStatus: vi.fn(async () => ({ orderId: 'DENTAL-1', intakeCode: 'TNK1', amount: 400000, status: 'PAID' as const })),
  redirectToMomo: vi.fn(),
  createVnpayPayment: vi.fn(async () => ({ orderId: 'DENTAL-VNPAY-1', payUrl: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html' })),
  getVnpayPaymentStatus: vi.fn(async () => ({ orderId: 'DENTAL-VNPAY-1', intakeCode: 'TNK1', amount: 400000, status: 'PAID' as const })),
  redirectToVnpay: vi.fn(),
}))

vi.mock('./payment-api', () => ({
  createMomoPayment,
  getMomoPaymentStatus,
  redirectToMomo,
  createVnpayPayment,
  getVnpayPaymentStatus,
  redirectToVnpay,
}))

const workspace = {
  patients: [{ id: 'MBN1', fullName: 'Nguyễn Văn An', dateOfBirth: '1990-01-01', gender: 'Nam', phone: '0901', address: '', note: '', createdAt: '2026-10-17T00:00:00.000Z', updatedAt: '2026-10-17T00:00:00.000Z' }],
  intakes: [{ id: 'TNK1', patientId: 'MBN1', symptoms: 'Đau răng', priority: 'Thường', services: [{ serviceId: 'cleaning', quantity: 1 }], roomId: 'room-01', doctorId: 'doctor-minh', status: 'READY', createdAt: '2026-10-17T00:00:00.000Z' }],
}

describe('PaymentPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
    window.localStorage.setItem('dental-erp.reception-workspace', JSON.stringify(workspace))
  })
  afterEach(cleanup)

  it('confirms cash payment and continues to step 5 receipt', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter initialEntries={['/reception/payment?intake=TNK1']}><ReceptionProvider><Routes><Route path="/reception/payment" element={<PaymentPage />} /><Route path="/reception/receipt" element={<h1>Phiếu tiếp nhận</h1>} /></Routes></ReceptionProvider></MemoryRouter>)
    await user.click(screen.getByRole('radio', { name: /tiền mặt/i }))
    await user.click(screen.getByRole('button', { name: /xác nhận thanh toán/i }))
    expect(screen.getByRole('heading', { name: 'Phiếu tiếp nhận' })).toBeInTheDocument()
  })

  it('requests a MoMo pay URL for the exact intake total', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter initialEntries={['/reception/payment?intake=TNK1']}><ReceptionProvider><PaymentPage /></ReceptionProvider></MemoryRouter>)
    await user.click(screen.getByRole('radio', { name: /momo/i }))
    await user.click(screen.getByRole('button', { name: /thanh toán qua momo/i }))
    expect(createMomoPayment).toHaveBeenCalledWith({ intakeCode: 'TNK1', amount: 400000 })
  })

  it('requests a VNPAY pay URL for the exact intake total', async () => {
    const user = userEvent.setup()
    render(<MemoryRouter initialEntries={['/reception/payment?intake=TNK1']}><ReceptionProvider><PaymentPage /></ReceptionProvider></MemoryRouter>)
    await user.click(screen.getByRole('radio', { name: /vnpay/i }))
    await user.click(screen.getByRole('button', { name: /thanh toán qua vnpay/i }))
    expect(createVnpayPayment).toHaveBeenCalledWith({ intakeCode: 'TNK1', amount: 400000 })
  })

  it('confirms a paid VNPAY return and navigates to step 5 receipt', async () => {
    render(<MemoryRouter initialEntries={['/reception/payment?vnpay=success&orderId=DENTAL-VNPAY-1']}><ReceptionProvider><Routes><Route path="/reception/payment" element={<PaymentPage />} /><Route path="/reception/receipt" element={<h1>Phiếu tiếp nhận</h1>} /></Routes></ReceptionProvider></MemoryRouter>)
    expect(await screen.findByRole('heading', { name: 'Phiếu tiếp nhận' })).toBeInTheDocument()
  })

  it('rejects a paid MoMo return when the stored amount does not match the intake total', async () => {
    getMomoPaymentStatus.mockResolvedValueOnce({ orderId: 'DENTAL-1', intakeCode: 'TNK1', amount: 10000, status: 'PAID' })
    render(<MemoryRouter initialEntries={['/reception/payment?momo=success&orderId=DENTAL-1']}><ReceptionProvider><Routes><Route path="/reception/payment" element={<PaymentPage />} /><Route path="/reception/receipt" element={<h1>Phiếu tiếp nhận</h1>} /></Routes></ReceptionProvider></MemoryRouter>)
    expect(await screen.findByRole('status')).toHaveTextContent(/số tiền giao dịch không khớp/i)
    expect(screen.queryByRole('heading', { name: 'Phiếu tiếp nhận' })).not.toBeInTheDocument()
  })

  it('rejects a paid VNPAY return when the stored amount does not match the intake total', async () => {
    getVnpayPaymentStatus.mockResolvedValueOnce({ orderId: 'DENTAL-VNPAY-1', intakeCode: 'TNK1', amount: 10000, status: 'PAID' })
    render(<MemoryRouter initialEntries={['/reception/payment?vnpay=success&orderId=DENTAL-VNPAY-1']}><ReceptionProvider><Routes><Route path="/reception/payment" element={<PaymentPage />} /><Route path="/reception/receipt" element={<h1>Phiếu tiếp nhận</h1>} /></Routes></ReceptionProvider></MemoryRouter>)
    expect(await screen.findByRole('status')).toHaveTextContent(/số tiền giao dịch không khớp/i)
    expect(screen.queryByRole('heading', { name: 'Phiếu tiếp nhận' })).not.toBeInTheDocument()
  })

  it('does not allow a draft intake to bypass service readiness with cash', () => {
    window.localStorage.setItem('dental-erp.reception-workspace', JSON.stringify({ ...workspace, intakes: [{ ...workspace.intakes[0], status: 'DRAFT' }] }))
    render(<MemoryRouter initialEntries={['/reception/payment?intake=TNK1']}><ReceptionProvider><PaymentPage /></ReceptionProvider></MemoryRouter>)
    expect(screen.queryByRole('button', { name: /xác nhận thanh toán/i })).not.toBeInTheDocument()
    expect(screen.getByText(/chưa có phiếu chờ thanh toán/i)).toBeInTheDocument()
  })
})
