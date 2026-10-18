import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { DoctorLayout } from './doctor-layout'
import * as doctorApi from './doctor-api'
import * as summaryExcel from './summary-excel'
import type { ExaminationDetail, MedicalSupplyCatalogItem, QueuePatient } from './doctor-types'
import type { AuthSession } from '../../lib/auth-session'

const mockRooms = [
  { id: 1, code: 'room-01', name: 'Phòng khám 01', description: 'Phòng nha cơ bản' },
  { id: 2, code: 'room-02', name: 'Phòng khám 02', description: 'Phòng chuyên sâu' },
]

const mockQueue: QueuePatient[] = [
  {
    stt: 1,
    id: 'TN20261018/0001',
    intakeId: 10,
    patientCode: 'BN001',
    patientName: 'Trần Văn An',
    dateOfBirth: '1990-01-01',
    gender: 'Nam',
    phone: '0901234567',
    note: '',
    symptoms: 'Đau răng hàm dưới',
    priority: 'Khẩn cấp',
    roomCode: 'room-01',
    roomName: 'Phòng khám 01',
    transferredAt: '2026-10-18T08:00:00.000Z',
    services: [{ code: 'cleaning', name: 'Cạo vôi răng', quantity: 1, unit: '2 hàm' }],
  },
]

const mockSuppliesCatalog: MedicalSupplyCatalogItem[] = [
  {
    id: 'gloves-vglove',
    name: 'Găng tay cao su Vglove',
    group: 'THUONG',
    baseUnit: 'Cái',
    inStock: 1000,
  },
  {
    id: 'needle-septoject',
    name: 'Kim tiêm Septoject',
    group: 'VO_CAM',
    baseUnit: 'Kim',
    conversionUnit: 'Hộp',
    conversionRate: 100,
    inStock: 500,
  },
]

const mockExam: ExaminationDetail = {
  id: 101,
  code: 'PKB20261810/0001',
  status: 'IN_PROGRESS',
  isLocked: false,
  startedAt: '2026-10-18T08:30:00.000Z',
  patient: {
    code: 'BN001',
    fullName: 'Trần Văn An',
    dateOfBirth: '1990-01-01',
    gender: 'Nam',
    phone: '0901234567',
    address: 'Hà Nội',
    note: '',
  },
  intake: {
    code: 'TN20261018/0001',
    symptoms: 'Đau răng hàm dưới',
    priority: 'Khẩn cấp',
    roomCode: 'room-01',
    roomName: 'Phòng khám 01',
    services: [{ code: 'cleaning', name: 'Cạo vôi răng', quantity: 1, unit: '2 hàm' }],
  },
  supplies: [],
  result: {
    summary: 'Răng 46 viêm tủy cấp',
    treatmentMethod: 'Làm sạch xoang tủy, đặt thuốc diệt tủy',
    treatmentOrientation: 'Tránh nhai đồ cứng, uống thuốc giảm đau',
    nextAppointmentDate: '2026-10-25',
  },
  printHistories: [],
}

const mockDoctorSession: AuthSession = {
  accessToken: 'doc-token',
  tokenType: 'Bearer',
  expiresIn: 3600,
  user: {
    id: 6,
    username: 'doctor-minh',
    fullName: 'BS. Hoàng Minh',
    role: 'DOCTOR',
    roleName: 'Bác sĩ lâm sàng',
  },
}

describe('Doctor UI Workflow Steps', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.spyOn(doctorApi, 'fetchDoctorRooms').mockResolvedValue(mockRooms)
    vi.spyOn(doctorApi, 'fetchDoctorQueue').mockResolvedValue(mockQueue)
    vi.spyOn(doctorApi, 'fetchCurrentExamining').mockResolvedValue(null)
    vi.spyOn(doctorApi, 'fetchSuppliesCatalog').mockResolvedValue(mockSuppliesCatalog)
    vi.spyOn(doctorApi, 'callNextPatientApi').mockResolvedValue(mockExam)
    vi.spyOn(doctorApi, 'updateSuppliesApi').mockResolvedValue(mockExam)
    vi.spyOn(doctorApi, 'updateResultApi').mockResolvedValue({ success: true })
    vi.spyOn(doctorApi, 'completeExaminationApi').mockResolvedValue({
      ...mockExam,
      status: 'COMPLETED',
      isLocked: true,
    })
    vi.spyOn(doctorApi, 'cancelExaminationApi').mockResolvedValue({
      ...mockExam,
      status: 'CANCELLED',
      cancelReason: 'Bệnh nhân bỏ về',
      isLocked: true,
    })
    vi.spyOn(summaryExcel, 'downloadSummaryWorkbook').mockResolvedValue(undefined)
  })

  afterEach(cleanup)

  it('renders Step 1 with patient queue and calls next patient', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <DoctorLayout session={mockDoctorSession} />
      </MemoryRouter>,
    )

    // Wait for queue patient to be rendered
    expect(await screen.findByText('Trần Văn An')).toBeInTheDocument()
    expect(screen.getByText('Khẩn cấp')).toBeInTheDocument()
    expect(screen.getByText('Cạo vôi răng × 1')).toBeInTheDocument()

    // Click "Gọi STT tiếp theo"
    const callButton = screen.getByRole('button', { name: /gọi stt tiếp theo/i })
    await user.click(callButton)

    expect(doctorApi.callNextPatientApi).toHaveBeenCalledWith('room-01')
    // Automatically transitions to Step 2
    expect(await screen.findByRole('heading', { name: /vật tư y tế tiêu hao \(vtyt\)/i })).toBeInTheDocument()
  })

  it('renders Step 2 (Supplies) without exposing cost prices', async () => {
    const user = userEvent.setup()
    vi.spyOn(doctorApi, 'fetchCurrentExamining').mockResolvedValue(mockExam)

    render(
      <MemoryRouter>
        <DoctorLayout session={mockDoctorSession} />
      </MemoryRouter>,
    )

    // Navigate to Step 2
    const step2Tab = await screen.findByRole('button', { name: /bước 2: vật tư y tế tiêu hao/i })
    await user.click(step2Tab)

    expect(screen.getByText('Găng tay cao su Vglove')).toBeInTheDocument()
    expect(screen.getAllByText(/không hiển thị giá/i).length).toBeGreaterThanOrEqual(1)
    // Verify no price or currency shown in supplies catalog
    expect(screen.queryByText(/đơn giá/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/vnđ/i)).not.toBeInTheDocument()
  })

  it('renders Step 3 (Summary) and triggers print', async () => {
    const user = userEvent.setup()
    vi.spyOn(doctorApi, 'fetchCurrentExamining').mockResolvedValue(mockExam)

    render(
      <MemoryRouter>
        <DoctorLayout session={mockDoctorSession} />
      </MemoryRouter>,
    )

    const step3Tab = await screen.findByRole('button', { name: /bước 3: tóm tắt kết quả/i })
    await user.click(step3Tab)

    expect(screen.getByDisplayValue('Răng 46 viêm tủy cấp')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Làm sạch xoang tủy, đặt thuốc diệt tủy')).toBeInTheDocument()

    // Trigger Print Modal
    const printBtn = screen.getByRole('button', { name: /in phiếu kết quả tổng kết/i })
    await user.click(printBtn)

    expect(screen.getByText('PHIẾU KẾT QUẢ KHÁM & ĐIỀU TRỊ NHA KHOA')).toBeInTheDocument()

    // Export Excel from print modal
    const excelBtn = screen.getByRole('button', { name: /xuất excel/i })
    await user.click(excelBtn)

    expect(summaryExcel.downloadSummaryWorkbook).toHaveBeenCalled()
  })

  it('renders Step 4 (Finish) and completes examination', async () => {
    const user = userEvent.setup()
    vi.spyOn(doctorApi, 'fetchCurrentExamining').mockResolvedValue(mockExam)

    render(
      <MemoryRouter>
        <DoctorLayout session={mockDoctorSession} />
      </MemoryRouter>,
    )

    const step4Tab = await screen.findByRole('button', { name: /bước 4: ghi sổ/i })
    await user.click(step4Tab)

    expect(screen.getByText(/kiểm tra lại toàn bộ dữ liệu điều trị trước khi ghi sổ/i)).toBeInTheDocument()

    const completeBtn = screen.getByRole('button', { name: /ghi sổ \(hoàn thành ca khám\)/i })
    await user.click(completeBtn)

    expect(doctorApi.completeExaminationApi).toHaveBeenCalledWith(101)
    expect(await screen.findByText(/đã ghi sổ hoàn thành ca khám thành công/i)).toBeInTheDocument()
  })

  it('opens universal cancel modal and requires reason to refuse examination', async () => {
    const user = userEvent.setup()
    vi.spyOn(doctorApi, 'fetchCurrentExamining').mockResolvedValue(mockExam)

    render(
      <MemoryRouter>
        <DoctorLayout session={mockDoctorSession} />
      </MemoryRouter>,
    )

    // Universal cancel button in header
    const cancelBtn = await screen.findByRole('button', { name: /từ chối \/ ngừng khám/i })
    await user.click(cancelBtn)

    expect(screen.getByText('Quy tắc nghiệp vụ khi Ngừng khám:')).toBeInTheDocument()

    // Type reason
    const reasonInput = screen.getByPlaceholderText(/ví dụ: bệnh nhân có dấu hiệu/i)
    await user.type(reasonInput, 'Bệnh nhân có tiền sử dị ứng thuốc tê, cần chuyển chuyên khoa dị ứng.')

    const confirmBtn = screen.getByRole('button', { name: /xác nhận ngừng khám/i })
    await user.click(confirmBtn)

    expect(doctorApi.cancelExaminationApi).toHaveBeenCalledWith(
      101,
      'Bệnh nhân có tiền sử dị ứng thuốc tê, cần chuyển chuyên khoa dị ứng.',
    )
  })

  it('allows selecting room from header and directly from Step 1 queue view', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <DoctorLayout session={mockDoctorSession} />
      </MemoryRouter>,
    )

    // Verify room options exist in header select
    const headerRoomSelect = await screen.findByLabelText('Chọn phòng trực')
    expect(headerRoomSelect).toBeInTheDocument()
    expect(within(headerRoomSelect).getByRole('option', { name: 'Phòng khám 01' })).toBeInTheDocument()
    expect(within(headerRoomSelect).getByRole('option', { name: 'Phòng khám 02' })).toBeInTheDocument()

    // Select room 2 from header
    await user.selectOptions(headerRoomSelect, 'room-02')
    expect(doctorApi.fetchDoctorQueue).toHaveBeenCalledWith('room-02')

    // Verify Step 1 room select also exists
    const step1RoomSelect = screen.getByLabelText('Chọn phòng khám trong hàng đợi')
    expect(step1RoomSelect).toHaveValue('room-02')
  })

  it('falls back to default warehouse supplies catalog when api returns empty', async () => {
    const user = userEvent.setup()
    vi.spyOn(doctorApi, 'fetchCurrentExamining').mockResolvedValue(mockExam)
    vi.spyOn(doctorApi, 'fetchSuppliesCatalog').mockResolvedValue([])

    render(
      <MemoryRouter>
        <DoctorLayout session={mockDoctorSession} />
      </MemoryRouter>,
    )

    const step2Tab = await screen.findByRole('button', { name: /bước 2: vật tư y tế tiêu hao/i })
    await user.click(step2Tab)

    // Should render default 10 warehouse items from doctor-data fallback
    expect(screen.getByText(/Găng tay cao su có bột Vglove/i)).toBeInTheDocument()
    expect(screen.getByText(/Composite đặc 3M Filtek Z350 XT/i)).toBeInTheDocument()

    // Switch to Vo cam group
    const voCamTab = screen.getByRole('button', { name: /vtyt vô cảm \/ gây tê/i })
    await user.click(voCamTab)

    expect(screen.getByText(/Kim tiêm Septoject/i)).toBeInTheDocument()
    expect(screen.getByText(/Septanest with Adrenaline/i)).toBeInTheDocument()
  })
})
