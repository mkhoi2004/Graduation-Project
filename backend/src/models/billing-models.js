import { DataTypes } from 'sequelize';

export function initBillingModels(sequelize, userModels, catalogModels, patientVisitModels, clinicalModels) {
  const { User, Branch } = userModels;
  const { ServicePriceVersion, TaxRateVersion } = catalogModels;
  const { Patient, Visit } = patientVisitModels;
  const { ServiceCompletionEvent } = clinicalModels;

  const CashShift = sequelize.define('CashShifts', {
    cashShiftId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'CashShiftId',
    },
    branchId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'BranchId',
    },
    cashierId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'CashierId',
    },
    openingFloat: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: false,
      field: 'OpeningFloat',
    },
    expectedCash: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: true,
      field: 'ExpectedCash',
    },
    actualCash: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: true,
      field: 'ActualCash',
    },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'OPEN',
      field: 'Status',
    },
    openedAt: {
      type: DataTypes.DATE,
      field: 'OpenedAt',
    },
    closedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'ClosedAt',
    },
    reconciledAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'ReconciledAt',
    },
    approvedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'ApprovedBy',
    },
    createdBy: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'CreatedBy',
    },
  }, {
    tableName: 'CashShifts',
    timestamps: false,
  });

  const Invoice = sequelize.define('Invoices', {
    invoiceId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'InvoiceId',
    },
    invoiceNo: {
      type: DataTypes.STRING(40),
      allowNull: false,
      unique: true,
      field: 'InvoiceNo',
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
    gross: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: false,
      field: 'Gross',
    },
    approvedDiscount: {
      type: DataTypes.DECIMAL(18, 2),
      defaultValue: 0,
      field: 'ApprovedDiscount',
    },
    tax: {
      type: DataTypes.DECIMAL(18, 2),
      defaultValue: 0,
      field: 'Tax',
    },
    roundingAdjustment: {
      type: DataTypes.DECIMAL(18, 2),
      defaultValue: 0,
      field: 'RoundingAdjustment',
    },
    netPayable: {
      type: DataTypes.DECIMAL(18, 2),
      field: 'NetPayable',
      // Computed column in SQL Server
    },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'DRAFT',
      field: 'Status',
    },
    issuedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'IssuedAt',
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
    tableName: 'Invoices',
    timestamps: false,
  });

  const InvoiceLine = sequelize.define('InvoiceLines', {
    invoiceLineId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'InvoiceLineId',
    },
    invoiceId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'InvoiceId',
    },
    serviceCompletionEventId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      field: 'ServiceCompletionEventId',
    },
    description: {
      type: DataTypes.STRING(300),
      allowNull: false,
      field: 'Description',
    },
    quantity: {
      type: DataTypes.DECIMAL(18, 4),
      allowNull: false,
      field: 'Quantity',
    },
    unitPrice: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: false,
      field: 'UnitPrice',
    },
    discountAmount: {
      type: DataTypes.DECIMAL(18, 2),
      defaultValue: 0,
      field: 'DiscountAmount',
    },
    taxAmount: {
      type: DataTypes.DECIMAL(18, 2),
      defaultValue: 0,
      field: 'TaxAmount',
    },
    lineTotal: {
      type: DataTypes.DECIMAL(18, 2),
      field: 'LineTotal',
      // Computed column in SQL Server
    },
    taxRateVersionId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'TaxRateVersionId',
    },
    priceVersionId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'PriceVersionId',
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
    tableName: 'InvoiceLines',
    timestamps: false,
  });

  const PaymentAllocation = sequelize.define('PaymentAllocations', {
    paymentAllocationId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'PaymentAllocationId',
    },
    invoiceId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'InvoiceId',
    },
    allocationVersion: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'AllocationVersion',
    },
    patientAllocation: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: false,
      field: 'PatientAllocation',
    },
    bhtmAllocation: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: false,
      field: 'BhtmAllocation',
    },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'DRAFT',
      field: 'Status',
    },
    finalizedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'FinalizedAt',
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
    tableName: 'PaymentAllocations',
    timestamps: false,
  });

  const Deposit = sequelize.define('Deposits', {
    depositId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'DepositId',
    },
    patientId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'PatientId',
    },
    payerName: {
      type: DataTypes.STRING(200),
      allowNull: false,
      field: 'PayerName',
    },
    amount: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: false,
      field: 'Amount',
    },
    balance: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: false,
      field: 'Balance',
    },
    method: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: 'Method',
    },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'PENDING',
      field: 'Status',
    },
    externalReference: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'ExternalReference',
    },
    confirmedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'ConfirmedAt',
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
    tableName: 'Deposits',
    timestamps: false,
  });

  const PaymentTransaction = sequelize.define('PaymentTransactions', {
    paymentTransactionId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'PaymentTransactionId',
    },
    invoiceId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'InvoiceId',
    },
    depositId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'DepositId',
    },
    cashShiftId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'CashShiftId',
    },
    patientId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'PatientId',
    },
    amount: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: false,
      field: 'Amount',
    },
    method: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: 'Method',
    },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'INITIATED',
      field: 'Status',
    },
    externalReference: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'ExternalReference',
    },
    confirmedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'ConfirmedAt',
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
    tableName: 'PaymentTransactions',
    timestamps: false,
  });

  const DepositApplication = sequelize.define('DepositApplications', {
    depositApplicationId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'DepositApplicationId',
    },
    depositId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'DepositId',
    },
    invoiceId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'InvoiceId',
    },
    amount: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: false,
      field: 'Amount',
    },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'CONFIRMED',
      field: 'Status',
    },
    appliedAt: {
      type: DataTypes.DATE,
      field: 'AppliedAt',
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
    tableName: 'DepositApplications',
    timestamps: false,
  });

  const Refund = sequelize.define('Refunds', {
    refundId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'RefundId',
    },
    paymentTransactionId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'PaymentTransactionId',
    },
    amount: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: false,
      field: 'Amount',
    },
    reason: {
      type: DataTypes.STRING(500),
      allowNull: false,
      field: 'Reason',
    },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'REQUESTED',
      field: 'Status',
    },
    requestedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'RequestedBy',
    },
    approvedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'ApprovedBy',
    },
    confirmedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'ConfirmedAt',
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
    tableName: 'Refunds',
    timestamps: false,
  });

  const DiscountApproval = sequelize.define('DiscountApprovals', {
    discountApprovalId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'DiscountApprovalId',
    },
    invoiceId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'InvoiceId',
    },
    discountPolicyId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'DiscountPolicyId',
    },
    amount: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: false,
      field: 'Amount',
    },
    reason: {
      type: DataTypes.STRING(500),
      allowNull: false,
      field: 'Reason',
    },
    requestedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'RequestedBy',
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
  }, {
    tableName: 'DiscountApprovals',
    timestamps: false,
  });

  const Receivable = sequelize.define('Receivables', {
    receivableId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'ReceivableId',
    },
    invoiceId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'InvoiceId',
    },
    debtorType: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: 'DebtorType',
    },
    debtorReferenceId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'DebtorReferenceId',
    },
    allocationAmount: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: false,
      field: 'AllocationAmount',
    },
    confirmedPayment: {
      type: DataTypes.DECIMAL(18, 2),
      defaultValue: 0,
      field: 'ConfirmedPayment',
    },
    appliedAdvance: {
      type: DataTypes.DECIMAL(18, 2),
      defaultValue: 0,
      field: 'AppliedAdvance',
    },
    postedCredit: {
      type: DataTypes.DECIMAL(18, 2),
      defaultValue: 0,
      field: 'PostedCredit',
    },
    refundedAmount: {
      type: DataTypes.DECIMAL(18, 2),
      defaultValue: 0,
      field: 'RefundedAmount',
    },
    outstanding: {
      type: DataTypes.DECIMAL(18, 2),
      field: 'Outstanding',
      // Computed column in SQL Server
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
    ownerDepartment: {
      type: DataTypes.STRING(80),
      allowNull: false,
      field: 'OwnerDepartment',
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
    tableName: 'Receivables',
    timestamps: false,
  });

  // Relationships
  CashShift.belongsTo(Branch, { foreignKey: 'branchId', as: 'branch' });
  CashShift.belongsTo(User, { foreignKey: 'cashierId', as: 'cashier' });
  CashShift.belongsTo(User, { foreignKey: 'approvedBy', as: 'approver' });

  Invoice.belongsTo(Visit, { foreignKey: 'visitId', as: 'visit' });
  Invoice.belongsTo(Patient, { foreignKey: 'patientId', as: 'patient' });
  Invoice.hasMany(InvoiceLine, { foreignKey: 'invoiceId', as: 'lines' });
  Invoice.hasMany(PaymentTransaction, { foreignKey: 'invoiceId', as: 'transactions' });
  Invoice.hasMany(DepositApplication, { foreignKey: 'invoiceId', as: 'depositApplications' });
  Invoice.hasMany(DiscountApproval, { foreignKey: 'invoiceId', as: 'discountApprovals' });
  Invoice.hasMany(Receivable, { foreignKey: 'invoiceId', as: 'receivables' });

  InvoiceLine.belongsTo(Invoice, { foreignKey: 'invoiceId', as: 'invoice' });
  InvoiceLine.belongsTo(ServiceCompletionEvent, { foreignKey: 'serviceCompletionEventId', as: 'completionEvent' });
  InvoiceLine.belongsTo(ServicePriceVersion, { foreignKey: 'priceVersionId', as: 'priceVersion' });

  Deposit.belongsTo(Patient, { foreignKey: 'patientId', as: 'patient' });
  Deposit.hasMany(DepositApplication, { foreignKey: 'depositId', as: 'applications' });
  Deposit.hasMany(PaymentTransaction, { foreignKey: 'depositId', as: 'transactions' });

  PaymentTransaction.belongsTo(Invoice, { foreignKey: 'invoiceId', as: 'invoice' });
  PaymentTransaction.belongsTo(Deposit, { foreignKey: 'depositId', as: 'deposit' });
  PaymentTransaction.belongsTo(CashShift, { foreignKey: 'cashShiftId', as: 'cashShift' });
  PaymentTransaction.belongsTo(Patient, { foreignKey: 'patientId', as: 'patient' });
  PaymentTransaction.hasMany(Refund, { foreignKey: 'paymentTransactionId', as: 'refunds' });

  DepositApplication.belongsTo(Deposit, { foreignKey: 'depositId', as: 'deposit' });
  DepositApplication.belongsTo(Invoice, { foreignKey: 'invoiceId', as: 'invoice' });

  Refund.belongsTo(PaymentTransaction, { foreignKey: 'paymentTransactionId', as: 'transaction' });
  Refund.belongsTo(User, { foreignKey: 'requestedBy', as: 'requester' });
  Refund.belongsTo(User, { foreignKey: 'approvedBy', as: 'approver' });

  DiscountApproval.belongsTo(Invoice, { foreignKey: 'invoiceId', as: 'invoice' });
  DiscountApproval.belongsTo(User, { foreignKey: 'requestedBy', as: 'requester' });
  DiscountApproval.belongsTo(User, { foreignKey: 'approvedBy', as: 'approver' });

  Receivable.belongsTo(Invoice, { foreignKey: 'invoiceId', as: 'invoice' });

  return {
    CashShift,
    Invoice,
    InvoiceLine,
    PaymentAllocation,
    Deposit,
    PaymentTransaction,
    DepositApplication,
    Refund,
    DiscountApproval,
    Receivable,
  };
}
