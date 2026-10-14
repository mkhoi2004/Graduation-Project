import { DataTypes } from 'sequelize';

export function initInsuranceModels(sequelize, { patientVisitModels, billingModels }) {
  const Patient = patientVisitModels?.Patient || sequelize.models.Patients;
  const Visit = patientVisitModels?.Visit || sequelize.models.Visits;
  const InvoiceLine = billingModels?.InvoiceLine || sequelize.models.InvoiceLines;
  const Invoice = billingModels?.Invoice || sequelize.models.Invoices;
  const Receivable = billingModels?.Receivable || sequelize.models.Receivables;

  const InsuranceContract = sequelize.define('InsuranceContracts', {
    insuranceContractId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'InsuranceContractId',
    },
    contractNo: {
      type: DataTypes.STRING(80),
      allowNull: false,
      unique: true,
      field: 'ContractNo',
    },
    payerName: {
      type: DataTypes.STRING(200),
      allowNull: false,
      field: 'PayerName',
    },
    effectiveFrom: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'EffectiveFrom',
    },
    effectiveTo: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'EffectiveTo',
    },
    coverageRulesJson: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'CoverageRulesJson',
    },
    limitAmount: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: true,
      field: 'LimitAmount',
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
    tableName: 'InsuranceContracts',
    timestamps: false,
  });

  const InsuranceClaim = sequelize.define('InsuranceClaims', {
    insuranceClaimId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'InsuranceClaimId',
    },
    claimNo: {
      type: DataTypes.STRING(60),
      allowNull: false,
      unique: true,
      field: 'ClaimNo',
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
    insuranceContractId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'InsuranceContractId',
    },
    status: {
      type: DataTypes.STRING(30),
      defaultValue: 'DRAFT',
      field: 'Status',
    },
    requestedAmount: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: false,
      field: 'RequestedAmount',
    },
    approvedAmount: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: true,
      field: 'ApprovedAmount',
    },
    settledAmount: {
      type: DataTypes.DECIMAL(18, 2),
      defaultValue: 0,
      field: 'SettledAmount',
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
    tableName: 'InsuranceClaims',
    timestamps: false,
  });

  const InsuranceClaimLine = sequelize.define('InsuranceClaimLines', {
    insuranceClaimLineId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'InsuranceClaimLineId',
    },
    insuranceClaimId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'InsuranceClaimId',
    },
    invoiceLineId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'InvoiceLineId',
    },
    requestedAmount: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: false,
      field: 'RequestedAmount',
    },
    approvedAmount: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: true,
      field: 'ApprovedAmount',
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
    tableName: 'InsuranceClaimLines',
    timestamps: false,
  });

  const InsuranceClaimVersion = sequelize.define('InsuranceClaimVersions', {
    insuranceClaimVersionId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'InsuranceClaimVersionId',
    },
    insuranceClaimId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'InsuranceClaimId',
    },
    versionNo: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'VersionNo',
    },
    destination: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'Destination',
    },
    payloadHash: {
      type: DataTypes.STRING(64),
      allowNull: false,
      field: 'PayloadHash',
    },
    payloadJson: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'PayloadJson',
    },
    status: {
      type: DataTypes.STRING(30),
      allowNull: false,
      field: 'Status',
    },
    submittedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'SubmittedAt',
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
    tableName: 'InsuranceClaimVersions',
    timestamps: false,
  });

  const InsuranceClaimPayment = sequelize.define('InsuranceClaimPayments', {
    insuranceClaimPaymentId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'InsuranceClaimPaymentId',
    },
    insuranceClaimId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'InsuranceClaimId',
    },
    externalReference: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      field: 'ExternalReference',
    },
    amount: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: false,
      field: 'Amount',
    },
    receivedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'ReceivedAt',
    },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'PENDING',
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
    tableName: 'InsuranceClaimPayments',
    timestamps: false,
  });

  const ClaimDispute = sequelize.define('ClaimDisputes', {
    claimDisputeId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'ClaimDisputeId',
    },
    insuranceClaimId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'InsuranceClaimId',
    },
    disputedAmount: {
      type: DataTypes.DECIMAL(18, 2),
      allowNull: false,
      field: 'DisputedAmount',
    },
    reason: {
      type: DataTypes.STRING(1000),
      allowNull: false,
      field: 'Reason',
    },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'OPEN',
      field: 'Status',
    },
    dueAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'DueAt',
    },
    resolution: {
      type: DataTypes.STRING(1000),
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
    tableName: 'ClaimDisputes',
    timestamps: false,
  });

  // Relationships
  InsuranceClaim.belongsTo(InsuranceContract, { foreignKey: 'insuranceContractId', as: 'contract' });
  InsuranceContract.hasMany(InsuranceClaim, { foreignKey: 'insuranceContractId', as: 'claims' });

  if (Patient) {
    InsuranceClaim.belongsTo(Patient, { foreignKey: 'patientId', as: 'patient' });
  }
  if (Visit) {
    InsuranceClaim.belongsTo(Visit, { foreignKey: 'visitId', as: 'visit' });
  }

  InsuranceClaim.hasMany(InsuranceClaimLine, { foreignKey: 'insuranceClaimId', as: 'lines' });
  InsuranceClaimLine.belongsTo(InsuranceClaim, { foreignKey: 'insuranceClaimId', as: 'claim' });

  if (InvoiceLine) {
    InsuranceClaimLine.belongsTo(InvoiceLine, { foreignKey: 'invoiceLineId', as: 'invoiceLine' });
  }

  InsuranceClaim.hasMany(InsuranceClaimVersion, { foreignKey: 'insuranceClaimId', as: 'versions' });
  InsuranceClaimVersion.belongsTo(InsuranceClaim, { foreignKey: 'insuranceClaimId', as: 'claim' });

  InsuranceClaim.hasMany(InsuranceClaimPayment, { foreignKey: 'insuranceClaimId', as: 'payments' });
  InsuranceClaimPayment.belongsTo(InsuranceClaim, { foreignKey: 'insuranceClaimId', as: 'claim' });

  InsuranceClaim.hasMany(ClaimDispute, { foreignKey: 'insuranceClaimId', as: 'disputes' });
  ClaimDispute.belongsTo(InsuranceClaim, { foreignKey: 'insuranceClaimId', as: 'claim' });

  return {
    InsuranceContract,
    InsuranceClaim,
    InsuranceClaimLine,
    InsuranceClaimVersion,
    InsuranceClaimPayment,
    ClaimDispute,
  };
}
