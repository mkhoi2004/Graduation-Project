export const formatCurrency = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value ?? 0)

export const formatDate = (value?: string | Date) => {
  if (!value) return '—'
  const d = new Date(value)
  if (isNaN(d.getTime())) return String(value)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

export const formatDateTime = (value?: string | Date) => {
  if (!value) return '—'
  const d = new Date(value)
  if (isNaN(d.getTime())) return String(value)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} ngày ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

export const debtTypeLabel = (value: string) =>
  value === 'PATIENT_RECEIVABLE' ? 'Bệnh nhân phải thu' : 'Nhà cung cấp phải trả'

export const categoryLabel = (value: string): string => {
  const map: Record<string, string> = {
    // Vào
    PATIENT_ADVANCE: 'Tạm ứng tiếp nhận',
    TREATMENT_REVENUE: 'Thu dịch vụ điều trị',
    COSMETIC_REVENUE: 'Thu dịch vụ thẩm mỹ',
    RETAIL_REVENUE: 'Thu bán lẻ',
    DEPOSIT_REVENUE: 'Thu cọc điều trị',
    INSTALLMENT_REVENUE: 'Thu trả góp',
    PATIENT_DEBT_PAYMENT: 'Thu công nợ bệnh nhân',
    // Ra
    MATERIAL_PAYMENT: 'Chi vật tư y tế',
    LABO_PAYMENT: 'Chi labo phục hình',
    ADMIN_EXPENSE: 'Chi hành chính (điện, nước, mặt bằng)',
    SALARY: 'Chi lương nhân viên',
    CARD_FEE: 'Phí thanh toán thẻ POS',
    REFUND: 'Hoàn tiền (dòng đảo)',
    // Không tiền
    DISPOSAL_LOSS: 'Tổn thất xuất hủy kho',
  }
  return map[value] ?? value
}

export const methodLabel = (value?: string) => {
  if (!value) return '—'
  const map: Record<string, string> = {
    CASH: 'Tiền mặt tại quầy',
    TRANSFER: 'Chuyển khoản ngân hàng',
    CARD: 'Thẻ thanh toán (POS)',
    MOMO: 'Cổng điện tử MoMo',
    VNPAY: 'Cổng thanh toán VNPAY',
  }
  return map[value] ?? value
}

export const documentStatusBadge = (status?: string) => {
  switch (status) {
    case 'VALID':
      return { label: 'Hóa đơn đúng', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
    case 'INVALID':
      return { label: 'Hóa đơn sai', className: 'bg-rose-50 text-rose-700 border-rose-200' }
    case 'PENDING':
      return { label: 'Chờ hóa đơn', className: 'bg-amber-50 text-amber-700 border-amber-200' }
    default:
      return { label: 'Không yêu cầu', className: 'bg-slate-50 text-slate-600 border-slate-200' }
  }
}
