BEGIN TRY
BEGIN TRAN;

ALTER TABLE [dbo].[DentalService] ADD
  [serviceType] VARCHAR(20) NOT NULL CONSTRAINT [DentalService_serviceType_df] DEFAULT 'TREATMENT',
  [taxClassification] NVARCHAR(100),
  [defaultTaxRate] DECIMAL(5,2);
ALTER TABLE [dbo].[Payment] ADD [accountingEntryId] INT;
ALTER TABLE [dbo].[ExaminationSupply] ADD [intakeServiceId] INT;

CREATE TABLE [dbo].[AccountingEvent] (
  [id] INT NOT NULL IDENTITY(1,1), [sourceType] VARCHAR(30) NOT NULL,
  [sourceCode] VARCHAR(80) NOT NULL, [eventType] VARCHAR(50) NOT NULL,
  [idempotencyKey] VARCHAR(120) NOT NULL, [payloadJson] NVARCHAR(MAX) NOT NULL,
  [status] VARCHAR(20) NOT NULL CONSTRAINT [AccountingEvent_status_df] DEFAULT 'PENDING',
  [errorMessage] NVARCHAR(1000), [processedAt] DATETIME2,
  [createdAt] DATETIME2 NOT NULL CONSTRAINT [AccountingEvent_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT [AccountingEvent_pkey] PRIMARY KEY CLUSTERED ([id]),
  CONSTRAINT [AccountingEvent_source_key] UNIQUE NONCLUSTERED ([sourceType],[sourceCode],[eventType],[idempotencyKey])
);

CREATE TABLE [dbo].[AccountingEntry] (
  [id] INT NOT NULL IDENTITY(1,1), [eventId] INT, [ledgerView] VARCHAR(20) NOT NULL,
  [direction] VARCHAR(10) NOT NULL, [category] VARCHAR(50) NOT NULL, [effectiveDate] DATETIME2 NOT NULL,
  [roomId] INT, [patientId] INT, [supplierId] INT, [sourceType] VARCHAR(30) NOT NULL,
  [sourceCode] VARCHAR(80) NOT NULL, [preTaxAmount] INT NOT NULL CONSTRAINT [AccountingEntry_preTaxAmount_df] DEFAULT 0,
  [taxRate] DECIMAL(7,4), [taxAmount] INT NOT NULL CONSTRAINT [AccountingEntry_taxAmount_df] DEFAULT 0,
  [totalAmount] INT NOT NULL CONSTRAINT [AccountingEntry_totalAmount_df] DEFAULT 0,
  [affectsCash] BIT NOT NULL CONSTRAINT [AccountingEntry_affectsCash_df] DEFAULT 0,
  [paymentMethod] VARCHAR(30), [transactionCode] VARCHAR(120), [paymentStatus] VARCHAR(30),
  [documentStatus] VARCHAR(30), [status] VARCHAR(20) NOT NULL CONSTRAINT [AccountingEntry_status_df] DEFAULT 'POSTED',
  [reversalOfId] INT, [reason] NVARCHAR(500), [actorId] INT, [approverId] INT, [taxConfirmedAt] DATETIME2,
  [createdAt] DATETIME2 NOT NULL CONSTRAINT [AccountingEntry_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT [AccountingEntry_pkey] PRIMARY KEY CLUSTERED ([id])
);

CREATE TABLE [dbo].[PerformanceLine] (
  [id] INT NOT NULL IDENTITY(1,1), [eventId] INT NOT NULL, [examinationId] INT NOT NULL,
  [intakeServiceId] INT NOT NULL, [serviceId] INT NOT NULL, [doctorId] INT NOT NULL, [roomId] INT NOT NULL,
  [serviceType] VARCHAR(20) NOT NULL, [taxClassification] NVARCHAR(100), [taxRate] DECIMAL(7,4),
  [taxAmount] INT NOT NULL CONSTRAINT [PerformanceLine_taxAmount_df] DEFAULT 0,
  [recognizedRevenue] INT NOT NULL CONSTRAINT [PerformanceLine_revenue_df] DEFAULT 0,
  [supplyCost] INT NOT NULL CONSTRAINT [PerformanceLine_supplyCost_df] DEFAULT 0,
  [status] VARCHAR(20) NOT NULL CONSTRAINT [PerformanceLine_status_df] DEFAULT 'POSTED', [reversalOfId] INT,
  [effectiveDate] DATETIME2 NOT NULL, [createdAt] DATETIME2 NOT NULL CONSTRAINT [PerformanceLine_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT [PerformanceLine_pkey] PRIMARY KEY CLUSTERED ([id])
);

CREATE TABLE [dbo].[Debt] (
  [id] INT NOT NULL IDENTITY(1,1), [debtType] VARCHAR(30) NOT NULL, [patientId] INT, [supplierId] INT, [roomId] INT,
  [sourceType] VARCHAR(30) NOT NULL, [sourceCode] VARCHAR(80) NOT NULL, [principalAmount] INT NOT NULL,
  [dueDate] DATE, [status] VARCHAR(20) NOT NULL CONSTRAINT [Debt_status_df] DEFAULT 'UNPAID', [reversalOfId] INT,
  [effectiveDate] DATETIME2 NOT NULL, [createdAt] DATETIME2 NOT NULL CONSTRAINT [Debt_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT [Debt_pkey] PRIMARY KEY CLUSTERED ([id])
);

CREATE TABLE [dbo].[DebtPaymentAllocation] (
  [id] INT NOT NULL IDENTITY(1,1), [debtId] INT NOT NULL, [cashEntryId] INT NOT NULL, [amount] INT NOT NULL,
  [reversedAt] DATETIME2, [createdAt] DATETIME2 NOT NULL CONSTRAINT [DebtPaymentAllocation_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT [DebtPaymentAllocation_pkey] PRIMARY KEY CLUSTERED ([id])
);

CREATE TABLE [dbo].[PatientAdvanceAllocation] (
  [id] INT NOT NULL IDENTITY(1,1), [cashEntryId] INT NOT NULL, [patientId] INT NOT NULL, [intakeId] INT,
  [examinationId] INT, [amount] INT NOT NULL, [reversedAt] DATETIME2,
  [createdAt] DATETIME2 NOT NULL CONSTRAINT [PatientAdvanceAllocation_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT [PatientAdvanceAllocation_pkey] PRIMARY KEY CLUSTERED ([id])
);

CREATE TABLE [dbo].[SupplierInvoice] (
  [id] INT NOT NULL IDENTITY(1,1), [invoiceNumber] VARCHAR(80) NOT NULL, [series] VARCHAR(50) NOT NULL,
  [invoiceDate] DATE NOT NULL, [supplierId] INT, [supplierTaxCode] VARCHAR(30) NOT NULL,
  [buyerName] NVARCHAR(200), [buyerTaxCode] VARCHAR(30), [buyerAddress] NVARCHAR(500),
  [goodsAmount] INT NOT NULL, [taxAmount] INT NOT NULL, [totalAmount] INT NOT NULL,
  [attachmentName] NVARCHAR(255), [attachmentUrl] NVARCHAR(1000),
  [documentStatus] VARCHAR(30) NOT NULL CONSTRAINT [SupplierInvoice_documentStatus_df] DEFAULT 'PENDING',
  [differenceNote] NVARCHAR(500), [createdById] INT,
  [createdAt] DATETIME2 NOT NULL CONSTRAINT [SupplierInvoice_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT [SupplierInvoice_pkey] PRIMARY KEY CLUSTERED ([id]),
  CONSTRAINT [SupplierInvoice_duplicate_key] UNIQUE NONCLUSTERED ([invoiceNumber],[series],[supplierTaxCode])
);

CREATE TABLE [dbo].[SupplierInvoiceStockDocument] (
  [id] INT NOT NULL IDENTITY(1,1), [supplierInvoiceId] INT NOT NULL, [stockDocumentId] INT NOT NULL,
  [linkedAmount] INT NOT NULL, [createdAt] DATETIME2 NOT NULL CONSTRAINT [SupplierInvoiceStockDocument_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT [SupplierInvoiceStockDocument_pkey] PRIMARY KEY CLUSTERED ([id]),
  CONSTRAINT [SupplierInvoiceStockDocument_link_key] UNIQUE NONCLUSTERED ([supplierInvoiceId],[stockDocumentId])
);

CREATE TABLE [dbo].[RefundRequest] (
  [id] INT NOT NULL IDENTITY(1,1), [originalEntryId] INT NOT NULL, [refundEntryId] INT,
  [patientId] INT NOT NULL, [amount] INT NOT NULL, [reason] NVARCHAR(500) NOT NULL,
  [status] VARCHAR(30) NOT NULL CONSTRAINT [RefundRequest_status_df] DEFAULT 'PENDING_APPROVAL',
  [createdById] INT NOT NULL, [approvedById] INT, [approvedAt] DATETIME2,
  [createdAt] DATETIME2 NOT NULL CONSTRAINT [RefundRequest_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT [RefundRequest_pkey] PRIMARY KEY CLUSTERED ([id])
);

CREATE TABLE [dbo].[AccountingPeriodLock] (
  [id] INT NOT NULL IDENTITY(1,1), [year] INT NOT NULL, [month] INT NOT NULL, [reason] NVARCHAR(500) NOT NULL,
  [lockedById] INT NOT NULL, [lockedAt] DATETIME2 NOT NULL CONSTRAINT [AccountingPeriodLock_lockedAt_df] DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT [AccountingPeriodLock_pkey] PRIMARY KEY CLUSTERED ([id]),
  CONSTRAINT [AccountingPeriodLock_period_key] UNIQUE NONCLUSTERED ([year],[month])
);

CREATE TABLE [dbo].[CashReconciliation] (
  [id] INT NOT NULL IDENTITY(1,1), [businessDate] DATE NOT NULL, [roomId] INT,
  [openingBalance] INT NOT NULL, [calculatedBalance] INT NOT NULL, [countedBalance] INT NOT NULL,
  [differenceAmount] INT NOT NULL, [reason] NVARCHAR(500), [recordedById] INT NOT NULL,
  [confirmedById] INT, [confirmedAt] DATETIME2,
  [createdAt] DATETIME2 NOT NULL CONSTRAINT [CashReconciliation_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT [CashReconciliation_pkey] PRIMARY KEY CLUSTERED ([id])
);
CREATE UNIQUE NONCLUSTERED INDEX [CashReconciliation_date_room_key] ON [dbo].[CashReconciliation]([businessDate],[roomId]);

CREATE TABLE [dbo].[AccountingAuditLog] (
  [id] INT NOT NULL IDENTITY(1,1), [entityType] VARCHAR(50) NOT NULL, [entityId] INT NOT NULL,
  [action] VARCHAR(50) NOT NULL, [actorId] INT, [reason] NVARCHAR(500), [beforeJson] NVARCHAR(MAX), [afterJson] NVARCHAR(MAX),
  [createdAt] DATETIME2 NOT NULL CONSTRAINT [AccountingAuditLog_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT [AccountingAuditLog_pkey] PRIMARY KEY CLUSTERED ([id])
);

CREATE INDEX [AccountingEvent_status_createdAt_idx] ON [dbo].[AccountingEvent]([status],[createdAt]);
CREATE INDEX [AccountingEntry_view_date_idx] ON [dbo].[AccountingEntry]([ledgerView],[effectiveDate]);
CREATE INDEX [AccountingEntry_source_idx] ON [dbo].[AccountingEntry]([sourceType],[sourceCode]);
CREATE INDEX [PerformanceLine_exam_idx] ON [dbo].[PerformanceLine]([examinationId]);
CREATE INDEX [Debt_type_status_due_idx] ON [dbo].[Debt]([debtType],[status],[dueDate]);
CREATE INDEX [Debt_source_idx] ON [dbo].[Debt]([sourceType],[sourceCode]);
CREATE INDEX [RefundRequest_status_createdAt_idx] ON [dbo].[RefundRequest]([status],[createdAt]);
CREATE INDEX [AccountingAuditLog_entity_idx] ON [dbo].[AccountingAuditLog]([entityType],[entityId],[createdAt]);
CREATE INDEX [ExaminationSupply_intakeServiceId_idx] ON [dbo].[ExaminationSupply]([intakeServiceId]);

ALTER TABLE [dbo].[ExaminationSupply] ADD CONSTRAINT [ExaminationSupply_intakeServiceId_fkey]
  FOREIGN KEY ([intakeServiceId]) REFERENCES [dbo].[IntakeService]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[AccountingEntry] ADD CONSTRAINT [AccountingEntry_eventId_fkey]
  FOREIGN KEY ([eventId]) REFERENCES [dbo].[AccountingEvent]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[PerformanceLine] ADD CONSTRAINT [PerformanceLine_eventId_fkey]
  FOREIGN KEY ([eventId]) REFERENCES [dbo].[AccountingEvent]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[DebtPaymentAllocation] ADD CONSTRAINT [DebtPaymentAllocation_debtId_fkey]
  FOREIGN KEY ([debtId]) REFERENCES [dbo].[Debt]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[DebtPaymentAllocation] ADD CONSTRAINT [DebtPaymentAllocation_cashEntryId_fkey]
  FOREIGN KEY ([cashEntryId]) REFERENCES [dbo].[AccountingEntry]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[PatientAdvanceAllocation] ADD CONSTRAINT [PatientAdvanceAllocation_cashEntryId_fkey]
  FOREIGN KEY ([cashEntryId]) REFERENCES [dbo].[AccountingEntry]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[SupplierInvoiceStockDocument] ADD CONSTRAINT [SupplierInvoiceStockDocument_invoiceId_fkey]
  FOREIGN KEY ([supplierInvoiceId]) REFERENCES [dbo].[SupplierInvoice]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

COMMIT TRAN;
END TRY
BEGIN CATCH
IF @@TRANCOUNT > 0 ROLLBACK TRAN;
THROW;
END CATCH
