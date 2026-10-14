import { DataTypes } from 'sequelize';

export function initReconciliationModels(sequelize, { userModels, patientVisitModels, operationsModels }) {
  const User = userModels?.User || sequelize.models.Users;
  const Branch = patientVisitModels?.Branch || sequelize.models.Branches;
  const Asset = operationsModels?.Asset || sequelize.models.Assets;

  // 1. MaintenanceLogs
  const MaintenanceLog = sequelize.define('MaintenanceLogs', {
    maintenanceLogId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'MaintenanceLogId',
    },
    assetId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'AssetId',
    },
    maintenanceType: {
      type: DataTypes.STRING(30),
      allowNull: false,
      field: 'MaintenanceType',
    },
    performedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'PerformedAt',
    },
    result: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: 'Result', // 'PASS' | 'FAIL' | 'LIMITED'
    },
    nextDueAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'NextDueAt',
    },
    details: {
      type: DataTypes.STRING(1000),
      allowNull: true,
      field: 'Details',
    },
    performedBy: {
      type: DataTypes.STRING(200),
      allowNull: false,
      field: 'PerformedBy',
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'CreatedAt',
    },
    createdBy: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'CreatedBy',
    },
  }, {
    tableName: 'MaintenanceLogs',
    timestamps: false,
  });

  // 2. ReconciliationItems
  const ReconciliationItem = sequelize.define('ReconciliationItems', {
    reconciliationItemId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'ReconciliationItemId',
    },
    reconciliationDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'ReconciliationDate',
    },
    branchId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'BranchId',
    },
    itemType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'ItemType',
    },
    referenceType: {
      type: DataTypes.STRING(80),
      allowNull: true,
      field: 'ReferenceType',
    },
    referenceId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'ReferenceId',
    },
    severity: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: 'Severity', // 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    },
    description: {
      type: DataTypes.STRING(1000),
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
      allowNull: false,
      defaultValue: 'OPEN',
      field: 'Status', // 'OPEN' | 'IN_PROGRESS' | 'PENDING_APPROVAL' | 'RESOLVED' | 'CLOSED'
    },
    resolution: {
      type: DataTypes.STRING(1000),
      allowNull: true,
      field: 'Resolution',
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'CreatedAt',
    },
    createdBy: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'CreatedBy',
    },
  }, {
    tableName: 'ReconciliationItems',
    timestamps: false,
  });

  // 3. ReportDefinitions
  const ReportDefinition = sequelize.define('ReportDefinitions', {
    reportDefinitionId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'ReportDefinitionId',
    },
    code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'Code',
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: false,
      field: 'Name',
    },
    definitionJson: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'DefinitionJson',
    },
    versionNo: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'VersionNo',
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'DRAFT',
      field: 'Status', // 'DRAFT' | 'APPROVED' | 'RETIRED'
    },
    approvedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'ApprovedBy',
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'CreatedAt',
    },
    createdBy: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'CreatedBy',
    },
  }, {
    tableName: 'ReportDefinitions',
    timestamps: false,
  });

  // Relationships
  if (Asset) {
    MaintenanceLog.belongsTo(Asset, { foreignKey: 'assetId', as: 'asset' });
    Asset.hasMany(MaintenanceLog, { foreignKey: 'assetId', as: 'maintenanceLogs' });
  }

  if (Branch) {
    ReconciliationItem.belongsTo(Branch, { foreignKey: 'branchId', as: 'branch' });
  }

  if (User) {
    ReconciliationItem.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });
    ReportDefinition.belongsTo(User, { foreignKey: 'approvedBy', as: 'approver' });
  }

  return {
    MaintenanceLog,
    ReconciliationItem,
    ReportDefinition,
  };
}
