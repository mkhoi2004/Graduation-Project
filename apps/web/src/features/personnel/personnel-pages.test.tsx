import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { EmployeesPage } from './employees-page';
import { AccessPage } from './access-page';
import { AttendancePage } from './attendance-page';
import { PayrollPage } from './payroll-page';
import { IncentivePage } from './incentive-page';
import { personnelApi } from './personnel-api';
import type { Employee, Payroll, PersonnelOverviewData, ServiceIncentive, UserAccount, UserRoleAssignment } from './personnel-types';

vi.mock('./personnel-api', () => ({
  personnelApi: {
    getOverview: vi.fn(),
    getEmployees: vi.fn(),
    getEmployeeById: vi.fn(),
    createEmployee: vi.fn(),
    updateEmployee: vi.fn(),
    terminateEmployee: vi.fn(),
    getRoles: vi.fn(),
    getUserAccounts: vi.fn(),
    createUserAccount: vi.fn(),
    updateUserAccount: vi.fn(),
    toggleUserActive: vi.fn(),
    resetUserPassword: vi.fn(),
    getUserRoleAssignments: vi.fn(),
    assignRole: vi.fn(),
    approveRole: vi.fn(),
    revokeRole: vi.fn(),
    getShifts: vi.fn(),
    createShift: vi.fn(),
    getShiftAssignments: vi.fn(),
    assignShift: vi.fn(),
    getAttendance: vi.fn(),
    getAttendanceSummary: vi.fn(),
    recordAttendance: vi.fn(),
    lockAttendance: vi.fn(),
    getIncentives: vi.fn(),
    syncIncentives: vi.fn(),
    getPayrolls: vi.fn(),
    getPayrollById: vi.fn(),
    createPayroll: vi.fn(),
    updatePayrollItem: vi.fn(),
    approvePayroll: vi.fn(),
    lockPayroll: vi.fn(),
    cancelPayroll: vi.fn(),
  },
}));

const mockOverview: PersonnelOverviewData = {
  employees: {
    totalActive: 9,
    totalTerminated: 1,
    doctorCount: 3,
    receptionCount: 1,
    warehouseCount: 1,
    accountingCount: 1,
  },
  today: {
    scheduledShifts: 9,
    presentCount: 8,
    lateCount: 1,
    onLeaveCount: 0,
  },
  governance: {
    pendingRoleApprovals: 1,
  },
  latestPayroll: {
    id: 1,
    code: 'BL202610/0001',
    year: 2026,
    month: 10,
    status: 'DRAFT',
    totalGross: 150000000,
    totalNet: 135000000,
    totalEmployees: 9,
  },
};

const mockEmployees: Employee[] = [
  {
    id: 1,
    code: 'NV-0001',
    fullName: 'Đỗ Minh Trí',
    dateOfBirth: '1988-04-12',
    gender: 'Nam',
    phone: '0901000001',
    title: 'Quản trị viên hệ thống',
    department: 'Ban Quản Trị',
    joinDate: '2024-01-01',
    status: 'ACTIVE',
    baseSalary: 30000000,
    fixedAllowance: 5000000,
    bankName: 'Vietcombank',
    bankAccountNumber: '******4567',
    citizenId: '******1122',
  },
  {
    id: 7,
    code: 'NV-0007',
    fullName: 'BS. Nguyễn Hoàng Minh',
    dateOfBirth: '1983-12-10',
    gender: 'Nam',
    phone: '0901000007',
    title: 'Bác sĩ CKI Nha khoa tổng quát',
    department: 'Khối Chuyên môn Lâm sàng',
    joinDate: '2024-01-01',
    status: 'ACTIVE',
    baseSalary: 28000000,
    fixedAllowance: 3000000,
    bankName: 'Vietcombank',
    bankAccountNumber: '******8776',
  },
];

const mockAssignments: UserRoleAssignment[] = [
  {
    id: 1,
    userId: 1,
    roleId: 1,
    isPrimary: true,
    isApproved: true,
    role: { id: 1, code: 'ADMIN', name: 'Quản trị viên', description: 'Toàn quyền' },
    user: { id: 1, username: 'admin', fullName: 'Đỗ Minh Trí', isActive: true, employee: { id: 1, code: 'NV-0001', title: 'Admin' } },
  },
  {
    id: 2,
    userId: 5,
    roleId: 4,
    isPrimary: false,
    isApproved: false, // Pending approval
    role: { id: 4, code: 'ACCOUNTING_STAFF', name: 'Nhân viên kế toán', description: 'Kế toán' },
    user: { id: 5, username: 'reception', fullName: 'Trần Tiếp Nhận', isActive: true, employee: { id: 5, code: 'NV-0005', title: 'Lễ tân' } },
  },
];

const mockUsers: UserAccount[] = [
  {
    id: 1,
    username: 'admin',
    fullName: 'Đỗ Minh Trí',
    isActive: true,
    roleId: 1,
    createdAt: '2024-01-01',
    role: { id: 1, code: 'ADMIN', name: 'Quản trị viên', description: 'Toàn quyền' },
    employee: { id: 1, code: 'NV-0001', fullName: 'Đỗ Minh Trí', title: 'Admin', department: 'Ban Quản Trị', status: 'ACTIVE', phone: '0901000001' },
    roleAssignments: [mockAssignments[0]],
  },
  {
    id: 3,
    username: 'doctor',
    fullName: 'BS. Nguyễn Hoàng Minh',
    isActive: true,
    roleId: 3,
    createdAt: '2024-01-01',
    role: { id: 3, code: 'DOCTOR', name: 'Bác sĩ thực hiện', description: 'Bác sĩ' },
    employee: { id: 7, code: 'NV-0007', fullName: 'BS. Nguyễn Hoàng Minh', title: 'Bác sĩ', department: 'Lâm sàng', status: 'ACTIVE', phone: '0901000007' },
    roleAssignments: [],
  },
  {
    id: 2,
    username: 'reception',
    fullName: 'Trần Tiếp Nhận',
    isActive: true,
    roleId: 2,
    createdAt: '2024-01-01',
    role: { id: 2, code: 'RECEPTION_STAFF', name: 'Nhân viên tiếp nhận', description: 'Tiếp nhận' },
    employee: { id: 5, code: 'NV-0005', fullName: 'Trần Tiếp Nhận', title: 'Lễ tân', department: 'Tiếp nhận', status: 'ACTIVE', phone: '0901000005' },
    roleAssignments: [],
  },
];

const mockPayroll: Payroll = {
  id: 1,
  code: 'BL202610/0001',
  year: 2026,
  month: 10,
  title: 'Bảng lương cán bộ nhân viên tháng 10/2026',
  standardWorkingDays: 26,
  status: 'DRAFT',
  totalGross: 58000000,
  totalDeductions: 4800000,
  totalNet: 53200000,
  createdById: 3,
  createdBy: { id: 3, username: 'hr', fullName: 'Lê Thị Nhân Sự' },
  items: [
    {
      id: 101,
      payrollId: 1,
      employeeId: 7,
      employee: mockEmployees[1],
      baseSalary: 28000000,
      standardDays: 26,
      actualDays: 26,
      attendanceSalary: 28000000,
      allowanceAmount: 3000000,
      serviceIncentiveAmount: 2500000,
      otherBonus: 0,
      overtimePay: 0,
      grossSalary: 33500000,
      insuranceDeduction: 2240000,
      advanceDeduction: 0,
      otherDeduction: 0,
      totalDeductions: 2240000,
      netSalary: 31260000,
    },
  ],
};

const mockIncentives: ServiceIncentive[] = [
  {
    id: 1,
    intakeServiceId: 10,
    examinationId: 5,
    employeeId: 7,
    employee: mockEmployees[1],
    roleType: 'DOCTOR',
    serviceName: 'Trồng răng Implant Dentium',
    serviceAmount: 25000000,
    rate: 5.0,
    incentiveAmount: 1250000,
    status: 'VALID',
    completedAt: '2026-10-18T10:00:00.000Z',
  },
  {
    id: 2,
    intakeServiceId: 10,
    examinationId: 5,
    employeeId: 5,
    employee: { ...mockEmployees[0], code: 'NV-0005', fullName: 'Trần Tiếp Nhận' },
    roleType: 'RECEPTION',
    serviceName: 'Trồng răng Implant Dentium',
    serviceAmount: 25000000,
    rate: 5.0,
    incentiveAmount: 1250000,
    status: 'VALID',
    completedAt: '2026-10-18T10:00:00.000Z',
  },
];

describe('Personnel & HR Feature Pages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(personnelApi.getOverview).mockResolvedValue(mockOverview);
    vi.mocked(personnelApi.getEmployees).mockResolvedValue(mockEmployees);
    vi.mocked(personnelApi.getRoles).mockResolvedValue({
      roles: [{ id: 1, code: 'ADMIN', name: 'Quản trị viên', description: 'Toàn quyền' }],
      forbiddenCombinations: [{ roleA: 'ACCOUNTING_STAFF', roleB: 'WAREHOUSE_MANAGEMENT', reason: 'Không kiêm nhiệm' }],
    });
    vi.mocked(personnelApi.getUserAccounts).mockResolvedValue(mockUsers);
    vi.mocked(personnelApi.getUserRoleAssignments).mockResolvedValue(mockAssignments);
    vi.mocked(personnelApi.getShifts).mockResolvedValue([
      { id: 1, code: 'CA_SANG', name: 'Ca sáng', startTime: '08:00', endTime: '12:00', shiftType: 'REGULAR', isActive: true },
    ]);
    vi.mocked(personnelApi.getShiftAssignments).mockResolvedValue([]);
    vi.mocked(personnelApi.getAttendance).mockResolvedValue([
      {
        id: 1,
        employeeId: 7,
        date: '2026-10-19',
        status: 'LATE',
        checkInTime: '08:15',
        checkOutTime: '17:00',
        lateMinutes: 15,
        overtimeHours: 0,
        sessionCount: 2,
        workUnits: 1.0,
        source: 'SELF',
        isAdjusted: false,
        approvalStatus: 'APPROVED',
        hasLeaveConflict: false,
        isOnDuty: false,
        isLocked: false,
        employee: mockEmployees[1],
      },
    ]);
    vi.mocked(personnelApi.getAttendanceSummary).mockResolvedValue([]);
    vi.mocked(personnelApi.getPayrolls).mockResolvedValue([mockPayroll]);
    vi.mocked(personnelApi.getPayrollById).mockResolvedValue(mockPayroll);
    vi.mocked(personnelApi.getIncentives).mockResolvedValue(mockIncentives);
    vi.mocked(personnelApi.syncIncentives).mockResolvedValue({ success: true, createdCount: 2 });
  });

  afterEach(() => {
    cleanup();
  });

  it('1. EmployeesPage renders employee list, stats, and opens create modal', async () => {
    render(
      <BrowserRouter>
        <EmployeesPage />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Quản Lý Hồ Sơ Nhân Sự')).toBeInTheDocument();
      expect(screen.getByText('NV-0001')).toBeInTheDocument();
      expect(screen.getByText('BS. Nguyễn Hoàng Minh')).toBeInTheDocument();
    });

    const createBtn = screen.getByRole('button', { name: /Thêm nhân viên mới/i });
    fireEvent.click(createBtn);

    expect(screen.getByText('Thêm Hồ Sơ Nhân Viên Mới')).toBeInTheDocument();
  });

  it('2. AccessPage manages user accounts (doctor, reception) and permissions with SoD approval', async () => {
    render(
      <BrowserRouter>
        <AccessPage />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Quản Lý Tài Khoản & Phân Quyền Vai Trò')).toBeInTheDocument();
      expect(screen.getByText('@doctor')).toBeInTheDocument();
      expect(screen.getByText('@reception')).toBeInTheDocument();
      expect(screen.getByText('BS. Nguyễn Hoàng Minh')).toBeInTheDocument();
      expect(screen.getByText('Trần Tiếp Nhận')).toBeInTheDocument();
    });

    // Test Create User Account Modal
    const createUserBtn = screen.getByRole('button', { name: /Cấp tài khoản mới/i });
    fireEvent.click(createUserBtn);

    expect(screen.getByText('Cấp Tài Khoản Người Dùng Mới')).toBeInTheDocument();

    // Switch to Permissions tab
    const permTab = screen.getByRole('button', { name: /Phân Quyền & Phê Duyệt Vai Trò/i });
    fireEvent.click(permTab);

    await waitFor(() => {
      expect(screen.getByText(/Tổ hợp vai trò bị cấm kiêm nhiệm/i)).toBeInTheDocument();
      expect(screen.getByText(/Yêu cầu gán vai trò nhạy cảm chờ phê duyệt/i)).toBeInTheDocument();
    });
  });

  it('3. AttendancePage displays daily attendance, late tracking, and switches to shifts tab', async () => {
    render(
      <BrowserRouter>
        <AttendancePage />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Quản Lý Công & Ca Trực')).toBeInTheDocument();
      expect(screen.getByText(/Đi trễ \(15p\)/i)).toBeInTheDocument();
    });

    // Switch to shifts tab
    const shiftsTabBtn = screen.getByRole('button', { name: /Lịch Phân Ca & Danh Mục Ca/i });
    fireEvent.click(shiftsTabBtn);

    await waitFor(() => {
      expect(screen.getByText('Danh Mục Các Ca Làm Việc & Ca Trực')).toBeInTheDocument();
      expect(screen.getByText('CA_SANG')).toBeInTheDocument();
    });
  });

  it('4. PayrollPage renders payroll cards, employee items, and opens A5 print preview', async () => {
    render(
      <BrowserRouter>
        <PayrollPage />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Quản Lý Bảng Lương & Chi Trả Lương')).toBeInTheDocument();
      expect(screen.getByText('BL202610/0001')).toBeInTheDocument();
      expect(screen.getByText('58.000.000 đ')).toBeInTheDocument(); // Gross
      expect(screen.getByText('53.200.000 đ')).toBeInTheDocument(); // Net
    });

    // Click print icon button
    const printBtn = screen.getByTitle('In phiếu lương A5');
    fireEvent.click(printBtn);

    await waitFor(() => {
      expect(screen.getByText('PHIẾU LƯƠNG NHÂN VIÊN')).toBeInTheDocument();
      expect(screen.getByText(/Xem trước bản in phiếu lương chuẩn khổ A5 dọc/i)).toBeInTheDocument();
    });
  });

  it('5. IncentivePage displays 5% doctor and 5% reception commissions with sync action', async () => {
    render(
      <BrowserRouter>
        <IncentivePage />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Quản Lý Thưởng Theo Dịch Vụ Nha Khoa')).toBeInTheDocument();
      expect(screen.getAllByText('Trồng răng Implant Dentium').length).toBe(2);
      expect(screen.getByText('Bác sĩ điều trị')).toBeInTheDocument();
      expect(screen.getByText('Tiếp nhận chỉ định')).toBeInTheDocument();
      expect(screen.getAllByText('1.250.000 đ').length).toBeGreaterThan(0);
    });

    const syncBtn = screen.getByRole('button', { name: /Đồng bộ thưởng từ ca khám/i });
    fireEvent.click(syncBtn);

    expect(personnelApi.syncIncentives).toHaveBeenCalled();
  });
});
