export function createReconciliationController({ reconciliationService }) {
  return {
    async createMaintenanceLog(req, res, next) {
      try {
        const result = await reconciliationService.createMaintenanceLog(req.body, req.user);
        res.status(201).json(result);
      } catch (err) {
        next(err);
      }
    },

    async listMaintenanceLogs(req, res, next) {
      try {
        const { assetId } = req.query;
        const result = await reconciliationService.listMaintenanceLogs({ assetId });
        res.status(200).json(result);
      } catch (err) {
        next(err);
      }
    },

    async runDailyReconciliation(req, res, next) {
      try {
        const { branchId, date } = req.body;
        const result = await reconciliationService.runDailyReconciliation({
          branchId: branchId || req.user.branchId,
          date,
        }, req.user);
        res.status(200).json(result);
      } catch (err) {
        next(err);
      }
    },

    async listReconciliationItems(req, res, next) {
      try {
        const { branchId, status, severity } = req.query;
        const result = await reconciliationService.listReconciliationItems({
          branchId: branchId || req.user.branchId,
          status,
          severity,
        });
        res.status(200).json(result);
      } catch (err) {
        next(err);
      }
    },

    async resolveReconciliationItem(req, res, next) {
      try {
        const result = await reconciliationService.resolveReconciliationItem(
          req.params.id,
          req.body,
          req.user
        );
        res.status(200).json(result);
      } catch (err) {
        next(err);
      }
    },

    async generateDailyReport(req, res, next) {
      try {
        const { branchId, date } = req.query;
        const result = await reconciliationService.generateDailyReport({
          branchId: branchId || req.user.branchId,
          date,
        });
        res.status(200).json(result);
      } catch (err) {
        next(err);
      }
    },

    // AT-11: Hoàn tiền sau khóa sổ
    async processPostClosingRefund(req, res, next) {
      try {
        const result = await reconciliationService.processPostClosingRefund(req.body, req.user);
        res.status(201).json(result);
      } catch (err) {
        next(err);
      }
    },

    // AT-19: Kiểm tra toàn vẹn cơ sở dữ liệu & audit
    async verifySystemIntegrity(req, res, next) {
      try {
        const result = await reconciliationService.verifySystemIntegrity();
        res.status(200).json(result);
      } catch (err) {
        next(err);
      }
    },
  };
}
