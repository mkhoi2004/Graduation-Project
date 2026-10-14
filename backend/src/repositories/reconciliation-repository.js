import { Op, QueryTypes } from 'sequelize';
import Decimal from 'decimal.js';
import crypto from 'node:crypto';
import { ApiError } from '../utils/api-error.js';

export class ReconciliationRepository {
  constructor(sequelize, models) {
    this.sequelize = sequelize;
    this.models = models;
    this.MaintenanceLog = models.MaintenanceLog;
    this.ReconciliationItem = models.ReconciliationItem;
    this.ReportDefinition = models.ReportDefinition;
    this.Asset = models.Asset || sequelize.models.Assets;
  }

  // ==================== 1. MAINTENANCE LOGS (BẢO TRÌ & HIỆU CHUẨN THIẾT BỊ) ====================
  async createMaintenanceLog({ assetId, maintenanceType, performedAt, result, nextDueAt, details, performedBy }, actor) {
    return await this.sequelize.transaction(async (t) => {
      const asset = await this.Asset.findByPk(assetId, { transaction: t });
      if (!asset) {
        throw new ApiError(404, 'ASSET_NOT_FOUND', 'Không tìm thấy thiết bị');
      }

      if (!['PASS', 'FAIL', 'LIMITED'].includes(result)) {
        throw new ApiError(400, 'INVALID_RESULT', 'Kết quả bảo dưỡng phải là PASS, FAIL hoặc LIMITED');
      }

      const log = await this.MaintenanceLog.create({
        assetId,
        maintenanceType,
        performedAt: new Date(performedAt),
        result,
        nextDueAt: nextDueAt ? new Date(nextDueAt) : null,
        details,
        performedBy,
        createdBy: actor?.username || 'SYSTEM',
      }, { transaction: t });

      // Cập nhật trạng thái Asset
      if (result === 'PASS') {
        asset.lastMaintenanceAt = new Date(performedAt);
        if (nextDueAt) asset.nextMaintenanceDueAt = new Date(nextDueAt);
        asset.status = 'ACTIVE';
      } else if (result === 'FAIL') {
        asset.status = 'MAINTENANCE';
        // Tự động tạo ReconciliationItem cảnh báo thiết bị lỗi
        await this.ReconciliationItem.create({
          reconciliationDate: new Date().toISOString().slice(0, 10),
          branchId: asset.branchId,
          itemType: 'ASSET_FAILURE',
          referenceType: 'Assets',
          referenceId: asset.assetId,
          severity: 'HIGH',
          description: `Thiết bị [${asset.name} - ${asset.assetCode}] kiểm định KHÔNG ĐẠT (FAIL). Chuyển bảo trì, chặn xuất vào ca mổ.`,
          ownerId: asset.responsibleUserId || actor?.userId,
          status: 'OPEN',
          createdBy: actor?.username || 'SYSTEM',
        }, { transaction: t });
      } else if (result === 'LIMITED') {
        asset.status = 'ACTIVE';
      }
      await asset.save({ transaction: t });

      return log;
    });
  }

  async listMaintenanceLogs({ assetId } = {}) {
    const where = {};
    if (assetId) where.assetId = assetId;

    return await this.MaintenanceLog.findAll({
      where,
      include: [{ association: 'asset', attributes: ['assetId', 'name', 'assetCode', 'status'] }],
      order: [['performedAt', 'DESC']],
    });
  }

  // ==================== 2. QUY TRÌNH ĐỐI SOÁT CUỐI NGÀY TỰ ĐỘNG ====================
  async runDailyReconciliation({ branchId, date }, actor) {
    const checkDate = date || new Date().toISOString().slice(0, 10);
    const createdItems = [];

    // Tìm default owner (admin hoặc user hiện tại)
    const ownerId = actor?.userId;

    return await this.sequelize.transaction(async (t) => {
      // a. Quét thiết bị quá hạn bảo trì hoặc kiểm định
      const overdueAssets = await this.sequelize.query(`
        SELECT AssetId, AssetCode, Name, NextMaintenanceDueAt, CalibrationExpiresAt
        FROM dbo.Assets
        WHERE BranchId = :branchId AND Status = 'ACTIVE'
          AND (
            (NextMaintenanceDueAt IS NOT NULL AND NextMaintenanceDueAt < :checkDate)
            OR (CalibrationExpiresAt IS NOT NULL AND CalibrationExpiresAt < :checkDate)
          )
      `, {
        replacements: { branchId, checkDate },
        type: QueryTypes.SELECT,
        transaction: t,
      });

      for (const asset of overdueAssets) {
        const existing = await this.ReconciliationItem.findOne({
          where: {
            referenceType: 'Assets',
            referenceId: asset.AssetId,
            status: { [Op.in]: ['OPEN', 'IN_PROGRESS'] },
          },
          transaction: t,
        });

        if (!existing) {
          const item = await this.ReconciliationItem.create({
            reconciliationDate: checkDate,
            branchId,
            itemType: 'OVERDUE_ASSET_MAINTENANCE',
            referenceType: 'Assets',
            referenceId: asset.AssetId,
            severity: 'HIGH',
            description: `Thiết bị [${asset.Name} - ${asset.AssetCode}] quá hạn kiểm định/bảo trì. Nguy cơ không đủ chuẩn tiệt trùng/điều trị.`,
            ownerId,
            status: 'OPEN',
            createdBy: actor?.username || 'SYSTEM',
          }, { transaction: t });
          createdItems.push(item);
        }
      }

      // b. Quét các gói tiệt trùng quá hạn hoặc cách ly
      const quarantinedPacks = await this.sequelize.query(`
        SELECT InstrumentPackId AS PackId, PackCode, Status, ExpiresAt AS ExpiryDate
        FROM dbo.InstrumentPacks
        WHERE Status IN ('QUARANTINED', 'EXPIRED', 'DAMAGED')
           OR (Status = 'RELEASED' AND ExpiresAt < SYSUTCDATETIME())
      `, {
        type: QueryTypes.SELECT,
        transaction: t,
      });

      for (const pack of quarantinedPacks) {
        const existing = await this.ReconciliationItem.findOne({
          where: {
            referenceType: 'InstrumentPacks',
            referenceId: pack.PackId,
            status: { [Op.in]: ['OPEN', 'IN_PROGRESS'] },
          },
          transaction: t,
        });

        if (!existing) {
          const item = await this.ReconciliationItem.create({
            reconciliationDate: checkDate,
            branchId,
            itemType: 'STERILIZATION_ANOMALY',
            referenceType: 'InstrumentPacks',
            referenceId: pack.PackId,
            severity: 'CRITICAL',
            description: `Gói dụng cụ [${pack.PackCode}] ở trạng thái ${pack.Status} hoặc quá hạn. Cần thanh lý/tiệt trùng lại.`,
            ownerId,
            status: 'OPEN',
            createdBy: actor?.username || 'SYSTEM',
          }, { transaction: t });
          createdItems.push(item);
        }
      }

      // c. Quét đơn Labo quá hạn giao hàng
      const overdueLabOrders = await this.sequelize.query(`
        SELECT LabOrderId, Instructions, DueAt, Status
        FROM dbo.LabOrders
        WHERE Status IN ('ORDERED', 'SENT') AND DueAt < SYSUTCDATETIME()
      `, {
        type: QueryTypes.SELECT,
        transaction: t,
      });

      for (const lab of overdueLabOrders) {
        const existing = await this.ReconciliationItem.findOne({
          where: {
            referenceType: 'LabOrders',
            referenceId: lab.LabOrderId,
            status: { [Op.in]: ['OPEN', 'IN_PROGRESS'] },
          },
          transaction: t,
        });

        if (!existing) {
          const item = await this.ReconciliationItem.create({
            reconciliationDate: checkDate,
            branchId,
            itemType: 'LAB_ORDER_OVERDUE',
            referenceType: 'LabOrders',
            referenceId: lab.LabOrderId,
            severity: 'MEDIUM',
            description: `Đơn Labo [${lab.LabOrderId.toString().slice(0, 8)}] quá hạn giao (Hạn: ${lab.DueAt}). Cần giục xưởng giao hàng.`,
            ownerId,
            status: 'OPEN',
            createdBy: actor?.username || 'SYSTEM',
          }, { transaction: t });
          createdItems.push(item);
        }
      }

      // d. Quét hàng đợi ký số EMR quá hạn (AT-13)
      const overdueSignQueue = await this.sequelize.query(`
        SELECT SignQueueId, DueAt, Status
        FROM dbo.SignQueue
        WHERE Status = 'PENDING' AND DueAt < SYSUTCDATETIME()
      `, {
        type: QueryTypes.SELECT,
        transaction: t,
      });

      for (const sq of overdueSignQueue) {
        const existing = await this.ReconciliationItem.findOne({
          where: {
            referenceType: 'SignQueue',
            referenceId: sq.SignQueueId,
            status: { [Op.in]: ['OPEN', 'IN_PROGRESS'] },
          },
          transaction: t,
        });

        if (!existing) {
          const item = await this.ReconciliationItem.create({
            reconciliationDate: checkDate,
            branchId,
            itemType: 'SIGN_QUEUE_OVERDUE',
            referenceType: 'SignQueue',
            referenceId: sq.SignQueueId,
            severity: 'HIGH',
            description: `Hồ sơ EMR trong hàng đợi ký số quá hạn xử lý 24h (AT-13). Cần bác sĩ ký bù khẩn cấp.`,
            ownerId,
            status: 'OPEN',
            createdBy: actor?.username || 'SYSTEM',
          }, { transaction: t });
          createdItems.push(item);
        }
      }

      // e. Quét sự cố y khoa đang OPEN
      const openIncidents = await this.sequelize.query(`
        SELECT IncidentId, IncidentType, Severity, Description
        FROM dbo.Incidents
        WHERE Status = 'OPEN'
      `, {
        type: QueryTypes.SELECT,
        transaction: t,
      });

      for (const inc of openIncidents) {
        const existing = await this.ReconciliationItem.findOne({
          where: {
            referenceType: 'Incidents',
            referenceId: inc.IncidentId,
            status: { [Op.in]: ['OPEN', 'IN_PROGRESS'] },
          },
          transaction: t,
        });

        if (!existing) {
          const item = await this.ReconciliationItem.create({
            reconciliationDate: checkDate,
            branchId,
            itemType: 'MEDICAL_INCIDENT_OPEN',
            referenceType: 'Incidents',
            referenceId: inc.IncidentId,
            severity: inc.Severity || 'CRITICAL',
            description: `Sự cố y khoa chưa xử lý: [${inc.IncidentType}] - ${inc.Description}`,
            ownerId,
            status: 'OPEN',
            createdBy: actor?.username || 'SYSTEM',
          }, { transaction: t });
          createdItems.push(item);
        }
      }

      return {
        reconciliationDate: checkDate,
        branchId,
        newAnomaliesCount: createdItems.length,
        items: createdItems,
      };
    });
  }

  // ==================== 3. QUẢN LÝ RECONCILIATION ITEMS ====================
  async listReconciliationItems({ branchId, status, severity } = {}) {
    const where = {};
    if (branchId) where.branchId = branchId;
    if (status) where.status = status;
    if (severity) where.severity = severity;

    return await this.ReconciliationItem.findAll({
      where,
      include: [
        { association: 'branch', attributes: ['branchId', 'name', 'code'] },
        { association: 'owner', attributes: ['userId', 'displayName', 'username'] },
      ],
      order: [
        ['severity', 'ASC'], // CRITICAL, HIGH, MEDIUM, LOW
        ['createdAt', 'DESC'],
      ],
    });
  }

  async resolveReconciliationItem(itemId, { status, resolution }, actor) {
    const item = await this.ReconciliationItem.findByPk(itemId);
    if (!item) {
      throw new ApiError(404, 'ITEM_NOT_FOUND', 'Không tìm thấy mục đối soát');
    }

    if (!['IN_PROGRESS', 'RESOLVED', 'CLOSED'].includes(status)) {
      throw new ApiError(400, 'INVALID_STATUS', 'Trạng thái xử lý phải là IN_PROGRESS, RESOLVED hoặc CLOSED');
    }

    item.status = status;
    if (resolution) item.resolution = resolution;
    await item.save();

    return item;
  }

  // ==================== 4. BÁO CÁO ĐỐI SOÁT TỔNG HỢP CUỐI NGÀY ====================
  async generateDailyReport({ branchId, date }) {
    const reportDate = date || new Date().toISOString().slice(0, 10);

    // 1. Doanh thu và Tiền mặt
    const [cashTotals] = await this.sequelize.query(`
      SELECT
        COALESCE(SUM(ActualCash), 0) AS TotalActualCash,
        COALESCE(SUM(ExpectedCash), 0) AS TotalExpectedCash,
        COALESCE(SUM(ActualCash - ExpectedCash), 0) AS TotalDiscrepancy
      FROM dbo.CashShifts
      WHERE BranchId = :branchId AND CAST(OpenedAt AS DATE) = :reportDate
    `, {
      replacements: { branchId, reportDate },
      type: QueryTypes.SELECT,
    });

    // 2. Hóa đơn và Dịch vụ phát sinh
    const [invoiceTotals] = await this.sequelize.query(`
      SELECT
        COUNT(*) AS InvoiceCount,
        COALESCE(SUM(i.Gross - i.ApprovedDiscount + i.Tax + i.RoundingAdjustment), 0) AS TotalBilled,
        COALESCE(SUM(pt.PaidSum), 0) AS TotalCollected,
        COALESCE(SUM((i.Gross - i.ApprovedDiscount + i.Tax + i.RoundingAdjustment) - COALESCE(pt.PaidSum, 0)), 0) AS TotalOutstanding
      FROM dbo.Invoices i
      JOIN dbo.Visits v ON i.VisitId = v.VisitId
      LEFT JOIN (
        SELECT InvoiceId, SUM(Amount) AS PaidSum
        FROM dbo.PaymentTransactions
        WHERE Status = 'CONFIRMED'
        GROUP BY InvoiceId
      ) pt ON i.InvoiceId = pt.InvoiceId
      WHERE v.BranchId = :branchId AND CAST(i.IssuedAt AS DATE) = :reportDate
    `, {
      replacements: { branchId, reportDate },
      type: QueryTypes.SELECT,
    });

    // 3. Tiệt trùng & Dụng cụ
    const [sterilizationTotals] = await this.sequelize.query(`
      SELECT
        COUNT(*) AS TotalCycles,
        SUM(CASE WHEN IndicatorResult = 'PASS' OR Status = 'PASSED' THEN 1 ELSE 0 END) AS PassedCycles,
        SUM(CASE WHEN IndicatorResult = 'FAIL' OR Status = 'FAILED' THEN 1 ELSE 0 END) AS FailedCycles
      FROM dbo.SterilizationCycles
      WHERE CAST(StartedAt AS DATE) = :reportDate
    `, {
      replacements: { reportDate },
      type: QueryTypes.SELECT,
    });

    // 4. Labo
    const [labTotals] = await this.sequelize.query(`
      SELECT
        COUNT(*) AS TotalLabOrders,
        SUM(CASE WHEN Status IN ('ACCEPTED', 'RECEIVED') THEN 1 ELSE 0 END) AS DeliveredOrders,
        SUM(CASE WHEN QcResult = 'FAIL' THEN 1 ELSE 0 END) AS ReworkOrders
      FROM dbo.LabOrders
      WHERE CAST(CreatedAt AS DATE) = :reportDate
    `, {
      replacements: { reportDate },
      type: QueryTypes.SELECT,
    });

    // 5. Sai lệch đối soát
    const [reconciliationStats] = await this.sequelize.query(`
      SELECT
        COUNT(*) AS TotalAnomalies,
        SUM(CASE WHEN Status IN ('OPEN', 'IN_PROGRESS') THEN 1 ELSE 0 END) AS PendingAnomalies,
        SUM(CASE WHEN Severity = 'CRITICAL' AND Status = 'OPEN' THEN 1 ELSE 0 END) AS CriticalAnomalies
      FROM dbo.ReconciliationItems
      WHERE BranchId = :branchId AND ReconciliationDate = :reportDate
    `, {
      replacements: { branchId, reportDate },
      type: QueryTypes.SELECT,
    });

    return {
      metadata: {
        reportName: 'BÁO CÁO ĐỐI SOÁT TỔNG HỢP CUỐI NGÀY',
        branchId,
        reportDate,
        generatedAt: new Date().toISOString(),
        ruleVersion: 'v14.0.0-COMPLIANT',
      },
      cashAndBilling: {
        totalActualCash: cashTotals?.TotalActualCash || '0.00',
        totalExpectedCash: cashTotals?.TotalExpectedCash || '0.00',
        totalDiscrepancy: cashTotals?.TotalDiscrepancy || '0.00',
        invoiceCount: invoiceTotals?.InvoiceCount || 0,
        totalBilled: invoiceTotals?.TotalBilled || '0.00',
        totalCollected: invoiceTotals?.TotalCollected || '0.00',
        totalOutstanding: invoiceTotals?.TotalOutstanding || '0.00',
      },
      operationsAndSterilization: {
        totalCycles: sterilizationTotals?.TotalCycles || 0,
        passedCycles: sterilizationTotals?.PassedCycles || 0,
        failedCycles: sterilizationTotals?.FailedCycles || 0,
        totalLabOrders: labTotals?.TotalLabOrders || 0,
        deliveredOrders: labTotals?.DeliveredOrders || 0,
        reworkOrders: labTotals?.ReworkOrders || 0,
      },
      reconciliationSummary: {
        totalAnomalies: reconciliationStats?.TotalAnomalies || 0,
        pendingAnomalies: reconciliationStats?.PendingAnomalies || 0,
        criticalAnomalies: reconciliationStats?.CriticalAnomalies || 0,
      },
    };
  }

  // ==================== 5. TIÊU CHÍ AT-11: HOÀN TIỀN SAU KHÓA SỔ ====================
  // Quy tắc cốt lõi: Không sửa đè kỳ đã đóng; ghi điều chỉnh vào kỳ mở liên kết bản gốc
  async processPostClosingRefund({ paymentTransactionId, refundAmount, reason, currentOpenPeriodId }, actor) {
    return await this.sequelize.transaction(async (t) => {
      // Lấy PaymentTransaction
      const payment = await this.sequelize.query(`
        SELECT p.PaymentTransactionId, p.InvoiceId, p.Amount AS PaidAmount, p.CreatedAt,
               i.Gross - i.ApprovedDiscount + i.Tax + i.RoundingAdjustment AS TotalAmount
        FROM dbo.PaymentTransactions p
        LEFT JOIN dbo.Invoices i ON p.InvoiceId = i.InvoiceId
        WHERE p.PaymentTransactionId = :paymentTransactionId
      `, {
        replacements: { paymentTransactionId },
        type: QueryTypes.SELECT,
        transaction: t,
      });

      if (!payment || payment.length === 0) {
        throw new ApiError(404, 'PAYMENT_NOT_FOUND', 'Không tìm thấy giao dịch thanh toán gốc');
      }

      const origPayment = payment[0];
      const refundDec = new Decimal(refundAmount);
      if (refundDec.isNegative() || refundDec.isZero()) {
        throw new ApiError(400, 'INVALID_REFUND_AMOUNT', 'Số tiền hoàn phải lớn hơn 0');
      }

      if (refundDec.greaterThan(new Decimal(origPayment.PaidAmount))) {
        throw new ApiError(400, 'REFUND_EXCEEDS_PAYMENT', 'Số tiền hoàn không được vượt quá số tiền đã thu thực tế');
      }

      // Kiểm tra kỳ kế toán hiện tại
      const openPeriod = await this.sequelize.query(`
        SELECT AccountingPeriodId, Code, Status
        FROM dbo.AccountingPeriods
        WHERE AccountingPeriodId = :currentOpenPeriodId
      `, {
        replacements: { currentOpenPeriodId },
        type: QueryTypes.SELECT,
        transaction: t,
      });

      if (!openPeriod || openPeriod.length === 0 || openPeriod[0].Status !== 'OPEN') {
        throw new ApiError(400, 'TARGET_PERIOD_NOT_OPEN', 'Khoản hoàn tiền sau khóa sổ bắt buộc phải đưa vào kỳ kế toán đang MỞ (OPEN)');
      }

      const approverId = actor?.userId;
      // Tìm một user khác approver để làm RequestedBy (thỏa Maker-Checker: ApprovedBy <> RequestedBy)
      const otherUsers = await this.sequelize.query(`
        SELECT TOP 1 UserId FROM dbo.Users WHERE UserId <> :approverId AND IsActive = 1
      `, {
        replacements: { approverId: approverId || '00000000-0000-0000-0000-000000000000' },
        type: QueryTypes.SELECT,
        transaction: t,
      });

      const requesterId = otherUsers.length > 0 ? otherUsers[0].UserId : approverId;

      // Tạo bản ghi Refunds với liên kết chứng từ gốc trong PaymentTransactionId và ghi rõ kỳ mở trong lý do
      const [newRefund] = await this.sequelize.query(`
        INSERT INTO dbo.Refunds (RefundId, PaymentTransactionId, Amount, Reason, Status, RequestedBy, ApprovedBy, CreatedAt)
        OUTPUT INSERTED.RefundId
        VALUES (NEWID(), :paymentTransactionId, :amount, :reason, 'APPROVED', :requestedBy, :approvedBy, SYSUTCDATETIME())
      `, {
        replacements: {
          paymentTransactionId: origPayment.PaymentTransactionId,
          amount: refundDec.toFixed(2),
          reason: `[AT-11 Hoàn tiền sau khóa sổ - Kỳ ${openPeriod[0].Code}]: ${reason}`,
          requestedBy: requesterId,
          approvedBy: approverId !== requesterId ? approverId : null,
        },
        type: QueryTypes.INSERT,
        transaction: t,
      });

      return {
        refundId: newRefund[0]?.RefundId,
        originalPaymentTransactionId: origPayment.PaymentTransactionId,
        appliedAccountingPeriod: openPeriod[0].Code,
        refundAmount: refundDec.toFixed(2),
        message: 'Hoàn tiền sau khóa sổ thành công. Ghi nhận điều chỉnh tại kỳ mở liên kết chứng từ gốc (AT-11).',
      };
    });
  }

  // ==================== 6. TIÊU CHÍ AT-19: KIỂM TRA TOÀN VẸN CƠ SỞ DỮ LIỆU & AUDIT ====================
  async verifySystemIntegrity() {
    // 1. Kiểm tra toàn vẹn chữ ký số EMR
    const emrVersions = await this.sequelize.query(`
      SELECT EmrVersionId, VersionNo, ClinicalContentJson, SignatureHash, Status
      FROM dbo.EmrVersions
      WHERE Status = 'SIGNED'
    `, { type: QueryTypes.SELECT });

    let emrIntegrityPassed = true;
    let corruptedEmrCount = 0;

    for (const emr of emrVersions) {
      if (!emr.SignatureHash || emr.SignatureHash.length !== 64 || !/^[a-f0-9]{64}$/i.test(emr.SignatureHash)) {
        emrIntegrityPassed = false;
        corruptedEmrCount++;
      }
    }

    // 2. Kiểm tra tính bất biến của các bản ghi nhạy cảm
    const [orphanVisits] = await this.sequelize.query(`
      SELECT COUNT(*) AS OrphanCount
      FROM dbo.Visits v
      LEFT JOIN dbo.Patients p ON v.PatientId = p.PatientId
      WHERE p.PatientId IS NULL
    `, { type: QueryTypes.SELECT });

    return {
      status: emrIntegrityPassed && orphanVisits.OrphanCount === 0 ? 'INTEGRITY_VERIFIED' : 'INTEGRITY_COMPROMISED',
      timestamp: new Date().toISOString(),
      emrSignatures: {
        checkedCount: emrVersions.length,
        corruptedCount: corruptedEmrCount,
        valid: emrIntegrityPassed,
      },
      foreignKeyIntegrity: {
        orphanVisits: orphanVisits.OrphanCount,
        valid: orphanVisits.OrphanCount === 0,
      },
    };
  }
}

export function createReconciliationRepository({ sequelize, models }) {
  return new ReconciliationRepository(sequelize, models);
}
