import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../infrastructure/database/prisma.service.js';
import type { AuthenticatedPersonnelUser } from './personnel.guard.js';
import {
  calculateSalary,
  calculateServiceIncentive,
  DEFAULT_WORKING_HOURS,
  calculateAttendanceMetrics,
  formatEmployeeCode,
  formatPayrollCode,
  getVietnamDateNow,
  maskSensitiveString,
  SENSITIVE_ROLES,
  timeToMinutes,
  validateForbiddenRoles,
  validateWorkingHoursOrder,
} from './personnel-domain.js';
import { hash } from 'bcryptjs';
import type {
  AdjustAttendanceDto,
  ApproveAttendanceAdjustmentDto,
  AssignRoleDto,
  AssignShiftDto,
  CancelPayrollDto,
  CheckInDto,
  CheckOutDto,
  CreateEmployeeDto,
  CreatePayrollDto,
  CreateShiftDto,
  CreateUserAccountDto,
  GenerateWeeklyShiftsDto,
  RecordAttendanceDto,
  ResetUserPasswordDto,
  SaveWorkingHoursConfigDto,
  TerminateEmployeeDto,
  UpdateEmployeeDto,
  UpdatePayrollItemDto,
  UpdateUserAccountDto,
} from './dto/personnel.dto.js';

@Injectable()
export class PersonnelService {
  constructor(private readonly prisma: PrismaService) {}

  // -------------------------------------------------------------
  // AUDIT LOG HELPER
  // -------------------------------------------------------------
  private async logAudit(
    entityType: string,
    entityId: number,
    action: string,
    actorId?: number,
    details?: Record<string, unknown>,
  ) {
    try {
      await this.prisma.hrAuditLog.create({
        data: {
          entityType,
          entityId,
          action,
          actorId,
          detailsJson: details ? JSON.stringify(details) : null,
        },
      });
    } catch (err) {
      console.error('Failed to write HR audit log:', err);
    }
  }

  // -------------------------------------------------------------
  // OVERVIEW
  // -------------------------------------------------------------
  async getOverview() {
    const [totalActive, totalTerminated, employees] = await Promise.all([
      this.prisma.employee.count({ where: { status: 'ACTIVE' } }),
      this.prisma.employee.count({ where: { status: 'TERMINATED' } }),
      this.prisma.employee.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, title: true, department: true },
      }),
    ]);

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const [todayShifts, todayAttendance, pendingRoles, latestPayroll] = await Promise.all([
      this.prisma.shiftAssignment.count({ where: { date: today } }),
      this.prisma.attendanceRecord.findMany({ where: { date: today } }),
      this.prisma.userRoleAssignment.count({ where: { isApproved: false } }),
      this.prisma.payroll.findFirst({ orderBy: { id: 'desc' }, include: { items: true } }),
    ]);

    const presentCount = todayAttendance.filter((a) => a.status === 'PRESENT').length;
    const lateCount = todayAttendance.filter((a) => a.status === 'LATE' || a.lateMinutes > 0).length;
    const onLeaveCount = todayAttendance.filter((a) => a.status === 'ON_LEAVE').length;

    const doctorCount = employees.filter((e) => e.title.toLowerCase().includes('bác sĩ')).length;
    const receptionCount = employees.filter((e) => e.title.toLowerCase().includes('tiếp nhận') || e.title.toLowerCase().includes('lễ tân')).length;
    const warehouseCount = employees.filter((e) => e.title.toLowerCase().includes('kho')).length;
    const accountingCount = employees.filter((e) => e.title.toLowerCase().includes('kế toán')).length;

    return {
      employees: {
        totalActive,
        totalTerminated,
        doctorCount,
        receptionCount,
        warehouseCount,
        accountingCount,
      },
      today: {
        scheduledShifts: todayShifts,
        presentCount,
        lateCount,
        onLeaveCount,
      },
      governance: {
        pendingRoleApprovals: pendingRoles,
      },
      latestPayroll: latestPayroll
        ? {
            id: latestPayroll.id,
            code: latestPayroll.code,
            year: latestPayroll.year,
            month: latestPayroll.month,
            status: latestPayroll.status,
            totalGross: latestPayroll.totalGross,
            totalNet: latestPayroll.totalNet,
            totalEmployees: latestPayroll.items.length,
          }
        : null,
    };
  }

  // -------------------------------------------------------------
  // EMPLOYEES MANAGEMENT
  // -------------------------------------------------------------
  async getEmployees(params?: {
    search?: string;
    department?: string;
    status?: string;
    roomId?: number;
    maskSensitive?: boolean;
  }) {
    const where: any = {};
    if (params?.status) where.status = params.status;
    if (params?.department) where.department = { contains: params.department };
    if (params?.roomId) where.roomId = params.roomId;
    if (params?.search) {
      where.OR = [
        { code: { contains: params.search } },
        { fullName: { contains: params.search } },
        { phone: { contains: params.search } },
      ];
    }

    const employees = await this.prisma.employee.findMany({
      where,
      include: {
        room: true,
        user: { include: { role: true, roleAssignments: { include: { role: true } } } },
        contracts: { orderBy: { id: 'desc' }, take: 1 },
      },
      orderBy: { id: 'asc' },
    });

    const mask = params?.maskSensitive !== false;
    return employees.map((emp) => ({
      ...emp,
      bankAccountNumber: mask ? maskSensitiveString(emp.bankAccountNumber) : emp.bankAccountNumber,
      citizenId: mask ? maskSensitiveString(emp.citizenId) : emp.citizenId,
      insuranceCode: mask ? maskSensitiveString(emp.insuranceCode) : emp.insuranceCode,
    }));
  }

  async getEmployeeById(id: number, actor?: AuthenticatedPersonnelUser) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: {
        room: true,
        user: {
          include: {
            role: true,
            roleAssignments: { include: { role: true } },
          },
        },
        contracts: { orderBy: { id: 'desc' } },
        shiftAssignments: {
          orderBy: { date: 'desc' },
          take: 10,
          include: { shift: true, room: true },
        },
        attendances: { orderBy: { date: 'desc' }, take: 31 },
        incentives: { orderBy: { id: 'desc' }, take: 20 },
      },
    });

    if (!employee) throw new NotFoundException('Không tìm thấy hồ sơ nhân viên.');

    // Audit log for viewing employee details
    if (actor) {
      await this.logAudit('EMPLOYEE', id, 'VIEW_DETAILS', actor.sub, {
        viewedEmployeeCode: employee.code,
        actorUsername: actor.username,
      });
    }

    return employee;
  }

  async createEmployee(dto: CreateEmployeeDto, actor: AuthenticatedPersonnelUser) {
    // 1. Anti-duplicate check
    const existingPhone = await this.prisma.employee.findUnique({ where: { phone: dto.phone } });
    if (existingPhone) {
      throw new BadRequestException(`Số điện thoại ${dto.phone} đã được đăng ký cho nhân viên ${existingPhone.code} (${existingPhone.fullName}).`);
    }

    const duplicateCheck = await this.prisma.employee.findFirst({
      where: {
        fullName: dto.fullName.trim(),
        dateOfBirth: new Date(dto.dateOfBirth),
      },
    });
    if (duplicateCheck) {
      throw new BadRequestException(
        `Cảnh báo trùng lặp hồ sơ: Đã tồn tại nhân viên ${duplicateCheck.code} có cùng họ tên "${dto.fullName}" và ngày sinh "${dto.dateOfBirth}".`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // 2. Generate sequential Employee code NV-0001
      const count = await tx.employee.count();
      let nextSeq = count + 1;
      let code = formatEmployeeCode(nextSeq);

      while (await tx.employee.findUnique({ where: { code } })) {
        nextSeq++;
        code = formatEmployeeCode(nextSeq);
      }

      const employee = await tx.employee.create({
        data: {
          code,
          fullName: dto.fullName.trim(),
          dateOfBirth: new Date(dto.dateOfBirth),
          gender: dto.gender,
          phone: dto.phone.trim(),
          email: dto.email?.trim() || null,
          address: dto.address?.trim() || null,
          citizenId: dto.citizenId?.trim() || null,
          title: dto.title.trim(),
          department: dto.department?.trim() || null,
          roomId: dto.roomId || null,
          joinDate: new Date(dto.joinDate),
          status: 'ACTIVE',
          insuranceCode: dto.insuranceCode?.trim() || null,
          insuranceStartDate: dto.joinDate ? new Date(dto.joinDate) : null,
          bankName: dto.bankName?.trim() || null,
          bankAccountNumber: dto.bankAccountNumber?.trim() || null,
          bankAccountName: dto.bankAccountName?.trim() || null,
          baseSalary: dto.baseSalary,
          fixedAllowance: dto.fixedAllowance,
          userId: dto.userId || null,
        },
      });

      // Contract
      if (dto.contractNumber || dto.contractType) {
        await tx.employeeContract.create({
          data: {
            employeeId: employee.id,
            contractNumber: dto.contractNumber || `HDLD-${employee.code}/2026`,
            contractType: dto.contractType || 'XAC_DINH_THOI_HAN',
            startDate: dto.contractStartDate ? new Date(dto.contractStartDate) : new Date(dto.joinDate),
            endDate: dto.contractEndDate ? new Date(dto.contractEndDate) : null,
            note: dto.note || null,
          },
        });
      }

      await this.logAudit('EMPLOYEE', employee.id, 'CREATE_EMPLOYEE', actor.sub, {
        code,
        fullName: employee.fullName,
      });

      return employee;
    });
  }

  async updateEmployee(id: number, dto: UpdateEmployeeDto, actor: AuthenticatedPersonnelUser) {
    const existing = await this.prisma.employee.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Không tìm thấy nhân viên.');

    if (dto.phone && dto.phone !== existing.phone) {
      const duplicatePhone = await this.prisma.employee.findUnique({ where: { phone: dto.phone } });
      if (duplicatePhone) throw new BadRequestException(`Số điện thoại ${dto.phone} đã thuộc nhân viên khác.`);
    }

    const updated = await this.prisma.employee.update({
      where: { id },
      data: {
        fullName: dto.fullName?.trim(),
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        gender: dto.gender,
        phone: dto.phone?.trim(),
        email: dto.email?.trim(),
        address: dto.address?.trim(),
        citizenId: dto.citizenId?.trim(),
        title: dto.title?.trim(),
        department: dto.department?.trim(),
        roomId: dto.roomId,
        insuranceCode: dto.insuranceCode?.trim(),
        bankName: dto.bankName?.trim(),
        bankAccountNumber: dto.bankAccountNumber?.trim(),
        bankAccountName: dto.bankAccountName?.trim(),
        baseSalary: dto.baseSalary,
        fixedAllowance: dto.fixedAllowance,
        userId: dto.userId,
      },
    });

    await this.logAudit('EMPLOYEE', id, 'UPDATE_EMPLOYEE', actor.sub, { changes: dto });
    return updated;
  }

  async terminateEmployee(id: number, dto: TerminateEmployeeDto, actor: AuthenticatedPersonnelUser) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!employee) throw new NotFoundException('Không tìm thấy nhân viên.');
    if (employee.status === 'TERMINATED') throw new BadRequestException('Nhân viên này đã ở trạng thái nghỉ việc.');

    // Invariant check: if employee is a doctor, check if doctor currently has in-progress examinations
    if (employee.userId) {
      const activeExam = await this.prisma.doctorExamination.findFirst({
        where: { doctorId: employee.userId, status: 'IN_PROGRESS' },
      });
      if (activeExam) {
        throw new BadRequestException(
          `Chặn nghỉ việc: Bác sĩ ${employee.fullName} hiện đang có ca khám chưa hoàn thành (${activeExam.code}). Vui lòng hoàn tất hoặc chuyển giao ca khám trước khi xử lý nghỉ việc.`,
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const termDate = new Date(dto.terminationDate);
      if (termDate < employee.joinDate) {
        throw new BadRequestException('Ngày nghỉ việc không được trước ngày vào làm.');
      }

      // Update employee
      const terminated = await tx.employee.update({
        where: { id },
        data: {
          status: 'TERMINATED',
          terminationDate: termDate,
          terminationReason: dto.terminationReason.trim(),
        },
      });

      // Deactivate user account if linked
      if (employee.userId) {
        await tx.user.update({
          where: { id: employee.userId },
          data: { isActive: false },
        });
      }

      await this.logAudit('EMPLOYEE', id, 'TERMINATE_EMPLOYEE', actor.sub, {
        terminationDate: dto.terminationDate,
        terminationReason: dto.terminationReason,
      });

      return terminated;
    });
  }

  // -------------------------------------------------------------
  // ROLES & ACCESS MANAGEMENT
  // -------------------------------------------------------------
  async getRoles() {
    const [roles, config] = await Promise.all([
      this.prisma.role.findMany({ orderBy: { id: 'asc' } }),
      this.prisma.roleConfiguration.findUnique({ where: { configKey: 'FORBIDDEN_ROLE_COMBINATIONS' } }),
    ]);

    const forbidden = config ? JSON.parse(config.configValue) : [];
    return { roles, forbiddenCombinations: forbidden };
  }

  // -------------------------------------------------------------
  // USER ACCOUNT MANAGEMENT (HR & ADMIN)
  // -------------------------------------------------------------
  async getUserAccounts(filter?: { search?: string; roleCode?: string; roleId?: number; isActive?: boolean }) {
    const where: any = {};
    if (filter?.search) {
      const s = filter.search.trim().toLowerCase();
      where.OR = [
        { username: { contains: s } },
        { fullName: { contains: s } },
      ];
    }
    if (filter?.roleId) {
      where.roleId = filter.roleId;
    }
    if (filter?.roleCode) {
      where.role = { code: filter.roleCode };
    }
    if (filter?.isActive !== undefined) {
      where.isActive = filter.isActive;
    }

    return this.prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        fullName: true,
        isActive: true,
        roleId: true,
        createdAt: true,
        role: {
          select: { id: true, code: true, name: true, description: true },
        },
        employee: {
          select: {
            id: true,
            code: true,
            fullName: true,
            title: true,
            department: true,
            status: true,
            phone: true,
          },
        },
        roleAssignments: {
          include: { role: true },
        },
      },
      orderBy: { id: 'asc' },
    });
  }

  async createUserAccount(dto: CreateUserAccountDto, actor: AuthenticatedPersonnelUser) {
    const cleanUsername = dto.username.trim().toLowerCase();
    const existing = await this.prisma.user.findFirst({
      where: { username: cleanUsername },
    });
    if (existing) {
      throw new BadRequestException(`Tên đăng nhập "${cleanUsername}" đã tồn tại trong hệ thống.`);
    }

    const role = await this.prisma.role.findUnique({ where: { id: dto.roleId } });
    if (!role) {
      throw new NotFoundException('Không tìm thấy vai trò đã chọn.');
    }

    if (dto.employeeId) {
      const emp = await this.prisma.employee.findUnique({ where: { id: dto.employeeId } });
      if (!emp) throw new NotFoundException('Không tìm thấy thông tin nhân viên liên kết.');
      if (emp.userId) {
        throw new BadRequestException(`Nhân viên ${emp.code} (${emp.fullName}) đã được liên kết với một tài khoản người dùng khác.`);
      }
    }

    const passwordToHash = dto.password?.trim() || 'Dental@123';
    const passwordHash = await hash(passwordToHash, 10);

    return this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          username: cleanUsername,
          fullName: dto.fullName.trim(),
          passwordHash,
          isActive: true,
          roleId: dto.roleId,
        },
        include: { role: true },
      });

      if (dto.employeeId) {
        await tx.employee.update({
          where: { id: dto.employeeId },
          data: { userId: newUser.id },
        });
      }

      await tx.userRoleAssignment.create({
        data: {
          userId: newUser.id,
          roleId: dto.roleId,
          isPrimary: true,
          isApproved: true,
          assignedById: actor.sub,
          approvedById: actor.sub,
          approvedAt: new Date(),
        },
      });

      await this.logAudit('USER', newUser.id, 'CREATE_USER_ACCOUNT', actor.sub, {
        username: cleanUsername,
        fullName: dto.fullName,
        roleCode: role.code,
        employeeId: dto.employeeId,
      });

      return newUser;
    });
  }

  async updateUserAccount(id: number, dto: UpdateUserAccountDto, actor: AuthenticatedPersonnelUser) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Không tìm thấy tài khoản người dùng.');

    return this.prisma.$transaction(async (tx) => {
      const data: any = {};
      if (dto.fullName) data.fullName = dto.fullName.trim();
      if (dto.roleId) data.roleId = dto.roleId;

      const updated = await tx.user.update({
        where: { id },
        data,
        include: { role: true, employee: true },
      });

      if (dto.employeeId !== undefined) {
        await tx.employee.updateMany({
          where: { userId: id },
          data: { userId: null },
        });

        if (dto.employeeId) {
          await tx.employee.update({
            where: { id: dto.employeeId },
            data: { userId: id },
          });
        }
      }

      await this.logAudit('USER', id, 'UPDATE_USER_ACCOUNT', actor.sub, {
        fullName: dto.fullName,
        roleId: dto.roleId,
        employeeId: dto.employeeId,
      });

      return updated;
    });
  }

  async toggleUserAccountActive(id: number, actor: AuthenticatedPersonnelUser) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { role: true, employee: true },
    });
    if (!user) throw new NotFoundException('Không tìm thấy tài khoản người dùng.');

    if (user.id === actor.sub) {
      throw new BadRequestException('Quy tắc an toàn: Bạn không thể tự khóa tài khoản của chính mình.');
    }

    if (user.isActive && user.role.code === 'DOCTOR') {
      const activeExams = await this.prisma.doctorExamination.count({
        where: {
          doctorId: user.id,
          status: 'IN_PROGRESS',
        },
      });
      if (activeExams > 0) {
        throw new BadRequestException(
          `Không thể khóa tài khoản bác sĩ ${user.fullName} vì đang có ${activeExams} ca khám chưa hoàn thành. Vui lòng chuyển giao ca khám trước khi khóa tài khoản!`,
        );
      }
    }

    const nextActive = !user.isActive;

    const updated = await this.prisma.user.update({
      where: { id },
      data: { isActive: nextActive },
      include: { role: true, employee: true },
    });

    await this.logAudit('USER', id, nextActive ? 'UNLOCK_USER_ACCOUNT' : 'LOCK_USER_ACCOUNT', actor.sub, {
      username: user.username,
      isActive: nextActive,
    });

    return updated;
  }

  async resetUserPassword(id: number, dto: ResetUserPasswordDto, actor: AuthenticatedPersonnelUser) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Không tìm thấy tài khoản người dùng.');

    const passwordToHash = dto.newPassword?.trim() || 'Dental@123';
    const passwordHash = await hash(passwordToHash, 10);

    await this.prisma.user.update({
      where: { id },
      data: { passwordHash },
    });

    await this.logAudit('USER', id, 'RESET_USER_PASSWORD', actor.sub, {
      username: user.username,
    });

    return { success: true, message: `Đã đặt lại mật khẩu thành công cho tài khoản "${user.username}".` };
  }

  async getUserRoleAssignments() {
    return this.prisma.userRoleAssignment.findMany({
      include: {
        user: { select: { id: true, username: true, fullName: true, isActive: true, employee: { select: { id: true, code: true, title: true } } } },
        role: true,
      },
      orderBy: { id: 'desc' },
    });
  }

  async assignRoleToUser(userId: number, dto: AssignRoleDto, actor: AuthenticatedPersonnelUser) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roleAssignments: { include: { role: true } }, role: true },
    });
    if (!user) throw new NotFoundException('Không tìm thấy tài khoản người dùng.');

    const targetRole = await this.prisma.role.findUnique({ where: { id: dto.roleId } });
    if (!targetRole) throw new NotFoundException('Không tìm thấy vai trò.');

    // Rule 1: HR cannot assign roles to themselves
    if (actor.sub === userId && actor.role === 'HR') {
      throw new BadRequestException('Quy tắc an toàn: Chuyên viên Hành chính Nhân sự không được tự gán vai trò cho chính mình.');
    }

    // Rule 2: Check forbidden role combinations
    const currentRoleCodes = user.roleAssignments.map((ra) => ra.role.code);
    if (!currentRoleCodes.includes(targetRole.code)) {
      currentRoleCodes.push(targetRole.code);
    }

    const config = await this.prisma.roleConfiguration.findUnique({ where: { configKey: 'FORBIDDEN_ROLE_COMBINATIONS' } });
    const forbidden = config ? JSON.parse(config.configValue) : [];
    const checkForbidden = validateForbiddenRoles(currentRoleCodes, forbidden);
    if (!checkForbidden.isAllowed) {
      throw new BadRequestException(checkForbidden.violationReason);
    }

    // Rule 3: Sensitive role assignment requires approval by Admin or HR
    const isSensitive = SENSITIVE_ROLES.includes(targetRole.code);
    const actorCanApprove = ['ADMIN', 'HR', 'MANAGER'].includes(actor.role);
    const isApproved = !isSensitive || actorCanApprove;

    const assignment = await this.prisma.userRoleAssignment.upsert({
      where: { userId_roleId: { userId, roleId: dto.roleId } },
      update: {
        isPrimary: dto.isPrimary ?? false,
        isApproved,
        approvedById: isApproved && isSensitive ? actor.sub : null,
        approvedAt: isApproved && isSensitive ? new Date() : null,
      },
      create: {
        userId,
        roleId: dto.roleId,
        isPrimary: dto.isPrimary ?? false,
        isApproved,
        assignedById: actor.sub,
        approvedById: isApproved && isSensitive ? actor.sub : null,
        approvedAt: isApproved && isSensitive ? new Date() : null,
      },
      include: { role: true, user: true },
    });

    await this.logAudit('USER_ROLE', assignment.id, 'ASSIGN_ROLE', actor.sub, {
      userId,
      roleCode: targetRole.code,
      isApproved,
      needsApproval: !isApproved,
    });

    return assignment;
  }

  async approveRoleAssignment(assignmentId: number, actor: AuthenticatedPersonnelUser) {
    if (!['ADMIN', 'HR', 'MANAGER'].includes(actor.role)) {
      throw new ForbiddenException('Chỉ Quản trị viên hoặc Hành chính nhân sự mới có quyền phê duyệt vai trò nhạy cảm.');
    }

    const assignment = await this.prisma.userRoleAssignment.findUnique({
      where: { id: assignmentId },
      include: { role: true, user: true },
    });
    if (!assignment) throw new NotFoundException('Không tìm thấy phân quyền.');

    // Segregation of duties: Approver !== Assigner
    if (assignment.assignedById === actor.sub) {
      throw new BadRequestException('Nguyên tắc kiểm soát: Người phê duyệt phải độc lập với người đề xuất gán vai trò.');
    }

    const approved = await this.prisma.userRoleAssignment.update({
      where: { id: assignmentId },
      data: {
        isApproved: true,
        approvedById: actor.sub,
        approvedAt: new Date(),
      },
    });

    await this.logAudit('USER_ROLE', assignmentId, 'APPROVE_ROLE', actor.sub, {
      roleCode: assignment.role.code,
      username: assignment.user.username,
    });

    return approved;
  }

  async revokeRoleAssignment(assignmentId: number, actor: AuthenticatedPersonnelUser) {
    const assignment = await this.prisma.userRoleAssignment.findUnique({
      where: { id: assignmentId },
      include: { role: true, user: true },
    });
    if (!assignment) throw new NotFoundException('Không tìm thấy phân quyền.');

    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.userRoleAssignmentDeleted.create({
        data: {
          originalId: assignment.id,
          userId: assignment.userId,
          roleId: assignment.roleId,
          isPrimary: assignment.isPrimary,
          isApproved: assignment.isApproved,
          assignedById: assignment.assignedById,
          approvedById: assignment.approvedById,
          approvedAt: assignment.approvedAt,
          createdAt: assignment.createdAt,
          deletedAt: now,
          deletedBy: actor.username,
          deleteReason: `Thu hồi vai trò ${assignment.role.name} của ${assignment.user.fullName}`,
        },
      });

      await tx.userRoleAssignment.delete({ where: { id: assignmentId } });
    });

    await this.logAudit('USER_ROLE', assignmentId, 'REVOKE_ROLE', actor.sub, {
      roleCode: assignment.role.code,
      username: assignment.user.username,
    });

    return { success: true, message: `Đã thu hồi vai trò ${assignment.role.name} của ${assignment.user.fullName}` };
  }

  // -------------------------------------------------------------
  // SHIFTS & ATTENDANCE MANAGEMENT
  // -------------------------------------------------------------
  async getWorkShifts() {
    return this.prisma.workShift.findMany({ orderBy: { id: 'asc' } });
  }

  async createWorkShift(dto: CreateShiftDto, actor: AuthenticatedPersonnelUser) {
    const existing = await this.prisma.workShift.findUnique({ where: { code: dto.code } });
    if (existing) throw new BadRequestException(`Mã ca làm việc ${dto.code} đã tồn tại.`);

    const shift = await this.prisma.workShift.create({
      data: {
        code: dto.code,
        name: dto.name,
        startTime: dto.startTime,
        endTime: dto.endTime,
        shiftType: dto.shiftType,
      },
    });

    await this.logAudit('WORK_SHIFT', shift.id, 'CREATE_SHIFT', actor.sub, { code: shift.code });
    return shift;
  }

  async getShiftAssignments(params?: { startDate?: string; endDate?: string; employeeId?: number; roomId?: number }) {
    const where: any = {};
    if (params?.employeeId) where.employeeId = params.employeeId;
    if (params?.roomId) where.roomId = params.roomId;
    if (params?.startDate || params?.endDate) {
      where.date = {};
      if (params.startDate) where.date.gte = new Date(params.startDate);
      if (params.endDate) where.date.lte = new Date(params.endDate);
    }

    return this.prisma.shiftAssignment.findMany({
      where,
      include: { employee: true, shift: true, room: true },
      orderBy: [{ date: 'asc' }, { shiftId: 'asc' }],
    });
  }

  async assignShift(dto: AssignShiftDto, actor: AuthenticatedPersonnelUser) {
    const date = new Date(dto.date);
    const employee = await this.prisma.employee.findUnique({ where: { id: dto.employeeId } });
    if (!employee) throw new NotFoundException('Không tìm thấy nhân viên.');

    const targetShift = await this.prisma.workShift.findUnique({ where: { id: dto.shiftId } });
    if (!targetShift) throw new NotFoundException('Không tìm thấy ca làm việc.');

    // Shift overlap check: same employee, same date
    const existingShifts = await this.prisma.shiftAssignment.findMany({
      where: { employeeId: dto.employeeId, date },
      include: { shift: true, room: true },
    });

    for (const item of existingShifts) {
      if (item.shiftId === dto.shiftId) {
        throw new BadRequestException(`Nhân viên ${employee.fullName} đã được phân ca "${targetShift.name}" trong ngày này.`);
      }
      // Check room conflict
      if (dto.roomId && item.roomId && dto.roomId !== item.roomId && item.shift.startTime === targetShift.startTime) {
        throw new BadRequestException(
          `Xung đột phân ca: Nhân viên không thể trực tại 2 phòng khám khác nhau trong cùng khung giờ (${targetShift.startTime} - ${targetShift.endTime}).`,
        );
      }
    }

    const assignment = await this.prisma.shiftAssignment.create({
      data: {
        employeeId: dto.employeeId,
        shiftId: dto.shiftId,
        date,
        roomId: dto.roomId || null,
        note: dto.note || null,
      },
      include: { employee: true, shift: true, room: true },
    });

    await this.logAudit('SHIFT_ASSIGNMENT', assignment.id, 'ASSIGN_SHIFT', actor.sub, {
      employeeCode: employee.code,
      shiftCode: targetShift.code,
      date: dto.date,
    });

    return assignment;
  }

  async generateWeeklyShifts(dto: GenerateWeeklyShiftsDto, actor: AuthenticatedPersonnelUser) {
    const { dateUtcMidnight } = getVietnamDateNow();
    const targetYear = dto.year ?? dateUtcMidnight.getUTCFullYear();
    const targetMonth = dto.month ?? (dateUtcMidnight.getUTCMonth() + 1);

    const monthStart = new Date(Date.UTC(targetYear, targetMonth - 1, 1));
    const monthEnd = new Date(Date.UTC(targetYear, targetMonth, 0));

    const activeConfig = await this.prisma.workingHoursConfig.findFirst({
      where: { effectiveDate: { lte: monthEnd } },
      orderBy: { effectiveDate: 'desc' },
    });

    const startTime = activeConfig?.startTime || '08:00';
    const endTime = activeConfig?.endTime || '17:30';

    const adminShift = await this.prisma.workShift.upsert({
      where: { code: 'CA_HANH_CHINH' },
      update: {
        name: `Ca hành chính (${startTime} - ${endTime})`,
        startTime,
        endTime,
        shiftType: 'REGULAR',
      },
      create: {
        code: 'CA_HANH_CHINH',
        name: `Ca hành chính (${startTime} - ${endTime})`,
        startTime,
        endTime,
        shiftType: 'REGULAR',
      },
    });

    const employees = await this.prisma.employee.findMany({
      where: { status: 'ACTIVE' },
      include: {
        user: { include: { role: true } },
      },
    });

    const clinicRooms = await this.prisma.clinicRoom.findMany();
    const room1 = clinicRooms.find((r) => r.code === 'room-01')?.id ?? 1;
    const room2 = clinicRooms.find((r) => r.code === 'room-02')?.id ?? 2;
    const room3 = clinicRooms.find((r) => r.code === 'room-03')?.id ?? 3;

    const doctorRoomMap: Record<string, number> = {
      'NV-0006': room1,
      'NV-0007': room2,
      'NV-0008': room3,
    };

    let totalCreated = 0;
    let totalUpdated = 0;
    const daysInMonth = monthEnd.getUTCDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const dayDate = new Date(Date.UTC(targetYear, targetMonth - 1, day));
      const dayOfWeek = dayDate.getUTCDay(); // 0 = Sunday

      // Only Monday to Saturday (Thứ 2 đến Thứ 7, skip Sunday)
      if (dayOfWeek === 0) continue;

      for (const emp of employees) {
        const isDoctor =
          emp.code === 'NV-0006' ||
          emp.code === 'NV-0007' ||
          emp.code === 'NV-0008' ||
          emp.user?.role?.code === 'DOCTOR';

        const assignedRoomId = isDoctor
          ? (doctorRoomMap[emp.code] || emp.roomId || room1)
          : null;

        const existing = await this.prisma.shiftAssignment.findFirst({
          where: { employeeId: emp.id, date: dayDate },
        });

        if (existing) {
          if (dto.overwriteExisting !== false) {
            await this.prisma.shiftAssignment.update({
              where: { id: existing.id },
              data: {
                shiftId: adminShift.id,
                roomId: assignedRoomId,
                note: `Ca hành chính Thứ 2 - Thứ 7 theo giờ HR (${startTime} - ${endTime})`,
              },
            });
            totalUpdated++;
          }
        } else {
          await this.prisma.shiftAssignment.create({
            data: {
              employeeId: emp.id,
              shiftId: adminShift.id,
              date: dayDate,
              roomId: assignedRoomId,
              note: `Ca hành chính Thứ 2 - Thứ 7 theo giờ HR (${startTime} - ${endTime})`,
            },
          });
          totalCreated++;
        }
      }
    }

    await this.logAudit('SHIFT_ASSIGNMENT', 0, 'GENERATE_WEEKLY_SHIFTS', actor.sub, {
      year: targetYear,
      month: targetMonth,
      startTime,
      endTime,
      totalCreated,
      totalUpdated,
    });

    return {
      success: true,
      year: targetYear,
      month: targetMonth,
      workingHours: { startTime, endTime },
      totalCreated,
      totalUpdated,
      totalStaff: employees.length,
      message: `Đã xếp lịch làm việc Thứ 2 - Thứ 7 cho ${employees.length} nhân sự tháng ${targetMonth}/${targetYear} theo khung giờ HR (${startTime} - ${endTime}). Tạo mới: ${totalCreated}, Cập nhật: ${totalUpdated}.`,
    };
  }

  // -------------------------------------------------------------
  // WORKING HOURS CONFIGURATION
  // -------------------------------------------------------------
  async getWorkingHoursConfig(dateStr?: string) {
    const { dateUtcMidnight } = getVietnamDateNow();
    const targetDate = dateStr ? new Date(dateStr) : dateUtcMidnight;

    const active = await this.prisma.workingHoursConfig.findFirst({
      where: { effectiveDate: { lte: targetDate } },
      orderBy: { effectiveDate: 'desc' },
    });

    if (active) return active;

    return {
      id: 0,
      startTime: DEFAULT_WORKING_HOURS.startTime,
      endTime: DEFAULT_WORKING_HOURS.endTime,
      splitTime: DEFAULT_WORKING_HOURS.splitTime,
      effectiveDate: new Date('2026-01-01'),
      note: 'Mốc mặc định hệ thống (09:00 - 12:00 - 18:00)',
    };
  }

  async getWorkingHoursHistory() {
    return this.prisma.workingHoursConfig.findMany({
      include: { audits: { orderBy: { changedAt: 'desc' } } },
      orderBy: { effectiveDate: 'desc' },
    });
  }

  async saveWorkingHoursConfig(dto: SaveWorkingHoursConfigDto, actor: AuthenticatedPersonnelUser) {
    // Constraint 1: S < M < E
    const orderCheck = validateWorkingHoursOrder(dto.startTime, dto.splitTime, dto.endTime);
    if (!orderCheck.isValid) {
      throw new BadRequestException(orderCheck.error);
    }

    // Constraint 2: effectiveDate cannot be in the past
    const { dateStr: todayStr } = getVietnamDateNow();
    if (dto.effectiveDate < todayStr) {
      throw new BadRequestException('Ngày hiệu lực không được ở trong quá khứ.');
    }

    const effDate = new Date(dto.effectiveDate);
    const existing = await this.prisma.workingHoursConfig.findFirst({
      where: { effectiveDate: effDate },
    });

    let config;
    if (existing) {
      config = await this.prisma.workingHoursConfig.update({
        where: { id: existing.id },
        data: {
          startTime: dto.startTime,
          endTime: dto.endTime,
          splitTime: dto.splitTime,
          note: dto.note || null,
          createdById: actor.sub,
        },
      });

      await this.prisma.workingHoursAudit.create({
        data: {
          configId: config.id,
          action: 'UPDATE',
          oldData: JSON.stringify(existing),
          newData: JSON.stringify(config),
          changedById: actor.sub,
        },
      });
    } else {
      config = await this.prisma.workingHoursConfig.create({
        data: {
          startTime: dto.startTime,
          endTime: dto.endTime,
          splitTime: dto.splitTime,
          effectiveDate: effDate,
          note: dto.note || null,
          createdById: actor.sub,
        },
      });

      await this.prisma.workingHoursAudit.create({
        data: {
          configId: config.id,
          action: 'CREATE',
          newData: JSON.stringify(config),
          changedById: actor.sub,
        },
      });
    }

    await this.logAudit('WORKING_HOURS_CONFIG', config.id, existing ? 'UPDATE_CONFIG' : 'CREATE_CONFIG', actor.sub, {
      startTime: dto.startTime,
      endTime: dto.endTime,
      splitTime: dto.splitTime,
      effectiveDate: dto.effectiveDate,
    });

    // Synchronize CA_HANH_CHINH work shift to reflect new HR working hours
    await this.prisma.workShift.upsert({
      where: { code: 'CA_HANH_CHINH' },
      update: {
        name: `Ca hành chính (${dto.startTime} - ${dto.endTime})`,
        startTime: dto.startTime,
        endTime: dto.endTime,
        shiftType: 'REGULAR',
      },
      create: {
        code: 'CA_HANH_CHINH',
        name: `Ca hành chính (${dto.startTime} - ${dto.endTime})`,
        startTime: dto.startTime,
        endTime: dto.endTime,
        shiftType: 'REGULAR',
      },
    });

    return config;
  }

  // -------------------------------------------------------------
  // SELF CHECK-IN & CHECK-OUT (UNIVERSAL FOR ALL ROLES)
  // -------------------------------------------------------------
  async getTodayAttendanceStatus(actor: AuthenticatedPersonnelUser) {
    const employee = await this.prisma.employee.findUnique({
      where: { userId: actor.sub },
    });
    if (!employee) {
      return {
        hasEmployee: false,
        message: 'Tài khoản chưa liên kết hồ sơ nhân sự',
        record: null,
        status: 'CHUA_CHECK_IN',
      };
    }

    const { dateUtcMidnight } = getVietnamDateNow();
    const record = await this.prisma.attendanceRecord.findUnique({
      where: { employeeId_date: { employeeId: employee.id, date: dateUtcMidnight } },
      include: { audits: { orderBy: { createdAt: 'desc' } } },
    });

    return {
      hasEmployee: true,
      employeeId: employee.id,
      employeeName: employee.fullName,
      employeeCode: employee.code,
      record,
      status: record?.status || 'CHUA_CHECK_IN',
      checkInTime: record?.checkInTime || null,
      checkOutTime: record?.checkOutTime || null,
    };
  }

  async checkIn(dto: CheckInDto, actor: AuthenticatedPersonnelUser) {
    const employee = await this.prisma.employee.findUnique({
      where: { userId: actor.sub },
    });
    if (!employee) {
      throw new BadRequestException('Tài khoản của bạn chưa được liên kết với hồ sơ nhân sự.');
    }

    const { timeStr, dateUtcMidnight } = getVietnamDateNow();

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.attendanceRecord.findUnique({
        where: { employeeId_date: { employeeId: employee.id, date: dateUtcMidnight } },
      });

      if (existing && existing.checkInTime) {
        return {
          success: true,
          alreadyDone: true,
          message: `Bạn đã Check-in rồi (lúc ${existing.checkInTime})`,
          record: existing,
        };
      }

      // Snapshot active config
      const activeConfig = await tx.workingHoursConfig.findFirst({
        where: { effectiveDate: { lte: dateUtcMidnight } },
        orderBy: { effectiveDate: 'desc' },
      });
      const milestones = activeConfig
        ? { startTime: activeConfig.startTime, endTime: activeConfig.endTime, splitTime: activeConfig.splitTime }
        : DEFAULT_WORKING_HOURS;

      const hasLeave =
        existing?.status === 'ON_LEAVE' ||
        existing?.status === 'NGHI_CO_LUONG' ||
        existing?.status === 'NGHI_KHONG_LUONG' ||
        Boolean(existing?.leaveType);
      const hasLeaveConflict = hasLeave;
      const conflictNote = hasLeave ? 'Nhân viên có chấm công vào ngày nghỉ phép đã duyệt' : null;

      const metrics = calculateAttendanceMetrics({
        checkInTime: timeStr,
        milestones,
        isOnLeave: hasLeave,
        leaveType: existing?.leaveType,
      });

      const record = await tx.attendanceRecord.upsert({
        where: { employeeId_date: { employeeId: employee.id, date: dateUtcMidnight } },
        update: {
          checkInTime: timeStr,
          originalCheckInTime: existing?.originalCheckInTime || timeStr,
          source: 'SELF',
          roleUsed: actor.role,
          configSnapshot: JSON.stringify(milestones),
          lateMinutes: metrics.lateMinutes,
          sessionCount: metrics.sessionCount,
          workUnits: metrics.workUnits,
          status: metrics.status,
          hasLeaveConflict,
          conflictNote,
          recordedById: actor.sub,
        },
        create: {
          employeeId: employee.id,
          date: dateUtcMidnight,
          checkInTime: timeStr,
          originalCheckInTime: timeStr,
          source: 'SELF',
          roleUsed: actor.role,
          configSnapshot: JSON.stringify(milestones),
          lateMinutes: metrics.lateMinutes,
          sessionCount: metrics.sessionCount,
          workUnits: metrics.workUnits,
          status: metrics.status,
          hasLeaveConflict,
          conflictNote,
          recordedById: actor.sub,
        },
        include: { employee: true },
      });

      await tx.attendanceAudit.create({
        data: {
          attendanceRecordId: record.id,
          action: 'CHECK_IN',
          newCheckInTime: timeStr,
          actorId: actor.sub,
          actorRole: actor.role,
          reason: 'Tự Check-in hệ thống',
        },
      });

      return {
        success: true,
        alreadyDone: false,
        message: `Đã Check-in lúc ${timeStr}`,
        record,
        conflictWarning: hasLeaveConflict ? conflictNote : undefined,
      };
    });
  }

  async checkOut(dto: CheckOutDto, actor: AuthenticatedPersonnelUser) {
    const employee = await this.prisma.employee.findUnique({
      where: { userId: actor.sub },
    });
    if (!employee) {
      throw new BadRequestException('Tài khoản của bạn chưa được liên kết với hồ sơ nhân sự.');
    }

    // Doctor warning check
    if (actor.role === 'DOCTOR' && !dto.confirmActiveExam) {
      const activeExam = await this.prisma.doctorExamination.findFirst({
        where: { doctorId: actor.sub, status: 'IN_PROGRESS' },
      });
      if (activeExam) {
        return {
          success: false,
          hasActiveExamWarning: true,
          message: 'Bác sĩ đang có ca khám "Đang khám" chưa Ghi sổ. Bạn có chắc chắn muốn Check-out không?',
        };
      }
    }

    const { timeStr, dateUtcMidnight } = getVietnamDateNow();

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.attendanceRecord.findUnique({
        where: { employeeId_date: { employeeId: employee.id, date: dateUtcMidnight } },
      });

      if (!existing || !existing.checkInTime) {
        throw new BadRequestException('Bạn chưa Check-in hôm nay.');
      }

      if (existing.checkOutTime) {
        return {
          success: true,
          alreadyDone: true,
          message: `Bạn đã Check-out rồi (lúc ${existing.checkOutTime})`,
          record: existing,
        };
      }

      let milestones = DEFAULT_WORKING_HOURS;
      if (existing.configSnapshot) {
        try {
          milestones = JSON.parse(existing.configSnapshot);
        } catch (e) {}
      } else {
        const activeConfig = await tx.workingHoursConfig.findFirst({
          where: { effectiveDate: { lte: dateUtcMidnight } },
          orderBy: { effectiveDate: 'desc' },
        });
        if (activeConfig) {
          milestones = { startTime: activeConfig.startTime, endTime: activeConfig.endTime, splitTime: activeConfig.splitTime };
        }
      }

      const metrics = calculateAttendanceMetrics({
        checkInTime: existing.checkInTime,
        checkOutTime: timeStr,
        milestones,
        isOnLeave: existing.hasLeaveConflict,
        leaveType: existing.leaveType,
      });

      const updated = await tx.attendanceRecord.update({
        where: { id: existing.id },
        data: {
          checkOutTime: timeStr,
          originalCheckOutTime: existing.originalCheckOutTime || timeStr,
          lateMinutes: metrics.lateMinutes,
          sessionCount: metrics.sessionCount,
          workUnits: metrics.workUnits,
          overtimeHours: metrics.overtimeHours,
          status: metrics.status,
        },
        include: { employee: true },
      });

      await tx.attendanceAudit.create({
        data: {
          attendanceRecordId: updated.id,
          action: 'CHECK_OUT',
          originalCheckInTime: existing.checkInTime,
          newCheckOutTime: timeStr,
          actorId: actor.sub,
          actorRole: actor.role,
          reason: 'Tự Check-out hệ thống',
        },
      });

      return {
        success: true,
        alreadyDone: false,
        message: `Đã Check-out lúc ${timeStr}`,
        record: updated,
      };
    });
  }

  async getAttendanceRecords(params?: {
    month?: number;
    year?: number;
    employeeId?: number;
    status?: string;
    roomId?: number;
    startDate?: string;
    endDate?: string;
  }) {
    const where: any = {};
    if (params?.employeeId) where.employeeId = params.employeeId;
    if (params?.status) where.status = params.status;

    if (params?.startDate || params?.endDate) {
      where.date = {};
      if (params.startDate) where.date.gte = new Date(params.startDate);
      if (params.endDate) where.date.lte = new Date(params.endDate);
    } else if (params?.year && params?.month) {
      const start = new Date(Date.UTC(params.year, params.month - 1, 1));
      const end = new Date(Date.UTC(params.year, params.month, 0, 23, 59, 59));
      where.date = { gte: start, lte: end };
    }

    if (params?.roomId) {
      where.employee = { roomId: params.roomId };
    }

    return this.prisma.attendanceRecord.findMany({
      where,
      include: {
        employee: { include: { room: true } },
        audits: { orderBy: { createdAt: 'desc' } },
      },
      orderBy: [{ date: 'desc' }, { employeeId: 'asc' }],
    });
  }

  async adjustAttendance(dto: AdjustAttendanceDto, actor: AuthenticatedPersonnelUser) {
    if (!dto.reason || !dto.reason.trim()) {
      throw new BadRequestException('Lý do điều chỉnh là bắt buộc.');
    }

    if (dto.checkInTime && dto.checkOutTime) {
      if (timeToMinutes(dto.checkOutTime) < timeToMinutes(dto.checkInTime)) {
        throw new BadRequestException('Giờ ra không được trước giờ vào.');
      }
    }

    const targetDate = new Date(dto.date);
    const { dateUtcMidnight: todayUtc } = getVietnamDateNow();
    if (targetDate > todayUtc) {
      throw new BadRequestException('Không được điều chỉnh chấm công cho ngày trong tương lai.');
    }

    const employee = await this.prisma.employee.findUnique({ where: { id: dto.employeeId } });
    if (!employee) throw new NotFoundException('Không tìm thấy nhân viên.');

    const existing = await this.prisma.attendanceRecord.findUnique({
      where: { employeeId_date: { employeeId: dto.employeeId, date: targetDate } },
    });

    if (existing?.isLocked) {
      throw new BadRequestException('Kỳ công này đã bị khóa. Mọi sửa đổi phải thông qua điều chỉnh ở kỳ tiếp theo.');
    }

    // Determine config snapshot to use
    let milestones = DEFAULT_WORKING_HOURS;
    if (existing?.configSnapshot) {
      try {
        milestones = JSON.parse(existing.configSnapshot);
      } catch (e) {}
    } else {
      const activeConfig = await this.prisma.workingHoursConfig.findFirst({
        where: { effectiveDate: { lte: targetDate } },
        orderBy: { effectiveDate: 'desc' },
      });
      if (activeConfig) {
        milestones = { startTime: activeConfig.startTime, endTime: activeConfig.endTime, splitTime: activeConfig.splitTime };
      }
    }

    const isPast = targetDate < todayUtc;
    const metrics = calculateAttendanceMetrics({
      checkInTime: dto.checkInTime || null,
      checkOutTime: dto.checkOutTime || null,
      milestones,
      isPastDay: isPast,
      isOnLeave: Boolean(dto.leaveType),
      leaveType: dto.leaveType || null,
    });

    const record = await this.prisma.attendanceRecord.upsert({
      where: { employeeId_date: { employeeId: dto.employeeId, date: targetDate } },
      update: {
        checkInTime: dto.checkInTime || null,
        checkOutTime: dto.checkOutTime || null,
        originalCheckInTime: existing?.originalCheckInTime || existing?.checkInTime || dto.checkInTime || null,
        originalCheckOutTime: existing?.originalCheckOutTime || existing?.checkOutTime || dto.checkOutTime || null,
        lateMinutes: metrics.lateMinutes,
        sessionCount: metrics.sessionCount,
        workUnits: metrics.workUnits,
        overtimeHours: metrics.overtimeHours,
        status: metrics.status,
        leaveType: dto.leaveType || null,
        source: 'HR',
        isAdjusted: true,
        adjustmentReason: dto.reason.trim(),
        adjustedById: actor.sub,
        approvalStatus: 'PENDING_APPROVAL',
        note: dto.note || existing?.note || null,
      },
      create: {
        employeeId: dto.employeeId,
        date: targetDate,
        checkInTime: dto.checkInTime || null,
        checkOutTime: dto.checkOutTime || null,
        originalCheckInTime: dto.checkInTime || null,
        originalCheckOutTime: dto.checkOutTime || null,
        lateMinutes: metrics.lateMinutes,
        sessionCount: metrics.sessionCount,
        workUnits: metrics.workUnits,
        overtimeHours: metrics.overtimeHours,
        status: metrics.status,
        leaveType: dto.leaveType || null,
        source: 'HR',
        isAdjusted: true,
        adjustmentReason: dto.reason.trim(),
        adjustedById: actor.sub,
        approvalStatus: 'PENDING_APPROVAL',
        note: dto.note || null,
        recordedById: actor.sub,
      },
      include: { employee: true },
    });

    await this.prisma.attendanceAudit.create({
      data: {
        attendanceRecordId: record.id,
        action: 'HR_ADJUST',
        originalCheckInTime: existing?.checkInTime || null,
        originalCheckOutTime: existing?.checkOutTime || null,
        newCheckInTime: dto.checkInTime || null,
        newCheckOutTime: dto.checkOutTime || null,
        reason: dto.reason.trim(),
        actorId: actor.sub,
        actorRole: actor.role,
      },
    });

    await this.logAudit('ATTENDANCE', record.id, 'HR_ADJUST', actor.sub, {
      employeeCode: employee.code,
      reason: dto.reason,
      date: dto.date,
    });

    return record;
  }

  async approveAttendanceAdjustment(recordId: number, dto: ApproveAttendanceAdjustmentDto, actor: AuthenticatedPersonnelUser) {
    const record = await this.prisma.attendanceRecord.findUnique({
      where: { id: recordId },
      include: { employee: true },
    });
    if (!record) throw new NotFoundException('Không tìm thấy bản ghi chấm công.');

    // Maker-Checker constraint: Người duyệt != Người sửa
    if (record.adjustedById === actor.sub) {
      throw new BadRequestException('Người sửa và người duyệt không được là cùng một tài khoản (Quy tắc Maker-Checker).');
    }

    const nextStatus = dto.approved ? 'APPROVED' : 'REJECTED';
    const updated = await this.prisma.attendanceRecord.update({
      where: { id: recordId },
      data: {
        approvalStatus: nextStatus,
        approvedById: actor.sub,
        approvedAt: new Date(),
      },
      include: { employee: true },
    });

    await this.prisma.attendanceAudit.create({
      data: {
        attendanceRecordId: record.id,
        action: dto.approved ? 'APPROVE' : 'REJECT',
        reason: dto.reason || (dto.approved ? 'Quản lý phê duyệt điều chỉnh' : 'Quản lý từ chối điều chỉnh'),
        actorId: actor.sub,
        actorRole: actor.role,
      },
    });

    await this.logAudit('ATTENDANCE', recordId, dto.approved ? 'APPROVE_ADJUSTMENT' : 'REJECT_ADJUSTMENT', actor.sub, {
      approved: dto.approved,
      actorUsername: actor.username,
    });

    return updated;
  }

  async getMonthlyAttendanceSummary(year: number, month: number) {
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 0, 23, 59, 59));

    const records = await this.prisma.attendanceRecord.findMany({
      where: {
        date: { gte: start, lte: end },
        approvalStatus: 'APPROVED',
      },
      include: { employee: true },
    });

    const summaryMap = new Map<
      number,
      {
        employeeId: number;
        employeeCode: string;
        fullName: string;
        title: string;
        totalWorkUnits: number;
        totalLateMinutes: number;
        totalOvertimeHours: number;
        missingCheckoutCount: number;
        paidLeaveDays: number;
        unpaidLeaveDays: number;
        absentDays: number;
      }
    >();

    for (const r of records) {
      let item = summaryMap.get(r.employeeId);
      if (!item) {
        item = {
          employeeId: r.employeeId,
          employeeCode: r.employee.code,
          fullName: r.employee.fullName,
          title: r.employee.title,
          totalWorkUnits: 0,
          totalLateMinutes: 0,
          totalOvertimeHours: 0,
          missingCheckoutCount: 0,
          paidLeaveDays: 0,
          unpaidLeaveDays: 0,
          absentDays: 0,
        };
        summaryMap.set(r.employeeId, item);
      }

      item.totalWorkUnits += Number(r.workUnits || 0);
      item.totalLateMinutes += r.lateMinutes || 0;
      item.totalOvertimeHours += Number(r.overtimeHours || 0);
      if (r.status === 'THIEU_CHECK_OUT') item.missingCheckoutCount += 1;
      if (r.status === 'NGHI_CO_LUONG') item.paidLeaveDays += 1;
      if (r.status === 'NGHI_KHONG_LUONG') item.unpaidLeaveDays += 1;
      if (r.status === 'VANG') item.absentDays += 1;
    }

    return Array.from(summaryMap.values());
  }

  async recordAttendance(dto: RecordAttendanceDto, actor: AuthenticatedPersonnelUser) {
    const targetDate = new Date(dto.date);
    const existing = await this.prisma.attendanceRecord.findUnique({
      where: { employeeId_date: { employeeId: dto.employeeId, date: targetDate } },
    });

    if (existing?.isLocked) {
      throw new BadRequestException('Kỳ công này đã bị khóa. Mọi sửa đổi phải thông qua điều chỉnh ở kỳ tiếp theo.');
    }

    const { dateUtcMidnight: todayUtc } = getVietnamDateNow();
    const isPast = targetDate < todayUtc;

    let milestones = DEFAULT_WORKING_HOURS;
    if (existing?.configSnapshot) {
      try { milestones = JSON.parse(existing.configSnapshot); } catch (e) {}
    } else {
      const activeConfig = await this.prisma.workingHoursConfig.findFirst({
        where: { effectiveDate: { lte: targetDate } },
        orderBy: { effectiveDate: 'desc' },
      });
      if (activeConfig) {
        milestones = { startTime: activeConfig.startTime, endTime: activeConfig.endTime, splitTime: activeConfig.splitTime };
      }
    }

    const metrics = calculateAttendanceMetrics({
      checkInTime: dto.checkInTime || null,
      checkOutTime: dto.checkOutTime || null,
      milestones,
      isPastDay: isPast,
      isOnLeave: Boolean(dto.leaveType),
      leaveType: dto.leaveType || null,
    });

    const record = await this.prisma.attendanceRecord.upsert({
      where: { employeeId_date: { employeeId: dto.employeeId, date: targetDate } },
      update: {
        status: dto.status || metrics.status,
        checkInTime: dto.checkInTime || null,
        checkOutTime: dto.checkOutTime || null,
        lateMinutes: dto.lateMinutes ?? metrics.lateMinutes,
        leaveType: dto.leaveType || null,
        overtimeHours: dto.overtimeHours ?? metrics.overtimeHours,
        sessionCount: metrics.sessionCount,
        workUnits: metrics.workUnits,
        isOnDuty: dto.isOnDuty ?? false,
        note: dto.note || null,
        recordedById: actor.sub,
      },
      create: {
        employeeId: dto.employeeId,
        date: targetDate,
        status: dto.status || metrics.status,
        checkInTime: dto.checkInTime || null,
        checkOutTime: dto.checkOutTime || null,
        lateMinutes: dto.lateMinutes ?? metrics.lateMinutes,
        leaveType: dto.leaveType || null,
        overtimeHours: dto.overtimeHours ?? metrics.overtimeHours,
        sessionCount: metrics.sessionCount,
        workUnits: metrics.workUnits,
        isOnDuty: dto.isOnDuty ?? false,
        note: dto.note || null,
        recordedById: actor.sub,
      },
      include: { employee: true },
    });

    return record;
  }

  async lockAttendance(year: number, month: number, actor: AuthenticatedPersonnelUser) {
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 0, 23, 59, 59));

    const result = await this.prisma.attendanceRecord.updateMany({
      where: { date: { gte: start, lte: end } },
      data: { isLocked: true },
    });

    await this.logAudit('ATTENDANCE', month, 'LOCK_ATTENDANCE', actor.sub, { year, month, affected: result.count });
    return { success: true, count: result.count, message: `Đã khóa bảng chấm công tháng ${month}/${year}` };
  }

  // -------------------------------------------------------------
  // SERVICE INCENTIVES (5% DOCTOR + 5% RECEPTION)
  // -------------------------------------------------------------
  async getServiceIncentives(params?: { employeeId?: number; roleType?: string; status?: string }) {
    const where: any = {};
    if (params?.employeeId) where.employeeId = params.employeeId;
    if (params?.roleType) where.roleType = params.roleType;
    if (params?.status) where.status = params.status;

    return this.prisma.serviceIncentive.findMany({
      where,
      include: { employee: true },
      orderBy: { id: 'desc' },
    });
  }

  async syncIncentivesFromCompletedExaminations(actor?: AuthenticatedPersonnelUser) {
    const completedExams = await this.prisma.doctorExamination.findMany({
      where: { status: 'COMPLETED' },
      include: {
        doctor: { include: { employee: true } },
        intake: {
          include: {
            createdBy: { include: { employee: true } },
            services: { include: { service: true } },
          },
        },
      },
    });

    let createdCount = 0;
    for (const exam of completedExams) {
      const doctorEmp = exam.doctor.employee;
      const receptionEmp = exam.intake.createdBy?.employee;

      for (const line of exam.intake.services) {
        const lineAmount = line.amount;
        const incentiveAmount = calculateServiceIncentive(lineAmount, 5.0);

        // Doctor incentive (5%)
        if (doctorEmp) {
          const existingDoc = await this.prisma.serviceIncentive.findUnique({
            where: { intakeServiceId_roleType: { intakeServiceId: line.id, roleType: 'DOCTOR' } },
          });
          if (!existingDoc) {
            await this.prisma.serviceIncentive.create({
              data: {
                intakeServiceId: line.id,
                examinationId: exam.id,
                employeeId: doctorEmp.id,
                roleType: 'DOCTOR',
                serviceName: line.service.name,
                serviceAmount: lineAmount,
                rate: 5.0,
                incentiveAmount,
                status: 'VALID',
                completedAt: exam.completedAt || new Date(),
              },
            });
            createdCount++;
          }
        }

        // Reception incentive (5%)
        if (receptionEmp) {
          const existingRec = await this.prisma.serviceIncentive.findUnique({
            where: { intakeServiceId_roleType: { intakeServiceId: line.id, roleType: 'RECEPTION' } },
          });
          if (!existingRec) {
            await this.prisma.serviceIncentive.create({
              data: {
                intakeServiceId: line.id,
                examinationId: exam.id,
                employeeId: receptionEmp.id,
                roleType: 'RECEPTION',
                serviceName: line.service.name,
                serviceAmount: lineAmount,
                rate: 5.0,
                incentiveAmount,
                status: 'VALID',
                completedAt: exam.completedAt || new Date(),
              },
            });
            createdCount++;
          }
        }
      }
    }

    if (actor) {
      await this.logAudit('INCENTIVE', 0, 'SYNC_INCENTIVES', actor.sub, { createdCount });
    }

    return { success: true, createdCount };
  }

  // -------------------------------------------------------------
  // PAYROLL MANAGEMENT
  // -------------------------------------------------------------
  async getPayrolls() {
    return this.prisma.payroll.findMany({
      include: {
        createdBy: { select: { id: true, username: true, fullName: true } },
        approvedBy: { select: { id: true, username: true, fullName: true } },
        items: { include: { employee: true } },
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
  }

  async getPayrollById(id: number, actor?: AuthenticatedPersonnelUser) {
    const payroll = await this.prisma.payroll.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, username: true, fullName: true } },
        approvedBy: { select: { id: true, username: true, fullName: true } },
        items: {
          include: {
            employee: {
              select: {
                id: true,
                code: true,
                fullName: true,
                title: true,
                department: true,
                bankName: true,
                bankAccountNumber: true,
                bankAccountName: true,
              },
            },
          },
          orderBy: { id: 'asc' },
        },
      },
    });

    if (!payroll) throw new NotFoundException('Không tìm thấy bảng lương.');

    if (actor) {
      await this.logAudit('PAYROLL', id, 'VIEW_PAYROLL', actor.sub, {
        code: payroll.code,
        actorUsername: actor.username,
      });
    }

    return payroll;
  }

  async createPayroll(dto: CreatePayrollDto, actor: AuthenticatedPersonnelUser) {
    const existing = await this.prisma.payroll.findFirst({
      where: { year: dto.year, month: dto.month, status: { not: 'CANCELLED' } },
    });
    if (existing) {
      throw new BadRequestException(`Bảng lương tháng ${dto.month}/${dto.year} đã tồn tại (${existing.code}).`);
    }

    return this.prisma.$transaction(async (tx) => {
      // Generate code BL{yyyyMM}/{0001}
      const countThisMonth = await tx.payroll.count({
        where: { year: dto.year, month: dto.month },
      });
      const code = formatPayrollCode(dto.year, dto.month, countThisMonth + 1);

      const payroll = await tx.payroll.create({
        data: {
          code,
          year: dto.year,
          month: dto.month,
          title: dto.title.trim(),
          standardWorkingDays: dto.standardWorkingDays,
          status: 'DRAFT',
          createdById: actor.sub,
          note: dto.note || null,
        },
      });

      // Pull active employees
      const activeEmployees = await tx.employee.findMany({
        where: { status: 'ACTIVE' },
      });

      const startMonth = new Date(Date.UTC(dto.year, dto.month - 1, 1));
      const endMonth = new Date(Date.UTC(dto.year, dto.month, 0, 23, 59, 59));

      let totalGross = 0;
      let totalDeductions = 0;
      let totalNet = 0;

      for (const emp of activeEmployees) {
        // Attendance count for actual days (allowing 0.5 work units from check-in/out)
        const attendances = await tx.attendanceRecord.findMany({
          where: {
            employeeId: emp.id,
            date: { gte: startMonth, lte: endMonth },
            approvalStatus: 'APPROVED',
          },
        });
        const workedUnits = attendances.reduce((sum, a) => sum + Number(a.workUnits || 0), 0);
        const paidLeaveUnits = attendances.filter(
          (a) => a.status === 'NGHI_CO_LUONG' || (a.status === 'ON_LEAVE' && a.leaveType === 'PAID_LEAVE'),
        ).length;
        const totalPayableDays = workedUnits + paidLeaveUnits;
        const actualDays = attendances.length > 0 ? totalPayableDays : Math.min(26, Number(dto.standardWorkingDays || 26));

        // Valid service incentives in period
        const incentives = await tx.serviceIncentive.findMany({
          where: {
            employeeId: emp.id,
            status: 'VALID',
            completedAt: { gte: startMonth, lte: endMonth },
          },
        });
        const incentiveTotal = incentives.reduce((sum, item) => sum + item.incentiveAmount, 0);

        const calc = calculateSalary({
          baseSalary: emp.baseSalary,
          standardDays: Number(dto.standardWorkingDays),
          actualDays,
          allowanceAmount: emp.fixedAllowance,
          serviceIncentiveAmount: incentiveTotal,
          insuranceDeduction: Math.round(emp.baseSalary * 0.08), // Nhập số tiền bảo hiểm
        });

        totalGross += calc.grossSalary;
        totalDeductions += calc.totalDeductions;
        totalNet += calc.netSalary;

        await tx.payrollItem.create({
          data: {
            payrollId: payroll.id,
            employeeId: emp.id,
            baseSalary: emp.baseSalary,
            standardDays: dto.standardWorkingDays,
            actualDays,
            attendanceSalary: calc.attendanceSalary,
            allowanceAmount: emp.fixedAllowance,
            serviceIncentiveAmount: incentiveTotal,
            otherBonus: 0,
            overtimePay: 0,
            grossSalary: calc.grossSalary,
            insuranceDeduction: Math.round(emp.baseSalary * 0.08),
            advanceDeduction: 0,
            otherDeduction: 0,
            totalDeductions: calc.totalDeductions,
            netSalary: calc.netSalary,
          },
        });
      }

      const updated = await tx.payroll.update({
        where: { id: payroll.id },
        data: { totalGross, totalDeductions, totalNet },
      });

      await this.logAudit('PAYROLL', payroll.id, 'CREATE_PAYROLL', actor.sub, { code });
      return updated;
    });
  }

  async updatePayrollItem(
    payrollId: number,
    itemId: number,
    dto: UpdatePayrollItemDto,
    actor: AuthenticatedPersonnelUser,
  ) {
    const payroll = await this.prisma.payroll.findUnique({ where: { id: payrollId } });
    if (!payroll) throw new NotFoundException('Không tìm thấy bảng lương.');
    if (payroll.status === 'LOCKED' || payroll.status === 'PAID') {
      throw new BadRequestException('Bảng lương đã chốt/đã chi, không được phép sửa đổi trực tiếp.');
    }

    const item = await this.prisma.payrollItem.findUnique({ where: { id: itemId } });
    if (!item || item.payrollId !== payrollId) throw new NotFoundException('Không tìm thấy dòng lương nhân viên.');

    const allowanceAmount = dto.allowanceAmount !== undefined ? dto.allowanceAmount : item.allowanceAmount;
    const otherBonus = dto.otherBonus !== undefined ? dto.otherBonus : item.otherBonus;
    const overtimePay = dto.overtimePay !== undefined ? dto.overtimePay : item.overtimePay;
    const insuranceDeduction = dto.insuranceDeduction !== undefined ? dto.insuranceDeduction : item.insuranceDeduction;
    const advanceDeduction = dto.advanceDeduction !== undefined ? dto.advanceDeduction : item.advanceDeduction;
    const otherDeduction = dto.otherDeduction !== undefined ? dto.otherDeduction : item.otherDeduction;

    const calc = calculateSalary({
      baseSalary: item.baseSalary,
      standardDays: Number(item.standardDays),
      actualDays: Number(item.actualDays),
      allowanceAmount,
      serviceIncentiveAmount: item.serviceIncentiveAmount,
      otherBonus,
      overtimePay,
      insuranceDeduction,
      advanceDeduction,
      otherDeduction,
    });

    if (!calc.isValid) {
      throw new BadRequestException(calc.errorMessage);
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.payrollItem.update({
        where: { id: itemId },
        data: {
          allowanceAmount,
          otherBonus,
          overtimePay,
          grossSalary: calc.grossSalary,
          insuranceDeduction,
          advanceDeduction,
          otherDeduction,
          totalDeductions: calc.totalDeductions,
          netSalary: calc.netSalary,
        },
      });

      // Recalculate payroll totals
      const allItems = await tx.payrollItem.findMany({ where: { payrollId } });
      const totalGross = allItems.reduce((sum, it) => sum + it.grossSalary, 0);
      const totalDeductions = allItems.reduce((sum, it) => sum + it.totalDeductions, 0);
      const totalNet = allItems.reduce((sum, it) => sum + it.netSalary, 0);

      // If payroll was APPROVED, reset back to DRAFT as per specification
      const newStatus = payroll.status === 'APPROVED' ? 'DRAFT' : payroll.status;

      await tx.payroll.update({
        where: { id: payrollId },
        data: { totalGross, totalDeductions, totalNet, status: newStatus },
      });

      await this.logAudit('PAYROLL_ITEM', itemId, 'UPDATE_ITEM', actor.sub, {
        payrollCode: payroll.code,
        changes: dto,
      });

      return { success: true, netSalary: calc.netSalary };
    });
  }

  async approvePayroll(id: number, actor: AuthenticatedPersonnelUser) {
    if (!['ADMIN', 'HR', 'MANAGER'].includes(actor.role)) {
      throw new ForbiddenException('Chỉ Quản trị viên hoặc Hành chính nhân sự mới có quyền phê duyệt bảng lương.');
    }

    const payroll = await this.prisma.payroll.findUnique({ where: { id } });
    if (!payroll) throw new NotFoundException('Không tìm thấy bảng lương.');
    if (payroll.status !== 'DRAFT') {
      throw new BadRequestException('Chỉ bảng lương ở trạng thái Nháp mới có thể duyệt.');
    }

    // Segregation of duties: Creator !== Approver
    if (payroll.createdById === actor.sub) {
      throw new BadRequestException('Nguyên tắc kiểm soát: Người phê duyệt bảng lương phải độc lập với người lập bảng lương.');
    }

    const approved = await this.prisma.payroll.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedById: actor.sub,
        approvedAt: new Date(),
      },
    });

    await this.logAudit('PAYROLL', id, 'APPROVE_PAYROLL', actor.sub, { code: payroll.code });
    return approved;
  }

  async lockPayroll(id: number, actor: AuthenticatedPersonnelUser) {
    const payroll = await this.prisma.payroll.findUnique({
      where: { id },
      include: { items: { include: { employee: true } } },
    });
    if (!payroll) throw new NotFoundException('Không tìm thấy bảng lương.');
    if (payroll.status !== 'APPROVED') {
      throw new BadRequestException('Bảng lương cần được phê duyệt trước khi chốt khóa sổ.');
    }

    return this.prisma.$transaction(async (tx) => {
      // Check each item netSalary >= 0
      for (const item of payroll.items) {
        if (item.netSalary < 0) {
          throw new BadRequestException(`Nhân viên ${item.employee.fullName} có thực nhận âm (${item.netSalary} đ). Chặn chốt sổ.`);
        }
      }

      // 1. Lock Payroll
      const locked = await tx.payroll.update({
        where: { id },
        data: {
          status: 'LOCKED',
          lockedAt: new Date(),
        },
      });

      // 2. Create Salary Payable Liability in Accounting module (Debt table)
      for (const item of payroll.items) {
        if (item.netSalary > 0) {
          await tx.debt.create({
            data: {
              debtType: 'EMPLOYEE_PAYABLE',
              patientId: null,
              supplierId: null,
              roomId: item.employee.roomId || null,
              sourceType: 'PAYROLL',
              sourceCode: `${payroll.code}/${item.employee.code}`,
              principalAmount: item.netSalary,
              dueDate: new Date(Date.UTC(payroll.year, payroll.month, 10)), // Hạn trả lương ngày 10 tháng sau
              status: 'UNPAID',
              effectiveDate: new Date(),
            },
          });
        }
      }

      await this.logAudit('PAYROLL', id, 'LOCK_PAYROLL', actor.sub, {
        code: payroll.code,
        totalNet: payroll.totalNet,
      });

      return locked;
    });
  }

  async cancelPayroll(id: number, dto: CancelPayrollDto, actor: AuthenticatedPersonnelUser) {
    const payroll = await this.prisma.payroll.findUnique({ where: { id } });
    if (!payroll) throw new NotFoundException('Không tìm thấy bảng lương.');
    if (payroll.status === 'PAID') {
      throw new BadRequestException('Bảng lương đã thanh toán chi trả, không thể hủy bỏ.');
    }

    const cancelled = await this.prisma.payroll.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelReason: dto.cancelReason.trim(),
      },
    });

    await this.logAudit('PAYROLL', id, 'CANCEL_PAYROLL', actor.sub, {
      code: payroll.code,
      cancelReason: dto.cancelReason,
    });

    return cancelled;
  }

  // -------------------------------------------------------------
  // AUDIT LOGS
  // -------------------------------------------------------------
  async getAuditLogs() {
    return this.prisma.hrAuditLog.findMany({
      orderBy: { id: 'desc' },
      take: 100,
    });
  }

  // -------------------------------------------------------------
  // SELF SERVICE
  // -------------------------------------------------------------
  async getMyProfile(actor: AuthenticatedPersonnelUser) {
    const employee = await this.prisma.employee.findFirst({
      where: { userId: actor.sub },
      include: {
        room: true,
        contracts: { orderBy: { id: 'desc' }, take: 1 },
        user: { include: { role: true, roleAssignments: { include: { role: true } } } },
      },
    });
    if (!employee) throw new NotFoundException('Chưa liên kết hồ sơ nhân viên cho tài khoản này.');
    return employee;
  }

  async getMyPayslips(actor: AuthenticatedPersonnelUser) {
    const employee = await this.prisma.employee.findFirst({ where: { userId: actor.sub } });
    if (!employee) return [];

    return this.prisma.payrollItem.findMany({
      where: { employeeId: employee.id, payroll: { status: { in: ['LOCKED', 'PAID'] } } },
      include: {
        payroll: { select: { id: true, code: true, year: true, month: true, title: true, status: true, lockedAt: true, paidAt: true } },
      },
      orderBy: { id: 'desc' },
    });
  }
}
