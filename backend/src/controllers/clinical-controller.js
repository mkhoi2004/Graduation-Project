export function createClinicalController({ clinicalService }) {
  // EMR
  async function getEmr(req, res, next) {
    try {
      const { visitId } = req.params;
      const data = await clinicalService.getEmr(visitId, req.user);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async function updateDraftEmr(req, res, next) {
    try {
      const { visitId, emrVersionId } = req.params;
      const data = await clinicalService.updateDraftEmr(visitId, emrVersionId, req.body, req.user);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async function signEmr(req, res, next) {
    try {
      const { visitId, emrVersionId } = req.params;
      const { simulateNetworkLoss } = req.body || {};
      const data = await clinicalService.signEmr(visitId, emrVersionId, req.user, { simulateNetworkLoss });
      res.json({ success: true, message: 'Ký số hồ sơ EMR thành công.', data });
    } catch (err) {
      next(err);
    }
  }

  async function createEmrAddendum(req, res, next) {
    try {
      const { visitId, emrVersionId } = req.params;
      const data = await clinicalService.createEmrAddendum(visitId, emrVersionId, req.body, req.user);
      res.status(201).json({ success: true, message: 'Đã lập phụ lục đính chính EMR thành công.', data });
    } catch (err) {
      next(err);
    }
  }

  // Treatment Plans
  async function getTreatmentPlans(req, res, next) {
    try {
      const { visitId } = req.params;
      const data = await clinicalService.getTreatmentPlans(visitId, req.user);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async function createTreatmentPlan(req, res, next) {
    try {
      const { visitId } = req.params;
      const data = await clinicalService.createTreatmentPlan(visitId, req.body, req.user);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async function updateTreatmentPlanStatus(req, res, next) {
    try {
      const { visitId, planId } = req.params;
      const { status } = req.body;
      const data = await clinicalService.updateTreatmentPlanStatus(visitId, planId, status, req.user);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  // Consents & Templates
  async function getConsentTemplates(req, res, next) {
    try {
      const data = await clinicalService.getConsentTemplates();
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async function createConsentTemplate(req, res, next) {
    try {
      const data = await clinicalService.createConsentTemplate(req.body, req.user);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async function getConsents(req, res, next) {
    try {
      const { visitId } = req.params;
      const data = await clinicalService.getConsents(visitId, req.user);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async function createConsent(req, res, next) {
    try {
      const { visitId } = req.params;
      const data = await clinicalService.createConsent(visitId, req.body, req.user);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async function signConsent(req, res, next) {
    try {
      const { visitId, consentId } = req.params;
      const data = await clinicalService.signConsent(visitId, consentId, req.body, req.user);
      res.json({ success: true, message: 'Đã ký giấy đồng thuận điều trị.', data });
    } catch (err) {
      next(err);
    }
  }

  async function revokeConsent(req, res, next) {
    try {
      const { visitId, consentId } = req.params;
      const data = await clinicalService.revokeConsent(visitId, consentId, req.body, req.user);
      res.json({ success: true, message: 'Đã rút giấy đồng thuận điều trị và hủy các thủ thuật chưa thực hiện (AT-06).', data });
    } catch (err) {
      next(err);
    }
  }

  // Prescriptions
  async function getPrescriptions(req, res, next) {
    try {
      const { visitId } = req.params;
      const data = await clinicalService.getPrescriptions(visitId, req.user);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async function createPrescription(req, res, next) {
    try {
      const { visitId } = req.params;
      const data = await clinicalService.createPrescription(visitId, req.body, req.user);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async function signPrescription(req, res, next) {
    try {
      const { visitId, prescriptionId } = req.params;
      const data = await clinicalService.signPrescription(visitId, prescriptionId, req.user);
      res.json({ success: true, message: 'Đã ký duyệt đơn thuốc.', data });
    } catch (err) {
      next(err);
    }
  }

  // Clinical Orders
  async function getClinicalOrders(req, res, next) {
    try {
      const { visitId } = req.params;
      const data = await clinicalService.getClinicalOrders(visitId, req.user);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async function createClinicalOrder(req, res, next) {
    try {
      const { visitId } = req.params;
      const data = await clinicalService.createClinicalOrder(visitId, req.body, req.user);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async function updateOrderStatus(req, res, next) {
    try {
      const { visitId, orderId } = req.params;
      const { status } = req.body;
      const data = await clinicalService.updateOrderStatus(visitId, orderId, status, req.user);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  // Services & Completion (AT-18)
  async function getServiceLines(req, res, next) {
    try {
      const { visitId } = req.params;
      const data = await clinicalService.getServiceLines(visitId, req.user);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async function addServiceLine(req, res, next) {
    try {
      const { visitId } = req.params;
      const data = await clinicalService.addServiceLine(visitId, req.body, req.user);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async function completeServiceLine(req, res, next) {
    try {
      const { visitId, serviceLineId } = req.params;
      const data = await clinicalService.completeServiceLine(visitId, serviceLineId, req.body, req.user);
      res.json({ success: true, message: 'Chốt hoàn thành dịch vụ thành công.', data });
    } catch (err) {
      next(err);
    }
  }

  // SignQueue (AT-13)
  async function getSignQueue(req, res, next) {
    try {
      const data = await clinicalService.getSignQueue(req.user);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async function processSignQueueItem(req, res, next) {
    try {
      const { queueId } = req.params;
      const data = await clinicalService.processSignQueueItem(queueId, req.user);
      res.json({ success: true, message: 'Đã hoàn tất ký bù từ hàng đợi ký số.', data });
    } catch (err) {
      next(err);
    }
  }

  return {
    getEmr,
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
