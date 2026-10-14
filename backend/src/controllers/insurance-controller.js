export function createInsuranceController({ insuranceService }) {
  // CONTRACTS
  async function createContract(req, res, next) {
    try {
      const data = await insuranceService.createContract(req.body, req.user);
      res.status(201).json({
        success: true,
        message: 'Tạo hợp đồng bảo lãnh BHTM thành công.',
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  async function listContracts(req, res, next) {
    try {
      const data = await insuranceService.listContracts(req.query, req.user);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async function getContractById(req, res, next) {
    try {
      const data = await insuranceService.getContractById(req.params.id, req.user);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  // CLAIMS
  async function createClaim(req, res, next) {
    try {
      const data = await insuranceService.createClaim(req.body, req.user);
      res.status(201).json({
        success: true,
        message: 'Lập hồ sơ yêu cầu bồi thường BHTM thành công.',
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  async function listClaims(req, res, next) {
    try {
      const data = await insuranceService.listClaims(req.query, req.user);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async function getClaimById(req, res, next) {
    try {
      const data = await insuranceService.getClaimById(req.params.id, req.user);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  // SUBMIT (AT-14)
  async function submitClaim(req, res, next) {
    try {
      const data = await insuranceService.submitClaim(req.params.id, req.body, req.user);
      res.json({
        success: true,
        message: 'Đã gửi hồ sơ bảo lãnh BHTM tới đối tác thành công (AT-14 chống trùng).',
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  // ADJUDICATE (AT-03, AT-04, AT-14)
  async function adjudicateClaim(req, res, next) {
    try {
      const data = await insuranceService.adjudicateClaim(req.params.id, req.body, req.user);
      res.json({
        success: true,
        message: data.disputeCreated
          ? 'BHTM duyệt một phần/từ chối; Đã tự động tạo quyết định xử lý phần thiếu theo hợp đồng (AT-04, AT-14).'
          : 'Ghi nhận phê duyệt BHTM thành công; Đã ghi nhận công nợ phải thu BHTM (AT-03).',
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  // RECORD PAYMENT (AT-03, AT-14)
  async function recordPayment(req, res, next) {
    try {
      const data = await insuranceService.recordPayment(req.body, req.user);
      res.json({
        success: true,
        message: data.disputeCreated
          ? 'BHTM chuyển tiền thiếu so với số duyệt; Đã ghi nhận chênh lệch chờ xử lý và giữ hồ sơ chưa SETTLED (AT-14).'
          : 'Đối soát tiền thực nhận BHTM thành công; Hồ sơ đã tất toán SETTLED (AT-03).',
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  // RESOLVE DISPUTE (AT-04, AT-14)
  async function resolveDispute(req, res, next) {
    try {
      const data = await insuranceService.resolveDispute(req.params.id, req.body, req.user);
      res.json({
        success: true,
        message: 'Đã phê duyệt phương án giải quyết tranh chấp/thiếu hụt BHTM thành công.',
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  return {
    createContract,
    listContracts,
    getContractById,
    createClaim,
    listClaims,
    getClaimById,
    submitClaim,
    adjudicateClaim,
    recordPayment,
    resolveDispute,
  };
}
