CREATE TABLE dbo.CashShifts (
  CashShiftId UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_CashShifts_Id DEFAULT NEWSEQUENTIALID(), BranchId UNIQUEIDENTIFIER NOT NULL,
  CashierId UNIQUEIDENTIFIER NOT NULL, OpeningFloat DECIMAL(18,2) NOT NULL, ExpectedCash DECIMAL(18,2) NULL, ActualCash DECIMAL(18,2) NULL,
  Status VARCHAR(20) NOT NULL CONSTRAINT DF_CashShifts_Status DEFAULT 'OPEN', OpenedAt DATETIME2 NOT NULL CONSTRAINT DF_CashShifts_OpenedAt DEFAULT SYSUTCDATETIME(),
  ClosedAt DATETIME2 NULL, ReconciledAt DATETIME2 NULL, ApprovedBy UNIQUEIDENTIFIER NULL, CreatedBy VARCHAR(100) NOT NULL, Version ROWVERSION NOT NULL,
  CONSTRAINT PK_CashShifts PRIMARY KEY(CashShiftId), CONSTRAINT FK_CashShifts_Branch FOREIGN KEY(BranchId) REFERENCES dbo.Branches(BranchId),
  CONSTRAINT FK_CashShifts_Cashier FOREIGN KEY(CashierId) REFERENCES dbo.Users(UserId), CONSTRAINT FK_CashShifts_Approver FOREIGN KEY(ApprovedBy) REFERENCES dbo.Users(UserId),
  CONSTRAINT CK_CashShifts_Amounts CHECK(OpeningFloat >= 0 AND (ExpectedCash IS NULL OR ExpectedCash >= 0) AND (ActualCash IS NULL OR ActualCash >= 0)),
  CONSTRAINT CK_CashShifts_Status CHECK(Status IN ('OPEN','CLOSED','RECONCILED','CANCELLED'))
);
CREATE UNIQUE INDEX UX_CashShifts_OneOpenPerCashier ON dbo.CashShifts(CashierId) WHERE Status='OPEN';
CREATE TABLE dbo.Invoices (
  InvoiceId UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_Invoices_Id DEFAULT NEWSEQUENTIALID(), InvoiceNo VARCHAR(40) NOT NULL,
  VisitId UNIQUEIDENTIFIER NOT NULL, PatientId UNIQUEIDENTIFIER NOT NULL, Gross DECIMAL(18,2) NOT NULL, ApprovedDiscount DECIMAL(18,2) NOT NULL CONSTRAINT DF_Invoices_Discount DEFAULT 0,
  Tax DECIMAL(18,2) NOT NULL CONSTRAINT DF_Invoices_Tax DEFAULT 0, RoundingAdjustment DECIMAL(18,2) NOT NULL CONSTRAINT DF_Invoices_Rounding DEFAULT 0,
  NetPayable AS (Gross - ApprovedDiscount + Tax + RoundingAdjustment) PERSISTED,
  Status VARCHAR(20) NOT NULL CONSTRAINT DF_Invoices_Status DEFAULT 'DRAFT', IssuedAt DATETIME2 NULL,
  CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Invoices_CreatedAt DEFAULT SYSUTCDATETIME(), CreatedBy VARCHAR(100) NOT NULL, OriginalId UNIQUEIDENTIFIER NULL, Version ROWVERSION NOT NULL,
  CONSTRAINT PK_Invoices PRIMARY KEY(InvoiceId), CONSTRAINT UQ_Invoices_No UNIQUE(InvoiceNo), CONSTRAINT FK_Invoices_Visit FOREIGN KEY(VisitId) REFERENCES dbo.Visits(VisitId),
  CONSTRAINT FK_Invoices_Patient FOREIGN KEY(PatientId) REFERENCES dbo.Patients(PatientId), CONSTRAINT FK_Invoices_Original FOREIGN KEY(OriginalId) REFERENCES dbo.Invoices(InvoiceId),
  CONSTRAINT CK_Invoices_Amounts CHECK(Gross >= 0 AND ApprovedDiscount >= 0 AND ApprovedDiscount <= Gross AND Tax >= 0 AND Gross - ApprovedDiscount + Tax + RoundingAdjustment >= 0),
  CONSTRAINT CK_Invoices_Status CHECK(Status IN ('DRAFT','ISSUED','PARTIALLY_PAID','PAID','VOID','ADJUSTED'))
);
CREATE TABLE dbo.InvoiceLines (
  InvoiceLineId UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_InvoiceLines_Id DEFAULT NEWSEQUENTIALID(), InvoiceId UNIQUEIDENTIFIER NOT NULL,
  ServiceCompletionEventId UNIQUEIDENTIFIER NOT NULL, Description NVARCHAR(300) NOT NULL, Quantity DECIMAL(18,4) NOT NULL,
  UnitPrice DECIMAL(18,2) NOT NULL, DiscountAmount DECIMAL(18,2) NOT NULL CONSTRAINT DF_InvoiceLines_Discount DEFAULT 0,
  TaxAmount DECIMAL(18,2) NOT NULL CONSTRAINT DF_InvoiceLines_Tax DEFAULT 0, LineTotal AS (Quantity * UnitPrice - DiscountAmount + TaxAmount) PERSISTED,
  TaxRateVersionId UNIQUEIDENTIFIER NULL, PriceVersionId UNIQUEIDENTIFIER NOT NULL, CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_InvoiceLines_CreatedAt DEFAULT SYSUTCDATETIME(), CreatedBy VARCHAR(100) NOT NULL,
  CONSTRAINT PK_InvoiceLines PRIMARY KEY(InvoiceLineId), CONSTRAINT UQ_InvoiceLines_Completion UNIQUE(ServiceCompletionEventId),
  CONSTRAINT FK_InvoiceLines_Invoice FOREIGN KEY(InvoiceId) REFERENCES dbo.Invoices(InvoiceId), CONSTRAINT FK_InvoiceLines_Completion FOREIGN KEY(ServiceCompletionEventId) REFERENCES dbo.ServiceCompletionEvents(ServiceCompletionEventId),
  CONSTRAINT FK_InvoiceLines_TaxRate FOREIGN KEY(TaxRateVersionId) REFERENCES dbo.TaxRateVersions(TaxRateVersionId), CONSTRAINT FK_InvoiceLines_Price FOREIGN KEY(PriceVersionId) REFERENCES dbo.ServicePriceVersions(PriceVersionId),
  CONSTRAINT CK_InvoiceLines_Amounts CHECK(Quantity > 0 AND UnitPrice >= 0 AND DiscountAmount >= 0 AND DiscountAmount <= Quantity * UnitPrice AND TaxAmount >= 0)
);
CREATE TABLE dbo.PaymentAllocations (
  PaymentAllocationId UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_PaymentAllocations_Id DEFAULT NEWSEQUENTIALID(), InvoiceId UNIQUEIDENTIFIER NOT NULL,
  AllocationVersion INT NOT NULL, PatientAllocation DECIMAL(18,2) NOT NULL, BhtmAllocation DECIMAL(18,2) NOT NULL,
  Status VARCHAR(20) NOT NULL CONSTRAINT DF_PaymentAllocations_Status DEFAULT 'DRAFT', FinalizedAt DATETIME2 NULL,
  CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_PaymentAllocations_CreatedAt DEFAULT SYSUTCDATETIME(), CreatedBy VARCHAR(100) NOT NULL,
  CONSTRAINT PK_PaymentAllocations PRIMARY KEY(PaymentAllocationId), CONSTRAINT UQ_PaymentAllocations_Invoice_Version UNIQUE(InvoiceId, AllocationVersion),
  CONSTRAINT FK_PaymentAllocations_Invoice FOREIGN KEY(InvoiceId) REFERENCES dbo.Invoices(InvoiceId),
  CONSTRAINT CK_PaymentAllocations_Amounts CHECK(PatientAllocation >= 0 AND BhtmAllocation >= 0),
  CONSTRAINT CK_PaymentAllocations_Status CHECK(Status IN ('DRAFT','FINALIZED','SUPERSEDED'))
);
CREATE TABLE dbo.Deposits (
  DepositId UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_Deposits_Id DEFAULT NEWSEQUENTIALID(), PatientId UNIQUEIDENTIFIER NOT NULL,
  PayerName NVARCHAR(200) NOT NULL, Amount DECIMAL(18,2) NOT NULL, Balance DECIMAL(18,2) NOT NULL,
  Method VARCHAR(20) NOT NULL, Status VARCHAR(20) NOT NULL CONSTRAINT DF_Deposits_Status DEFAULT 'PENDING', ExternalReference VARCHAR(100) NULL,
  ConfirmedAt DATETIME2 NULL, CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Deposits_CreatedAt DEFAULT SYSUTCDATETIME(), CreatedBy VARCHAR(100) NOT NULL, OriginalId UNIQUEIDENTIFIER NULL, Version ROWVERSION NOT NULL,
  CONSTRAINT PK_Deposits PRIMARY KEY(DepositId), CONSTRAINT FK_Deposits_Patient FOREIGN KEY(PatientId) REFERENCES dbo.Patients(PatientId),
  CONSTRAINT FK_Deposits_Original FOREIGN KEY(OriginalId) REFERENCES dbo.Deposits(DepositId), CONSTRAINT CK_Deposits_Amounts CHECK(Amount > 0 AND Balance >= 0 AND Balance <= Amount),
  CONSTRAINT CK_Deposits_Method CHECK(Method IN ('CASH','BANK_TRANSFER','QR','CARD')), CONSTRAINT CK_Deposits_Status CHECK(Status IN ('PENDING','CONFIRMED','FAILED','REFUNDED','VOID'))
);
CREATE TABLE dbo.PaymentTransactions (
  PaymentTransactionId UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_PaymentTransactions_Id DEFAULT NEWSEQUENTIALID(), InvoiceId UNIQUEIDENTIFIER NULL,
  DepositId UNIQUEIDENTIFIER NULL, CashShiftId UNIQUEIDENTIFIER NULL, PatientId UNIQUEIDENTIFIER NOT NULL, Amount DECIMAL(18,2) NOT NULL,
  Method VARCHAR(20) NOT NULL, Status VARCHAR(20) NOT NULL CONSTRAINT DF_PaymentTransactions_Status DEFAULT 'INITIATED', ExternalReference VARCHAR(100) NULL,
  ConfirmedAt DATETIME2 NULL, CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_PaymentTransactions_CreatedAt DEFAULT SYSUTCDATETIME(), CreatedBy VARCHAR(100) NOT NULL, OriginalId UNIQUEIDENTIFIER NULL,
  CONSTRAINT PK_PaymentTransactions PRIMARY KEY(PaymentTransactionId), CONSTRAINT FK_PaymentTransactions_Invoice FOREIGN KEY(InvoiceId) REFERENCES dbo.Invoices(InvoiceId),
  CONSTRAINT FK_PaymentTransactions_Deposit FOREIGN KEY(DepositId) REFERENCES dbo.Deposits(DepositId), CONSTRAINT FK_PaymentTransactions_Shift FOREIGN KEY(CashShiftId) REFERENCES dbo.CashShifts(CashShiftId),
  CONSTRAINT FK_PaymentTransactions_Patient FOREIGN KEY(PatientId) REFERENCES dbo.Patients(PatientId), CONSTRAINT FK_PaymentTransactions_Original FOREIGN KEY(OriginalId) REFERENCES dbo.PaymentTransactions(PaymentTransactionId),
  CONSTRAINT CK_PaymentTransactions_Amount CHECK(Amount > 0), CONSTRAINT CK_PaymentTransactions_Method CHECK(Method IN ('CASH','BANK_TRANSFER','QR','CARD','DEPOSIT')),
  CONSTRAINT CK_PaymentTransactions_CashShift CHECK(Method <> 'CASH' OR CashShiftId IS NOT NULL),
  CONSTRAINT CK_PaymentTransactions_Status CHECK(Status IN ('INITIATED','PENDING','CONFIRMED','FAILED','VOID'))
);
CREATE UNIQUE INDEX UX_PaymentTransactions_ExternalReference ON dbo.PaymentTransactions(Method, ExternalReference) WHERE ExternalReference IS NOT NULL;
CREATE TABLE dbo.DepositApplications (
  DepositApplicationId UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_DepositApplications_Id DEFAULT NEWSEQUENTIALID(), DepositId UNIQUEIDENTIFIER NOT NULL,
  InvoiceId UNIQUEIDENTIFIER NOT NULL, Amount DECIMAL(18,2) NOT NULL, Status VARCHAR(20) NOT NULL CONSTRAINT DF_DepositApplications_Status DEFAULT 'CONFIRMED',
  AppliedAt DATETIME2 NOT NULL CONSTRAINT DF_DepositApplications_AppliedAt DEFAULT SYSUTCDATETIME(), CreatedBy VARCHAR(100) NOT NULL, OriginalId UNIQUEIDENTIFIER NULL,
  CONSTRAINT PK_DepositApplications PRIMARY KEY(DepositApplicationId), CONSTRAINT FK_DepositApplications_Deposit FOREIGN KEY(DepositId) REFERENCES dbo.Deposits(DepositId),
  CONSTRAINT FK_DepositApplications_Invoice FOREIGN KEY(InvoiceId) REFERENCES dbo.Invoices(InvoiceId), CONSTRAINT FK_DepositApplications_Original FOREIGN KEY(OriginalId) REFERENCES dbo.DepositApplications(DepositApplicationId),
  CONSTRAINT CK_DepositApplications_Amount CHECK(Amount > 0), CONSTRAINT CK_DepositApplications_Status CHECK(Status IN ('CONFIRMED','REVERSED'))
);
CREATE TABLE dbo.Refunds (
  RefundId UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_Refunds_Id DEFAULT NEWSEQUENTIALID(), PaymentTransactionId UNIQUEIDENTIFIER NOT NULL,
  Amount DECIMAL(18,2) NOT NULL, Reason NVARCHAR(500) NOT NULL, Status VARCHAR(20) NOT NULL CONSTRAINT DF_Refunds_Status DEFAULT 'REQUESTED',
  RequestedBy UNIQUEIDENTIFIER NOT NULL, ApprovedBy UNIQUEIDENTIFIER NULL, ConfirmedAt DATETIME2 NULL,
  CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Refunds_CreatedAt DEFAULT SYSUTCDATETIME(), OriginalId UNIQUEIDENTIFIER NULL,
  CONSTRAINT PK_Refunds PRIMARY KEY(RefundId), CONSTRAINT FK_Refunds_Payment FOREIGN KEY(PaymentTransactionId) REFERENCES dbo.PaymentTransactions(PaymentTransactionId),
  CONSTRAINT FK_Refunds_Requester FOREIGN KEY(RequestedBy) REFERENCES dbo.Users(UserId), CONSTRAINT FK_Refunds_Approver FOREIGN KEY(ApprovedBy) REFERENCES dbo.Users(UserId),
  CONSTRAINT FK_Refunds_Original FOREIGN KEY(OriginalId) REFERENCES dbo.Refunds(RefundId), CONSTRAINT CK_Refunds_Amount CHECK(Amount > 0),
  CONSTRAINT CK_Refunds_MakerChecker CHECK(ApprovedBy IS NULL OR ApprovedBy <> RequestedBy), CONSTRAINT CK_Refunds_Status CHECK(Status IN ('REQUESTED','APPROVED','SENT','CONFIRMED','FAILED','REJECTED'))
);
CREATE TABLE dbo.DiscountApprovals (
  DiscountApprovalId UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_DiscountApprovals_Id DEFAULT NEWSEQUENTIALID(), InvoiceId UNIQUEIDENTIFIER NOT NULL,
  DiscountPolicyId UNIQUEIDENTIFIER NULL, Amount DECIMAL(18,2) NOT NULL, Reason NVARCHAR(500) NOT NULL,
  RequestedBy UNIQUEIDENTIFIER NOT NULL, ApprovedBy UNIQUEIDENTIFIER NULL, Status VARCHAR(20) NOT NULL CONSTRAINT DF_DiscountApprovals_Status DEFAULT 'REQUESTED',
  CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_DiscountApprovals_CreatedAt DEFAULT SYSUTCDATETIME(),
  CONSTRAINT PK_DiscountApprovals PRIMARY KEY(DiscountApprovalId), CONSTRAINT FK_DiscountApprovals_Invoice FOREIGN KEY(InvoiceId) REFERENCES dbo.Invoices(InvoiceId),
  CONSTRAINT FK_DiscountApprovals_Policy FOREIGN KEY(DiscountPolicyId) REFERENCES dbo.DiscountPolicies(DiscountPolicyId),
  CONSTRAINT FK_DiscountApprovals_Requester FOREIGN KEY(RequestedBy) REFERENCES dbo.Users(UserId), CONSTRAINT FK_DiscountApprovals_Approver FOREIGN KEY(ApprovedBy) REFERENCES dbo.Users(UserId),
  CONSTRAINT CK_DiscountApprovals_Amount CHECK(Amount > 0), CONSTRAINT CK_DiscountApprovals_MakerChecker CHECK(ApprovedBy IS NULL OR ApprovedBy <> RequestedBy),
  CONSTRAINT CK_DiscountApprovals_Status CHECK(Status IN ('REQUESTED','APPROVED','REJECTED','CANCELLED'))
);
CREATE TABLE dbo.Receivables (
  ReceivableId UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_Receivables_Id DEFAULT NEWSEQUENTIALID(), InvoiceId UNIQUEIDENTIFIER NOT NULL,
  DebtorType VARCHAR(20) NOT NULL, DebtorReferenceId UNIQUEIDENTIFIER NULL, AllocationAmount DECIMAL(18,2) NOT NULL,
  ConfirmedPayment DECIMAL(18,2) NOT NULL CONSTRAINT DF_Receivables_Payment DEFAULT 0, AppliedAdvance DECIMAL(18,2) NOT NULL CONSTRAINT DF_Receivables_Advance DEFAULT 0,
  PostedCredit DECIMAL(18,2) NOT NULL CONSTRAINT DF_Receivables_Credit DEFAULT 0, RefundedAmount DECIMAL(18,2) NOT NULL CONSTRAINT DF_Receivables_Refund DEFAULT 0,
  Outstanding AS (AllocationAmount - ConfirmedPayment - AppliedAdvance - PostedCredit + RefundedAmount) PERSISTED,
  DueAt DATETIME2 NULL, Status VARCHAR(20) NOT NULL CONSTRAINT DF_Receivables_Status DEFAULT 'OPEN', OwnerDepartment VARCHAR(80) NOT NULL,
  CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Receivables_CreatedAt DEFAULT SYSUTCDATETIME(), CreatedBy VARCHAR(100) NOT NULL, Version ROWVERSION NOT NULL,
  CONSTRAINT PK_Receivables PRIMARY KEY(ReceivableId), CONSTRAINT FK_Receivables_Invoice FOREIGN KEY(InvoiceId) REFERENCES dbo.Invoices(InvoiceId),
  CONSTRAINT CK_Receivables_Debtor CHECK(DebtorType IN ('PATIENT','BHTM')), CONSTRAINT CK_Receivables_Amounts CHECK(AllocationAmount >= 0 AND ConfirmedPayment >= 0 AND AppliedAdvance >= 0 AND PostedCredit >= 0 AND RefundedAmount >= 0 AND AllocationAmount - ConfirmedPayment - AppliedAdvance - PostedCredit + RefundedAmount >= 0),
  CONSTRAINT CK_Receivables_Status CHECK(Status IN ('OPEN','PARTIALLY_PAID','PAID','DISPUTED','WRITTEN_OFF'))
);
CREATE TABLE dbo.CreditNotes (
  CreditNoteId UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_CreditNotes_Id DEFAULT NEWSEQUENTIALID(), InvoiceId UNIQUEIDENTIFIER NOT NULL,
  Amount DECIMAL(18,2) NOT NULL, Reason NVARCHAR(500) NOT NULL, Status VARCHAR(20) NOT NULL CONSTRAINT DF_CreditNotes_Status DEFAULT 'DRAFT',
  ApprovedBy UNIQUEIDENTIFIER NULL, CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_CreditNotes_CreatedAt DEFAULT SYSUTCDATETIME(), CreatedBy VARCHAR(100) NOT NULL,
  CONSTRAINT PK_CreditNotes PRIMARY KEY(CreditNoteId), CONSTRAINT FK_CreditNotes_Invoice FOREIGN KEY(InvoiceId) REFERENCES dbo.Invoices(InvoiceId),
  CONSTRAINT FK_CreditNotes_Approver FOREIGN KEY(ApprovedBy) REFERENCES dbo.Users(UserId), CONSTRAINT CK_CreditNotes_Amount CHECK(Amount > 0),
  CONSTRAINT CK_CreditNotes_Status CHECK(Status IN ('DRAFT','APPROVED','POSTED','VOID'))
);
CREATE TABLE dbo.InvoiceAdjustments (
  InvoiceAdjustmentId UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_InvoiceAdjustments_Id DEFAULT NEWSEQUENTIALID(), InvoiceId UNIQUEIDENTIFIER NOT NULL,
  AdjustmentType VARCHAR(20) NOT NULL, Amount DECIMAL(18,2) NOT NULL, Reason NVARCHAR(500) NOT NULL,
  CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_InvoiceAdjustments_CreatedAt DEFAULT SYSUTCDATETIME(), CreatedBy VARCHAR(100) NOT NULL, OriginalId UNIQUEIDENTIFIER NULL,
  CONSTRAINT PK_InvoiceAdjustments PRIMARY KEY(InvoiceAdjustmentId), CONSTRAINT FK_InvoiceAdjustments_Invoice FOREIGN KEY(InvoiceId) REFERENCES dbo.Invoices(InvoiceId),
  CONSTRAINT FK_InvoiceAdjustments_Original FOREIGN KEY(OriginalId) REFERENCES dbo.InvoiceAdjustments(InvoiceAdjustmentId),
  CONSTRAINT CK_InvoiceAdjustments_Amount CHECK(Amount <> 0), CONSTRAINT CK_InvoiceAdjustments_Type CHECK(AdjustmentType IN ('PRICE','TAX','DISCOUNT','ROUNDING','REVERSAL'))
);
