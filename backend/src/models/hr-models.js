import { DataTypes } from 'sequelize';

export function initHrModels(sequelize, { userModels, catalogModels, clinicalModels }) {
  const User = userModels?.User || sequelize.models.Users;
  const Service = catalogModels?.Service || sequelize.models.Services;
  const ServiceCompletionEvent = clinicalModels?.ServiceCompletionEvent || sequelize.models.ServiceCompletionEvents;

  // 1. Employees
  const Employee = sequelize.define('Employees', {
    employeeId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'EmployeeId',
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      field: 'UserId',
    },
    employeeCode: {
      type: DataTypes.STRING(30),
      allowNull: false,
      unique: true,
      field: 'EmployeeCode',
    },
    baseSalary: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'BaseSalary',
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'ACTIVE',
      field: 'Status',
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
    tableName: 'Employees',
    timestamps: false,
  });

  // 2. CommissionRuleVersions
  const CommissionRuleVersion = sequelize.define('CommissionRuleVersions', {
    commissionRuleVersionId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'CommissionRuleVersionId',
    },
    serviceId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'ServiceId',
    },
    versionNo: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'VersionNo',
    },
    basis: {
      type: DataTypes.STRING(30),
      allowNull: false,
      field: 'Basis', // 'COMPLETION' | 'CONFIRMED_COLLECTION'
    },
    ratePercent: {
      type: DataTypes.DECIMAL(7, 4),
      allowNull: false,
      field: 'RatePercent', // 0 -> 100
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
    tableName: 'CommissionRuleVersions',
    timestamps: false,
  });

  // 3. PayrollPeriods
  const PayrollPeriod = sequelize.define('PayrollPeriods', {
    payrollPeriodId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'PayrollPeriodId',
    },
    code: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
      field: 'Code',
    },
    startsOn: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'StartsOn',
    },
    endsOn: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'EndsOn',
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'OPEN',
      field: 'Status', // 'OPEN' | 'CALCULATED' | 'LOCKED'
    },
    lockedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'LockedAt',
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
    tableName: 'PayrollPeriods',
    timestamps: false,
  });

  // 4. Commissions
  const Commission = sequelize.define('Commissions', {
    commissionId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'CommissionId',
    },
    employeeId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'EmployeeId',
    },
    serviceCompletionEventId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'ServiceCompletionEventId',
    },
    commissionRuleVersionId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'CommissionRuleVersionId',
    },
    payrollPeriodId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'PayrollPeriodId',
    },
    basisAmount: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: false,
      field: 'BasisAmount',
    },
    commissionAmount: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: false,
      field: 'CommissionAmount',
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'CALCULATED',
      field: 'Status', // 'CALCULATED' | 'APPROVED' | 'PAID' | 'REVERSED'
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
    tableName: 'Commissions',
    timestamps: false,
  });

  // 5. CommissionAdjustments
  const CommissionAdjustment = sequelize.define('CommissionAdjustments', {
    commissionAdjustmentId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'CommissionAdjustmentId',
    },
    commissionId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'CommissionId',
    },
    payrollPeriodId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'PayrollPeriodId',
    },
    amount: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: false,
      field: 'Amount', // <> 0, can be negative
    },
    reason: {
      type: DataTypes.STRING(500),
      allowNull: false,
      field: 'Reason',
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
    tableName: 'CommissionAdjustments',
    timestamps: false,
  });

  // Relationships
  if (User) {
    Employee.belongsTo(User, { foreignKey: 'userId', as: 'user' });
    CommissionRuleVersion.belongsTo(User, { foreignKey: 'approvedBy', as: 'approver' });
  }

  if (Service) {
    CommissionRuleVersion.belongsTo(Service, { foreignKey: 'serviceId', as: 'service' });
  }

  if (ServiceCompletionEvent) {
    Commission.belongsTo(ServiceCompletionEvent, { foreignKey: 'serviceCompletionEventId', as: 'completionEvent' });
  }

  Employee.hasMany(Commission, { foreignKey: 'employeeId', as: 'commissions' });
  Commission.belongsTo(Employee, { foreignKey: 'employeeId', as: 'employee' });

  CommissionRuleVersion.hasMany(Commission, { foreignKey: 'commissionRuleVersionId', as: 'commissions' });
  Commission.belongsTo(CommissionRuleVersion, { foreignKey: 'commissionRuleVersionId', as: 'ruleVersion' });

  PayrollPeriod.hasMany(Commission, { foreignKey: 'payrollPeriodId', as: 'commissions' });
  Commission.belongsTo(PayrollPeriod, { foreignKey: 'payrollPeriodId', as: 'payrollPeriod' });

  Commission.hasMany(CommissionAdjustment, { foreignKey: 'commissionId', as: 'adjustments' });
  CommissionAdjustment.belongsTo(Commission, { foreignKey: 'commissionId', as: 'commission' });

  PayrollPeriod.hasMany(CommissionAdjustment, { foreignKey: 'payrollPeriodId', as: 'adjustments' });
  CommissionAdjustment.belongsTo(PayrollPeriod, { foreignKey: 'payrollPeriodId', as: 'payrollPeriod' });

  return {
    Employee,
    CommissionRuleVersion,
    PayrollPeriod,
    Commission,
    CommissionAdjustment,
  };
}
