-- Execute in [Graduation Project]. Read-only: checks presence, not all future business invariants.
IF EXISTS (
  SELECT name FROM (VALUES
    ('SchemaMigrations'),('Roles'),('Branches'),('Users'),('AccessAuditLogs'),('IdempotencyKeys'),
    ('Rooms'),('Services'),('ServicePriceVersions'),('TaxRateVersions'),('DiscountPolicies'),('AccountingRuleVersions'),('Suppliers'),('SystemConfigVersions'),('ConsentTemplates'),
    ('Patients'),('PatientAliases'),('PatientAllergies'),('PatientMedicalHistory'),('PatientMergeRecords'),('Appointments'),('Visits'),('TreatmentRelationships'),('VisitStatusHistory'),('EmergencyAccessGrants'),
    ('EmrRecords'),('EmrVersions'),('Diagnoses'),('ToothChart'),('TreatmentPlans'),('Prescriptions'),('ClinicalOrders'),('Consents'),('EmrAddenda'),('ServiceLines'),('ServiceCompletionEvents'),('SignQueue'),
    ('CashShifts'),('Invoices'),('InvoiceLines'),('PaymentAllocations'),('Deposits'),('PaymentTransactions'),('DepositApplications'),('Refunds'),('DiscountApprovals'),('Receivables'),('CreditNotes'),('InvoiceAdjustments'),
    ('Warehouses'),('Items'),('GoodsReceipts'),('StockLots'),('StockSerials'),('StockBalances'),('StockReservations'),('StockMovements'),('Stocktakes'),('LotRecalls'),
    ('CashCounts'),('CashDiscrepancies'),('AccountingPeriods'),('Accounts'),('JournalEntries'),('JournalLines'),
    ('InsuranceContracts'),('InsuranceClaims'),('InsuranceClaimLines'),('InsuranceClaimVersions'),('InsuranceClaimPayments'),('ClaimDisputes'),
    ('Assets'),('SterilizationCycles'),('InstrumentPacks'),('PackUsages'),('LabOrders'),('LabReworks'),('Warranties'),('Incidents'),
    ('Employees'),('CommissionRuleVersions'),('PayrollPeriods'),('Commissions'),('CommissionAdjustments'),('MaintenanceLogs'),('ReconciliationItems'),('ReportDefinitions'),
    ('Roles_Deleted'),('Branches_Deleted'),('Users_Deleted'),('Rooms_Deleted'),('Services_Deleted'),('Suppliers_Deleted'),('ConsentTemplates_Deleted'),
    ('Patients_Deleted'),('Appointments_Deleted'),('Warehouses_Deleted'),('Items_Deleted'),('Assets_Deleted')) AS required(name)
  WHERE OBJECT_ID(N'dbo.' + name, N'U') IS NULL
) THROW 51003, 'Foundation table missing. Investigate schema drift; bootstrap will not overwrite it.', 1;

IF EXISTS (
  SELECT name FROM (VALUES ('TR_Roles_Archive'),('TR_Branches_Archive'),('TR_Users_Archive'),
    ('TR_Roles_ImmutableId'),('TR_Branches_ImmutableId'),('TR_Users_ImmutableId'),('TR_AccessAuditLogs_AppendOnly')) AS required(name)
  WHERE NOT EXISTS (SELECT 1 FROM sys.triggers t WHERE t.object_id = OBJECT_ID(N'dbo.' + required.name) AND t.is_disabled = 0)
) THROW 51004, 'Foundation trigger missing/disabled. Investigate schema drift.', 1;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.IdempotencyKeys') AND name='UQ_IdempotencyKeys_Scope_Key' AND is_unique=1)
  THROW 51005, 'Idempotency unique constraint missing.', 1;
IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE parent_object_id=OBJECT_ID(N'dbo.Users') AND (is_disabled=1 OR is_not_trusted=1))
  THROW 51006, 'Users FK disabled or untrusted.', 1;
IF NOT EXISTS (SELECT 1 FROM dbo.SchemaMigrations WHERE MigrationId='001-full-schema')
  THROW 51007, 'Full schema migration marker missing.', 1;
PRINT 'Full project schema objects verified. Business AT-01 through AT-24 still require API/integration tests.';
