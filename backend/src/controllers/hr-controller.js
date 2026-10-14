export function createHrController({ hrService }) {
  return {
    // Employees
    async createEmployee(req, res, next) {
      try {
        const result = await hrService.createEmployee(req.body, req.user);
        res.status(201).json(result);
      } catch (err) {
        next(err);
      }
    },

    async listEmployees(req, res, next) {
      try {
        const { status } = req.query;
        const result = await hrService.listEmployees({ status });
        res.status(200).json(result);
      } catch (err) {
        next(err);
      }
    },

    async getEmployeeById(req, res, next) {
      try {
        const result = await hrService.getEmployeeById(req.params.id);
        res.status(200).json(result);
      } catch (err) {
        next(err);
      }
    },

    // Commission Rules
    async createCommissionRule(req, res, next) {
      try {
        const result = await hrService.createCommissionRule(req.body, req.user);
        res.status(201).json(result);
      } catch (err) {
        next(err);
      }
    },

    async approveCommissionRule(req, res, next) {
      try {
        const result = await hrService.approveCommissionRule(req.params.id, req.user);
        res.status(200).json(result);
      } catch (err) {
        next(err);
      }
    },

    async listCommissionRules(req, res, next) {
      try {
        const { serviceId, status } = req.query;
        const result = await hrService.listCommissionRules({ serviceId, status });
        res.status(200).json(result);
      } catch (err) {
        next(err);
      }
    },

    // Payroll Periods
    async createPayrollPeriod(req, res, next) {
      try {
        const result = await hrService.createPayrollPeriod(req.body, req.user);
        res.status(201).json(result);
      } catch (err) {
        next(err);
      }
    },

    async listPayrollPeriods(req, res, next) {
      try {
        const result = await hrService.listPayrollPeriods();
        res.status(200).json(result);
      } catch (err) {
        next(err);
      }
    },

    async getPayrollPeriod(req, res, next) {
      try {
        const result = await hrService.getPayrollPeriod(req.params.id);
        res.status(200).json(result);
      } catch (err) {
        next(err);
      }
    },

    async lockPayrollPeriod(req, res, next) {
      try {
        const result = await hrService.lockPayrollPeriod(req.params.id, req.user);
        res.status(200).json(result);
      } catch (err) {
        next(err);
      }
    },

    // Commissions
    async calculateCommission(req, res, next) {
      try {
        const result = await hrService.calculateCommission(req.body, req.user);
        res.status(201).json(result);
      } catch (err) {
        next(err);
      }
    },

    async listCommissions(req, res, next) {
      try {
        const { employeeId, payrollPeriodId, status } = req.query;
        const result = await hrService.listCommissions({ employeeId, payrollPeriodId, status }, req.user);
        res.status(200).json(result);
      } catch (err) {
        next(err);
      }
    },

    // Adjustments
    async adjustCommission(req, res, next) {
      try {
        const { payrollPeriodId, amount, reason } = req.body;
        const result = await hrService.adjustCommission({
          commissionId: req.params.id,
          payrollPeriodId,
          amount,
          reason,
        }, req.user);
        res.status(201).json(result);
      } catch (err) {
        next(err);
      }
    },

    async listAdjustments(req, res, next) {
      try {
        const { commissionId, payrollPeriodId } = req.query;
        const result = await hrService.listAdjustments({ commissionId, payrollPeriodId });
        res.status(200).json(result);
      } catch (err) {
        next(err);
      }
    },

    // Summary
    async getPayrollSummary(req, res, next) {
      try {
        const result = await hrService.getPayrollSummary(req.params.id);
        res.status(200).json(result);
      } catch (err) {
        next(err);
      }
    },
  };
}
