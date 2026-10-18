import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import App from './App'

function receptionSession() {
  const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }))
  return {
    accessToken: `header.${payload}.signature`, tokenType: 'Bearer', expiresIn: 3600,
    user: { id: 2, username: 'reception', fullName: 'Lê Thu Hà', role: 'RECEPTION_STAFF', roleName: 'Nhân viên tiếp nhận' },
  }
}

describe('Dental ERP login', () => {
  afterEach(cleanup)
  beforeEach(() => {
    window.localStorage.clear()
    window.history.pushState({}, '', '/login')
  })

  it('renders the Vietnamese login form', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', { name: /chào mừng/i }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/tên đăng nhập/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^mật khẩu$/i)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /đăng nhập/i }),
    ).toBeInTheDocument()
  })

  it('renders the reception workspace and its route tabs for reception staff', () => {
    window.localStorage.setItem('dental-erp.session', JSON.stringify(receptionSession()))
    window.history.pushState({}, '', '/reception')

    render(<App />)

    expect(screen.getByRole('heading', { name: /quầy tiếp nhận/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /^bệnh nhân$/i })).toHaveAttribute('href', '/reception/patients')
    expect(screen.getByRole('link', { name: /^tạo tiếp nhận$/i })).toHaveAttribute('href', '/reception/intakes/new')
    expect(screen.getByRole('link', { name: /^thanh toán$/i })).toHaveAttribute('href', '/reception/payment')
  })

  it('renders the doctor workspace for doctor staff', () => {
    const session = receptionSession()
    session.user = { ...session.user, username: 'doctor', role: 'DOCTOR', roleName: 'Bác sĩ lâm sàng' }
    window.localStorage.setItem('dental-erp.session', JSON.stringify(session))
    window.history.pushState({}, '', '/doctor')

    render(<App />)

    expect(screen.getByText(/phân hệ bác sĩ lâm sàng/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /bước 1: hàng đợi tiếp nhận/i })).toBeInTheDocument()
  })

  it('renders the three warehouse tabs for warehouse management staff', async () => {
    const session = receptionSession()
    session.user = { ...session.user, username: 'warehouse', role: 'WAREHOUSE_MANAGEMENT', roleName: 'Quản lý kho' }
    window.localStorage.setItem('dental-erp.session', JSON.stringify(session))
    window.history.pushState({}, '', '/warehouse')
    const originalFetch = globalThis.fetch
    globalThis.fetch = async () => new Response(JSON.stringify({
      metrics: { itemCount: 12, inventoryValue: 12500000, lowStockCount: 2, expiringCount: 1 },
      lowStock: [], expiring: [], groups: [], recentDocuments: [],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })

    try {
      render(<App />)
      expect(await screen.findByRole('heading', { name: /tổng quan kho/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /chi tiết vật tư/i })).toHaveAttribute('href', '/warehouse/details')
      expect(screen.getByRole('link', { name: /nhập.*xuất kho/i })).toHaveAttribute('href', '/warehouse/transactions')
      expect(screen.getByText('12')).toBeInTheDocument()
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('redirects an unauthenticated reception route to login', () => {
    window.history.pushState({}, '', '/reception/patients')
    render(<App />)
    expect(screen.getByRole('heading', { name: /chào mừng/i })).toBeInTheDocument()
  })

  it('redirects a wrong role away from reception', () => {
    const session = receptionSession()
    session.user = { ...session.user, username: 'admin', role: 'ADMIN', roleName: 'Quản trị viên' }
    window.localStorage.setItem('dental-erp.session', JSON.stringify(session))
    window.history.pushState({}, '', '/reception')
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Quản trị viên' })).toBeInTheDocument()
  })

  it('navigates to reception workspace upon successful login submission', async () => {
    const session = receptionSession()
    const originalFetch = globalThis.fetch
    globalThis.fetch = async () =>
      new Response(JSON.stringify(session), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })

    try {
      render(<App />)
      fireEvent.click(screen.getByRole('button', { name: 'Tiếp nhận' }))
      const form = screen.getByRole('button', { name: /đăng nhập/i }).closest('form')!
      fireEvent.submit(form)
      expect(await screen.findByRole('heading', { name: /quầy tiếp nhận/i })).toBeInTheDocument()
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})
