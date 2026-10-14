import crypto from 'node:crypto';
import { Op } from 'sequelize';
import { ApiError } from '../utils/api-error.js';
import { setSessionUser } from '../utils/session-context.js';

export function createClinicalRepository({ sequelize, models, userModels, catalogModels, patientVisitModels }) {
  const {
    ConsentTemplate,
    EmrRecord,
    EmrVersion,
    Diagnosis,
    ToothChart,
    TreatmentPlan,
    Prescription,
    ClinicalOrder,
    Consent,
    EmrAddendum,
    ServiceLine,
    ServiceCompletionEvent,
    SignQueue,
  } = models;

  const { User } = userModels;
  const { Service, ServicePriceVersion } = catalogModels;
  const { Visit, Patient } = patientVisitModels;

  // --- Seed default consent templates if empty ---
  async function seedDefaultConsentTemplatesIfEmpty(actorUsername = 'system') {
    const count = await ConsentTemplate.count();
    if (count > 0) return;

    const templates = [
      {
        code: 'CONSENT-SURGERY-EXTRACTION',
        versionNo: 1,
        title: 'Giấy cam kết phẫu thuật nhổ răng khôn / tiểu phẫu miệng',
        content: 'Tôi đã được bác sĩ giải thích rõ ràng về tình trạng bệnh lý, phương pháp phẫu thuật nhổ răng, các nguy cơ có thể xảy ra (chảy máu, sưng đau, tê bì môi má tạm thời...) và đồng ý thực hiện.',
        status: 'APPROVED',
        effectiveFrom: new Date('2024-01-01'),
        createdBy: actorUsername,
      },
      {
        code: 'CONSENT-ENDO-TREATMENT',
        versionNo: 1,
        title: 'Giấy cam kết điều trị nội nha (chữa tủy răng)',
        content: 'Tôi đồng ý thực hiện điều trị tủy răng và hiểu rõ quá trình điều trị có thể cần từ 1-3 lần hẹn, sau khi điều trị tủy cần bọc răng sứ để bảo vệ thân răng không bị vỡ nứt.',
        status: 'APPROVED',
        effectiveFrom: new Date('2024-01-01'),
        createdBy: actorUsername,
      },
      {
        code: 'CONSENT-IMPLANT-PLACEMENT',
        versionNo: 1,
        title: 'Giấy cam kết cấy ghép Implant nha khoa',
        content: 'Tôi đồng ý thực hiện cấy ghép trụ Implant nha khoa và được tư vấn đầy đủ về quy trình cấy ghép, thời gian tích hợp xương và chăm sóc vệ sinh sau phẫu thuật.',
        status: 'APPROVED',
        effectiveFrom: new Date('2024-01-01'),
        createdBy: actorUsername,
      },
    ];

    for (const t of templates) {
      await ConsentTemplate.create(t);
    }
  }

  // --- EMR Methods ---
  async function getEmrByVisitId(visitId) {
    return EmrRecord.findOne({
      where: { visitId },
      include: [
        {
          model: User,
          as: 'doctor',
          attributes: ['userId', 'username', 'displayName'],
        },
        {
          model: EmrVersion,
          as: 'versions',
          include: [
            {
              model: User,
              as: 'author',
              attributes: ['userId', 'username', 'displayName'],
            },
            {
              model: Diagnosis,
              as: 'diagnoses',
            },
            {
              model: ToothChart,
              as: 'toothChart',
            },
            {
              model: EmrAddendum,
              as: 'addenda',
              include: [
                {
                  model: User,
                  as: 'author',
                  attributes: ['userId', 'username', 'displayName'],
                },
              ],
            },
          ],
        },
      ],
      order: [
        [{ model: EmrVersion, as: 'versions' }, 'versionNo', 'DESC'],
      ],
    });
  }

  async function getOrCreateDraftEmr(visitId, user) {
    let emrRecord = await getEmrByVisitId(visitId);
    if (emrRecord) {
      return emrRecord;
    }

    const visit = await Visit.findByPk(visitId, {
      include: [{ model: Patient, as: 'patient' }],
    });
    if (!visit) {
      throw new ApiError(404, 'VISIT_NOT_FOUND', 'Không tìm thấy lượt khám.');
    }

    const doctorId = visit.doctorId || user.userId;

    await sequelize.transaction(async (t) => {
      await setSessionUser(sequelize, t, user.username);

      const newRecord = await EmrRecord.create({
        visitId,
        patientId: visit.patientId,
        doctorId,
        status: 'DRAFT',
        currentVersionNo: 1,
        createdBy: user.username,
      }, { transaction: t });

      const initialContent = JSON.stringify({
        chiefComplaint: '',
        medicalHistory: '',
        dentalHistory: '',
        clinicalExamination: '',
        diagnosisSummary: '',
        treatmentPlanSummary: '',
        notes: '',
      });

      await EmrVersion.create({
        emrRecordId: newRecord.emrRecordId,
        versionNo: 1,
        clinicalContentJson: initialContent,
        authoredBy: user.userId,
        status: 'DRAFT',
      }, { transaction: t });
    });

    return getEmrByVisitId(visitId);
  }

  async function updateDraftEmr(visitId, emrVersionId, payload, user) {
    const { clinicalContent, diagnoses = [], toothChart = [] } = payload;

    const version = await EmrVersion.findByPk(emrVersionId, {
      include: [{ model: EmrRecord, as: 'emrRecord' }],
    });

    if (!version) {
      throw new ApiError(404, 'EMR_VERSION_NOT_FOUND', 'Không tìm thấy phiên bản EMR.');
    }

    // AT-23: Immutable once signed
    if (version.status !== 'DRAFT' || version.emrRecord.status === 'SIGNED') {
      throw new ApiError(400, 'EMR_VERSION_LOCKED_CANNOT_UPDATE', 'EMR đã ký là bất biến, không thể sửa đổi trực tiếp. Hãy sử dụng phụ lục đính chính (Addenda).');
    }

    await sequelize.transaction(async (t) => {
      await setSessionUser(sequelize, t, user.username);

      const contentJson = typeof clinicalContent === 'string'
        ? clinicalContent
        : JSON.stringify(clinicalContent || {});

      await version.update({
        clinicalContentJson: contentJson,
        authoredBy: user.userId,
      }, { transaction: t });

      // Replace Diagnoses for this version
      await Diagnosis.destroy({
        where: { emrVersionId },
        transaction: t,
      });

      if (Array.isArray(diagnoses) && diagnoses.length > 0) {
        for (const d of diagnoses) {
          await Diagnosis.create({
            emrVersionId,
            code: d.code || null,
            description: d.description || '',
            isPrimary: Boolean(d.isPrimary),
            createdBy: user.username,
          }, { transaction: t });
        }
      }

      // Replace ToothChart findings for this version
      await ToothChart.destroy({
        where: { emrVersionId },
        transaction: t,
      });

      if (Array.isArray(toothChart) && toothChart.length > 0) {
        for (const tc of toothChart) {
          await ToothChart.create({
            emrVersionId,
            toothCode: String(tc.toothCode),
            surfaceCode: tc.surfaceCode || null,
            findingCode: tc.findingCode || 'GENERAL',
            note: tc.note || null,
            createdBy: user.username,
          }, { transaction: t });
        }
      }
    });

    return getEmrByVisitId(visitId);
  }

  async function signEmr(visitId, emrVersionId, user, options = {}) {
    const { simulateNetworkLoss = false } = options;

    const version = await EmrVersion.findByPk(emrVersionId, {
      include: [{ model: EmrRecord, as: 'emrRecord' }],
    });

    if (!version) {
      throw new ApiError(404, 'EMR_VERSION_NOT_FOUND', 'Không tìm thấy phiên bản EMR.');
    }

    if (version.status === 'SIGNED') {
      throw new ApiError(409, 'EMR_ALREADY_SIGNED', 'Bản ghi EMR này đã được ký trước đó.');
    }

    // AT-13: Handle network loss during signing
    if (simulateNetworkLoss) {
      await SignQueue.create({
        emrRecordId: version.emrRecordId,
        requestedBy: user.userId,
        dueAt: new Date(Date.now() + 24 * 3600 * 1000), // 24 hours
        status: 'PENDING',
        failureReason: 'Mất kết nối mạng trong quá trình trao đổi chữ ký điện tử. Lưu bản nháp vào hàng đợi ký để xử lý bù.',
      });

      throw new ApiError(503, 'NETWORK_DISCONNECTED_QUEUED_FOR_SIGN', 'Mất kết nối mạng khi ký số EMR. Yêu cầu ký đã được ghi nhận vào hàng đợi ký (SignQueue) để xử lý ký bù.');
    }

    await sequelize.transaction(async (t) => {
      await setSessionUser(sequelize, t, user.username);

      const signTime = new Date();
      const payloadToHash = JSON.stringify({
        emrRecordId: version.emrRecordId,
        emrVersionId: version.emrVersionId,
        content: version.clinicalContentJson,
        authorId: version.authoredBy,
        signerId: user.userId,
        signedAt: signTime.toISOString(),
      });

      const signatureHash = crypto.createHash('sha256').update(payloadToHash).digest('hex');

      await version.update({
        status: 'SIGNED',
        signedAt: signTime,
        signatureHash,
      }, { transaction: t });

      await version.emrRecord.update({
        status: 'SIGNED',
        signedAt: signTime,
      }, { transaction: t });

      // Update visit clinical status if in progress
      await Visit.update({
        status: 'CLINICAL_COMPLETED',
      }, {
        where: {
          visitId,
          status: 'IN_PROGRESS',
        },
        transaction: t,
      });

      // Clear any pending sign queue for this EMR
      await SignQueue.update({
        status: 'SIGNED',
      }, {
        where: {
          emrRecordId: version.emrRecordId,
          status: 'PENDING',
        },
        transaction: t,
      });
    });

    return getEmrByVisitId(visitId);
  }

  // AT-23: Addenda for signed EMR
  async function createEmrAddendum(emrVersionId, payload, user) {
    const { content, reason } = payload;
    if (!content || !reason) {
      throw new ApiError(400, 'CONTENT_AND_REASON_REQUIRED', 'Nội dung và lý do đính chính là bắt buộc.');
    }

    const version = await EmrVersion.findByPk(emrVersionId);
    if (!version) {
      throw new ApiError(404, 'EMR_VERSION_NOT_FOUND', 'Không tìm thấy phiên bản EMR.');
    }

    if (version.status !== 'SIGNED') {
      throw new ApiError(400, 'EMR_NOT_SIGNED_YET', 'Chỉ có thể lập phụ lục đính chính cho EMR đã ký.');
    }

    return sequelize.transaction(async (t) => {
      await setSessionUser(sequelize, t, user.username);

      const addendum = await EmrAddendum.create({
        emrVersionId,
        content,
        reason,
        authoredBy: user.userId,
        signedAt: new Date(),
      }, { transaction: t });

      return addendum;
    });
  }

  // --- Treatment Plan Methods ---
  async function getTreatmentPlans(visitId) {
    return TreatmentPlan.findAll({
      where: { visitId },
      include: [
        {
          model: User,
          as: 'doctor',
          attributes: ['userId', 'username', 'displayName'],
        },
        {
          model: ServiceLine,
          as: 'serviceLines',
          include: [
            { model: Service, as: 'service', attributes: ['serviceId', 'code', 'name'] },
            { model: ServicePriceVersion, as: 'priceVersion' },
          ],
        },
      ],
      order: [['phaseNo', 'ASC']],
    });
  }

  async function createTreatmentPlan(visitId, payload, user) {
    const visit = await Visit.findByPk(visitId);
    if (!visit) {
      throw new ApiError(404, 'VISIT_NOT_FOUND', 'Không tìm thấy lượt khám.');
    }

    const { phaseNo = 1, planJson, status = 'DRAFT' } = payload;
    const planContent = typeof planJson === 'string' ? planJson : JSON.stringify(planJson || {});

    return TreatmentPlan.create({
      visitId,
      patientId: visit.patientId,
      doctorId: visit.doctorId || user.userId,
      phaseNo,
      status,
      planJson: planContent,
      createdBy: user.username,
    });
  }

  async function updateTreatmentPlanStatus(treatmentPlanId, status, user) {
    const plan = await TreatmentPlan.findByPk(treatmentPlanId);
    if (!plan) {
      throw new ApiError(404, 'PLAN_NOT_FOUND', 'Không tìm thấy kế hoạch điều trị.');
    }

    const updates = { status };
    if (status === 'ACCEPTED') {
      updates.acceptedAt = new Date();
    }

    await plan.update(updates);
    return plan;
  }

  // --- Consent & ConsentTemplate Methods ---
  async function getConsentTemplates() {
    await seedDefaultConsentTemplatesIfEmpty();
    return ConsentTemplate.findAll({
      order: [['code', 'ASC'], ['versionNo', 'DESC']],
    });
  }

  async function createConsentTemplate(payload, user) {
    const { code, versionNo = 1, title, content, effectiveFrom = new Date(), serviceId = null } = payload;
    return ConsentTemplate.create({
      code,
      versionNo,
      title,
      content,
      effectiveFrom,
      serviceId,
      status: 'APPROVED',
      approvedBy: user.userId,
      createdBy: user.username,
    });
  }

  async function getConsents(visitId) {
    return Consent.findAll({
      where: { visitId },
      include: [
        { model: ConsentTemplate, as: 'template' },
        { model: Patient, as: 'patient', attributes: ['patientId', 'fullName', 'patientCode'] },
      ],
      order: [['createdAt', 'DESC']],
    });
  }

  async function createConsent(visitId, payload, user) {
    const visit = await Visit.findByPk(visitId);
    if (!visit) {
      throw new ApiError(404, 'VISIT_NOT_FOUND', 'Không tìm thấy lượt khám.');
    }

    const { consentTemplateId, signerName, signerRelationship = 'SELF' } = payload;
    const template = await ConsentTemplate.findByPk(consentTemplateId);
    if (!template) {
      throw new ApiError(404, 'TEMPLATE_NOT_FOUND', 'Không tìm thấy mẫu đồng thuận.');
    }

    return Consent.create({
      visitId,
      consentTemplateId,
      patientId: visit.patientId,
      signerName: signerName || visit.patientName || 'Bệnh nhân',
      signerRelationship,
      status: 'DRAFT',
      presentedAt: new Date(),
      createdBy: user.username,
    });
  }

  async function signConsent(consentId, payload, user) {
    const consent = await Consent.findByPk(consentId);
    if (!consent) {
      throw new ApiError(404, 'CONSENT_NOT_FOUND', 'Không tìm thấy giấy đồng thuận.');
    }

    if (consent.status === 'SIGNED') {
      throw new ApiError(409, 'CONSENT_ALREADY_SIGNED', 'Giấy đồng thuận này đã được ký.');
    }

    if (consent.status === 'REVOKED') {
      throw new ApiError(400, 'CONSENT_REVOKED', 'Giấy đồng thuận đã bị rút, không thể ký.');
    }

    const { signerName } = payload;

    await consent.update({
      status: 'SIGNED',
      signedAt: new Date(),
      signerName: signerName || consent.signerName,
    });

    return consent;
  }

  // AT-06: Revoke consent after partial procedure
  async function revokeConsent(consentId, payload, user) {
    const { revocationReason } = payload;
    if (!revocationReason) {
      throw new ApiError(400, 'REVOCATION_REASON_REQUIRED', 'Lý do rút đồng thuận là bắt buộc.');
    }

    const consent = await Consent.findByPk(consentId, {
      include: [{ model: Visit, as: 'visit' }],
    });

    if (!consent) {
      throw new ApiError(404, 'CONSENT_NOT_FOUND', 'Không tìm thấy giấy đồng thuận.');
    }

    if (consent.status === 'REVOKED') {
      throw new ApiError(409, 'CONSENT_ALREADY_REVOKED', 'Giấy đồng thuận này đã được rút trước đó.');
    }

    return sequelize.transaction(async (t) => {
      await setSessionUser(sequelize, t, user.username);

      // AT-06: Do NOT delete consent record; update status to REVOKED
      await consent.update({
        status: 'REVOKED',
        revokedAt: new Date(),
        revocationReason,
      }, { transaction: t });

      // AT-06: Cancel all PLANNED or IN_PROGRESS services of this visit (keep completed services untouched)
      await ServiceLine.update({
        status: 'CANCELLED',
      }, {
        where: {
          visitId: consent.visitId,
          status: {
            [Op.in]: ['PLANNED', 'IN_PROGRESS'],
          },
        },
        transaction: t,
      });

      return consent;
    });
  }

  // --- Prescriptions Methods ---
  async function getPrescriptions(visitId) {
    return Prescription.findAll({
      where: { visitId },
      include: [
        { model: User, as: 'doctor', attributes: ['userId', 'username', 'displayName'] },
      ],
      order: [['createdAt', 'DESC']],
    });
  }

  async function createPrescription(visitId, payload, user) {
    const visit = await Visit.findByPk(visitId);
    if (!visit) {
      throw new ApiError(404, 'VISIT_NOT_FOUND', 'Không tìm thấy lượt khám.');
    }

    const { prescriptionJson, status = 'DRAFT' } = payload;
    const content = typeof prescriptionJson === 'string' ? prescriptionJson : JSON.stringify(prescriptionJson || {});

    return Prescription.create({
      visitId,
      doctorId: visit.doctorId || user.userId,
      prescriptionJson: content,
      status,
      createdBy: user.username,
    });
  }

  async function signPrescription(prescriptionId, user) {
    const prescription = await Prescription.findByPk(prescriptionId);
    if (!prescription) {
      throw new ApiError(404, 'PRESCRIPTION_NOT_FOUND', 'Không tìm thấy đơn thuốc.');
    }

    if (prescription.status === 'SIGNED') {
      throw new ApiError(409, 'PRESCRIPTION_ALREADY_SIGNED', 'Đơn thuốc này đã được ký.');
    }

    await prescription.update({
      status: 'SIGNED',
      signedAt: new Date(),
      doctorId: user.userId,
    });

    return prescription;
  }

  // --- Clinical Orders Methods ---
  async function getClinicalOrders(visitId) {
    return ClinicalOrder.findAll({
      where: { visitId },
      include: [
        { model: User, as: 'doctor', attributes: ['userId', 'username', 'displayName'] },
      ],
      order: [['createdAt', 'DESC']],
    });
  }

  async function createClinicalOrder(visitId, payload, user) {
    const visit = await Visit.findByPk(visitId);
    if (!visit) {
      throw new ApiError(404, 'VISIT_NOT_FOUND', 'Không tìm thấy lượt khám.');
    }

    const { orderType, orderJson, status = 'ORDERED' } = payload;
    const content = typeof orderJson === 'string' ? orderJson : JSON.stringify(orderJson || {});

    return ClinicalOrder.create({
      visitId,
      doctorId: visit.doctorId || user.userId,
      orderType,
      orderJson: content,
      status,
      createdBy: user.username,
    });
  }

  async function updateOrderStatus(orderId, status, user) {
    const order = await ClinicalOrder.findByPk(orderId);
    if (!order) {
      throw new ApiError(404, 'ORDER_NOT_FOUND', 'Không tìm thấy chỉ định cận lâm sàng.');
    }

    await order.update({ status });
    return order;
  }

  // --- ServiceLines and ServiceCompletionEvents Methods (AT-18) ---
  async function getServiceLines(visitId) {
    return ServiceLine.findAll({
      where: { visitId },
      include: [
        { model: Service, as: 'service', attributes: ['serviceId', 'code', 'name', 'requiresConsent'] },
        { model: ServicePriceVersion, as: 'priceVersion' },
        {
          model: ServiceCompletionEvent,
          as: 'completionEvents',
          include: [
            { model: User, as: 'completer', attributes: ['userId', 'username', 'displayName'] },
          ],
        },
      ],
      order: [['createdAt', 'ASC']],
    });
  }

  async function addServiceLine(visitId, payload, user) {
    const visit = await Visit.findByPk(visitId);
    if (!visit) {
      throw new ApiError(404, 'VISIT_NOT_FOUND', 'Không tìm thấy lượt khám.');
    }

    const { serviceId, quantity = 1, toothCode = null, treatmentPlanId = null } = payload;

    // Find active price version for this service
    const now = new Date();
    const activePrice = await ServicePriceVersion.findOne({
      where: {
        serviceId,
        status: 'APPROVED',
        effectiveFrom: { [Op.lte]: now },
        [Op.or]: [
          { effectiveTo: null },
          { effectiveTo: { [Op.gt]: now } },
        ],
      },
      order: [['versionNo', 'DESC']],
    });

    if (!activePrice) {
      throw new ApiError(400, 'NO_ACTIVE_PRICE_VERSION', 'Dịch vụ này hiện chưa có phiên bản giá được phê duyệt và hiệu lực.');
    }

    return ServiceLine.create({
      visitId,
      serviceId,
      priceVersionId: activePrice.priceVersionId,
      treatmentPlanId,
      quantity,
      approvedUnitPrice: activePrice.unitPrice,
      status: 'PLANNED',
      toothCode,
      createdBy: user.username,
    });
  }

  // AT-18: Service Completion - prevent duplicate completion and double revenue/stock consumption
  async function completeServiceLine(serviceLineId, payload, user) {
    const { quantityCompleted = null, result = null } = payload;

    const line = await ServiceLine.findByPk(serviceLineId, {
      include: [
        { model: ServiceCompletionEvent, as: 'completionEvents' },
      ],
    });

    if (!line) {
      throw new ApiError(404, 'SERVICE_LINE_NOT_FOUND', 'Không tìm thấy dòng dịch vụ.');
    }

    // Calculate current completed quantity
    const events = line.completionEvents || [];
    const currentCompleted = events.reduce((sum, ev) => {
      if (ev.eventType === 'COMPLETION') return sum + Number(ev.quantityCompleted);
      if (ev.eventType === 'REVERSAL') return sum - Number(ev.quantityCompleted);
      return sum;
    }, 0);

    const plannedQty = Number(line.quantity);

    // AT-18: If already fully completed, reject duplicate calls to prevent double revenue / stock
    if (currentCompleted >= plannedQty) {
      throw new ApiError(409, 'SERVICE_ALREADY_COMPLETED', 'Dịch vụ này đã được chốt hoàn thành đủ số lượng trước đó. Không được phép chốt lặp để tránh trùng doanh thu và trừ kho.');
    }

    const qtyToComplete = quantityCompleted ? Number(quantityCompleted) : (plannedQty - currentCompleted);

    if (qtyToComplete <= 0) {
      throw new ApiError(400, 'INVALID_QUANTITY', 'Số lượng hoàn thành phải lớn hơn 0.');
    }

    if (currentCompleted + qtyToComplete > plannedQty) {
      throw new ApiError(400, 'EXCEEDS_PLANNED_QUANTITY', `Số lượng hoàn thành (${currentCompleted + qtyToComplete}) vượt quá số lượng chỉ định (${plannedQty}).`);
    }

    const maxVersion = events.length > 0 ? Math.max(...events.map(e => e.completionVersion)) : 0;
    const nextVersion = maxVersion + 1;

    return sequelize.transaction(async (t) => {
      await setSessionUser(sequelize, t, user.username);

      const event = await ServiceCompletionEvent.create({
        serviceLineId,
        completionVersion: nextVersion,
        quantityCompleted: qtyToComplete,
        completedBy: user.userId,
        completedAt: new Date(),
        result,
        eventType: 'COMPLETION',
        createdBy: user.username,
      }, { transaction: t });

      const newTotal = currentCompleted + qtyToComplete;
      const newStatus = newTotal >= plannedQty ? 'COMPLETED' : 'IN_PROGRESS';

      await line.update({
        status: newStatus,
      }, { transaction: t });

      return {
        event,
        serviceLineStatus: newStatus,
        totalCompleted: newTotal,
        plannedQuantity: plannedQty,
      };
    });
  }

  // --- SignQueue Methods (AT-13) ---
  async function getSignQueue(user) {
    return SignQueue.findAll({
      where: {
        status: 'PENDING',
      },
      include: [
        {
          model: EmrRecord,
          as: 'emrRecord',
          include: [
            { model: Visit, as: 'visit' },
            { model: User, as: 'doctor', attributes: ['userId', 'username', 'displayName'] },
          ],
        },
        { model: User, as: 'requester', attributes: ['userId', 'username', 'displayName'] },
      ],
      order: [['requestedAt', 'DESC']],
    });
  }

  async function processSignQueueItem(signQueueId, user) {
    const queueItem = await SignQueue.findByPk(signQueueId, {
      include: [{ model: EmrRecord, as: 'emrRecord' }],
    });

    if (!queueItem) {
      throw new ApiError(404, 'SIGN_QUEUE_ITEM_NOT_FOUND', 'Không tìm thấy yêu cầu ký trong hàng đợi.');
    }

    if (queueItem.status !== 'PENDING') {
      throw new ApiError(400, 'QUEUE_ITEM_NOT_PENDING', 'Yêu cầu ký này đã được xử lý hoặc đã hủy.');
    }

    const emrRecord = await getEmrByVisitId(queueItem.emrRecord.visitId);
    const latestVersion = emrRecord.versions?.[0];
    if (!latestVersion) {
      throw new ApiError(404, 'EMR_VERSION_NOT_FOUND', 'Không tìm thấy phiên bản EMR cần ký.');
    }

    return signEmr(emrRecord.visitId, latestVersion.emrVersionId, user, { simulateNetworkLoss: false });
  }

  return {
    seedDefaultConsentTemplatesIfEmpty,
    getEmrByVisitId,
    getOrCreateDraftEmr,
    updateDraftEmr,
    signEmr,
    createEmrAddendum,
    getTreatmentPlans,
    createTreatmentPlan,
    updateTreatmentPlanStatus,
    getConsentTemplates,
    createConsentTemplate,
    getConsents,
    createConsent,
    signConsent,
    revokeConsent,
    getPrescriptions,
    createPrescription,
    signPrescription,
    getClinicalOrders,
    createClinicalOrder,
    updateOrderStatus,
    getServiceLines,
    addServiceLine,
    completeServiceLine,
    getSignQueue,
    processSignQueueItem,
  };
}
