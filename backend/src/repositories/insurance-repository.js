import crypto from 'crypto';
import Decimal from 'decimal.js';
import { Op } from 'sequelize';

export class InsuranceRepository {
  constructor(sequelize, models) {
    this.sequelize = sequelize;
    this.models = models;
  }

  get InsuranceContract() {
    return this.models.InsuranceContract;
  }

  get InsuranceClaim() {
    return this.models.InsuranceClaim;
  }

  get InsuranceClaimLine() {
    return this.models.InsuranceClaimLine;
  }

  get InsuranceClaimVersion() {
    return this.models.InsuranceClaimVersion;
  }

  get InsuranceClaimPayment() {
    return this.models.InsuranceClaimPayment;
  }

  get ClaimDispute() {
    return this.models.ClaimDispute;
  }

  get Receivable() {
    return this.models.Receivable;
  }

  get Invoice() {
    return this.models.Invoice;
  }

  get InvoiceLine() {
    return this.models.InvoiceLine;
  }

  // --- INSURANCE CONTRACTS ---
  async createContract({ contractNo, payerName, effectiveFrom, effectiveTo, coverageRulesJson, limitAmount, status = 'ACTIVE' }, user, options = {}) {
    let rulesString = typeof coverageRulesJson === 'object' ? JSON.stringify(coverageRulesJson) : coverageRulesJson;
    if (!rulesString) {
      rulesString = JSON.stringify({ allowPatientRecovery: false, coveragePercent: 80 });
    }

    return await this.InsuranceContract.create({
      contractNo,
      payerName,
      effectiveFrom,
      effectiveTo,
      coverageRulesJson: rulesString,
      limitAmount: limitAmount ? new Decimal(limitAmount).toFixed(2) : null,
      status,
      createdBy: user?.username || 'system',
    }, options);
  }

  async listContracts(query = {}, options = {}) {
    const where = {};
    if (query.status) {
      where.status = query.status;
    }
    if (query.payerName) {
      where.payerName = { [Op.like]: `%${query.payerName}%` };
    }
    return await this.InsuranceContract.findAll({
      where,
      order: [['CreatedAt', 'DESC']],
      ...options,
    });
  }

  async getContractById(insuranceContractId, options = {}) {
    return await this.InsuranceContract.findByPk(insuranceContractId, options);
  }

  // --- INSURANCE CLAIMS ---
  async createClaim({ visitId, patientId, insuranceContractId, lines = [] }, user, options = {}) {
    const runInTx = async (transaction) => {
      const txOpt = { transaction, ...options };

      // 1. Kiểm tra hợp đồng
      const contract = await this.InsuranceContract.findByPk(insuranceContractId, txOpt);
      if (!contract) {
        throw new Error('INSURANCE_CONTRACT_NOT_FOUND');
      }
      if (contract.status !== 'ACTIVE') {
        throw new Error('INSURANCE_CONTRACT_NOT_ACTIVE');
      }

      const today = new Date().toISOString().split('T')[0];
      if (today < contract.effectiveFrom || today > contract.effectiveTo) {
        throw new Error('INSURANCE_CONTRACT_EXPIRED_OR_NOT_EFFECTIVE');
      }

      if (!lines || lines.length === 0) {
        throw new Error('CLAIM_LINES_REQUIRED');
      }

      // 2. Tính tổng số tiền yêu cầu bồi thường (RequestedAmount)
      let totalRequested = new Decimal(0);
      for (const line of lines) {
        if (!line.invoiceLineId || line.requestedAmount === undefined) {
          throw new Error('INVALID_CLAIM_LINE_DATA');
        }
        const reqAmt = new Decimal(line.requestedAmount);
        if (reqAmt.lte(0)) {
          throw new Error('CLAIM_LINE_AMOUNT_MUST_BE_POSITIVE');
        }
        totalRequested = totalRequested.plus(reqAmt);
      }

      // Kiểm tra hạn mức hợp đồng nếu có
      if (contract.limitAmount) {
        const limit = new Decimal(contract.limitAmount);
        if (totalRequested.gt(limit)) {
          throw new Error('CLAIM_AMOUNT_EXCEEDS_CONTRACT_LIMIT');
        }
      }

      const claimNo = `CLM-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;

      // 3. Tạo InsuranceClaim (trạng thái VALIDATED khi đã pass điều kiện)
      const claim = await this.InsuranceClaim.create({
        claimNo,
        visitId,
        patientId,
        insuranceContractId,
        status: 'VALIDATED',
        requestedAmount: totalRequested.toFixed(2),
        approvedAmount: null,
        settledAmount: '0.00',
        createdBy: user?.username || 'system',
      }, txOpt);

      // 4. Tạo các InsuranceClaimLines
      for (const line of lines) {
        await this.InsuranceClaimLine.create({
          insuranceClaimId: claim.insuranceClaimId,
          invoiceLineId: line.invoiceLineId,
          requestedAmount: new Decimal(line.requestedAmount).toFixed(2),
          approvedAmount: null,
          createdBy: user?.username || 'system',
        }, txOpt);
      }

      return await this.getClaimById(claim.insuranceClaimId, txOpt);
    };

    if (options.transaction) {
      return await runInTx(options.transaction);
    }
    return await this.sequelize.transaction(runInTx);
  }

  async getClaimById(insuranceClaimId, options = {}) {
    return await this.InsuranceClaim.findByPk(insuranceClaimId, {
      include: [
        { model: this.InsuranceContract, as: 'contract' },
        { model: this.InsuranceClaimLine, as: 'lines' },
        { model: this.InsuranceClaimVersion, as: 'versions' },
        { model: this.InsuranceClaimPayment, as: 'payments' },
        { model: this.ClaimDispute, as: 'disputes' },
      ],
      ...options,
    });
  }

  async listClaims(query = {}, options = {}) {
    const where = {};
    if (query.status) {
      where.status = query.status;
    }
    if (query.visitId) {
      where.visitId = query.visitId;
    }
    if (query.patientId) {
      where.patientId = query.patientId;
    }
    if (query.insuranceContractId) {
      where.insuranceContractId = query.insuranceContractId;
    }

    return await this.InsuranceClaim.findAll({
      where,
      include: [
        { model: this.InsuranceContract, as: 'contract' },
        { model: this.InsuranceClaimLine, as: 'lines' },
        { model: this.ClaimDispute, as: 'disputes' },
      ],
      order: [['CreatedAt', 'DESC']],
      ...options,
    });
  }

  // --- SUBMISSION & CHỐNG GỬI TRÙNG (AT-14) ---
  async submitClaim(insuranceClaimId, { versionNo = 1, destination = 'MOCK_PAYER_GATEWAY', payload }, user, options = {}) {
    const runInTx = async (transaction) => {
      const txOpt = { transaction, ...options };

      const claim = await this.InsuranceClaim.findByPk(insuranceClaimId, txOpt);
      if (!claim) {
        throw new Error('CLAIM_NOT_FOUND');
      }
      if (!['DRAFT', 'VALIDATED', 'SUBMITTED', 'ACKNOWLEDGED'].includes(claim.status)) {
        throw new Error(`CANNOT_SUBMIT_CLAIM_IN_STATUS_${claim.status}`);
      }

      const payloadString = typeof payload === 'object' ? JSON.stringify(payload) : (payload || JSON.stringify({ claimId: claim.insuranceClaimId, claimNo: claim.claimNo, requestedAmount: claim.requestedAmount }));
      const payloadHash = crypto.createHash('sha256').update(payloadString).digest('hex');

      // Chống gửi trùng theo (hồ sơ + phiên bản + đích nhận) - AT-14
      const existingSubmission = await this.InsuranceClaimVersion.findOne({
        where: {
          insuranceClaimId,
          versionNo,
          destination,
        },
        ...txOpt,
      });

      if (existingSubmission) {
        const err = new Error('DUPLICATE_CLAIM_SUBMISSION');
        err.statusCode = 409;
        throw err;
      }

      // Ghi nhận bản ghi version gửi đi
      const versionRecord = await this.InsuranceClaimVersion.create({
        insuranceClaimId,
        versionNo,
        destination,
        payloadHash,
        payloadJson: payloadString,
        status: 'SUBMITTED',
        submittedAt: new Date(),
        createdBy: user?.username || 'system',
      }, txOpt);

      // Cập nhật trạng thái Claim sang SUBMITTED (hoặc ACKNOWLEDGED)
      await claim.update({ status: 'ACKNOWLEDGED' }, txOpt);

      return {
        claim,
        versionRecord,
      };
    };

    if (options.transaction) {
      return await runInTx(options.transaction);
    }
    return await this.sequelize.transaction(runInTx);
  }

  // --- XÉT DUYỆT BHTM (AT-03, AT-04, AT-14) ---
  async adjudicateClaim(insuranceClaimId, { approvedAmount, invoiceId, lineApprovals = [] }, user, options = {}) {
    const runInTx = async (transaction) => {
      const txOpt = { transaction, ...options };

      const claim = await this.InsuranceClaim.findByPk(insuranceClaimId, {
        include: [
          { model: this.InsuranceContract, as: 'contract' },
          { model: this.InsuranceClaimLine, as: 'lines' },
        ],
        ...txOpt,
      });

      if (!claim) {
        throw new Error('CLAIM_NOT_FOUND');
      }
      if (!['SUBMITTED', 'ACKNOWLEDGED', 'VALIDATED'].includes(claim.status)) {
        throw new Error(`CANNOT_ADJUDICATE_CLAIM_IN_STATUS_${claim.status}`);
      }

      const requestedAmt = new Decimal(claim.requestedAmount);
      const approvedAmt = new Decimal(approvedAmount);

      if (approvedAmt.lt(0) || approvedAmt.gt(requestedAmt)) {
        throw new Error('INVALID_APPROVED_AMOUNT_MUST_BE_BETWEEN_ZERO_AND_REQUESTED');
      }

      // Cập nhật duyệt cho từng line nếu có
      if (lineApprovals && lineApprovals.length > 0) {
        for (const la of lineApprovals) {
          const l = claim.lines.find(x => x.insuranceClaimLineId === la.insuranceClaimLineId);
          if (l) {
            await l.update({ approvedAmount: new Decimal(la.approvedAmount).toFixed(2) }, txOpt);
          }
        }
      }

      let newStatus = 'APPROVED';
      let disputeCreated = null;

      if (approvedAmt.equals(0)) {
        newStatus = 'REJECTED';
      } else if (approvedAmt.lt(requestedAmt)) {
        newStatus = 'PARTIALLY_APPROVED';
      }

      // Cập nhật claim
      await claim.update({
        approvedAmount: approvedAmt.toFixed(2),
        status: newStatus,
      }, txOpt);

      // AT-03: BHTM duyệt nhưng CHƯA chuyển tiền:
      // Phải thu BHTM ghi nhận approvedAmount, tiền ngân hàng CHƯA tăng, claim CHƯA SETTLED
      if (approvedAmt.gt(0)) {
        const targetInvoiceId = invoiceId || (claim.lines?.[0]?.invoiceLineId ? (await this.InvoiceLine?.findByPk(claim.lines[0].invoiceLineId, txOpt))?.invoiceId : null);

        if (targetInvoiceId && this.Receivable) {
          // Kiểm tra xem đã có receivable BHTM cho invoice này chưa
          const existingReceivable = await this.Receivable.findOne({
            where: {
              invoiceId: targetInvoiceId,
              debtorType: 'BHTM',
            },
            ...txOpt,
          });

          if (existingReceivable) {
            await existingReceivable.update({
              allocationAmount: approvedAmt.toFixed(2),
            }, txOpt);
          } else {
            await this.Receivable.create({
              invoiceId: targetInvoiceId,
              debtorType: 'BHTM',
              debtorReferenceId: claim.insuranceContractId,
              allocationAmount: approvedAmt.toFixed(2),
              confirmedPayment: '0.00',
              appliedAdvance: '0.00',
              postedCredit: '0.00',
              refundedAmount: '0.00',
              status: 'OPEN',
              ownerDepartment: 'INSURANCE_CLAIM',
              createdBy: user?.username || 'system',
            }, txOpt);
          }
        }
      }

      // AT-04: BHTM duyệt thiếu, hợp đồng không cho thu lại bệnh nhân
      // -> KHÔNG tự chuyển nợ sang bệnh nhân; tạo quyết định/tranh chấp xử lý phần thiếu
      if (approvedAmt.lt(requestedAmt)) {
        const shortfall = requestedAmt.minus(approvedAmt);
        const rules = JSON.parse(claim.contract?.coverageRulesJson || '{}');

        // Bất kể allowPatientRecovery là false hay không quy định cho thu, hệ thống không tự ý tăng công nợ bệnh nhân
        // mà tạo ClaimDispute để chờ phê duyệt xử lý
        const reason = rules.allowPatientRecovery === false
          ? `BHTM duyệt thiếu ${shortfall.toFixed(2)} VND; Hợp đồng không cho phép thu lại bệnh nhân; Chờ BGĐ/Kế toán trưởng duyệt xử lý chi phí cơ sở chịu.`
          : `BHTM duyệt thiếu ${shortfall.toFixed(2)} VND; Chờ phê duyệt phương án xử lý công nợ.`;

        disputeCreated = await this.ClaimDispute.create({
          insuranceClaimId: claim.insuranceClaimId,
          disputedAmount: shortfall.toFixed(2),
          reason,
          status: 'OPEN',
          createdBy: user?.username || 'system',
        }, txOpt);
      }

      return {
        claim: await this.getClaimById(claim.insuranceClaimId, txOpt),
        disputeCreated,
      };
    };

    if (options.transaction) {
      return await runInTx(options.transaction);
    }
    return await this.sequelize.transaction(runInTx);
  }

  // --- NHẬN TIỀN THANH TOÁN TỪ BHTM & ĐỐI SOÁT (AT-03, AT-14) ---
  async recordPayment({ insuranceClaimId, externalReference, amount, receivedAt = new Date(), invoiceId }, user, options = {}) {
    const runInTx = async (transaction) => {
      const txOpt = { transaction, ...options };

      // 1. Kiểm tra chống trùng mã giao dịch externalReference
      const existingPayment = await this.InsuranceClaimPayment.findOne({
        where: { externalReference },
        ...txOpt,
      });

      if (existingPayment) {
        const err = new Error('DUPLICATE_PAYMENT_REFERENCE');
        err.statusCode = 409;
        throw err;
      }

      const claim = await this.InsuranceClaim.findByPk(insuranceClaimId, txOpt);
      if (!claim) {
        throw new Error('CLAIM_NOT_FOUND');
      }

      if (!['APPROVED', 'PARTIALLY_APPROVED'].includes(claim.status)) {
        throw new Error(`CANNOT_RECORD_PAYMENT_FOR_CLAIM_IN_STATUS_${claim.status}`);
      }

      const paymentAmt = new Decimal(amount);
      if (paymentAmt.lte(0)) {
        throw new Error('PAYMENT_AMOUNT_MUST_BE_POSITIVE');
      }

      const approvedAmt = new Decimal(claim.approvedAmount || 0);
      const currentSettled = new Decimal(claim.settledAmount || 0);
      const remainingToSettle = approvedAmt.minus(currentSettled);

      let paymentStatus = 'CONFIRMED';
      let disputeCreated = null;

      // AT-14: BHTM nhận tiền thiếu
      if (paymentAmt.lt(remainingToSettle)) {
        paymentStatus = 'MISMATCH';
        const shortage = remainingToSettle.minus(paymentAmt);

        // Tạo ClaimDispute ghi nhận thiếu tiền thanh toán
        disputeCreated = await this.ClaimDispute.create({
          insuranceClaimId: claim.insuranceClaimId,
          disputedAmount: shortage.toFixed(2),
          reason: `BHTM chuyển tiền thiếu so với số duyệt (Thực nhận: ${paymentAmt.toFixed(2)}, Còn thiếu: ${shortage.toFixed(2)} VND). Mã GD: ${externalReference}`,
          status: 'OPEN',
          createdBy: user?.username || 'system',
        }, txOpt);
      }

      // 2. Tạo bản ghi thanh toán InsuranceClaimPayments
      const paymentRecord = await this.InsuranceClaimPayment.create({
        insuranceClaimId,
        externalReference,
        amount: paymentAmt.toFixed(2),
        receivedAt,
        status: paymentStatus,
        createdBy: user?.username || 'system',
      }, txOpt);

      // 3. Cập nhật settledAmount trên claim
      const newSettled = currentSettled.plus(paymentAmt);
      if (newSettled.gt(approvedAmt)) {
        throw new Error('TOTAL_SETTLED_CANNOT_EXCEED_APPROVED_AMOUNT');
      }

      const claimUpdateData = {
        settledAmount: newSettled.toFixed(2),
      };

      // Chỉ chuyển sang SETTLED khi tiền thực nhận đã đủ bằng ApprovedAmount VÀ không có chênh lệch chưa khớp
      if (newSettled.equals(approvedAmt) && paymentStatus === 'CONFIRMED') {
        claimUpdateData.status = 'SETTLED';
      }

      await claim.update(claimUpdateData, txOpt);

      // 4. Cập nhật Receivables (DebtorType='BHTM')
      const targetInvoiceId = invoiceId || (claim.lines?.[0]?.invoiceLineId ? (await this.InvoiceLine?.findByPk(claim.lines[0].invoiceLineId, txOpt))?.invoiceId : null);
      if (targetInvoiceId && this.Receivable) {
        const receivable = await this.Receivable.findOne({
          where: {
            invoiceId: targetInvoiceId,
            debtorType: 'BHTM',
          },
          ...txOpt,
        });

        if (receivable) {
          const newConfirmedPayment = new Decimal(receivable.confirmedPayment || 0).plus(paymentAmt);
          const recUpdate = {
            confirmedPayment: newConfirmedPayment.toFixed(2),
          };
          if (newConfirmedPayment.gte(new Decimal(receivable.allocationAmount))) {
            recUpdate.status = 'PAID';
          } else {
            recUpdate.status = 'PARTIALLY_PAID';
          }
          await receivable.update(recUpdate, txOpt);
        }
      }

      return {
        paymentRecord,
        claim: await this.getClaimById(claim.insuranceClaimId, txOpt),
        disputeCreated,
      };
    };

    if (options.transaction) {
      return await runInTx(options.transaction);
    }
    return await this.sequelize.transaction(runInTx);
  }

  // --- GIẢI QUYẾT TRANH CHẤP & ĐÓNG HỒ SƠ (AT-04, AT-14) ---
  async resolveDispute(claimDisputeId, { resolution, status = 'RESOLVED' }, user, options = {}) {
    const runInTx = async (transaction) => {
      const txOpt = { transaction, ...options };

      const dispute = await this.ClaimDispute.findByPk(claimDisputeId, txOpt);
      if (!dispute) {
        throw new Error('DISPUTE_NOT_FOUND');
      }

      await dispute.update({
        resolution,
        status,
      }, txOpt);

      // Kiểm tra nếu tất cả dispute của claim đã RESOLVED/CLOSED và settledAmount = approvedAmount
      const claim = await this.InsuranceClaim.findByPk(dispute.insuranceClaimId, {
        include: [{ model: this.ClaimDispute, as: 'disputes' }],
        ...txOpt,
      });

      const allDisputesClosed = claim.disputes.every(d => ['RESOLVED', 'CLOSED'].includes(d.status));
      const settledAmt = new Decimal(claim.settledAmount || 0);
      const approvedAmt = new Decimal(claim.approvedAmount || 0);

      // Khi mọi phần đã có kết cục (tiền thực nhận đã khớp hoặc dispute đã duyệt xử lý), đóng Claim -> CLOSED
      if (allDisputesClosed && (settledAmt.equals(approvedAmt) || ['REJECTED', 'PARTIALLY_APPROVED'].includes(claim.status))) {
        await claim.update({ status: 'CLOSED' }, txOpt);
      }

      return {
        dispute,
        claim: await this.getClaimById(claim.insuranceClaimId, txOpt),
      };
    };

    if (options.transaction) {
      return await runInTx(options.transaction);
    }
    return await this.sequelize.transaction(runInTx);
  }
}
