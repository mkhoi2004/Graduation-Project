import { Router } from 'express';
import { ApiError } from '../utils/api-error.js';

export function createHrRoutes({ hrController, authMiddlewares }) {
  const router = Router();
  const { authenticate, authorize } = authMiddlewares;

  const requireApprover = (req, res, next) => {
    if (!req.user?.isApprover && req.user?.role !== 'ADMIN') {
      return next(new ApiError(403, 'APPROVER_ROLE_REQUIRED', 'Chỉ Người duyệt (Approver) hoặc Admin mới có quyền thực hiện'));
    }
    next();
  };

  router.use(authenticate);

  // Employees (Admin & Accountant)
  router.get('/employees', authorize('ADMIN', 'ACCOUNTANT'), hrController.listEmployees);
  router.post('/employees', authorize('ADMIN', 'ACCOUNTANT'), hrController.createEmployee);
  router.get('/employees/:id', authorize('ADMIN', 'ACCOUNTANT'), hrController.getEmployeeById);

  // Commission Rules
  router.get('/commission-rules', authorize('ADMIN', 'ACCOUNTANT'), hrController.listCommissionRules);
  router.post('/commission-rules', authorize('ADMIN', 'ACCOUNTANT'), hrController.createCommissionRule);
  router.post('/commission-rules/:id/approve', requireApprover, hrController.approveCommissionRule);

  // Payroll Periods
  router.get('/payroll-periods', authorize('ADMIN', 'ACCOUNTANT'), hrController.listPayrollPeriods);
  router.post('/payroll-periods', authorize('ADMIN', 'ACCOUNTANT'), hrController.createPayrollPeriod);
  router.get('/payroll-periods/:id', authorize('ADMIN', 'ACCOUNTANT'), hrController.getPayrollPeriod);
  router.post('/payroll-periods/:id/lock', requireApprover, hrController.lockPayrollPeriod);
  router.get('/payroll-periods/:id/summary', authorize('ADMIN', 'ACCOUNTANT'), hrController.getPayrollSummary);

  // Commissions
  // Bác sĩ được xem hoa hồng (service sẽ tự lọc chỉ của chính bác sĩ)
  router.get('/commissions', authorize('ADMIN', 'ACCOUNTANT', 'DOCTOR'), hrController.listCommissions);
  router.post('/commissions/calculate', authorize('ADMIN', 'ACCOUNTANT'), hrController.calculateCommission);
  router.post('/commissions/:id/adjust', authorize('ADMIN', 'ACCOUNTANT'), hrController.adjustCommission);

  // Adjustments
  router.get('/adjustments', authorize('ADMIN', 'ACCOUNTANT'), hrController.listAdjustments);

  return router;
}
