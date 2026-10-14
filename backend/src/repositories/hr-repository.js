import { Op, QueryTypes } from 'sequelize';
import Decimal from 'decimal.js';
import { ApiError } from '../utils/api-error.js';

export class HrRepository {
  constructor(sequelize, models) {
    this.sequelize = sequelize;
    this.models = models;
    this.Employee = models.Employee;
    this.CommissionRuleVersion = models.CommissionRuleVersion;
    this.PayrollPeriod = models.PayrollPeriod;
    this.Commission = models.Commission;
    this.CommissionAdjustment = models.CommissionAdjustment;
  }

  // ==================== EMPLOYEES ====================
  async createEmployee({ userId, employeeCode, baseSalary = 0, status = 'ACTIVE' }, actor) {
    const existing = await this.Employee.findOne({
      where: {
        [Op.or]: [{ userId }, { employeeCode }],
      },
    });
    if (existing) {
      throw new ApiError(409, 'EMPLOYEE_ALREADY_EXISTS', 'Nhân viên với User ID hoặc Mã nhân viên này đã tồn tại');
    }

    return await this.Employee.create({
      userId,
      employeeCode,
      baseSalary: new Decimal(baseSalary).toFixed(2),
      status,
      createdBy: actor?.username || 'SYSTEM',
    });
  }

  async getEmployeeById(employeeId) {
    return await this.Employee.findByPk(employeeId, {
      include: [
        {
          association: 'user',
          attributes: ['userId', 'username', 'displayName'],
          include: [{ association: 'role', attributes: ['code', 'name'] }],
        },
      ],
    });
  }

  async getEmployeeByUserId(userId) {
    return await this.Employee.findOne({
      where: { userId },
      include: [
        {
          association: 'user',
          attributes: ['userId', 'username', 'displayName'],
          include: [{ association: 'role', attributes: ['code', 'name'] }],
        },
      ],
    });
  }

  async listEmployees({ status } = {}) {
    const where = {};
    if (status) where.status = status;
    return await this.Employee.findAll({
      where,
      include: [
        {
          association: 'user',
          attributes: ['userId', 'username', 'displayName'],
          include: [{ association: 'role', attributes: ['code', 'name'] }],
        },
      ],
      order: [['employeeCode', 'ASC']],
    });
  }

  // ==================== COMMISSION RULES ====================
  async createCommissionRuleVersion({ serviceId = null, basis, ratePercent, effectiveFrom, effectiveTo = null }, actor) {
    if (!['COMPLETION', 'CONFIRMED_COLLECTION'].includes(basis)) {
      throw new ApiError(400, 'INVALID_COMMISSION_BASIS', 'Căn cứ hoa hồng phải là COMPLETION hoặc CONFIRMED_COLLECTION');
    }
    const rate = new Decimal(ratePercent);
    if (rate.isNegative() || rate.greaterThan(100)) {
      throw new ApiError(400, 'INVALID_COMMISSION_RATE', 'Tỷ lệ hoa hồng phải từ 0% đến 100%');
    }

    if (effectiveTo && new Date(effectiveTo) <= new Date(effectiveFrom)) {
      throw new ApiError(400, 'INVALID_EFFECTIVE_PERIOD', 'Ngày kết thúc hiệu lực phải sau ngày bắt đầu');
    }

    // VersionNo tăng dần theo ServiceId (hoặc null)
    const latest = await this.CommissionRuleVersion.findOne({
      where: { serviceId: serviceId || null },
      order: [['versionNo', 'DESC']],
    });
    const versionNo = latest ? latest.versionNo + 1 : 1;

    return await this.CommissionRuleVersion.create({
      serviceId: serviceId || null,
      versionNo,
      basis,
      ratePercent: rate.toFixed(4),
      effectiveFrom: new Date(effectiveFrom),
      effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
      status: 'DRAFT',
      createdBy: actor?.username || 'SYSTEM',
    });
  }

  async checkCommissionRuleOverlap(serviceId, basis, effectiveFrom, effectiveTo, excludeRuleId = null) {
    const fromDate = new Date(effectiveFrom);
    const toDate = effectiveTo ? new Date(effectiveTo) : null;

    const approvedRules = await this.CommissionRuleVersion.findAll({
      where: {
        serviceId: serviceId || null,
        basis,
        status: 'APPROVED',
        ...(excludeRuleId ? { commissionRuleVersionId: { [Op.ne]: excludeRuleId } } : {}),
      },
    });

    for (const rule of approvedRules) {
      const existingFrom = new Date(rule.effectiveFrom);
      const existingTo = rule.effectiveTo ? new Date(rule.effectiveTo) : null;

      // Check overlap: Overlap exists unless one is completely before or after the other
      const isBefore = toDate && toDate <= existingFrom;
      const isAfter = existingTo && fromDate >= existingTo;

      if (!isBefore && !isAfter) {
        return { isOverlap: true, overlappingRule: rule };
      }
    }

    return { isOverlap: false };
  }

  async approveCommissionRuleVersion(ruleId, actor) {
    const rule = await this.CommissionRuleVersion.findByPk(ruleId);
    if (!rule) {
      throw new ApiError(404, 'RULE_NOT_FOUND', 'Không tìm thấy quy tắc hoa hồng');
    }
    if (rule.status !== 'DRAFT') {
      throw new ApiError(400, 'INVALID_RULE_STATUS', `Chỉ quy tắc ở trạng thái DRAFT mới được duyệt. Hiện tại: ${rule.status}`);
    }

    // Maker-Checker: Người tạo không được tự duyệt
    if (actor?.role !== 'ADMIN' && rule.createdBy === actor?.username) {
      throw new ApiError(403, 'MAKER_CANNOT_APPROVE', 'Người tạo quy tắc hoa hồng không được tự phê duyệt (Maker-Checker)');
    }

    // Kiểm tra không có 2 phiên bản hiệu lực chồng chéo cùng phạm vi
    const { isOverlap, overlappingRule } = await this.checkCommissionRuleOverlap(
      rule.serviceId,
      rule.basis,
      rule.effectiveFrom,
      rule.effectiveTo,
      rule.commissionRuleVersionId
    );

    if (isOverlap) {
      throw new ApiError(
        409,
        'COMMISSION_RULE_OVERLAP',
        `Phát hiện xung đột thời gian hiệu lực với phiên bản v${overlappingRule.versionNo} đã được duyệt`
      );
    }

    rule.status = 'APPROVED';
    rule.approvedBy = actor?.userId || null;
    await rule.save();

    return rule;
  }

  async listCommissionRules({ serviceId, status } = {}) {
    const where = {};
    if (serviceId !== undefined) where.serviceId = serviceId;
    if (status) where.status = status;

    return await this.CommissionRuleVersion.findAll({
      where,
      include: [
        { association: 'service', attributes: ['serviceId', 'code', 'name'] },
        { association: 'approver', attributes: ['userId', 'username', 'displayName'] },
      ],
      order: [['createdAt', 'DESC']],
    });
  }

  // ==================== PAYROLL PERIODS ====================
  async createPayrollPeriod({ code, startsOn, endsOn }, actor) {
    if (new Date(endsOn) < new Date(startsOn)) {
      throw new ApiError(400, 'INVALID_PAYROLL_PERIOD_DATES', 'Ngày kết thúc kỳ lương phải lớn hơn hoặc bằng ngày bắt đầu');
    }

    const existing = await this.PayrollPeriod.findOne({ where: { code } });
    if (existing) {
      throw new ApiError(409, 'PAYROLL_PERIOD_ALREADY_EXISTS', 'Kỳ lương với mã này đã tồn tại');
    }

    return await this.PayrollPeriod.create({
      code,
      startsOn,
      endsOn,
      status: 'OPEN',
      createdBy: actor?.username || 'SYSTEM',
    });
  }

  async getPayrollPeriodById(periodId) {
    return await this.PayrollPeriod.findByPk(periodId);
  }

  async listPayrollPeriods() {
    return await this.PayrollPeriod.findAll({
      order: [['startsOn', 'DESC']],
    });
  }

  async lockPayrollPeriod(periodId, actor) {
    const period = await this.PayrollPeriod.findByPk(periodId);
    if (!period) {
      throw new ApiError(404, 'PERIOD_NOT_FOUND', 'Không tìm thấy kỳ lương');
    }
    if (period.status === 'LOCKED') {
      throw new ApiError(400, 'PERIOD_ALREADY_LOCKED', 'Kỳ lương này đã bị khóa từ trước');
    }

    period.status = 'LOCKED';
    period.lockedAt = new Date();
    await period.save();

    return period;
  }

  // ==================== COMMISSIONS ====================
  // Quy tắc cốt lõi: Một dòng tiền không tính hoa hồng 2 lần (Anti-Double Commission)
  async calculateCommission({
    employeeId,
    serviceCompletionEventId,
    commissionRuleVersionId,
    payrollPeriodId,
    basisAmount,
  }, actor) {
    return await this.sequelize.transaction(async (t) => {
      // 1. Kiểm tra kỳ lương có bị khóa không
      const period = await this.PayrollPeriod.findByPk(payrollPeriodId, { transaction: t });
      if (!period) {
        throw new ApiError(404, 'PERIOD_NOT_FOUND', 'Không tìm thấy kỳ lương chỉ định');
      }
      if (period.status === 'LOCKED') {
        throw new ApiError(400, 'PERIOD_ALREADY_LOCKED', 'Không thể tính hoa hồng vào kỳ lương đã khóa sổ');
      }

      // 2. Kiểm tra quy tắc hoa hồng
      const rule = await this.CommissionRuleVersion.findByPk(commissionRuleVersionId, { transaction: t });
      if (!rule) {
        throw new ApiError(404, 'RULE_NOT_FOUND', 'Không tìm thấy quy tắc hoa hồng');
      }
      if (rule.status !== 'APPROVED') {
        throw new ApiError(400, 'RULE_NOT_APPROVED', 'Chỉ quy tắc hoa hồng đã được duyệt (APPROVED) mới được dùng để tính hoa hồng');
      }

      // 3. Kiểm tra nhân viên
      const employee = await this.Employee.findByPk(employeeId, { transaction: t });
      if (!employee || employee.status !== 'ACTIVE') {
        throw new ApiError(400, 'EMPLOYEE_NOT_ACTIVE', 'Nhân viên không tồn tại hoặc không ở trạng thái hoạt động (ACTIVE)');
      }

      // 4. KIỂM TRA CHỐNG TÍNH LẶP (Một dòng tiền không tính hoa hồng 2 lần)
      const existing = await this.Commission.findOne({
        where: {
          serviceCompletionEventId,
          employeeId,
          commissionRuleVersionId,
        },
        transaction: t,
      });

      if (existing) {
        throw new ApiError(
          409,
          'COMMISSION_ALREADY_CALCULATED',
          'Sự kiện hoàn thành dịch vụ này đã được tính hoa hồng cho nhân viên theo quy tắc này (Không tính hoa hồng 2 lần)'
        );
      }

      // 5. Tính số tiền hoa hồng = BasisAmount * RatePercent / 100
      const basisDecimal = new Decimal(basisAmount);
      if (basisDecimal.isNegative()) {
        throw new ApiError(400, 'INVALID_BASIS_AMOUNT', 'Số tiền căn cứ tính hoa hồng không được là số âm');
      }
      const rateDecimal = new Decimal(rule.ratePercent).dividedBy(100);
      const commissionAmount = basisDecimal.times(rateDecimal).toDecimalPlaces(2);

      const commission = await this.Commission.create({
        employeeId,
        serviceCompletionEventId,
        commissionRuleVersionId,
        payrollPeriodId,
        basisAmount: basisDecimal.toFixed(2),
        commissionAmount: commissionAmount.toFixed(2),
        status: 'CALCULATED',
        createdBy: actor?.username || 'SYSTEM',
      }, { transaction: t });

      return commission;
    });
  }

  // ==================== COMMISSION ADJUSTMENTS ====================
  // Quy tắc cốt lõi: Hoàn tiền / đảo dịch vụ tạo CommissionAdjustments số âm liên kết bản gốc
  async adjustCommission({ commissionId, payrollPeriodId, amount, reason }, actor) {
    return await this.sequelize.transaction(async (t) => {
      const originalCommission = await this.Commission.findByPk(commissionId, { transaction: t });
      if (!originalCommission) {
        throw new ApiError(404, 'COMMISSION_NOT_FOUND', 'Không tìm thấy bản ghi hoa hồng gốc');
      }

      const period = await this.PayrollPeriod.findByPk(payrollPeriodId, { transaction: t });
      if (!period) {
        throw new ApiError(404, 'PERIOD_NOT_FOUND', 'Không tìm thấy kỳ lương chỉ định');
      }
      if (period.status === 'LOCKED') {
        throw new ApiError(400, 'PERIOD_ALREADY_LOCKED', 'Không thể tạo điều chỉnh vào kỳ lương đã khóa');
      }

      const adjAmount = new Decimal(amount);
      if (adjAmount.isZero()) {
        throw new ApiError(400, 'ADJUSTMENT_AMOUNT_CANNOT_BE_ZERO', 'Số tiền điều chỉnh hoa hồng phải khác 0');
      }

      if (!reason || reason.trim() === '') {
        throw new ApiError(400, 'ADJUSTMENT_REASON_REQUIRED', 'Bắt buộc cung cấp lý do điều chỉnh hoa hồng');
      }

      const adjustment = await this.CommissionAdjustment.create({
        commissionId,
        payrollPeriodId,
        amount: adjAmount.toFixed(2),
        reason: reason.trim(),
        createdBy: actor?.username || 'SYSTEM',
      }, { transaction: t });

      return adjustment;
    });
  }

  // ==================== LIST & SUMMARY ====================
  async listCommissions({ employeeId, payrollPeriodId, status } = {}) {
    const where = {};
    if (employeeId) where.employeeId = employeeId;
    if (payrollPeriodId) where.payrollPeriodId = payrollPeriodId;
    if (status) where.status = status;

    return await this.Commission.findAll({
      where,
      include: [
        {
          association: 'employee',
          include: [{
            association: 'user',
            attributes: ['userId', 'displayName', 'username'],
            include: [{ association: 'role', attributes: ['code', 'name'] }],
          }],
        },
        { association: 'ruleVersion' },
        { association: 'payrollPeriod' },
        { association: 'adjustments' },
      ],
      order: [['createdAt', 'DESC']],
    });
  }

  async listAdjustments({ commissionId, payrollPeriodId } = {}) {
    const where = {};
    if (commissionId) where.commissionId = commissionId;
    if (payrollPeriodId) where.payrollPeriodId = payrollPeriodId;

    return await this.CommissionAdjustment.findAll({
      where,
      include: [
        {
          association: 'commission',
          include: [{
            association: 'employee',
            include: [{
              association: 'user',
              attributes: ['userId', 'displayName', 'username'],
              include: [{ association: 'role', attributes: ['code', 'name'] }],
            }],
          }],
        },
        { association: 'payrollPeriod' },
      ],
      order: [['createdAt', 'DESC']],
    });
  }

  // Tổng hợp bảng lương kỳ: BaseSalary + Commissions + Adjustments
  async getPayrollSummary(payrollPeriodId) {
    const period = await this.PayrollPeriod.findByPk(payrollPeriodId);
    if (!period) {
      throw new ApiError(404, 'PERIOD_NOT_FOUND', 'Không tìm thấy kỳ lương');
    }

    const employees = await this.Employee.findAll({
      where: { status: 'ACTIVE' },
      include: [{
        association: 'user',
        attributes: ['userId', 'displayName', 'username'],
        include: [{ association: 'role', attributes: ['code', 'name'] }],
      }],
    });

    const commissions = await this.Commission.findAll({
      where: {
        payrollPeriodId,
        status: { [Op.ne]: 'REVERSED' },
      },
    });

    const adjustments = await this.CommissionAdjustment.findAll({
      where: { payrollPeriodId },
    });

    const summary = employees.map((emp) => {
      const empCommissions = commissions.filter((c) => c.employeeId === emp.employeeId);
      const empCommissionTotal = empCommissions.reduce(
        (sum, c) => sum.plus(new Decimal(c.commissionAmount)),
        new Decimal(0)
      );

      // Điều chỉnh của các commission thuộc nhân viên này
      const empCommissionIds = new Set(empCommissions.map((c) => c.commissionId));
      const empAdjustments = adjustments.filter((a) => empCommissionIds.has(a.commissionId));
      const empAdjustmentTotal = empAdjustments.reduce(
        (sum, a) => sum.plus(new Decimal(a.amount)),
        new Decimal(0)
      );

      const baseSalary = new Decimal(emp.baseSalary);
      const netPay = baseSalary.plus(empCommissionTotal).plus(empAdjustmentTotal);

      return {
        employeeId: emp.employeeId,
        employeeCode: emp.employeeCode,
        userId: emp.userId,
        displayName: emp.user?.displayName || emp.employeeCode,
        role: emp.user?.role?.code || 'STAFF',
        baseSalary: baseSalary.toFixed(2),
        totalCommissions: empCommissionTotal.toFixed(2),
        totalAdjustments: empAdjustmentTotal.toFixed(2),
        netPay: netPay.toFixed(2),
        commissionCount: empCommissions.length,
        adjustmentCount: empAdjustments.length,
      };
    });

    return {
      period,
      summary,
      totalPayrollAmount: summary
        .reduce((sum, item) => sum.plus(new Decimal(item.netPay)), new Decimal(0))
        .toFixed(2),
    };
  }
}

export function createHrRepository({ sequelize, models }) {
  return new HrRepository(sequelize, models);
}
