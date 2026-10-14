import { DataTypes } from 'sequelize';

export function initAccountingModels(sequelize, { userModels, billingModels, catalogModels, branchModels }) {
  const { User } = userModels;
  const { CashShift } = billingModels;
  const Branch = branchModels?.Branch || sequelize.models.Branches;

  const AccountingRuleVersion = catalogModels?.AccountingRuleVersion || sequelize.define('AccountingRuleVersions', {
    accountingRuleVersionId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'AccountingRuleVersionId',
    },
    eventType: {
      type: DataTypes.STRING(80),
      allowNull: false,
      field: 'EventType',
    },
    versionNo: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'VersionNo',
    },
    ruleJson: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'RuleJson',
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
    tableName: 'AccountingRuleVersions',
    timestamps: false,
  });

  const CashCount = sequelize.define('CashCounts', {
    cashCountId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'CashCountId',
    },
    cashShiftId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'CashShiftId',
    },
    denomination: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: false,
      field: 'Denomination',
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'Quantity',
    },
    amount: {
      type: DataTypes.DECIMAL(18, 2),
      field: 'Amount',
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
    tableName: 'CashCounts',
    timestamps: false,
  });

  const CashDiscrepancy = sequelize.define('CashDiscrepancies', {
    cashDiscrepancyId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'CashDiscrepancyId',
    },
    cashShiftId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'CashShiftId',
    },
    amount: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: false,
      field: 'Amount',
    },
    reason: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'Reason',
    },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'PENDING',
      field: 'Status',
    },
    approvedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'ApprovedBy',
    },
    resolvedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'ResolvedAt',
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
    tableName: 'CashDiscrepancies',
    timestamps: false,
  });

  const AccountingPeriod = sequelize.define('AccountingPeriods', {
    accountingPeriodId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'AccountingPeriodId',
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
      defaultValue: 'OPEN',
      field: 'Status',
    },
    closedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'ClosedBy',
    },
    closedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'ClosedAt',
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
    tableName: 'AccountingPeriods',
    timestamps: false,
  });

  const Account = sequelize.define('Accounts', {
    accountId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'AccountId',
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
    accountType: {
      type: DataTypes.STRING(30),
      allowNull: false,
      field: 'AccountType',
    },
    parentAccountId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'ParentAccountId',
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
    tableName: 'Accounts',
    timestamps: false,
  });

  const JournalEntry = sequelize.define('JournalEntries', {
    journalEntryId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'JournalEntryId',
    },
    entryNo: {
      type: DataTypes.STRING(40),
      allowNull: false,
      unique: true,
      field: 'EntryNo',
    },
    sourceEventId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'SourceEventId',
    },
    sourceDocumentId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'SourceDocumentId',
    },
    accountingRuleVersionId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'AccountingRuleVersionId',
    },
    eventType: {
      type: DataTypes.STRING(80),
      allowNull: false,
      field: 'EventType',
    },
    accountingPeriodId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'AccountingPeriodId',
    },
    branchId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'BranchId',
    },
    currency: {
      type: DataTypes.STRING(3),
      defaultValue: 'VND',
      field: 'Currency',
    },
    documentDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'DocumentDate',
    },
    postingDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'PostingDate',
    },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'DRAFT',
      field: 'Status',
    },
    createdByUserId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'CreatedByUserId',
    },
    approvedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'ApprovedBy',
    },
    postedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'PostedAt',
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
  }, {
    tableName: 'JournalEntries',
    timestamps: false,
  });

  const JournalLine = sequelize.define('JournalLines', {
    journalLineId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'JournalLineId',
    },
    journalEntryId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'JournalEntryId',
    },
    lineNo: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'LineNo',
    },
    accountId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'AccountId',
    },
    debit: {
      type: DataTypes.DECIMAL(18, 2),
      defaultValue: 0,
      field: 'Debit',
    },
    credit: {
      type: DataTypes.DECIMAL(18, 2),
      defaultValue: 0,
      field: 'Credit',
    },
    description: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'Description',
    },
  }, {
    tableName: 'JournalLines',
    timestamps: false,
  });

  // Relationships
  CashShift.hasMany(CashCount, { foreignKey: 'cashShiftId', as: 'cashCounts' });
  CashCount.belongsTo(CashShift, { foreignKey: 'cashShiftId', as: 'cashShift' });

  CashShift.hasMany(CashDiscrepancy, { foreignKey: 'cashShiftId', as: 'discrepancies' });
  CashDiscrepancy.belongsTo(CashShift, { foreignKey: 'cashShiftId', as: 'cashShift' });
  CashDiscrepancy.belongsTo(User, { foreignKey: 'approvedBy', as: 'approver' });

  AccountingPeriod.belongsTo(User, { foreignKey: 'closedBy', as: 'closer' });
  AccountingPeriod.hasMany(JournalEntry, { foreignKey: 'accountingPeriodId', as: 'journalEntries' });

  Account.belongsTo(Account, { foreignKey: 'parentAccountId', as: 'parentAccount' });
  Account.hasMany(Account, { foreignKey: 'parentAccountId', as: 'childAccounts' });

  JournalEntry.belongsTo(AccountingPeriod, { foreignKey: 'accountingPeriodId', as: 'period' });
  if (Branch) {
    JournalEntry.belongsTo(Branch, { foreignKey: 'branchId', as: 'branch' });
  }
  JournalEntry.belongsTo(User, { foreignKey: 'createdByUserId', as: 'creator' });
  JournalEntry.belongsTo(User, { foreignKey: 'approvedBy', as: 'approver' });
  JournalEntry.belongsTo(AccountingRuleVersion, { foreignKey: 'accountingRuleVersionId', as: 'ruleVersion' });
  JournalEntry.hasMany(JournalLine, { foreignKey: 'journalEntryId', as: 'lines' });

  JournalLine.belongsTo(JournalEntry, { foreignKey: 'journalEntryId', as: 'journalEntry' });
  JournalLine.belongsTo(Account, { foreignKey: 'accountId', as: 'account' });

  return {
    CashCount,
    CashDiscrepancy,
    AccountingPeriod,
    Account,
    JournalEntry,
    JournalLine,
    AccountingRuleVersion,
  };
}
