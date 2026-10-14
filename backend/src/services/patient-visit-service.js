import { ApiError } from '../utils/api-error.js';
import { scopeByRole } from '../middlewares/scope-by-role.js';

export function createPatientVisitService({ patientVisitRepo, userRepo }) {
  return {
    // PATIENTS
    async getPatients(params, user) {
      const scope = scopeByRole(user, 'PATIENT');
      if (scope.requiresDoctorRelationship) {
        // Doctors only see patients they have active relationships with
        return patientVisitRepo.listPatients({ ...params, doctorId: scope.doctorId });
      }
      return patientVisitRepo.listPatients(params);
    },

    async getPatientById(patientId, user) {
      const scope = scopeByRole(user, 'PATIENT');

      // AT-17 Enforcement: Doctor cannot view patient without established treatment relationship
      if (scope.requiresDoctorRelationship) {
        const hasRelationship = await patientVisitRepo.checkDoctorRelationship(user.userId, patientId);
        if (!hasRelationship) {
          await userRepo.createAuditLog({
            actorId: user.userId,
            actorName: user.username,
            roleCode: user.role,
            purpose: 'CLINICAL_ACCESS',
            action: 'VIEW_PATIENT_UNAUTHORIZED',
            objectType: 'PATIENTS',
            objectId: patientId,
            outcome: 'DENIED',
            source: 'API',
          });
          throw ApiError.forbidden('NO_TREATMENT_RELATIONSHIP', 'Bác sĩ không có quan hệ điều trị với bệnh nhân này (AT-17)');
        }
      }

      const patient = await patientVisitRepo.findPatientById(patientId);
      if (!patient) throw ApiError.notFound('PATIENT_NOT_FOUND', 'Không tìm thấy hồ sơ bệnh nhân');

      // Audit sensitive data access by Admin
      if (user.role === 'ADMIN') {
        await userRepo.createAuditLog({
          actorId: user.userId,
          actorName: user.username,
          roleCode: user.role,
          purpose: 'ADMIN_SENSITIVE_DATA_AUDIT',
          action: 'VIEW_PATIENT_PROFILE',
          objectType: 'PATIENTS',
          objectId: patientId,
          outcome: 'ALLOWED',
          source: 'API',
        });
      }

      return patient;
    },

    async createPatient(data, user) {
      if (!data.fullName) {
        throw ApiError.badRequest('MISSING_FIELDS', 'Họ và tên bệnh nhân là bắt buộc');
      }

      // Check birth constraint: Either DateOfBirth or BirthYear, not both, not neither
      if (!data.dateOfBirth && !data.birthYear) {
        data.birthYear = new Date().getFullYear();
      }

      // AT-05: Check duplicate phone number
      if (data.phone && !data.confirmDuplicatePhone) {
        const existing = await patientVisitRepo.findPatientsByPhone(data.phone);
        if (existing.length > 0) {
          return {
            warning: 'PHONE_DUPLICATE_WARNING',
            message: `Số điện thoại ${data.phone} đã được đăng ký bởi ${existing.length} bệnh nhân khác (AT-05)`,
            existingPatients: existing,
            requireConfirmation: true,
          };
        }
      }

      const year = new Date().getFullYear().toString().slice(-2);
      const random = Math.floor(10000 + Math.random() * 90000);
      const patientCode = data.patientCode || `BN${year}${random}`;

      const patient = await patientVisitRepo.createPatient({
        ...data,
        patientCode,
        createdBy: user.username,
      });

      // Add initial allergy/medical history if provided
      if (data.allergy) {
        await patientVisitRepo.addAllergy(patient.patientId, {
          allergen: data.allergy,
          reaction: data.allergyReaction,
          knowledgeStatus: 'KNOWN',
          createdBy: user.username,
        });
      }

      if (data.medicalHistory) {
        await patientVisitRepo.addMedicalHistory(patient.patientId, {
          description: data.medicalHistory,
          knowledgeStatus: 'KNOWN',
          createdBy: user.username,
        });
      }

      await userRepo.createAuditLog({
        actorId: user.userId,
        actorName: user.username,
        roleCode: user.role,
        purpose: 'PATIENT_REGISTRATION',
        action: 'CREATE_PATIENT',
        objectType: 'PATIENTS',
        objectId: patient.patientId,
        outcome: 'ALLOWED',
        source: 'API',
      });

      return patient;
    },

    async updatePatient(id, data, user) {
      const updated = await patientVisitRepo.updatePatient(id, data);
      if (!updated) throw ApiError.notFound('PATIENT_NOT_FOUND', 'Không tìm thấy bệnh nhân');

      await userRepo.createAuditLog({
        actorId: user.userId,
        actorName: user.username,
        roleCode: user.role,
        purpose: 'PATIENT_MANAGEMENT',
        action: 'UPDATE_PATIENT',
        objectType: 'PATIENTS',
        objectId: id,
        outcome: 'ALLOWED',
        source: 'API',
      });

      return updated;
    },

    async softDeletePatient(id, user) {
      try {
        const success = await patientVisitRepo.softDeletePatient(id, user.username);
        if (!success) throw ApiError.notFound('PATIENT_NOT_FOUND', 'Không tìm thấy bệnh nhân để xóa');

        await userRepo.createAuditLog({
          actorId: user.userId,
          actorName: user.username,
          roleCode: user.role,
          purpose: 'PATIENT_MANAGEMENT',
          action: 'SOFT_DELETE_PATIENT',
          objectType: 'PATIENTS',
          objectId: id,
          outcome: 'ALLOWED',
          source: 'API',
        });

        return { success: true, message: 'Đã xóa hồ sơ bệnh nhân (Soft-Delete)' };
      } catch (err) {
        if (err.code === 'PATIENT_HAS_VISITS') {
          throw ApiError.conflict('PATIENT_HAS_VISITS', err.message);
        }
        throw err;
      }
    },

    // APPOINTMENTS
    async getAppointments(params, user) {
      return patientVisitRepo.listAppointments(params);
    },

    async createAppointment(data, user) {
      if (!data.patientId || !data.branchId || !data.startsAt || !data.endsAt) {
        throw ApiError.badRequest('MISSING_FIELDS', 'Bệnh nhân, chi nhánh và thời gian hẹn là bắt buộc');
      }

      return patientVisitRepo.createAppointment({
        ...data,
        createdBy: user.username,
      });
    },

    // VISITS & TREATMENT RELATIONSHIPS
    async getVisits(params, user) {
      const scope = scopeByRole(user, 'VISIT');
      const queryParams = { ...params };

      if (scope.doctorId) {
        queryParams.doctorId = scope.doctorId;
      }
      if (scope.branchId && !queryParams.branchId) {
        queryParams.branchId = scope.branchId;
      }

      return patientVisitRepo.listVisits(queryParams);
    },

    async getVisitById(id, user) {
      const visit = await patientVisitRepo.findVisitById(id);
      if (!visit) throw ApiError.notFound('VISIT_NOT_FOUND', 'Không tìm thấy lượt khám');

      // Check Doctor permission
      if (user.role === 'DOCTOR' && visit.doctorId !== user.userId) {
        throw ApiError.forbidden('DOCTOR_NOT_ASSIGNED', 'Bác sĩ không được phân công cho lượt khám này');
      }

      return visit;
    },

    async createVisit(data, user) {
      if (!data.patientId || !data.branchId || !data.doctorId) {
        throw ApiError.badRequest('MISSING_FIELDS', 'Bệnh nhân, chi nhánh và bác sĩ khám là bắt buộc');
      }

      const year = new Date().getFullYear().toString().slice(-2);
      const random = Math.floor(10000 + Math.random() * 90000);
      const visitCode = `LK${year}${random}`;

      const visit = await patientVisitRepo.createVisit({
        ...data,
        visitCode,
        createdBy: user.username,
        changedByUserId: user.userId,
      });

      await userRepo.createAuditLog({
        actorId: user.userId,
        actorName: user.username,
        roleCode: user.role,
        purpose: 'VISIT_REGISTRATION',
        action: 'CREATE_VISIT',
        objectType: 'VISITS',
        objectId: visit.visitId,
        outcome: 'ALLOWED',
        source: 'API',
      });

      return patientVisitRepo.findVisitById(visit.visitId);
    },

    async updateVisitStatus(id, { newStatus, reason }, user) {
      const validStatuses = ['REGISTERED', 'IN_PROGRESS', 'CLINICAL_COMPLETED', 'CLOSED', 'ON_HOLD', 'CANCELLED'];
      if (!validStatuses.includes(newStatus)) {
        throw ApiError.badRequest('INVALID_STATUS', `Trạng thái lượt khám không hợp lệ: ${newStatus}`);
      }

      const updated = await patientVisitRepo.updateVisitStatus(id, {
        newStatus,
        reason,
        changedByUserId: user.userId,
      });

      if (!updated) throw ApiError.notFound('VISIT_NOT_FOUND', 'Không tìm thấy lượt khám');

      await userRepo.createAuditLog({
        actorId: user.userId,
        actorName: user.username,
        roleCode: user.role,
        purpose: 'VISIT_PROGRESSION',
        action: `CHANGE_STATUS_TO_${newStatus}`,
        objectType: 'VISITS',
        objectId: id,
        outcome: 'ALLOWED',
        source: 'API',
      });

      return updated;
    },
  };
}
