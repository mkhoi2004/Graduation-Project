import { DataTypes } from 'sequelize';

export function initPatientVisitModels(sequelize, userModels, catalogModels) {
  const { Branch, User } = userModels;
  const { Room } = catalogModels;

  const Patient = sequelize.define('Patients', {
    patientId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'PatientId',
    },
    patientCode: {
      type: DataTypes.STRING(30),
      allowNull: false,
      unique: true,
      field: 'PatientCode',
    },
    fullName: {
      type: DataTypes.STRING(200),
      allowNull: false,
      field: 'FullName',
    },
    dateOfBirth: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'DateOfBirth',
    },
    birthYear: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      field: 'BirthYear',
    },
    gender: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'Gender',
    },
    phone: {
      type: DataTypes.STRING(30),
      allowNull: true,
      field: 'Phone',
    },
    email: {
      type: DataTypes.STRING(254),
      allowNull: true,
      field: 'Email',
    },
    guardianName: {
      type: DataTypes.STRING(200),
      allowNull: true,
      field: 'GuardianName',
    },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'ACTIVE',
      field: 'Status',
    },
    mergedIntoPatientId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'MergedIntoPatientId',
    },
    createdAt: {
      type: DataTypes.DATE,
      field: 'CreatedAt',
    },
    createdBy: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'CreatedBy',
    },
  }, {
    tableName: 'Patients',
    timestamps: false,
  });

  const PatientAllergy = sequelize.define('PatientAllergies', {
    allergyId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'AllergyId',
    },
    patientId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'PatientId',
    },
    allergen: {
      type: DataTypes.STRING(200),
      allowNull: false,
      field: 'Allergen',
    },
    reaction: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'Reaction',
    },
    knowledgeStatus: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'UNKNOWN',
      field: 'KnowledgeStatus',
    },
    confirmedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'ConfirmedAt',
    },
    source: {
      type: DataTypes.STRING(200),
      allowNull: false,
      field: 'Source',
    },
    createdAt: {
      type: DataTypes.DATE,
      field: 'CreatedAt',
    },
    createdBy: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'CreatedBy',
    },
  }, {
    tableName: 'PatientAllergies',
    timestamps: false,
  });

  const PatientMedicalHistory = sequelize.define('PatientMedicalHistory', {
    medicalHistoryId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'MedicalHistoryId',
    },
    patientId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'PatientId',
    },
    conditionCode: {
      type: DataTypes.STRING(80),
      allowNull: true,
      field: 'ConditionCode',
    },
    description: {
      type: DataTypes.STRING(500),
      allowNull: false,
      field: 'Description',
    },
    knowledgeStatus: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'UNKNOWN',
      field: 'KnowledgeStatus',
    },
    confirmedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'ConfirmedAt',
    },
    source: {
      type: DataTypes.STRING(200),
      allowNull: false,
      field: 'Source',
    },
    createdAt: {
      type: DataTypes.DATE,
      field: 'CreatedAt',
    },
    createdBy: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'CreatedBy',
    },
  }, {
    tableName: 'PatientMedicalHistory',
    timestamps: false,
  });

  const Appointment = sequelize.define('Appointments', {
    appointmentId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'AppointmentId',
    },
    patientId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'PatientId',
    },
    branchId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'BranchId',
    },
    doctorId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'DoctorId',
    },
    roomId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'RoomId',
    },
    startsAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'StartsAt',
    },
    endsAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'EndsAt',
    },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'BOOKED',
      field: 'Status',
    },
    note: {
      type: DataTypes.STRING(1000),
      allowNull: true,
      field: 'Note',
    },
    createdAt: {
      type: DataTypes.DATE,
      field: 'CreatedAt',
    },
    createdBy: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'CreatedBy',
    },
  }, {
    tableName: 'Appointments',
    timestamps: false,
  });

  const Visit = sequelize.define('Visits', {
    visitId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'VisitId',
    },
    visitCode: {
      type: DataTypes.STRING(30),
      allowNull: false,
      unique: true,
      field: 'VisitCode',
    },
    patientId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'PatientId',
    },
    appointmentId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'AppointmentId',
    },
    branchId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'BranchId',
    },
    doctorId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'DoctorId',
    },
    roomId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'RoomId',
    },
    visitType: {
      type: DataTypes.STRING(30),
      allowNull: false,
      field: 'VisitType',
    },
    paymentType: {
      type: DataTypes.STRING(30),
      allowNull: false,
      field: 'PaymentType',
    },
    status: {
      type: DataTypes.STRING(30),
      defaultValue: 'REGISTERED',
      field: 'Status',
    },
    registeredAt: {
      type: DataTypes.DATE,
      field: 'RegisteredAt',
    },
    closedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'ClosedAt',
    },
    holdReason: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'HoldReason',
    },
    createdAt: {
      type: DataTypes.DATE,
      field: 'CreatedAt',
    },
    createdBy: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'CreatedBy',
    },
  }, {
    tableName: 'Visits',
    timestamps: false,
  });

  const TreatmentRelationship = sequelize.define('TreatmentRelationships', {
    treatmentRelationshipId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'TreatmentRelationshipId',
    },
    doctorId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'DoctorId',
    },
    patientId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'PatientId',
    },
    visitId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'VisitId',
    },
    source: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: 'VISIT',
      field: 'Source',
    },
    startsAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'StartsAt',
    },
    endsAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'EndsAt',
    },
    createdAt: {
      type: DataTypes.DATE,
      field: 'CreatedAt',
    },
    createdBy: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'CreatedBy',
    },
  }, {
    tableName: 'TreatmentRelationships',
    timestamps: false,
  });

  const VisitStatusHistory = sequelize.define('VisitStatusHistory', {
    visitStatusHistoryId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'VisitStatusHistoryId',
    },
    visitId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'VisitId',
    },
    fromStatus: {
      type: DataTypes.STRING(30),
      allowNull: true,
      field: 'FromStatus',
    },
    toStatus: {
      type: DataTypes.STRING(30),
      allowNull: false,
      field: 'ToStatus',
    },
    reason: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'Reason',
    },
    changedAt: {
      type: DataTypes.DATE,
      field: 'ChangedAt',
    },
    changedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'ChangedBy',
    },
  }, {
    tableName: 'VisitStatusHistory',
    timestamps: false,
  });

  // Relationships
  Patient.hasMany(PatientAllergy, { foreignKey: 'patientId', as: 'allergies' });
  Patient.hasMany(PatientMedicalHistory, { foreignKey: 'patientId', as: 'medicalHistories' });
  Patient.hasMany(Appointment, { foreignKey: 'patientId', as: 'appointments' });
  Patient.hasMany(Visit, { foreignKey: 'patientId', as: 'visits' });

  Appointment.belongsTo(Patient, { foreignKey: 'patientId', as: 'patient' });
  Appointment.belongsTo(Branch, { foreignKey: 'branchId', as: 'branch' });
  Appointment.belongsTo(User, { foreignKey: 'doctorId', as: 'doctor' });
  Appointment.belongsTo(Room, { foreignKey: 'roomId', as: 'room' });

  Visit.belongsTo(Patient, { foreignKey: 'patientId', as: 'patient' });
  Visit.belongsTo(Branch, { foreignKey: 'branchId', as: 'branch' });
  Visit.belongsTo(User, { foreignKey: 'doctorId', as: 'doctor' });
  Visit.belongsTo(Room, { foreignKey: 'roomId', as: 'room' });
  Visit.hasMany(VisitStatusHistory, { foreignKey: 'visitId', as: 'statusHistory' });

  TreatmentRelationship.belongsTo(User, { foreignKey: 'doctorId', as: 'doctor' });
  TreatmentRelationship.belongsTo(Patient, { foreignKey: 'patientId', as: 'patient' });
  TreatmentRelationship.belongsTo(Visit, { foreignKey: 'visitId', as: 'visit' });

  return {
    Patient,
    PatientAllergy,
    PatientMedicalHistory,
    Appointment,
    Visit,
    TreatmentRelationship,
    VisitStatusHistory,
  };
}
