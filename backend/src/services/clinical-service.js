import { ApiError } from '../utils/api-error.js';

export function createClinicalService({ clinicalRepo, patientVisitRepo, userRepo }) {
  async function assertTreatmentRelationship(visitId, user) {
    if (!user) {
      throw new ApiError(401, 'UNAUTHORIZED', 'Chưa đăng nhập.');
    }

    const privilegedRoles = ['ADMIN', 'CLINICAL_DIRECTOR'];
    if (privilegedRoles.includes(user.role)) {
      return true;
    }

    // Receptionist and Nurse can view for operational coordination
    if (['RECEPTIONIST', 'NURSE'].includes(user.role)) {
      return true;
    }

    // For DOCTOR: AT-17 check treatment relationship
    if (user.role === 'DOCTOR') {
      const visit = await patientVisitRepo.findVisitById(visitId);
      if (!visit) {
        throw new ApiError(404, 'VISIT_NOT_FOUND', 'Không tìm thấy lượt khám.');
      }

      const isPrimaryDoctor = visit.doctorId === user.userId;
      const isAssigned = visit.assignments?.some(a => a.doctorId === user.userId);
      const hasRelationship = await patientVisitRepo.checkDoctorRelationship(user.userId, visit.patientId);

      if (!isPrimaryDoctor && !isAssigned && !hasRelationship) {
        throw new ApiError(403, 'NO_TREATMENT_RELATIONSHIP', 'Bác sĩ không có quan hệ điều trị hoặc phân công với lượt khám này (AT-17).');
      }
    }

    return true;
  }

  function assertDoctorRole(user, actionName = 'thực hiện thao tác chuyên môn') {
    const doctorRoles = ['DOCTOR', 'CLINICAL_DIRECTOR'];
    if (!doctorRoles.includes(user.role)) {
      throw new ApiError(403, 'DOCTOR_ROLE_REQUIRED', `Chỉ bác sĩ mới được phép ${actionName}.`);
    }
  }

  // --- EMR ---
  async function getEmr(visitId, user) {
    await assertTreatmentRelationship(visitId, user);
    return clinicalRepo.getOrCreateDraftEmr(visitId, user);
  }

  async function updateDraftEmr(visitId, emrVersionId, payload, user) {
    await assertTreatmentRelationship(visitId, user);
    assertDoctorRole(user, 'chỉnh sửa nội dung EMR');
    return clinicalRepo.updateDraftEmr(visitId, emrVersionId, payload, user);
  }

  async function signEmr(visitId, emrVersionId, user, options = {}) {
    await assertTreatmentRelationship(visitId, user);
    assertDoctorRole(user, 'ký số hồ sơ bệnh án EMR');
    return clinicalRepo.signEmr(visitId, emrVersionId, user, options);
  }

  async function createEmrAddendum(visitId, emrVersionId, payload, user) {
    await assertTreatmentRelationship(visitId, user);
    assertDoctorRole(user, 'lập phụ lục đính chính EMR');
    return clinicalRepo.createEmrAddendum(emrVersionId, payload, user);
  }

  // --- Treatment Plans ---
  async function getTreatmentPlans(visitId, user) {
    await assertTreatmentRelationship(visitId, user);
    return clinicalRepo.getTreatmentPlans(visitId);
  }

  async function createTreatmentPlan(visitId, payload, user) {
    await assertTreatmentRelationship(visitId, user);
    assertDoctorRole(user, 'lập kế hoạch điều trị');
    return clinicalRepo.createTreatmentPlan(visitId, payload, user);
  }

  async function updateTreatmentPlanStatus(visitId, treatmentPlanId, status, user) {
    await assertTreatmentRelationship(visitId, user);
    return clinicalRepo.updateTreatmentPlanStatus(treatmentPlanId, status, user);
  }

  // --- Consents (AT-06) ---
  async function getConsentTemplates() {
    return clinicalRepo.getConsentTemplates();
  }

  async function createConsentTemplate(payload, user) {
    const privilegedRoles = ['ADMIN', 'CLINICAL_DIRECTOR'];
    if (!privilegedRoles.includes(user.role)) {
      throw new ApiError(403, 'FORBIDDEN', 'Chỉ quản trị viên hoặc giám đốc chuyên môn mới được tạo mẫu cam kết.');
    }
    return clinicalRepo.createConsentTemplate(payload, user);
  }

  async function getConsents(visitId, user) {
    await assertTreatmentRelationship(visitId, user);
    return clinicalRepo.getConsents(visitId);
  }

  async function createConsent(visitId, payload, user) {
    await assertTreatmentRelationship(visitId, user);
    return clinicalRepo.createConsent(visitId, payload, user);
  }

  async function signConsent(visitId, consentId, payload, user) {
    await assertTreatmentRelationship(visitId, user);
    return clinicalRepo.signConsent(consentId, payload, user);
  }

  async function revokeConsent(visitId, consentId, payload, user) {
    await assertTreatmentRelationship(visitId, user);
    // AT-06: Revocation stops unfinished procedures, keeps completed ones, never deletes EMR
    return clinicalRepo.revokeConsent(consentId, payload, user);
  }

  // --- Prescriptions ---
  async function getPrescriptions(visitId, user) {
    await assertTreatmentRelationship(visitId, user);
    return clinicalRepo.getPrescriptions(visitId);
  }

  async function createPrescription(visitId, payload, user) {
    await assertTreatmentRelationship(visitId, user);
    assertDoctorRole(user, 'kê đơn thuốc');
    return clinicalRepo.createPrescription(visitId, payload, user);
  }

  async function signPrescription(visitId, prescriptionId, user) {
    await assertTreatmentRelationship(visitId, user);
    assertDoctorRole(user, 'ký đơn thuốc');
    return clinicalRepo.signPrescription(prescriptionId, user);
  }

  // --- Clinical Orders ---
  async function getClinicalOrders(visitId, user) {
    await assertTreatmentRelationship(visitId, user);
    return clinicalRepo.getClinicalOrders(visitId);
  }

  async function createClinicalOrder(visitId, payload, user) {
    await assertTreatmentRelationship(visitId, user);
    assertDoctorRole(user, 'chỉ định cận lâm sàng');
    return clinicalRepo.createClinicalOrder(visitId, payload, user);
  }

  async function updateOrderStatus(visitId, orderId, status, user) {
    await assertTreatmentRelationship(visitId, user);
    return clinicalRepo.updateOrderStatus(orderId, status, user);
  }

  // --- Services and Completion (AT-18) ---
  async function getServiceLines(visitId, user) {
    await assertTreatmentRelationship(visitId, user);
    return clinicalRepo.getServiceLines(visitId);
  }

  async function addServiceLine(visitId, payload, user) {
    await assertTreatmentRelationship(visitId, user);
    return clinicalRepo.addServiceLine(visitId, payload, user);
  }

  async function completeServiceLine(visitId, serviceLineId, payload, user) {
    await assertTreatmentRelationship(visitId, user);
    assertDoctorRole(user, 'chốt hoàn thành dịch vụ thủ thuật');
    // AT-18: Prevents duplicate completion
    return clinicalRepo.completeServiceLine(serviceLineId, payload, user);
  }

  // --- SignQueue (AT-13) ---
  async function getSignQueue(user) {
    assertDoctorRole(user, 'xem hàng đợi ký số');
    return clinicalRepo.getSignQueue(user);
  }

  async function processSignQueueItem(signQueueId, user) {
    assertDoctorRole(user, 'xử lý ký số bù từ hàng đợi');
    return clinicalRepo.processSignQueueItem(signQueueId, user);
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
