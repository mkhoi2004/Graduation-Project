export function createBillingController({ billingService }) {
  // Cash Shifts
  async function getCurrentShift(req, res, next) {
    try {
      const data = await billingService.getCurrentShift(req.user);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async function openShift(req, res, next) {
    try {
      const data = await billingService.openShift(req.body, req.user);
      res.status(201).json({ success: true, message: 'Mở ca thu ngân thành công.', data });
    } catch (err) {
      next(err);
    }
  }

  async function closeShift(req, res, next) {
    try {
      const { cashShiftId } = req.params;
      const data = await billingService.closeShift(cashShiftId, req.body, req.user);
      res.json({ success: true, message: 'Đóng ca thu ngân thành công.', data });
    } catch (err) {
      next(err);
    }
  }

  // Deposits (AT-15, AT-20)
  async function createDeposit(req, res, next) {
    try {
      const data = await billingService.createDeposit(req.body, req.user);
      res.status(201).json({ success: true, message: 'Thu tiền tạm ứng / đặt cọc thành công.', data });
    } catch (err) {
      next(err);
    }
  }

  async function getPatientDeposits(req, res, next) {
    try {
      const { patientId } = req.params;
      const data = await billingService.getPatientDeposits(patientId, req.user);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async function applyDeposit(req, res, next) {
    try {
      const { invoiceId } = req.params;
      const { depositId, amount } = req.body;
      const data = await billingService.applyDeposit(invoiceId, depositId, amount, req.user);
      res.json({ success: true, message: 'Cấn trừ tiền cọc vào hóa đơn thành công (AT-15).', data });
    } catch (err) {
      next(err);
    }
  }

  // Invoices (AT-01, AT-18, AT-20)
  async function createInvoice(req, res, next) {
    try {
      const { visitId } = req.params;
      const data = await billingService.createInvoice(visitId, req.body, req.user);
      res.status(201).json({ success: true, message: 'Xuất hóa đơn thành công (AT-01).', data });
    } catch (err) {
      next(err);
    }
  }

  async function getInvoicesByVisit(req, res, next) {
    try {
      const { visitId } = req.params;
      const data = await billingService.getInvoicesByVisit(visitId, req.user);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async function getInvoiceById(req, res, next) {
    try {
      const { invoiceId } = req.params;
      const data = await billingService.getInvoiceById(invoiceId, req.user);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  // Payments (AT-01, AT-02, AT-20)
  async function payInvoice(req, res, next) {
    try {
      const { invoiceId } = req.params;
      const data = await billingService.payInvoice(invoiceId, req.body, req.user);
      res.json({ success: true, message: 'Thu tiền hóa đơn thành công.', data });
    } catch (err) {
      next(err);
    }
  }

  // Refunds (Maker-Checker, AT-20)
  async function requestRefund(req, res, next) {
    try {
      const { paymentTransactionId } = req.params;
      const data = await billingService.requestRefund(paymentTransactionId, req.body, req.user);
      res.status(201).json({ success: true, message: 'Lập phiếu đề xuất hoàn tiền thành công.', data });
    } catch (err) {
      next(err);
    }
  }

  async function approveRefund(req, res, next) {
    try {
      const { refundId } = req.params;
      const data = await billingService.approveRefund(refundId, req.user);
      res.json({ success: true, message: 'Phê duyệt hoàn tiền thành công (Maker-Checker).', data });
    } catch (err) {
      next(err);
    }
  }

  // Discounts (Maker-Checker, AT-18)
  async function requestDiscountApproval(req, res, next) {
    try {
      const { invoiceId } = req.params;
      const data = await billingService.requestDiscountApproval(invoiceId, req.body, req.user);
      res.status(201).json({ success: true, message: 'Lập phiếu đề xuất giảm giá thành công.', data });
    } catch (err) {
      next(err);
    }
  }

  async function approveDiscount(req, res, next) {
    try {
      const { discountApprovalId } = req.params;
      const data = await billingService.approveDiscount(discountApprovalId, req.user);
      res.json({ success: true, message: 'Phê duyệt giảm giá thành công (Maker-Checker).', data });
    } catch (err) {
      next(err);
    }
  }

  return {
    getCurrentShift,
    openShift,
    closeShift,
    createDeposit,
    getPatientDeposits,
    applyDeposit,
    createInvoice,
    getInvoicesByVisit,
    getInvoiceById,
    payInvoice,
    requestRefund,
    approveRefund,
    requestDiscountApproval,
    approveDiscount,
  };
}
