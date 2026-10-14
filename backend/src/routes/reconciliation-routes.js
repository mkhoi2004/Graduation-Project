import { Router } from 'express';
import { ApiError } from '../utils/api-error.js';

export function createReconciliationRoutes({ reconciliationController, authMiddlewares }) {
  const router = Router();
  const { authenticate, authorize } = authMiddlewares;

  const requireApprover = (req, res, next) => {
    if (!req.user?.isApprover && req.user?.role !== 'ADMIN') {
      return next(new ApiError(403, 'APPROVER_ROLE_REQUIRED', 'Yêu cầu quyền Người duyệt (Approver) hoặc Quản trị viên'));
    }
    next();
  };

  router.use(authenticate);

  // 1. Maintenance Logs (Bảo trì & Hiệu chuẩn)
  router.get('/maintenance-logs', authorize('ADMIN', 'WAREHOUSE', 'ACCOUNTANT'), reconciliationController.listMaintenanceLogs);
  router.post('/maintenance-logs', authorize('ADMIN', 'WAREHOUSE'), reconciliationController.createMaintenanceLog);

  // 2. Daily Reconciliation (Đối soát cuối ngày)
  router.post('/run', authorize('ADMIN', 'ACCOUNTANT'), reconciliationController.runDailyReconciliation);
  router.get('/items', authorize('ADMIN', 'ACCOUNTANT'), reconciliationController.listReconciliationItems);
  router.post('/items/:id/resolve', authorize('ADMIN', 'ACCOUNTANT'), reconciliationController.resolveReconciliationItem);

  // 3. Daily Summary Report (Báo cáo tổng hợp cuối ngày)
  router.get('/daily-report', authorize('ADMIN', 'ACCOUNTANT'), reconciliationController.generateDailyReport);

  // 4. AT-11: Post-Closing Refund (Hoàn tiền sau khóa sổ)
  router.post('/post-closing-refund', requireApprover, reconciliationController.processPostClosingRefund);

  // 5. AT-19: System Integrity Verification (Kiểm tra toàn vẹn CSDL)
  router.get('/integrity-check', authorize('ADMIN', 'ACCOUNTANT'), reconciliationController.verifySystemIntegrity);

  return router;
}
