import { ApiError } from '../utils/api-error.js';

export class HrService {
  constructor({ hrRepo }) {
    this.hrRepo = hrRepo;
  }

  // Employees
  async createEmployee(payload, actor) {
    return await this.hrRepo.createEmployee(payload, actor);
  }

  async getEmployeeById(employeeId) {
    const emp = await this.hrRepo.getEmployeeById(employeeId);
    if (!emp) {
      throw new ApiError(404, 'EMPLOYEE_NOT_FOUND', 'Không tìm thấy nhân viên');
    }
    return emp;
  }

  async getEmployeeByUserId(userId) {
    const emp = await this.hrRepo.getEmployeeByUserId(userId);
    if (!emp) {
      throw new ApiError(404, 'EMPLOYEE_NOT_FOUND', 'Không tìm thấy hồ sơ nhân viên liên kết');
    }
    return emp;
  }

  async listEmployees(filters) {
    return await this.hrRepo.listEmployees(filters);
  }

  // Commission Rules
  async createCommissionRule(payload, actor) {
    return await this.hrRepo.createCommissionRuleVersion(payload, actor);
  }

  async approveCommissionRule(ruleId, actor) {
    return await this.hrRepo.approveCommissionRuleVersion(ruleId, actor);
  }

  async listCommissionRules(filters) {
    return await this.hrRepo.listCommissionRules(filters);
  }

  // Payroll Periods
  async createPayrollPeriod(payload, actor) {
    return await this.hrRepo.createPayrollPeriod(payload, actor);
  }

  async getPayrollPeriod(periodId) {
    const period = await this.hrRepo.getPayrollPeriodById(periodId);
    if (!period) {
      throw new ApiError(404, 'PERIOD_NOT_FOUND', 'Không tìm thấy kỳ lương');
    }
    return period;
  }

  async listPayrollPeriods() {
    return await this.hrRepo.listPayrollPeriods();
  }

  async lockPayrollPeriod(periodId, actor) {
    return await this.hrRepo.lockPayrollPeriod(periodId, actor);
  }

  // Commissions calculation
  async calculateCommission(payload, actor) {
    return await this.hrRepo.calculateCommission(payload, actor);
  }

  // Adjustments
  async adjustCommission(payload, actor) {
    return await this.hrRepo.adjustCommission(payload, actor);
  }

  // List Commissions with Role Scope
  async listCommissions(filters, actor) {
    // Nếu actor là DOCTOR, chỉ cho phép xem hoa hồng của chính mình
    if (actor?.role === 'DOCTOR') {
      const emp = await this.hrRepo.getEmployeeByUserId(actor.userId);
      if (!emp) {
        return [];
      }
      if (filters.employeeId && filters.employeeId !== emp.employeeId) {
        throw new ApiError(403, 'FORBIDDEN_EMPLOYEE_COMMISSION_ACCESS', 'Bác sĩ không có quyền xem hoa hồng của nhân viên khác');
      }
      return await this.hrRepo.listCommissions({
        ...filters,
        employeeId: emp.employeeId,
      });
    }

    // Nếu người dùng chỉ định employeeId cụ thể nhưng không phải ADMIN/ACCOUNTANT
    if (filters.employeeId && !['ADMIN', 'ACCOUNTANT'].includes(actor?.role)) {
      const emp = await this.hrRepo.getEmployeeByUserId(actor.userId);
      if (!emp || emp.employeeId !== filters.employeeId) {
        throw new ApiError(403, 'FORBIDDEN_EMPLOYEE_COMMISSION_ACCESS', 'Bạn không có quyền xem hoa hồng của nhân viên khác');
      }
    }

    return await this.hrRepo.listCommissions(filters);
  }

  async listAdjustments(filters) {
    return await this.hrRepo.listAdjustments(filters);
  }

  async getPayrollSummary(periodId) {
    return await this.hrRepo.getPayrollSummary(periodId);
  }
}

export function createHrService({ hrRepo }) {
  return new HrService({ hrRepo });
}
