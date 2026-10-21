import { cleanup, render, screen } from '@testing-library/react'
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
    queueNumber: '0001',
    id: 'TN20261018/0001',
    intakeId: 10,
    patientCode: 'BN001',
    patientName: 'Trần Văn An',
    dateOfBirth: '1990-01-01',
    gender: 'Nam',
    phone: '0901234567',
    note: '',
    symptoms: 'Đau răng hàm dưới',
    priority: 'Thường',
    roomCode: 'room-01',
    roomName: 'Phòng khám 01',
    issuedAt: '2026-10-18T08:00:00.000Z',
    services: [{ code: 'cleaning', name: 'Cạo vôi răng', quantity: 1, unit: '2 hàm' }],
  },
  {
    queueNumber: '0002', id: 'TN20261018/0002', intakeId: 11, patientCode: 'BN002',
    patientName: 'Lê Thị Bình', dateOfBirth: '1985-02-02', gender: 'Nữ', phone: '0902000002',
    note: '', symptoms: 'Đau răng', priority: 'Thường', roomCode: 'room-01', roomName: 'Phòng khám 01',
    issuedAt: '2026-10-18T08:05:00.000Z', services: [{ code: 'exam', name: 'Khám tổng quát', quantity: 1 }],
  },
  {
    queueNumber: '0003', id: 'TN20261018/0003', intakeId: 12, patientCode: 'BN003',
    patientName: 'Nguyễn Văn Cường', dateOfBirth: '1950-03-03', gender: 'Nam', phone: '0903000003',
    note: '', symptoms: 'Đau nướu', priority: 'Ưu tiên', priorityReason: 'Người cao tuổi',
    roomCode: 'room-01', roomName: 'Phòng khám 01', issuedAt: '2026-10-18T08:10:00.000Z',
    services: [{ code: 'gum', name: 'Khám nha chu', quantity: 1 }],
  },
]

const mockQueueResponse = {
  queue: mockQueue,
  summary: {
    businessDate: '2026-10-18', roomCode: 'room-01', roomName: 'Phòng khám 01',
    waitingCount: 3, priorityWaitingCount: 1, currentCallingNumber: undefined,
  },
}

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
    priority: 'Ưu tiên',
    priorityReason: 'Người cao tuổi',
    roomCode: 'room-01',
    roomName: 'Phòng khám 01',
    services: [{ intakeServiceId: 11, code: 'cleaning', name: 'Cạo vôi răng', quantity: 1, unit: '2 hàm' }],
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
    vi.spyOn(doctorApi, 'fetchDoctorQueue').mockResolvedValue(mockQueueResponse)
    vi.spyOn(doctorApi, 'fetchCurrentExamining').mockResolvedValue(null)
    vi.spyOn(doctorApi, 'fetchSuppliesCatalog').mockResolvedValue(mockSuppliesCatalog)
    vi.spyOn(doctorApi, 'callNextPatientApi').mockResolvedValue({
      nextExaminationId: mockExam.id,
      nextExamination: mockExam,
      queueNumber: '0001',
      message: 'Đã gọi STT 0001',
    })
    vi.spyOn(doctorApi, 'markAbsentApi').mockResolvedValue({
      absentExamination: { ...mockExam, status: 'ABSENT', isLocked: true },
      nextExamination: null,
      message: 'Không còn bệnh nhân chờ',
    })
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

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('renders Step 1 with patient queue and calls next patient', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <DoctorLayout session={mockDoctorSession} />
      </MemoryRouter>,
    )

    // Wait for queue patient to be rendered
    expect(await screen.findByText('Trần Văn An')).toBeInTheDocument()
    expect(screen.getByText('Có 1 bệnh nhân ưu tiên đang chờ')).toBeInTheDocument()
    expect(screen.getByText('Người cao tuổi')).toBeInTheDocument()
    expect(screen.getByText('Cạo vôi răng × 1')).toBeInTheDocument()
    const numbers = screen.getAllByText(/^000[123]$/).map((element) => element.textContent)
    expect(numbers).toEqual(['0001', '0002', '0003'])

    // Click "Gọi STT tiếp theo"
    const callButton = screen.getByRole('button', { name: /gọi stt tiếp theo/i })
    await user.click(callButton)

    expect(doctorApi.callNextPatientApi).toHaveBeenCalledWith()
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

  it('assigns every selected supply to a service line before saving', async () => {
    const user = userEvent.setup()
    vi.spyOn(doctorApi, 'fetchCurrentExamining').mockResolvedValue(mockExam)

    render(
      <MemoryRouter>
        <DoctorLayout session={mockDoctorSession} />
      </MemoryRouter>,
    )

    await user.click(await screen.findByRole('button', { name: /bước 2: vật tư y tế tiêu hao/i }))
    await user.click(screen.getByText('Găng tay cao su Vglove'))
    expect(screen.getByLabelText('Dịch vụ sử dụng vật tư')).toHaveValue('11')
    await user.click(screen.getByRole('button', { name: /^thêm$/i }))
    await user.click(screen.getByRole('button', { name: /lưu danh sách vtyt đã chọn/i }))

    expect(doctorApi.updateSuppliesApi).toHaveBeenCalledWith(101, [
      expect.objectContaining({ supplyCode: 'gloves-vglove', intakeServiceId: 11 }),
    ])
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

  it('uses the room assigned by the server and does not expose room selectors', async () => {
    render(
      <MemoryRouter>
        <DoctorLayout session={mockDoctorSession} />
      </MemoryRouter>,
    )

    expect((await screen.findAllByText('Phòng khám 01')).length).toBeGreaterThanOrEqual(1)
    expect(screen.queryByLabelText('Chọn phòng trực')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Chọn phòng khám trong hàng đợi')).not.toBeInTheDocument()
    expect(doctorApi.fetchDoctorQueue).toHaveBeenCalledWith()
  })

  it('marks a just-called patient absent and returns to the queue when nobody remains', async () => {
    const user = userEvent.setup()
    const cleanExam: ExaminationDetail = { ...mockExam, supplies: [], result: undefined, printHistories: [] }
    vi.spyOn(doctorApi, 'fetchCurrentExamining').mockResolvedValue(cleanExam)
    vi.spyOn(doctorApi, 'fetchDoctorQueue').mockResolvedValue({
      queue: [],
      summary: { ...mockQueueResponse.summary, waitingCount: 0, priorityWaitingCount: 0, currentCallingNumber: '0001' },
    })

    render(
      <MemoryRouter>
        <DoctorLayout session={mockDoctorSession} />
      </MemoryRouter>,
    )

    await user.click(await screen.findByRole('button', { name: /bước 1: hàng đợi tiếp nhận/i }))
    await user.click(await screen.findByRole('button', { name: /^vắng mặt$/i }))
    expect(screen.getByRole('dialog', { name: /xác nhận bệnh nhân vắng mặt/i })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /xác nhận vắng mặt/i }))

    expect(doctorApi.markAbsentApi).toHaveBeenCalledWith(101)
    expect(await screen.findByRole('alert')).toHaveTextContent('Không còn bệnh nhân chờ')
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
