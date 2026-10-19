import { describe, expect, it, vi } from 'vitest';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { PersonnelService } from './personnel.service.js';

describe('PersonnelService', () => {
  const createMockPrisma = () => {
    return {
      employee: {
        count: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      employeeContract: {
        create: vi.fn(),
        findFirst: vi.fn(),
      },
      user: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      role: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
      },
      userRoleAssignment: {
        count: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        upsert: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      roleConfiguration: {
        findUnique: vi.fn(),
      },
      workShift: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      shiftAssignment: {
        count: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
      },
      attendanceRecord: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        upsert: vi.fn(),
        updateMany: vi.fn(),
      },
      attendanceAudit: {
        create: vi.fn(),
        findMany: vi.fn(),
      },
      workingHoursConfig: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      workingHoursAudit: {
        create: vi.fn(),
        findMany: vi.fn(),
      },
      serviceIncentive: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      doctorExamination: {
        count: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      payroll: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      },
      payrollItem: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      debt: {
        create: vi.fn(),
      },
      hrAuditLog: {
        create: vi.fn(),
        findMany: vi.fn(),
      },
      $transaction: vi.fn(async (cb: (tx: any) => Promise<any>) => cb(prismaMock)),
    } as any;
  };

  let prismaMock: ReturnType<typeof createMockPrisma>;
  let service: PersonnelService;

  const mockHrActor = { sub: 3, username: 'hr', role: 'HR' };
  const mockManagerActor = { sub: 2, username: 'manager', role: 'MANAGER' };
  const mockAdminActor = { sub: 1, username: 'admin', role: 'ADMIN' };

  beforeEach(() => {
    prismaMock = createMockPrisma();
    service = new PersonnelService(prismaMock);
  });

  it('blocks duplicate phone number when creating employee', async () => {
    prismaMock.employee.findUnique.mockResolvedValueOnce({ id: 1, code: 'NV-0001', fullName: 'Đã có', phone: '0901234567' });

    await expect(
      service.createEmployee(
        {
          fullName: 'Nguyễn Văn Mới',
          dateOfBirth: '1995-01-01',
          gender: 'Nam',
          phone: '0901234567',
          title: 'Nhân viên',
          joinDate: '2026-01-01',
          baseSalary: 10_000_000,
          fixedAllowance: 1_000_000,
        },
        mockHrActor,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('blocks employee termination if doctor has in-progress examinations', async () => {
    prismaMock.employee.findUnique.mockResolvedValueOnce({
      id: 7,
      code: 'NV-0007',
      fullName: 'BS. Minh',
      status: 'ACTIVE',
      userId: 7,
      joinDate: new Date('2024-01-01'),
    });
    prismaMock.doctorExamination.findFirst.mockResolvedValueOnce({
      id: 10,
      code: 'DT20261019/0001',
      status: 'IN_PROGRESS',
    });

    await expect(
      service.terminateEmployee(
        7,
        { terminationDate: '2026-10-31', terminationReason: 'Xin nghỉ phép dài hạn' },
        mockHrActor,
      ),
    ).rejects.toThrow('Chặn nghỉ việc: Bác sĩ BS. Minh hiện đang có ca khám chưa hoàn thành');
  });

  it('prevents HR from assigning roles to themselves', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 3,
      username: 'hr',
      role: { code: 'HR' },
      roleAssignments: [],
    });
    prismaMock.role.findUnique.mockResolvedValueOnce({
      id: 1,
      code: 'ADMIN',
      name: 'Quản trị viên',
    });

    await expect(
      service.assignRoleToUser(3, { roleId: 1 }, mockHrActor),
    ).rejects.toThrow('Chuyên viên Hành chính Nhân sự không được tự gán vai trò cho chính mình');
  });

  it('prevents forbidden role combinations (Accounting + Warehouse)', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 4,
      username: 'accounting',
      role: { code: 'ACCOUNTING_STAFF' },
      roleAssignments: [{ role: { code: 'ACCOUNTING_STAFF' } }],
    });
    prismaMock.role.findUnique.mockResolvedValueOnce({
      id: 4,
      code: 'WAREHOUSE_MANAGEMENT',
      name: 'Quản lý kho',
    });
    prismaMock.roleConfiguration.findUnique.mockResolvedValueOnce({
      configKey: 'FORBIDDEN_ROLE_COMBINATIONS',
      configValue: JSON.stringify([
        { roleA: 'ACCOUNTING_STAFF', roleB: 'WAREHOUSE_MANAGEMENT', reason: 'Không kiêm nhiệm kho' },
      ]),
    });

    await expect(
      service.assignRoleToUser(4, { roleId: 4 }, mockAdminActor),
    ).rejects.toThrow('Tổ hợp vai trò bị cấm: ACCOUNTING_STAFF và WAREHOUSE_MANAGEMENT');
  });

  it('enforces segregation of duties on sensitive role approvals (actor !== assigner)', async () => {
    prismaMock.userRoleAssignment.findUnique.mockResolvedValueOnce({
      id: 15,
      assignedById: 2, // Assigned by manager
      role: { code: 'ACCOUNTING_STAFF', name: 'Nhân viên kế toán' },
      user: { username: 'test-user', fullName: 'Người thử nghiệm' },
    });

    // Manager (id=2) tries to approve own assignment -> blocked
    await expect(
      service.approveRoleAssignment(15, mockManagerActor),
    ).rejects.toThrow('Người phê duyệt phải độc lập với người đề xuất');
  });

  it('blocks shift assignment with overlapping time or multiple rooms at same hour', async () => {
    prismaMock.employee.findUnique.mockResolvedValueOnce({ id: 5, fullName: 'Trần Tiếp Nhận' });
    prismaMock.workShift.findUnique.mockResolvedValueOnce({
      id: 1,
      name: 'Ca sáng',
      startTime: '08:00',
      endTime: '12:00',
    });
    prismaMock.shiftAssignment.findMany.mockResolvedValueOnce([
      {
        shiftId: 2,
        roomId: 1,
        shift: { startTime: '08:00', endTime: '12:00' },
      },
    ]);

    await expect(
      service.assignShift(
        { employeeId: 5, shiftId: 1, date: '2026-10-20', roomId: 2 },
        mockHrActor,
      ),
    ).rejects.toThrow('Xung đột phân ca');
  });

  it('enforces segregation of duties on payroll approval (approver !== creator)', async () => {
    prismaMock.payroll.findUnique.mockResolvedValueOnce({
      id: 1,
      code: 'BL202610/0001',
      status: 'DRAFT',
      createdById: 2, // Manager created this draft
    });

    // Manager tries to approve own payroll -> blocked!
    await expect(
      service.approvePayroll(1, mockManagerActor),
    ).rejects.toThrow('Người phê duyệt bảng lương phải độc lập với người lập');
  });

  it('demotes approved payroll back to draft if item line is edited after approval', async () => {
    prismaMock.payroll.findUnique.mockResolvedValueOnce({
      id: 1,
      code: 'BL202610/0001',
      status: 'APPROVED',
    });
    prismaMock.payrollItem.findUnique.mockResolvedValueOnce({
      id: 10,
      payrollId: 1,
      baseSalary: 10_000_000,
      standardDays: 26,
      actualDays: 26,
      allowanceAmount: 1_000_000,
      serviceIncentiveAmount: 0,
      otherBonus: 0,
      overtimePay: 0,
      insuranceDeduction: 800_000,
      advanceDeduction: 0,
      otherDeduction: 0,
    });
    prismaMock.payrollItem.findMany.mockResolvedValueOnce([
      { grossSalary: 11_500_000, totalDeductions: 800_000, netSalary: 10_700_000 },
    ]);

    const res = await service.updatePayrollItem(1, 10, { allowanceAmount: 1_500_000 }, mockHrActor);
    expect(res.success).toBe(true);
    expect(prismaMock.payroll.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'DRAFT' }),
      }),
    );
  });

  it('locking payroll automatically generates salary payable liabilities in accounting', async () => {
    prismaMock.payroll.findUnique.mockResolvedValueOnce({
      id: 1,
      code: 'BL202610/0001',
      year: 2026,
      month: 10,
      status: 'APPROVED',
      totalNet: 10_000_000,
      items: [
        {
          id: 101,
          netSalary: 10_000_000,
          employee: { code: 'NV-0005', fullName: 'Trần Tiếp Nhận', roomId: 1 },
        },
      ],
    });

    await service.lockPayroll(1, mockHrActor);

    expect(prismaMock.debt.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          debtType: 'EMPLOYEE_PAYABLE',
          sourceType: 'PAYROLL',
          sourceCode: 'BL202610/0001/NV-0005',
          principalAmount: 10_000_000,
        }),
      }),
    );
  });

  it('creates a new user account with default password and assigns primary role', async () => {
    prismaMock.user.findFirst.mockResolvedValueOnce(null);
    prismaMock.role.findUnique.mockResolvedValueOnce({ id: 3, code: 'DOCTOR', name: 'Bác sĩ' });
    prismaMock.employee.findUnique.mockResolvedValueOnce({ id: 7, code: 'NV-0007', fullName: 'BS. Minh', userId: null });
    prismaMock.user.create.mockResolvedValueOnce({ id: 10, username: 'bs.minh', fullName: 'BS. Minh', roleId: 3 });

    const result = await service.createUserAccount(
      { username: 'bs.minh', fullName: 'BS. Minh', roleId: 3, employeeId: 7 },
      mockHrActor,
    );

    expect(result.id).toBe(10);
    expect(prismaMock.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          username: 'bs.minh',
          fullName: 'BS. Minh',
          roleId: 3,
        }),
      }),
    );
    expect(prismaMock.employee.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 7 },
        data: { userId: 10 },
      }),
    );
  });

  it('prevents locking an active doctor account if clinical examinations are in progress', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 3,
      username: 'doctor',
      fullName: 'BS. Minh',
      isActive: true,
      role: { code: 'DOCTOR' },
    });
    prismaMock.doctorExamination.count.mockResolvedValueOnce(2);

    await expect(service.toggleUserAccountActive(3, mockHrActor)).rejects.toThrow(BadRequestException);
  });

  describe('Universal Attendance & Working Hours', () => {
    it('check-in records server time on first click and returns confirmation', async () => {
      prismaMock.employee.findUnique.mockResolvedValueOnce({ id: 5, code: 'NV-0005', fullName: 'Lê Tiếp Nhận' });
      prismaMock.attendanceRecord.findUnique.mockResolvedValueOnce(null);
      prismaMock.workingHoursConfig.findFirst.mockResolvedValueOnce(null);
      prismaMock.attendanceRecord.upsert.mockResolvedValueOnce({
        id: 1,
        employeeId: 5,
        checkInTime: '08:50',
        status: 'DANG_LAM',
      });

      const res = await service.checkIn({}, { sub: 5, username: 'reception', role: 'RECEPTION_STAFF' });
      expect(res.alreadyDone).toBe(false);
      expect(res.message).toContain('Đã Check-in lúc');
      expect(prismaMock.attendanceRecord.upsert).toHaveBeenCalled();
      expect(prismaMock.attendanceAudit.create).toHaveBeenCalled();
    });

    it('subsequent check-in clicks notify that user already checked in and preserve original time', async () => {
      prismaMock.employee.findUnique.mockResolvedValueOnce({ id: 5, code: 'NV-0005', fullName: 'Lê Tiếp Nhận' });
      prismaMock.attendanceRecord.findUnique.mockResolvedValueOnce({
        id: 1,
        employeeId: 5,
        checkInTime: '08:50',
        originalCheckInTime: '08:50',
      });

      const res = await service.checkIn({}, { sub: 5, username: 'reception', role: 'RECEPTION_STAFF' });
      expect(res.alreadyDone).toBe(true);
      expect(res.message).toBe('Bạn đã Check-in rồi (lúc 08:50)');
      expect(prismaMock.attendanceRecord.upsert).not.toHaveBeenCalled();
    });

    it('blocks checkout if user has not checked in today', async () => {
      prismaMock.employee.findUnique.mockResolvedValueOnce({ id: 5, code: 'NV-0005' });
      prismaMock.attendanceRecord.findUnique.mockResolvedValueOnce(null);

      await expect(service.checkOut({}, { sub: 5, username: 'reception', role: 'RECEPTION_STAFF' })).rejects.toThrow(
        'Bạn chưa Check-in hôm nay.',
      );
    });

    it('warns doctor before check-out if an examination is currently in progress', async () => {
      prismaMock.employee.findUnique.mockResolvedValueOnce({ id: 2, code: 'NV-0002' });
      prismaMock.doctorExamination.findFirst.mockResolvedValueOnce({ id: 10, status: 'IN_PROGRESS' });

      const res = await service.checkOut({}, { sub: 2, username: 'doctor1', role: 'DOCTOR' });
      expect(res.hasActiveExamWarning).toBe(true);
      expect(res.message).toContain('Bác sĩ đang có ca khám "Đang khám" chưa Ghi sổ');
      expect(prismaMock.attendanceRecord.update).not.toHaveBeenCalled();
    });

    it('allows doctor to confirm check-out even when exam is in progress', async () => {
      prismaMock.employee.findUnique.mockResolvedValueOnce({ id: 2, code: 'NV-0002' });
      prismaMock.attendanceRecord.findUnique.mockResolvedValueOnce({
        id: 2,
        checkInTime: '08:30',
        configSnapshot: JSON.stringify({ startTime: '09:00', endTime: '18:00', splitTime: '12:00' }),
      });
      prismaMock.attendanceRecord.update.mockResolvedValueOnce({ id: 2, status: 'DU_NGAY' });

      const res = await service.checkOut(
        { confirmActiveExam: true },
        { sub: 2, username: 'doctor1', role: 'DOCTOR' },
      );
      expect(res.success).toBe(true);
      expect(res.message).toContain('Đã Check-out lúc');
      expect(prismaMock.attendanceRecord.update).toHaveBeenCalled();
    });

    it('HR adjustments require a mandatory reason and are set to PENDING_APPROVAL', async () => {
      await expect(
        service.adjustAttendance(
          { employeeId: 5, date: '2026-10-18', reason: '   ' },
          mockHrActor,
        ),
      ).rejects.toThrow('Lý do điều chỉnh là bắt buộc.');
    });

    it('enforces maker-checker rule: adjuster cannot approve their own adjustment', async () => {
      prismaMock.attendanceRecord.findUnique.mockResolvedValueOnce({
        id: 99,
        employeeId: 5,
        adjustedById: 3, // same as mockHrActor (sub: 3)
      });

      await expect(
        service.approveAttendanceAdjustment(99, { approved: true }, mockHrActor),
      ).rejects.toThrow('Người sửa và người duyệt không được là cùng một tài khoản (Quy tắc Maker-Checker).');
    });

    it('allows a manager or checker different from adjuster to approve adjustment', async () => {
      prismaMock.attendanceRecord.findUnique.mockResolvedValueOnce({
        id: 99,
        employeeId: 5,
        adjustedById: 3, // adjusted by HR (sub: 3)
      });
      prismaMock.attendanceRecord.update.mockResolvedValueOnce({
        id: 99,
        approvalStatus: 'APPROVED',
      });

      const res = await service.approveAttendanceAdjustment(99, { approved: true }, mockManagerActor); // sub: 2
      expect(res.approvalStatus).toBe('APPROVED');
      expect(prismaMock.attendanceAudit.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: 'APPROVE' }),
        }),
      );
    });

    it('validates working hours order: rejects saving config when S >= M or M >= E', async () => {
      await expect(
        service.saveWorkingHoursConfig(
          { startTime: '13:00', splitTime: '12:00', endTime: '18:00', effectiveDate: '2026-10-25' },
          mockHrActor,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});

