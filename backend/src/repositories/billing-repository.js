import { Op } from 'sequelize';
import { ApiError } from '../utils/api-error.js';
import { setSessionUser } from '../utils/session-context.js';

export function createBillingRepository({
  sequelize,
  models,
  userModels,
  catalogModels,
  patientVisitModels,
  clinicalModels,
}) {
  const {
    CashShift,
    Invoice,
    InvoiceLine,
    PaymentAllocation,
    Deposit,
    PaymentTransaction,
    DepositApplication,
    Refund,
    DiscountApproval,
    Receivable,
  } = models;

  const { User, Branch } = userModels;
  const { Patient, Visit } = patientVisitModels;
  const { ServiceLine, ServiceCompletionEvent } = clinicalModels;
  const { ServicePriceVersion } = catalogModels;

  // --- CashShift Methods ---
  async function getCurrentShift(cashierId) {
    return CashShift.findOne({
      where: {
        cashierId,
        status: 'OPEN',
      },
      include: [{ model: Branch, as: 'branch' }],
    });
  }

  async function openShift({ branchId, openingFloat = 0 }, user) {
    const existing = await getCurrentShift(user.userId);
    if (existing) {
      throw new ApiError(409, 'SHIFT_ALREADY_OPEN', 'Thu ngân hiện đang có một ca làm việc đang mở. Vui lòng đóng ca hiện tại trước.');
    }

    if (Number(openingFloat) < 0) {
      throw new ApiError(400, 'INVALID_OPENING_FLOAT', 'Tiền đầu ca không được là số âm.');
    }

    return CashShift.create({
      branchId,
      cashierId: user.userId,
      openingFloat,
      status: 'OPEN',
      openedAt: new Date(),
      createdBy: user.username,
    });
  }

  async function closeShift(cashShiftId, { actualCash }, user) {
    const shift = await CashShift.findByPk(cashShiftId);
    if (!shift) {
      throw new ApiError(404, 'SHIFT_NOT_FOUND', 'Không tìm thấy ca thu ngân.');
    }

    if (shift.status !== 'OPEN') {
      throw new ApiError(400, 'SHIFT_NOT_OPEN', 'Ca thu ngân này đã đóng hoặc đã hủy.');
    }

    // Calculate total cash transactions in this shift
    const cashTxns = await PaymentTransaction.findAll({
      where: {
        cashShiftId,
        method: 'CASH',
        status: 'CONFIRMED',
      },
    });

    const totalCashCollected = cashTxns.reduce((sum, t) => sum + Number(t.amount), 0);
    const expectedCash = Number(shift.openingFloat) + totalCashCollected;

    await shift.update({
      actualCash: actualCash !== undefined ? Number(actualCash) : expectedCash,
      expectedCash,
      status: 'CLOSED',
      closedAt: new Date(),
    });

    return shift;
  }

  // --- Deposits Methods ---
  async function createDeposit(payload, user) {
    const { patientId, amount, method, payerName, externalReference = null } = payload;
    const depositAmount = Number(amount);

    // AT-20: Prevent negative amounts
    if (isNaN(depositAmount) || depositAmount <= 0) {
      throw new ApiError(400, 'INVALID_AMOUNT', 'Số tiền cọc phải lớn hơn 0 (AT-20).');
    }

    let cashShiftId = null;
    if (method === 'CASH') {
      const activeShift = await getCurrentShift(user.userId);
      if (!activeShift) {
        throw new ApiError(400, 'CASH_SHIFT_REQUIRED', 'Thu tiền mặt bắt buộc thu ngân phải đang mở ca làm việc.');
      }
      cashShiftId = activeShift.cashShiftId;
    }

    return sequelize.transaction(async (t) => {
      await setSessionUser(sequelize, t, user.username);

      const deposit = await Deposit.create({
        patientId,
        payerName: payerName || 'Bệnh nhân',
        amount: depositAmount,
        balance: depositAmount,
        method,
        status: 'CONFIRMED',
        externalReference,
        confirmedAt: new Date(),
        createdBy: user.username,
      }, { transaction: t });

      await PaymentTransaction.create({
        depositId: deposit.depositId,
        cashShiftId,
        patientId,
        amount: depositAmount,
        method,
        status: 'CONFIRMED',
        externalReference,
        confirmedAt: new Date(),
        createdBy: user.username,
      }, { transaction: t });

      return deposit;
    });
  }

  async function getPatientDeposits(patientId) {
    return Deposit.findAll({
      where: { patientId },
      include: [
        { model: DepositApplication, as: 'applications' },
        { model: PaymentTransaction, as: 'transactions' },
      ],
      order: [['createdAt', 'DESC']],
    });
  }

  // AT-15: Apply Deposit (Cấn trừ cọc) with balance validation
  async function applyDeposit(invoiceId, depositId, amountToApply, user) {
    const applyAmount = Number(amountToApply);
    if (isNaN(applyAmount) || applyAmount <= 0) {
      throw new ApiError(400, 'INVALID_AMOUNT', 'Số tiền cấn trừ phải lớn hơn 0.');
    }

    return sequelize.transaction(async (t) => {
      await setSessionUser(sequelize, t, user.username);

      // Lock Deposit with UPDLOCK, HOLDLOCK for SQL Server (AT-15)
      const [lockedDeposits] = await sequelize.query(
        `SELECT DepositId, Balance, Status FROM [Deposits] WITH (UPDLOCK, HOLDLOCK) WHERE DepositId = :depositId`,
        {
          replacements: { depositId },
          transaction: t,
        }
      );

      const rawDeposit = lockedDeposits?.[0];
      if (!rawDeposit) {
        throw new ApiError(404, 'DEPOSIT_NOT_FOUND', 'Không tìm thấy khoản cọc.');
      }

      if (rawDeposit.Status !== 'CONFIRMED') {
        throw new ApiError(400, 'DEPOSIT_NOT_CONFIRMED', 'Khoản cọc chưa được xác nhận hoặc đã hoàn/hủy.');
      }

      // AT-15: Two cashiers concurrent deposit application prevention
      const currentBalance = Number(rawDeposit.Balance);
      if (currentBalance < applyAmount) {
        throw new ApiError(409, 'DEPOSIT_BALANCE_INSUFFICIENT', `Số dư tiền cọc hiện tại (${currentBalance.toLocaleString('vi-VN')} đ) không đủ để cấn trừ (${applyAmount.toLocaleString('vi-VN')} đ) (AT-15).`);
      }

      // Lock Invoice with UPDLOCK, HOLDLOCK
      const [lockedInvoices] = await sequelize.query(
        `SELECT InvoiceId, Gross, ApprovedDiscount, Tax, RoundingAdjustment, NetPayable, Status FROM [Invoices] WITH (UPDLOCK, HOLDLOCK) WHERE InvoiceId = :invoiceId`,
        {
          replacements: { invoiceId },
          transaction: t,
        }
      );

      const rawInvoice = lockedInvoices?.[0];
      if (!rawInvoice) {
        throw new ApiError(404, 'INVOICE_NOT_FOUND', 'Không tìm thấy hóa đơn.');
      }

      // Calculate invoice outstanding directly inside this locked transaction
      const [paidRows] = await sequelize.query(
        `SELECT ISNULL(SUM(Amount), 0) AS TotalPaid FROM [PaymentTransactions] WHERE InvoiceId = :invoiceId AND Status = 'CONFIRMED'`,
        { replacements: { invoiceId }, transaction: t }
      );
      const [appliedRows] = await sequelize.query(
        `SELECT ISNULL(SUM(Amount), 0) AS TotalApplied FROM [DepositApplications] WHERE InvoiceId = :invoiceId AND Status = 'CONFIRMED'`,
        { replacements: { invoiceId }, transaction: t }
      );

      const totalPaidTxns = Number(paidRows?.[0]?.TotalPaid || 0);
      const totalAppliedDeps = Number(appliedRows?.[0]?.TotalApplied || 0);

      const netPayable = Number(rawInvoice.NetPayable != null ? rawInvoice.NetPayable : rawInvoice.Gross);
      const outstanding = netPayable - totalPaidTxns - totalAppliedDeps;

      if (applyAmount > outstanding) {
        throw new ApiError(400, 'EXCEEDS_INVOICE_OUTSTANDING', `Số tiền cấn trừ vượt quá số dư còn phải trả của hóa đơn (${outstanding.toLocaleString('vi-VN')} đ).`);
      }

      // Deduct deposit balance
      const newDepositBalance = currentBalance - applyAmount;
      await Deposit.update({
        balance: newDepositBalance,
      }, {
        where: { depositId },
        transaction: t,
      });

      // Create DepositApplication record
      const appRecord = await DepositApplication.create({
        depositId,
        invoiceId,
        amount: applyAmount,
        status: 'CONFIRMED',
        appliedAt: new Date(),
        createdBy: user.username,
      }, { transaction: t });

      // Update Invoice status
      const newTotalPaid = totalPaidTxns + totalAppliedDeps + applyAmount;
      const newInvoiceStatus = newTotalPaid >= netPayable ? 'PAID' : 'PARTIALLY_PAID';

      await Invoice.update({
        status: newInvoiceStatus,
      }, {
        where: { invoiceId },
        transaction: t,
      });

      return {
        application: appRecord,
        remainingDepositBalance: newDepositBalance,
        invoiceStatus: newInvoiceStatus,
      };
    });
  }

  // --- Invoices & Lines (AT-01, AT-18, AT-20) ---
  async function createInvoiceFromCompletedServices(visitId, payload, user) {
    const { approvedDiscount = 0, tax = 0, roundingAdjustment = 0 } = payload;

    const discountNum = Number(approvedDiscount) || 0;
    const taxNum = Number(tax) || 0;
    const roundingNum = Number(roundingAdjustment) || 0;

    // AT-20: Reject negative amounts
    if (discountNum < 0 || taxNum < 0) {
      throw new ApiError(400, 'INVALID_AMOUNTS', 'Giảm giá và thuế không được là số âm (AT-20).');
    }

    const visit = await Visit.findByPk(visitId, {
      include: [{ model: Patient, as: 'patient' }],
    });
    if (!visit) {
      throw new ApiError(404, 'VISIT_NOT_FOUND', 'Không tìm thấy lượt khám.');
    }

    // Get all completed service lines of this visit
    const serviceLines = await ServiceLine.findAll({
      where: {
        visitId,
        status: 'COMPLETED',
      },
      include: [
        {
          model: ServiceCompletionEvent,
          as: 'completionEvents',
          where: { eventType: 'COMPLETION' },
        },
        { model: ServicePriceVersion, as: 'priceVersion' },
      ],
    });

    // Flatten all completion events
    const allCompletionEvents = [];
    for (const sl of serviceLines) {
      for (const ev of sl.completionEvents || []) {
        allCompletionEvents.push({
          event: ev,
          serviceLine: sl,
        });
      }
    }

    // Find already invoiced completion events
    const existingLines = await InvoiceLine.findAll({
      where: {
        serviceCompletionEventId: {
          [Op.in]: allCompletionEvents.map(x => x.event.serviceCompletionEventId),
        },
      },
    });
    const invoicedEventIds = new Set(existingLines.map(l => l.serviceCompletionEventId));

    // Filter unbilled completion events
    const unbilledItems = allCompletionEvents.filter(x => !invoicedEventIds.has(x.event.serviceCompletionEventId));

    if (unbilledItems.length === 0) {
      throw new ApiError(400, 'NO_COMPLETED_SERVICES_TO_INVOICE', 'Không có dịch vụ nào đã hoàn thành chưa xuất hóa đơn trong lượt khám này.');
    }

    // Calculate Gross
    let gross = 0;
    for (const item of unbilledItems) {
      const lineGross = Number(item.event.quantityCompleted) * Number(item.serviceLine.approvedUnitPrice);
      gross += lineGross;
    }

    // AT-20: Discount cannot exceed gross
    if (discountNum > gross) {
      throw new ApiError(400, 'DISCOUNT_EXCEEDS_GROSS', `Giảm giá (${discountNum}) không được vượt quá tổng tiền dịch vụ (${gross}) (AT-20).`);
    }

    const year = new Date().getFullYear().toString().slice(-2);
    const random = Math.floor(10000 + Math.random() * 90000);
    const invoiceNo = `HD${year}${random}`;

    return sequelize.transaction(async (t) => {
      await setSessionUser(sequelize, t, user.username);

      const invoice = await Invoice.create({
        invoiceNo,
        visitId,
        patientId: visit.patientId,
        gross,
        approvedDiscount: discountNum,
        tax: taxNum,
        roundingAdjustment: roundingNum,
        status: 'ISSUED',
        issuedAt: new Date(),
        createdBy: user.username,
      }, { transaction: t });

      // Create invoice lines for each completed event
      for (const item of unbilledItems) {
        const qty = Number(item.event.quantityCompleted);
        const unitPrice = Number(item.serviceLine.approvedUnitPrice);

        await InvoiceLine.create({
          invoiceId: invoice.invoiceId,
          serviceCompletionEventId: item.event.serviceCompletionEventId,
          description: `Thủ thuật răng ${item.serviceLine.toothCode || 'chung'}`,
          quantity: qty,
          unitPrice,
          priceVersionId: item.serviceLine.priceVersionId,
          createdBy: user.username,
        }, { transaction: t });
      }

      // Create initial PaymentAllocation
      const net = gross - discountNum + taxNum + roundingNum;
      await PaymentAllocation.create({
        invoiceId: invoice.invoiceId,
        allocationVersion: 1,
        patientAllocation: net,
        bhtmAllocation: 0,
        status: 'FINALIZED',
        finalizedAt: new Date(),
        createdBy: user.username,
      }, { transaction: t });

      // Create Receivable for tracking debt
      await Receivable.create({
        invoiceId: invoice.invoiceId,
        debtorType: 'PATIENT',
        allocationAmount: net,
        status: 'OPEN',
        ownerDepartment: 'THU_NGAN',
        createdBy: user.username,
      }, { transaction: t });

      return invoice;
    });
  }

  async function getInvoicesByVisit(visitId) {
    return Invoice.findAll({
      where: { visitId },
      include: [
        { model: InvoiceLine, as: 'lines' },
        { model: PaymentTransaction, as: 'transactions' },
        { model: DepositApplication, as: 'depositApplications' },
        { model: DiscountApproval, as: 'discountApprovals' },
        { model: Receivable, as: 'receivables' },
      ],
      order: [['createdAt', 'DESC']],
    });
  }

  async function getInvoiceById(invoiceId) {
    return Invoice.findByPk(invoiceId, {
      include: [
        { model: Patient, as: 'patient' },
        { model: Visit, as: 'visit' },
        { model: InvoiceLine, as: 'lines' },
        { model: PaymentTransaction, as: 'transactions' },
        { model: DepositApplication, as: 'depositApplications' },
        { model: DiscountApproval, as: 'discountApprovals' },
        { model: Receivable, as: 'receivables' },
      ],
    });
  }

  // --- Payment Transactions (AT-01, AT-02, AT-20) ---
  async function payInvoice(invoiceId, payload, user) {
    const { amount, method, externalReference = null } = payload;
    const payAmount = Number(amount);

    // AT-20: Validate non-negative
    if (isNaN(payAmount) || payAmount <= 0) {
      throw new ApiError(400, 'INVALID_AMOUNT', 'Số tiền thanh toán phải lớn hơn 0 (AT-20).');
    }

    let cashShiftId = null;
    if (method === 'CASH') {
      const activeShift = await getCurrentShift(user.userId);
      if (!activeShift) {
        throw new ApiError(400, 'CASH_SHIFT_REQUIRED', 'Thu tiền mặt bắt buộc thu ngân phải đang mở ca làm việc.');
      }
      cashShiftId = activeShift.cashShiftId;
    }

    return sequelize.transaction(async (t) => {
      await setSessionUser(sequelize, t, user.username);

      // Lock Invoice with UPDLOCK, HOLDLOCK for SQL Server (AT-02)
      const [lockedInvoices] = await sequelize.query(
        `SELECT InvoiceId, PatientId, Gross, ApprovedDiscount, Tax, RoundingAdjustment, NetPayable, Status FROM [Invoices] WITH (UPDLOCK, HOLDLOCK) WHERE InvoiceId = :invoiceId`,
        {
          replacements: { invoiceId },
          transaction: t,
        }
      );

      const rawInvoice = lockedInvoices?.[0];
      if (!rawInvoice) {
        throw new ApiError(404, 'INVOICE_NOT_FOUND', 'Không tìm thấy hóa đơn.');
      }

      if (['PAID', 'VOID'].includes(rawInvoice.Status)) {
        throw new ApiError(400, 'INVOICE_ALREADY_SETTLED', `Hóa đơn đã ở trạng thái ${rawInvoice.Status}, không thể thu thêm.`);
      }

      const [paidRows] = await sequelize.query(
        `SELECT ISNULL(SUM(Amount), 0) AS TotalPaid FROM [PaymentTransactions] WHERE InvoiceId = :invoiceId AND Status = 'CONFIRMED'`,
        { replacements: { invoiceId }, transaction: t }
      );
      const [appliedRows] = await sequelize.query(
        `SELECT ISNULL(SUM(Amount), 0) AS TotalApplied FROM [DepositApplications] WHERE InvoiceId = :invoiceId AND Status = 'CONFIRMED'`,
        { replacements: { invoiceId }, transaction: t }
      );

      const totalPaidTxns = Number(paidRows?.[0]?.TotalPaid || 0);
      const totalAppliedDeps = Number(appliedRows?.[0]?.TotalApplied || 0);

      const netPayable = Number(rawInvoice.NetPayable != null ? rawInvoice.NetPayable : rawInvoice.Gross);
      const outstanding = netPayable - totalPaidTxns - totalAppliedDeps;

      // AT-02: Prevent duplicate/over-collection by concurrent cashiers
      if (payAmount > outstanding) {
        throw new ApiError(409, 'PAYMENT_EXCEEDS_OUTSTANDING', `Số tiền thanh toán (${payAmount.toLocaleString('vi-VN')} đ) vượt quá số tiền còn nợ (${outstanding.toLocaleString('vi-VN')} đ). Giao dịch bị từ chối để tránh thu vượt (AT-02).`);
      }

      const txn = await PaymentTransaction.create({
        invoiceId,
        cashShiftId,
        patientId: rawInvoice.PatientId,
        amount: payAmount,
        method,
        status: 'CONFIRMED',
        externalReference,
        confirmedAt: new Date(),
        createdBy: user.username,
      }, { transaction: t });

      // Update Receivable
      const rec = await Receivable.findOne({
        where: { invoiceId, debtorType: 'PATIENT' },
        transaction: t,
      });
      if (rec) {
        const newPaid = Number(rec.confirmedPayment) + payAmount;
        await rec.update({
          confirmedPayment: newPaid,
          status: newPaid >= Number(rec.allocationAmount) ? 'PAID' : 'PARTIALLY_PAID',
        }, { transaction: t });
      }

      // Update Invoice status
      const newTotal = totalPaidTxns + totalAppliedDeps + payAmount;
      const newStatus = newTotal >= netPayable ? 'PAID' : 'PARTIALLY_PAID';

      await Invoice.update({
        status: newStatus,
      }, {
        where: { invoiceId },
        transaction: t,
      });

      return {
        transaction: txn,
        invoiceStatus: newStatus,
        totalPaid: newTotal,
        remainingOutstanding: netPayable - newTotal,
      };
    });
  }

  // --- Refunds (Maker-Checker, AT-20) ---
  async function requestRefund(paymentTransactionId, payload, user) {
    const { amount, reason } = payload;
    const refundAmount = Number(amount);

    if (isNaN(refundAmount) || refundAmount <= 0) {
      throw new ApiError(400, 'INVALID_AMOUNT', 'Số tiền hoàn phải lớn hơn 0.');
    }
    if (!reason) {
      throw new ApiError(400, 'REASON_REQUIRED', 'Lý do hoàn tiền là bắt buộc.');
    }

    const txn = await PaymentTransaction.findByPk(paymentTransactionId, {
      include: [{ model: Refund, as: 'refunds' }],
    });

    if (!txn) {
      throw new ApiError(404, 'TRANSACTION_NOT_FOUND', 'Không tìm thấy giao dịch thanh toán.');
    }

    if (txn.status !== 'CONFIRMED') {
      throw new ApiError(400, 'TRANSACTION_NOT_CONFIRMED', 'Chỉ có thể hoàn tiền cho giao dịch đã xác nhận.');
    }

    const alreadyRefunded = (txn.refunds || [])
      .filter(r => ['APPROVED', 'CONFIRMED', 'REQUESTED'].includes(r.status))
      .reduce((sum, r) => sum + Number(r.amount), 0);

    // AT-20: Refund cannot exceed collected amount
    if (refundAmount > (Number(txn.amount) - alreadyRefunded)) {
      throw new ApiError(400, 'REFUND_EXCEEDS_PAYMENT', `Số tiền hoàn (${refundAmount.toLocaleString('vi-VN')} đ) vượt quá số tiền thực thu còn lại (${(Number(txn.amount) - alreadyRefunded).toLocaleString('vi-VN')} đ) (AT-20).`);
    }

    return Refund.create({
      paymentTransactionId,
      amount: refundAmount,
      reason,
      status: 'REQUESTED',
      requestedBy: user.userId,
    });
  }

  async function approveRefund(refundId, user) {
    const refund = await Refund.findByPk(refundId);
    if (!refund) {
      throw new ApiError(404, 'REFUND_NOT_FOUND', 'Không tìm thấy yêu cầu hoàn tiền.');
    }

    if (refund.status !== 'REQUESTED') {
      throw new ApiError(400, 'REFUND_NOT_REQUESTED', 'Yêu cầu này đã được phê duyệt hoặc đã từ chối.');
    }

    // Maker-Checker: Cannot approve own refund request
    if (refund.requestedBy === user.userId) {
      throw new ApiError(403, 'MAKER_CANNOT_APPROVE', 'Người lập yêu cầu hoàn tiền không được tự phê duyệt (Maker-Checker).');
    }

    await refund.update({
      status: 'APPROVED',
      approvedBy: user.userId,
      confirmedAt: new Date(),
    });

    return refund;
  }

  // --- Discount Approvals (Maker-Checker, AT-18) ---
  async function requestDiscountApproval(invoiceId, payload, user) {
    const { amount, reason, discountPolicyId = null } = payload;
    const discountAmount = Number(amount);

    if (isNaN(discountAmount) || discountAmount <= 0) {
      throw new ApiError(400, 'INVALID_AMOUNT', 'Số tiền giảm giá phải lớn hơn 0.');
    }

    return DiscountApproval.create({
      invoiceId,
      discountPolicyId,
      amount: discountAmount,
      reason: reason || 'Giảm giá theo chính sách phòng khám',
      requestedBy: user.userId,
      status: 'REQUESTED',
    });
  }

  async function approveDiscount(discountApprovalId, user) {
    const approval = await DiscountApproval.findByPk(discountApprovalId, {
      include: [{ model: Invoice, as: 'invoice' }],
    });

    if (!approval) {
      throw new ApiError(404, 'APPROVAL_NOT_FOUND', 'Không tìm thấy yêu cầu phê duyệt giảm giá.');
    }

    if (approval.status !== 'REQUESTED') {
      throw new ApiError(400, 'NOT_REQUESTED', 'Yêu cầu giảm giá này đã được xử lý.');
    }

    // Maker-Checker rule
    if (approval.requestedBy === user.userId) {
      throw new ApiError(403, 'MAKER_CANNOT_APPROVE', 'Người đề xuất giảm giá không được tự phê duyệt (Maker-Checker).');
    }

    return sequelize.transaction(async (t) => {
      await setSessionUser(sequelize, t, user.username);

      await approval.update({
        status: 'APPROVED',
        approvedBy: user.userId,
      }, { transaction: t });

      // Apply discount to Invoice
      const invoice = approval.invoice;
      const newDiscount = Number(invoice.approvedDiscount) + Number(approval.amount);

      await invoice.update({
        approvedDiscount: newDiscount,
      }, { transaction: t });

      return approval;
    });
  }

  return {
    getCurrentShift,
    openShift,
    closeShift,
    createDeposit,
    getPatientDeposits,
    applyDeposit,
    createInvoiceFromCompletedServices,
    getInvoicesByVisit,
    getInvoiceById,
    payInvoice,
    requestRefund,
    approveRefund,
    requestDiscountApproval,
    approveDiscount,
  };
}
