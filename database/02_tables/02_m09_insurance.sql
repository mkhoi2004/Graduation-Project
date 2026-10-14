CREATE TABLE dbo.InsuranceContracts (
  InsuranceContractId UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_InsuranceContracts_Id DEFAULT NEWSEQUENTIALID(), ContractNo VARCHAR(80) NOT NULL,
  PayerName NVARCHAR(200) NOT NULL, EffectiveFrom DATE NOT NULL, EffectiveTo DATE NOT NULL, CoverageRulesJson NVARCHAR(MAX) NOT NULL,
  LimitAmount DECIMAL(18,2) NULL, Status VARCHAR(20) NOT NULL CONSTRAINT DF_InsuranceContracts_Status DEFAULT 'ACTIVE',
  CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_InsuranceContracts_CreatedAt DEFAULT SYSUTCDATETIME(), CreatedBy VARCHAR(100) NOT NULL, Version ROWVERSION NOT NULL,
  CONSTRAINT PK_InsuranceContracts PRIMARY KEY(InsuranceContractId), CONSTRAINT UQ_InsuranceContracts_No UNIQUE(ContractNo),
  CONSTRAINT CK_InsuranceContracts_Dates CHECK(EffectiveTo >= EffectiveFrom), CONSTRAINT CK_InsuranceContracts_Json CHECK(ISJSON(CoverageRulesJson)=1),
  CONSTRAINT CK_InsuranceContracts_Limit CHECK(LimitAmount IS NULL OR LimitAmount >= 0), CONSTRAINT CK_InsuranceContracts_Status CHECK(Status IN ('DRAFT','ACTIVE','EXPIRED','SUSPENDED'))
);
CREATE TABLE dbo.InsuranceClaims (
  InsuranceClaimId UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_InsuranceClaims_Id DEFAULT NEWSEQUENTIALID(), ClaimNo VARCHAR(60) NOT NULL,
  VisitId UNIQUEIDENTIFIER NOT NULL, PatientId UNIQUEIDENTIFIER NOT NULL, InsuranceContractId UNIQUEIDENTIFIER NOT NULL,
  Status VARCHAR(30) NOT NULL CONSTRAINT DF_InsuranceClaims_Status DEFAULT 'DRAFT', RequestedAmount DECIMAL(18,2) NOT NULL,
  ApprovedAmount DECIMAL(18,2) NULL, SettledAmount DECIMAL(18,2) NOT NULL CONSTRAINT DF_InsuranceClaims_Settled DEFAULT 0,
  CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_InsuranceClaims_CreatedAt DEFAULT SYSUTCDATETIME(), CreatedBy VARCHAR(100) NOT NULL, OriginalId UNIQUEIDENTIFIER NULL, Version ROWVERSION NOT NULL,
  CONSTRAINT PK_InsuranceClaims PRIMARY KEY(InsuranceClaimId), CONSTRAINT UQ_InsuranceClaims_No UNIQUE(ClaimNo),
  CONSTRAINT FK_InsuranceClaims_Visit FOREIGN KEY(VisitId) REFERENCES dbo.Visits(VisitId), CONSTRAINT FK_InsuranceClaims_Patient FOREIGN KEY(PatientId) REFERENCES dbo.Patients(PatientId),
  CONSTRAINT FK_InsuranceClaims_Contract FOREIGN KEY(InsuranceContractId) REFERENCES dbo.InsuranceContracts(InsuranceContractId), CONSTRAINT FK_InsuranceClaims_Original FOREIGN KEY(OriginalId) REFERENCES dbo.InsuranceClaims(InsuranceClaimId),
  CONSTRAINT CK_InsuranceClaims_Amounts CHECK(RequestedAmount >= 0 AND (ApprovedAmount IS NULL OR ApprovedAmount BETWEEN 0 AND RequestedAmount) AND SettledAmount >= 0 AND (ApprovedAmount IS NULL OR SettledAmount <= ApprovedAmount)),
  CONSTRAINT CK_InsuranceClaims_Status CHECK(Status IN ('DRAFT','VALIDATED','SUBMITTED','ACKNOWLEDGED','APPROVED','PARTIALLY_APPROVED','REJECTED','DISPUTED','SETTLED','CLOSED'))
);
CREATE TABLE dbo.InsuranceClaimLines (
  InsuranceClaimLineId UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_InsuranceClaimLines_Id DEFAULT NEWSEQUENTIALID(), InsuranceClaimId UNIQUEIDENTIFIER NOT NULL,
  InvoiceLineId UNIQUEIDENTIFIER NOT NULL, RequestedAmount DECIMAL(18,2) NOT NULL, ApprovedAmount DECIMAL(18,2) NULL,
  CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_InsuranceClaimLines_CreatedAt DEFAULT SYSUTCDATETIME(), CreatedBy VARCHAR(100) NOT NULL,
  CONSTRAINT PK_InsuranceClaimLines PRIMARY KEY(InsuranceClaimLineId), CONSTRAINT UQ_InsuranceClaimLines_Claim_Line UNIQUE(InsuranceClaimId, InvoiceLineId),
  CONSTRAINT FK_InsuranceClaimLines_Claim FOREIGN KEY(InsuranceClaimId) REFERENCES dbo.InsuranceClaims(InsuranceClaimId), CONSTRAINT FK_InsuranceClaimLines_InvoiceLine FOREIGN KEY(InvoiceLineId) REFERENCES dbo.InvoiceLines(InvoiceLineId),
  CONSTRAINT CK_InsuranceClaimLines_Amounts CHECK(RequestedAmount >= 0 AND (ApprovedAmount IS NULL OR ApprovedAmount BETWEEN 0 AND RequestedAmount))
);
CREATE TABLE dbo.InsuranceClaimVersions (
  InsuranceClaimVersionId UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_InsuranceClaimVersions_Id DEFAULT NEWSEQUENTIALID(), InsuranceClaimId UNIQUEIDENTIFIER NOT NULL,
  VersionNo INT NOT NULL, Destination VARCHAR(100) NOT NULL, PayloadHash CHAR(64) NOT NULL, PayloadJson NVARCHAR(MAX) NOT NULL,
  Status VARCHAR(30) NOT NULL, SubmittedAt DATETIME2 NULL, CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_InsuranceClaimVersions_CreatedAt DEFAULT SYSUTCDATETIME(), CreatedBy VARCHAR(100) NOT NULL,
  CONSTRAINT PK_InsuranceClaimVersions PRIMARY KEY(InsuranceClaimVersionId), CONSTRAINT UQ_InsuranceClaimVersions_Submission UNIQUE(InsuranceClaimId, VersionNo, Destination),
  CONSTRAINT FK_InsuranceClaimVersions_Claim FOREIGN KEY(InsuranceClaimId) REFERENCES dbo.InsuranceClaims(InsuranceClaimId), CONSTRAINT CK_InsuranceClaimVersions_Json CHECK(ISJSON(PayloadJson)=1)
);
CREATE TABLE dbo.InsuranceClaimPayments (
  InsuranceClaimPaymentId UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_InsuranceClaimPayments_Id DEFAULT NEWSEQUENTIALID(), InsuranceClaimId UNIQUEIDENTIFIER NOT NULL,
  ExternalReference VARCHAR(100) NOT NULL, Amount DECIMAL(18,2) NOT NULL, ReceivedAt DATETIME2 NOT NULL,
  Status VARCHAR(20) NOT NULL CONSTRAINT DF_InsuranceClaimPayments_Status DEFAULT 'PENDING', CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_InsuranceClaimPayments_CreatedAt DEFAULT SYSUTCDATETIME(), CreatedBy VARCHAR(100) NOT NULL,
  CONSTRAINT PK_InsuranceClaimPayments PRIMARY KEY(InsuranceClaimPaymentId), CONSTRAINT UQ_InsuranceClaimPayments_Reference UNIQUE(ExternalReference),
  CONSTRAINT FK_InsuranceClaimPayments_Claim FOREIGN KEY(InsuranceClaimId) REFERENCES dbo.InsuranceClaims(InsuranceClaimId), CONSTRAINT CK_InsuranceClaimPayments_Amount CHECK(Amount > 0),
  CONSTRAINT CK_InsuranceClaimPayments_Status CHECK(Status IN ('PENDING','CONFIRMED','MISMATCH','FAILED'))
);
CREATE TABLE dbo.ClaimDisputes (
  ClaimDisputeId UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_ClaimDisputes_Id DEFAULT NEWSEQUENTIALID(), InsuranceClaimId UNIQUEIDENTIFIER NOT NULL,
  DisputedAmount DECIMAL(18,2) NOT NULL, Reason NVARCHAR(1000) NOT NULL, Status VARCHAR(20) NOT NULL CONSTRAINT DF_ClaimDisputes_Status DEFAULT 'OPEN',
  DueAt DATETIME2 NULL, Resolution NVARCHAR(1000) NULL, CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_ClaimDisputes_CreatedAt DEFAULT SYSUTCDATETIME(), CreatedBy VARCHAR(100) NOT NULL,
  CONSTRAINT PK_ClaimDisputes PRIMARY KEY(ClaimDisputeId), CONSTRAINT FK_ClaimDisputes_Claim FOREIGN KEY(InsuranceClaimId) REFERENCES dbo.InsuranceClaims(InsuranceClaimId),
  CONSTRAINT CK_ClaimDisputes_Amount CHECK(DisputedAmount > 0), CONSTRAINT CK_ClaimDisputes_Status CHECK(Status IN ('OPEN','UNDER_REVIEW','RESOLVED','CLOSED'))
);
