import { DataTypes } from 'sequelize';

export function initOperationsModels(sequelize, { userModels, patientVisitModels, clinicalModels, inventoryModels }) {
  const User = userModels?.User || sequelize.models.Users;
  const Branch = patientVisitModels?.Branch || sequelize.models.Branches;
  const Patient = patientVisitModels?.Patient || sequelize.models.Patients;
  const Visit = patientVisitModels?.Visit || sequelize.models.Visits;
  const ServiceLine = clinicalModels?.ServiceLine || sequelize.models.ServiceLines;
  const Supplier = inventoryModels?.Supplier || sequelize.models.Suppliers;

  const Asset = sequelize.define('Assets', {
    assetId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'AssetId',
    },
    branchId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'BranchId',
    },
    assetCode: {
      type: DataTypes.STRING(40),
      allowNull: false,
      unique: true,
      field: 'AssetCode',
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: false,
      field: 'Name',
    },
    assetType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'AssetType',
    },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'ACTIVE',
      field: 'Status',
    },
    lastMaintenanceAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'LastMaintenanceAt',
    },
    nextMaintenanceDueAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'NextMaintenanceDueAt',
    },
    calibrationExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'CalibrationExpiresAt',
    },
    responsibleUserId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'ResponsibleUserId',
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
    tableName: 'Assets',
    timestamps: false,
  });

  const SterilizationCycle = sequelize.define('SterilizationCycles', {
    sterilizationCycleId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'SterilizationCycleId',
    },
    assetId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'AssetId',
    },
    cycleNo: {
      type: DataTypes.STRING(60),
      allowNull: false,
      unique: true,
      field: 'CycleNo',
    },
    startedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'StartedAt',
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'CompletedAt',
    },
    indicatorResult: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'IndicatorResult',
    },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'STARTED',
      field: 'Status',
    },
    checkedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'CheckedBy',
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
    tableName: 'SterilizationCycles',
    timestamps: false,
  });

  const InstrumentPack = sequelize.define('InstrumentPacks', {
    instrumentPackId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'InstrumentPackId',
    },
    packCode: {
      type: DataTypes.STRING(60),
      allowNull: false,
      unique: true,
      field: 'PackCode',
    },
    sterilizationCycleId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'SterilizationCycleId',
    },
    packType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'PackType',
    },
    sterileFrom: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'SterileFrom',
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'ExpiresAt',
    },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'PENDING_RELEASE',
      field: 'Status',
    },
    releasedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'ReleasedBy',
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
    tableName: 'InstrumentPacks',
    timestamps: false,
  });

  const PackUsage = sequelize.define('PackUsages', {
    packUsageId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'PackUsageId',
    },
    instrumentPackId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      field: 'InstrumentPackId',
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
    usedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'UsedAt',
    },
    usedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'UsedBy',
    },
  }, {
    tableName: 'PackUsages',
    timestamps: false,
  });

  const LabOrder = sequelize.define('LabOrders', {
    labOrderId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'LabOrderId',
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
    supplierId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'SupplierId',
    },
    specimen: {
      type: DataTypes.STRING(300),
      allowNull: true,
      field: 'Specimen',
    },
    instructions: {
      type: DataTypes.STRING(1000),
      allowNull: false,
      field: 'Instructions',
    },
    dueAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'DueAt',
    },
    status: {
      type: DataTypes.STRING(30),
      defaultValue: 'ORDERED',
      field: 'Status',
    },
    qcResult: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'QcResult',
    },
    cost: {
      type: DataTypes.DECIMAL(18, 2),
      defaultValue: 0,
      field: 'Cost',
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
    tableName: 'LabOrders',
    timestamps: false,
  });

  const LabRework = sequelize.define('LabReworks', {
    labReworkId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'LabReworkId',
    },
    labOrderId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'LabOrderId',
    },
    reworkNo: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'ReworkNo',
    },
    reason: {
      type: DataTypes.STRING(1000),
      allowNull: false,
      field: 'Reason',
    },
    costBearer: {
      type: DataTypes.STRING(30),
      allowNull: false,
      field: 'CostBearer',
    },
    cost: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: false,
      field: 'Cost',
    },
    approvedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'ApprovedBy',
    },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'REQUESTED',
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
    tableName: 'LabReworks',
    timestamps: false,
  });

  const Warranty = sequelize.define('Warranties', {
    warrantyId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'WarrantyId',
    },
    serviceLineId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'ServiceLineId',
    },
    patientId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'PatientId',
    },
    startsAt: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'StartsAt',
    },
    expiresAt: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'ExpiresAt',
    },
    termsJson: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'TermsJson',
    },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'ACTIVE',
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
    tableName: 'Warranties',
    timestamps: false,
  });

  const Incident = sequelize.define('Incidents', {
    incidentId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'IncidentId',
    },
    incidentType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'IncidentType',
    },
    visitId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'VisitId',
    },
    objectType: {
      type: DataTypes.STRING(80),
      allowNull: true,
      field: 'ObjectType',
    },
    objectId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'ObjectId',
    },
    severity: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: 'Severity',
    },
    description: {
      type: DataTypes.STRING(2000),
      allowNull: false,
      field: 'Description',
    },
    ownerId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'OwnerId',
    },
    dueAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'DueAt',
    },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'OPEN',
      field: 'Status',
    },
    resolution: {
      type: DataTypes.STRING(2000),
      allowNull: true,
      field: 'Resolution',
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
    tableName: 'Incidents',
    timestamps: false,
  });

  // Relationships
  SterilizationCycle.belongsTo(Asset, { foreignKey: 'assetId', as: 'asset' });
  Asset.hasMany(SterilizationCycle, { foreignKey: 'assetId', as: 'cycles' });

  InstrumentPack.belongsTo(SterilizationCycle, { foreignKey: 'sterilizationCycleId', as: 'cycle' });
  SterilizationCycle.hasMany(InstrumentPack, { foreignKey: 'sterilizationCycleId', as: 'packs' });

  PackUsage.belongsTo(InstrumentPack, { foreignKey: 'instrumentPackId', as: 'pack' });
  InstrumentPack.hasOne(PackUsage, { foreignKey: 'instrumentPackId', as: 'usage' });

  if (Visit) {
    PackUsage.belongsTo(Visit, { foreignKey: 'visitId', as: 'visit' });
    LabOrder.belongsTo(Visit, { foreignKey: 'visitId', as: 'visit' });
    Incident.belongsTo(Visit, { foreignKey: 'visitId', as: 'visit' });
  }

  if (Patient) {
    PackUsage.belongsTo(Patient, { foreignKey: 'patientId', as: 'patient' });
    Warranty.belongsTo(Patient, { foreignKey: 'patientId', as: 'patient' });
  }

  if (User) {
    Asset.belongsTo(User, { foreignKey: 'responsibleUserId', as: 'responsibleUser' });
    SterilizationCycle.belongsTo(User, { foreignKey: 'checkedBy', as: 'checker' });
    InstrumentPack.belongsTo(User, { foreignKey: 'releasedBy', as: 'releaser' });
    PackUsage.belongsTo(User, { foreignKey: 'usedBy', as: 'user' });
    LabOrder.belongsTo(User, { foreignKey: 'doctorId', as: 'doctor' });
    LabRework.belongsTo(User, { foreignKey: 'approvedBy', as: 'approver' });
    Incident.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });
  }

  if (Supplier) {
    LabOrder.belongsTo(Supplier, { foreignKey: 'supplierId', as: 'supplier' });
  }

  LabRework.belongsTo(LabOrder, { foreignKey: 'labOrderId', as: 'labOrder' });
  LabOrder.hasMany(LabRework, { foreignKey: 'labOrderId', as: 'reworks' });

  if (ServiceLine) {
    Warranty.belongsTo(ServiceLine, { foreignKey: 'serviceLineId', as: 'serviceLine' });
  }

  return {
    Asset,
    SterilizationCycle,
    InstrumentPack,
    PackUsage,
    LabOrder,
    LabRework,
    Warranty,
    Incident,
  };
}
