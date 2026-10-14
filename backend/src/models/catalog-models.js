import { DataTypes } from 'sequelize';

export function initCatalogModels(sequelize, userModels) {
  const { Branch, User } = userModels;

  const Room = sequelize.define('Rooms', {
    roomId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'RoomId',
    },
    branchId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'BranchId',
    },
    code: {
      type: DataTypes.STRING(30),
      allowNull: false,
      field: 'Code',
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
      field: 'Name',
    },
    roomType: {
      type: DataTypes.STRING(30),
      defaultValue: 'CHAIR',
      field: 'RoomType',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'IsActive',
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
    tableName: 'Rooms',
    timestamps: false,
  });

  const Service = sequelize.define('Services', {
    serviceId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'ServiceId',
    },
    code: {
      type: DataTypes.STRING(30),
      allowNull: false,
      unique: true,
      field: 'Code',
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: false,
      field: 'Name',
    },
    requiresConsent: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'RequiresConsent',
    },
    requiresSterilePack: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'RequiresSterilePack',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'IsActive',
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
    tableName: 'Services',
    timestamps: false,
  });

  const ServicePriceVersion = sequelize.define('ServicePriceVersions', {
    priceVersionId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'PriceVersionId',
    },
    serviceId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'ServiceId',
    },
    branchId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'BranchId',
    },
    versionNo: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'VersionNo',
    },
    unitPrice: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: false,
      field: 'UnitPrice',
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
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'DRAFT',
      field: 'Status',
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
    tableName: 'ServicePriceVersions',
    timestamps: false,
  });

  const Supplier = sequelize.define('Suppliers', {
    supplierId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'SupplierId',
    },
    code: {
      type: DataTypes.STRING(30),
      allowNull: false,
      unique: true,
      field: 'Code',
    },
    name: {
      type: DataTypes.STRING(200),
      allowNull: false,
      field: 'Name',
    },
    phone: {
      type: DataTypes.STRING(30),
      allowNull: true,
      field: 'Phone',
    },
    taxCode: {
      type: DataTypes.STRING(30),
      allowNull: true,
      field: 'TaxCode',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'IsActive',
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
    tableName: 'Suppliers',
    timestamps: false,
  });

  const SystemConfigVersion = sequelize.define('SystemConfigVersions', {
    configVersionId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'ConfigVersionId',
    },
    configKey: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'ConfigKey',
    },
    scopeCode: {
      type: DataTypes.STRING(100),
      defaultValue: 'GLOBAL',
      field: 'ScopeCode',
    },
    versionNo: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'VersionNo',
    },
    valueJson: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'ValueJson',
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
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'DRAFT',
      field: 'Status',
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
    tableName: 'SystemConfigVersions',
    timestamps: false,
  });

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

  // Relationships
  Room.belongsTo(Branch, { foreignKey: 'branchId', as: 'branch' });
  ServicePriceVersion.belongsTo(Service, { foreignKey: 'serviceId', as: 'service' });
  ServicePriceVersion.belongsTo(Branch, { foreignKey: 'branchId', as: 'branch' });
  ServicePriceVersion.belongsTo(User, { foreignKey: 'approvedBy', as: 'approver' });
  Service.hasMany(ServicePriceVersion, { foreignKey: 'serviceId', as: 'priceVersions' });
  ConsentTemplate.belongsTo(Service, { foreignKey: 'serviceId', as: 'service' });

  return { Room, Service, ServicePriceVersion, Supplier, SystemConfigVersion, ConsentTemplate };
}
