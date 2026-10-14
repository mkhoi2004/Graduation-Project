import { Op, QueryTypes } from 'sequelize';
import { setSessionUser, clearSessionUser } from '../utils/session-context.js';

export function createPatientVisitRepository({ sequelize, models, userModels, catalogModels }) {
  const { Patient, PatientAllergy, PatientMedicalHistory, Appointment, Visit, TreatmentRelationship, VisitStatusHistory } = models;
  const { User, Branch } = userModels;
  const { Room } = catalogModels;

  return {
    // PATIENTS
    async listPatients({ page = 1, pageSize = 20, search = '', status } = {}) {
      const where = {};
      if (search) {
        where[Op.or] = [
          { patientCode: { [Op.like]: `%${search}%` } },
          { fullName: { [Op.like]: `%${search}%` } },
          { phone: { [Op.like]: `%${search}%` } },
        ];
      }
      if (status) where.status = status;

      const offset = (Math.max(1, page) - 1) * Math.max(1, pageSize);
      const limit = Math.max(1, Math.min(100, pageSize));

      const { count, rows } = await Patient.findAndCountAll({
        where,
        order: [['createdAt', 'DESC']],
        limit,
        offset,
      });

      return {
        total: count,
        page: Math.max(1, page),
        pageSize: limit,
        totalPages: Math.ceil(count / limit),
        items: rows,
      };
    },

    async findPatientById(patientId) {
      return Patient.findByPk(patientId, {
        include: [
          { model: PatientAllergy, as: 'allergies' },
          { model: PatientMedicalHistory, as: 'medicalHistories' },
          {
            model: Visit,
            as: 'visits',
            include: [
              { model: User, as: 'doctor', attributes: ['userId', 'displayName'] },
              { model: Room, as: 'room', attributes: ['roomId', 'name', 'roomType'] },
            ],
            order: [['registeredAt', 'DESC']],
          },
        ],
      });
    },

    async findPatientsByPhone(phone) {
      if (!phone) return [];
      return Patient.findAll({
        where: { phone: String(phone).trim() },
        attributes: ['patientId', 'patientCode', 'fullName', 'phone', 'dateOfBirth', 'birthYear', 'status'],
      });
    },

    async createPatient(data) {
      return Patient.create({
        patientCode: data.patientCode.trim().toUpperCase(),
        fullName: data.fullName.trim(),
        dateOfBirth: data.dateOfBirth || null,
        birthYear: data.birthYear || null,
        gender: data.gender || null,
        phone: data.phone ? String(data.phone).trim() : null,
        email: data.email ? String(data.email).trim() : null,
        guardianName: data.guardianName?.trim() || null,
        status: 'ACTIVE',
        createdBy: data.createdBy,
      });
    },

    async updatePatient(patientId, data) {
      const patient = await Patient.findByPk(patientId);
      if (!patient) return null;

      if (data.fullName !== undefined) patient.fullName = data.fullName.trim();
      if (data.gender !== undefined) patient.gender = data.gender;
      if (data.phone !== undefined) patient.phone = data.phone ? String(data.phone).trim() : null;
      if (data.email !== undefined) patient.email = data.email ? String(data.email).trim() : null;
      if (data.guardianName !== undefined) patient.guardianName = data.guardianName?.trim() || null;
      if (data.status !== undefined) patient.status = data.status;

      await patient.save();
      return patient;
    },

    async softDeletePatient(patientId, username) {
      return sequelize.transaction(async transaction => {
        // Enforce rule: Patients can only be deleted if they have NO visits
        const visitsCount = await Visit.count({ where: { patientId }, transaction });
        if (visitsCount > 0) {
          const error = new Error('Hồ sơ bệnh nhân đã có lượt khám, không thể xóa vật lý hoặc xóa mềm (theo quy tắc nghiệp vụ)');
          error.code = 'PATIENT_HAS_VISITS';
          error.statusCode = 409;
          throw error;
        }

        await setSessionUser(sequelize, transaction, username);
        try {
          const patient = await Patient.findByPk(patientId, { transaction });
          if (!patient) return false;
          await patient.destroy({ transaction });
          return true;
        } finally {
          await clearSessionUser(sequelize, transaction);
        }
      });
    },

    async addAllergy(patientId, data) {
      return PatientAllergy.create({
        patientId,
        allergen: data.allergen.trim(),
        reaction: data.reaction?.trim() || null,
        knowledgeStatus: data.knowledgeStatus || 'KNOWN',
        confirmedAt: data.confirmedAt || new Date(),
        source: data.source || 'Tiếp nhận khai báo',
        createdBy: data.createdBy,
      });
    },

    async addMedicalHistory(patientId, data) {
      return PatientMedicalHistory.create({
        patientId,
        conditionCode: data.conditionCode || null,
        description: data.description.trim(),
        knowledgeStatus: data.knowledgeStatus || 'KNOWN',
        confirmedAt: data.confirmedAt || new Date(),
        source: data.source || 'Tiếp nhận khai báo',
        createdBy: data.createdBy,
      });
    },

    // APPOINTMENTS
    async listAppointments({ branchId, doctorId, date, status } = {}) {
      const where = {};
      if (branchId) where.branchId = branchId;
      if (doctorId) where.doctorId = doctorId;
      if (status) where.status = status;
      if (date) {
        const start = new Date(date);
        start.setHours(0, 0, 0, 0);
        const end = new Date(date);
        end.setHours(23, 59, 59, 999);
        where.startsAt = { [Op.between]: [start, end] };
      }

      return Appointment.findAll({
        where,
        include: [
          { model: Patient, as: 'patient', attributes: ['patientId', 'patientCode', 'fullName', 'phone'] },
          { model: User, as: 'doctor', attributes: ['userId', 'displayName'] },
          { model: Room, as: 'room', attributes: ['roomId', 'name'] },
        ],
        order: [['startsAt', 'ASC']],
      });
    },

    async createAppointment(data) {
      return Appointment.create({
        patientId: data.patientId,
        branchId: data.branchId,
        doctorId: data.doctorId || null,
        roomId: data.roomId || null,
        startsAt: data.startsAt,
        endsAt: data.endsAt,
        status: 'BOOKED',
        note: data.note?.trim() || null,
        createdBy: data.createdBy,
      });
    },

    // VISITS & TREATMENT RELATIONSHIPS
    async listVisits({ branchId, doctorId, status, patientId } = {}) {
      const where = {};
      if (branchId) where.branchId = branchId;
      if (doctorId) where.doctorId = doctorId;
      if (status) where.status = status;
      if (patientId) where.patientId = patientId;

      return Visit.findAll({
        where,
        include: [
          { model: Patient, as: 'patient', attributes: ['patientId', 'patientCode', 'fullName', 'phone'] },
          { model: User, as: 'doctor', attributes: ['userId', 'displayName'] },
          { model: Room, as: 'room', attributes: ['roomId', 'name', 'roomType'] },
          { model: Branch, as: 'branch', attributes: ['branchId', 'name', 'code'] },
        ],
        order: [['registeredAt', 'DESC']],
      });
    },

    async findVisitById(visitId) {
      return Visit.findByPk(visitId, {
        include: [
          { model: Patient, as: 'patient' },
          { model: User, as: 'doctor', attributes: ['userId', 'displayName'] },
          { model: Room, as: 'room', attributes: ['roomId', 'name', 'roomType'] },
          { model: Branch, as: 'branch', attributes: ['branchId', 'name', 'code'] },
          { model: VisitStatusHistory, as: 'statusHistory', order: [['changedAt', 'ASC']] },
        ],
      });
    },

    async createVisit(data) {
      return sequelize.transaction(async transaction => {
        // 1. Create Visit
        const visit = await Visit.create({
          visitCode: data.visitCode.trim().toUpperCase(),
          patientId: data.patientId,
          appointmentId: data.appointmentId || null,
          branchId: data.branchId,
          doctorId: data.doctorId,
          roomId: data.roomId || null,
          visitType: data.visitType || 'FIRST_VISIT',
          paymentType: data.paymentType || 'SELF_PAY',
          status: 'REGISTERED',
          registeredAt: new Date(),
          createdBy: data.createdBy,
        }, { transaction });

        // 2. Establish TreatmentRelationship for doctor (Enforces Data Visibility)
        await TreatmentRelationship.create({
          doctorId: data.doctorId,
          patientId: data.patientId,
          visitId: visit.visitId,
          source: 'VISIT',
          startsAt: new Date(),
          endsAt: null,
          createdBy: data.createdBy,
        }, { transaction });

        // 3. Log initial status history
        await VisitStatusHistory.create({
          visitId: visit.visitId,
          fromStatus: null,
          toStatus: 'REGISTERED',
          reason: 'Bệnh nhân hoàn tất thủ tục tiếp nhận',
          changedAt: new Date(),
          changedBy: data.changedByUserId,
        }, { transaction });

        return visit;
      });
    },

    async updateVisitStatus(visitId, { newStatus, reason, changedByUserId }) {
      return sequelize.transaction(async transaction => {
        const visit = await Visit.findByPk(visitId, { transaction });
        if (!visit) return null;

        const oldStatus = visit.status;
        visit.status = newStatus;
        if (newStatus === 'CLOSED') {
          visit.closedAt = new Date();
        }
        if (newStatus === 'ON_HOLD') {
          visit.holdReason = reason || 'Tạm hoãn';
        }

        await visit.save({ transaction });

        await VisitStatusHistory.create({
          visitId,
          fromStatus: oldStatus,
          toStatus: newStatus,
          reason: reason || null,
          changedAt: new Date(),
          changedBy: changedByUserId,
        }, { transaction });

        return visit;
      });
    },

    async checkDoctorRelationship(doctorId, patientId) {
      const active = await TreatmentRelationship.findOne({
        where: {
          doctorId,
          patientId,
          [Op.or]: [
            { endsAt: null },
            { endsAt: { [Op.gt]: new Date() } },
          ],
        },
      });
      return Boolean(active);
    },
  };
}
