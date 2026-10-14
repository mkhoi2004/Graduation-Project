import { DataTypes } from 'sequelize';

export function initClinicalModels(sequelize, userModels, catalogModels, patientVisitModels) {
  const { User } = userModels;
  const { Service, ServicePriceVersion } = catalogModels;
  const { Patient, Visit } = patientVisitModels;

  const ConsentTemplate = sequelize.define('ConsentTemplates', {
    consentTemplateId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'ConsentTemplateId',
    },
    serviceId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'ServiceId',
    },
    code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'Code',
    },
    versionNo: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'VersionNo',
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
      field: 'Title',
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'Content',
    },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'DRAFT',
      field: 'Status',
    },
    effectiveFrom: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'EffectiveFrom',
    },
    effectiveTo: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'EffectiveTo',
    },
    approvedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'ApprovedBy',
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
    tableName: 'ConsentTemplates',
    timestamps: false,
  });

  const EmrRecord = sequelize.define('EmrRecords', {
    emrRecordId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'EmrRecordId',
    },
    visitId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      field: 'VisitId',
    },
    patientId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'PatientId',
    },
    doctorId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'DoctorId',
    },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'DRAFT',
      field: 'Status',
    },
    currentVersionNo: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      field: 'CurrentVersionNo',
    },
    signedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'SignedAt',
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
    originalId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'OriginalId',
    },
  }, {
    tableName: 'EmrRecords',
    timestamps: false,
  });

  const EmrVersion = sequelize.define('EmrVersions', {
    emrVersionId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'EmrVersionId',
    },
    emrRecordId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'EmrRecordId',
    },
    versionNo: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'VersionNo',
    },
    clinicalContentJson: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'ClinicalContentJson',
    },
    authoredBy: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'AuthoredBy',
    },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'DRAFT',
      field: 'Status',
    },
    signedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'SignedAt',
    },
    signatureHash: {
      type: DataTypes.CHAR(64),
      allowNull: true,
      field: 'SignatureHash',
    },
    createdAt: {
      type: DataTypes.DATE,
      field: 'CreatedAt',
    },
    originalId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'OriginalId',
    },
  }, {
    tableName: 'EmrVersions',
    timestamps: false,
  });

  const Diagnosis = sequelize.define('Diagnoses', {
    diagnosisId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'DiagnosisId',
    },
    emrVersionId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'EmrVersionId',
    },
    code: {
      type: DataTypes.STRING(30),
      allowNull: true,
      field: 'Code',
    },
    description: {
      type: DataTypes.STRING(500),
      allowNull: false,
      field: 'Description',
    },
    isPrimary: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'IsPrimary',
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
    tableName: 'Diagnoses',
    timestamps: false,
  });

  const ToothChart = sequelize.define('ToothChart', {
    toothChartId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'ToothChartId',
    },
    emrVersionId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'EmrVersionId',
    },
    toothCode: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: 'ToothCode',
    },
    surfaceCode: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'SurfaceCode',
    },
    findingCode: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'FindingCode',
    },
    note: {
      type: DataTypes.STRING(500),
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
    tableName: 'ToothChart',
    timestamps: false,
  });

  const TreatmentPlan = sequelize.define('TreatmentPlans', {
    treatmentPlanId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'TreatmentPlanId',
    },
    visitId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'VisitId',
    },
    patientId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'PatientId',
    },
    doctorId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'DoctorId',
    },
    phaseNo: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'PhaseNo',
    },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'DRAFT',
      field: 'Status',
    },
    planJson: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'PlanJson',
    },
    acceptedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'AcceptedAt',
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
    tableName: 'TreatmentPlans',
    timestamps: false,
  });

  const Prescription = sequelize.define('Prescriptions', {
    prescriptionId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'PrescriptionId',
    },
    visitId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'VisitId',
    },
    doctorId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'DoctorId',
    },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'DRAFT',
      field: 'Status',
    },
    prescriptionJson: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'PrescriptionJson',
    },
    signedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'SignedAt',
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
    tableName: 'Prescriptions',
    timestamps: false,
  });

  const ClinicalOrder = sequelize.define('ClinicalOrders', {
    clinicalOrderId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'ClinicalOrderId',
    },
    visitId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'VisitId',
    },
    doctorId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'DoctorId',
    },
    orderType: {
      type: DataTypes.STRING(30),
      allowNull: false,
      field: 'OrderType',
    },
    orderJson: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'OrderJson',
    },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'ORDERED',
      field: 'Status',
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
    tableName: 'ClinicalOrders',
    timestamps: false,
  });

  const Consent = sequelize.define('Consents', {
    consentId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'ConsentId',
    },
    visitId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'VisitId',
    },
    consentTemplateId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'ConsentTemplateId',
    },
    patientId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'PatientId',
    },
    signerName: {
      type: DataTypes.STRING(200),
      allowNull: true,
      field: 'SignerName',
    },
    signerRelationship: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'SignerRelationship',
    },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'DRAFT',
      field: 'Status',
    },
    presentedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'PresentedAt',
    },
    signedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'SignedAt',
    },
    revokedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'RevokedAt',
    },
    signatureData: {
      type: DataTypes.BLOB,
      allowNull: true,
      field: 'SignatureData',
    },
    revocationReason: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'RevocationReason',
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
    originalId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'OriginalId',
    },
  }, {
    tableName: 'Consents',
    timestamps: false,
  });

  const EmrAddendum = sequelize.define('EmrAddenda', {
    emrAddendumId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'EmrAddendumId',
    },
    emrVersionId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'EmrVersionId',
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'Content',
    },
    reason: {
      type: DataTypes.STRING(500),
      allowNull: false,
      field: 'Reason',
    },
    authoredBy: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'AuthoredBy',
    },
    signedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'SignedAt',
    },
    createdAt: {
      type: DataTypes.DATE,
      field: 'CreatedAt',
    },
  }, {
    tableName: 'EmrAddenda',
    timestamps: false,
  });

  const ServiceLine = sequelize.define('ServiceLines', {
    serviceLineId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'ServiceLineId',
    },
    visitId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'VisitId',
    },
    treatmentPlanId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'TreatmentPlanId',
    },
    serviceId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'ServiceId',
    },
    priceVersionId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'PriceVersionId',
    },
    quantity: {
      type: DataTypes.DECIMAL(18, 4),
      allowNull: false,
      field: 'Quantity',
    },
    approvedUnitPrice: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: false,
      field: 'ApprovedUnitPrice',
    },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'PLANNED',
      field: 'Status',
    },
    toothCode: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'ToothCode',
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
    tableName: 'ServiceLines',
    timestamps: false,
  });

  const ServiceCompletionEvent = sequelize.define('ServiceCompletionEvents', {
    serviceCompletionEventId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'ServiceCompletionEventId',
    },
    serviceLineId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'ServiceLineId',
    },
    completionVersion: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'CompletionVersion',
    },
    quantityCompleted: {
      type: DataTypes.DECIMAL(18, 4),
      allowNull: false,
      field: 'QuantityCompleted',
    },
    completedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'CompletedBy',
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'CompletedAt',
    },
    result: {
      type: DataTypes.STRING(1000),
      allowNull: true,
      field: 'Result',
    },
    eventType: {
      type: DataTypes.STRING(20),
      defaultValue: 'COMPLETION',
      field: 'EventType',
    },
    originalId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'OriginalId',
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
    tableName: 'ServiceCompletionEvents',
    timestamps: false,
  });

  const SignQueue = sequelize.define('SignQueue', {
    signQueueId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'SignQueueId',
    },
    emrRecordId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'EmrRecordId',
    },
    requestedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'RequestedBy',
    },
    requestedAt: {
      type: DataTypes.DATE,
      field: 'RequestedAt',
    },
    dueAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'DueAt',
    },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'PENDING',
      field: 'Status',
    },
    failureReason: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'FailureReason',
    },
  }, {
    tableName: 'SignQueue',
    timestamps: false,
  });

  // Relationships
  ConsentTemplate.belongsTo(Service, { foreignKey: 'serviceId', as: 'service' });
  ConsentTemplate.belongsTo(User, { foreignKey: 'approvedBy', as: 'approver' });

  EmrRecord.belongsTo(Visit, { foreignKey: 'visitId', as: 'visit' });
  EmrRecord.belongsTo(Patient, { foreignKey: 'patientId', as: 'patient' });
  EmrRecord.belongsTo(User, { foreignKey: 'doctorId', as: 'doctor' });
  EmrRecord.hasMany(EmrVersion, { foreignKey: 'emrRecordId', as: 'versions' });

  EmrVersion.belongsTo(EmrRecord, { foreignKey: 'emrRecordId', as: 'emrRecord' });
  EmrVersion.belongsTo(User, { foreignKey: 'authoredBy', as: 'author' });
  EmrVersion.hasMany(Diagnosis, { foreignKey: 'emrVersionId', as: 'diagnoses' });
  EmrVersion.hasMany(ToothChart, { foreignKey: 'emrVersionId', as: 'toothChart' });
  EmrVersion.hasMany(EmrAddendum, { foreignKey: 'emrVersionId', as: 'addenda' });

  Diagnosis.belongsTo(EmrVersion, { foreignKey: 'emrVersionId', as: 'emrVersion' });
  ToothChart.belongsTo(EmrVersion, { foreignKey: 'emrVersionId', as: 'emrVersion' });
  EmrAddendum.belongsTo(EmrVersion, { foreignKey: 'emrVersionId', as: 'emrVersion' });
  EmrAddendum.belongsTo(User, { foreignKey: 'authoredBy', as: 'author' });

  TreatmentPlan.belongsTo(Visit, { foreignKey: 'visitId', as: 'visit' });
  TreatmentPlan.belongsTo(Patient, { foreignKey: 'patientId', as: 'patient' });
  TreatmentPlan.belongsTo(User, { foreignKey: 'doctorId', as: 'doctor' });
  TreatmentPlan.hasMany(ServiceLine, { foreignKey: 'treatmentPlanId', as: 'serviceLines' });

  Prescription.belongsTo(Visit, { foreignKey: 'visitId', as: 'visit' });
  Prescription.belongsTo(User, { foreignKey: 'doctorId', as: 'doctor' });

  ClinicalOrder.belongsTo(Visit, { foreignKey: 'visitId', as: 'visit' });
  ClinicalOrder.belongsTo(User, { foreignKey: 'doctorId', as: 'doctor' });

  Consent.belongsTo(Visit, { foreignKey: 'visitId', as: 'visit' });
  Consent.belongsTo(ConsentTemplate, { foreignKey: 'consentTemplateId', as: 'template' });
  Consent.belongsTo(Patient, { foreignKey: 'patientId', as: 'patient' });

  ServiceLine.belongsTo(Visit, { foreignKey: 'visitId', as: 'visit' });
  ServiceLine.belongsTo(Service, { foreignKey: 'serviceId', as: 'service' });
  ServiceLine.belongsTo(ServicePriceVersion, { foreignKey: 'priceVersionId', as: 'priceVersion' });
  ServiceLine.belongsTo(TreatmentPlan, { foreignKey: 'treatmentPlanId', as: 'treatmentPlan' });
  ServiceLine.hasMany(ServiceCompletionEvent, { foreignKey: 'serviceLineId', as: 'completionEvents' });

  ServiceCompletionEvent.belongsTo(ServiceLine, { foreignKey: 'serviceLineId', as: 'serviceLine' });
  ServiceCompletionEvent.belongsTo(User, { foreignKey: 'completedBy', as: 'completer' });

  SignQueue.belongsTo(EmrRecord, { foreignKey: 'emrRecordId', as: 'emrRecord' });
  SignQueue.belongsTo(User, { foreignKey: 'requestedBy', as: 'requester' });

  return {
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
  };
}
