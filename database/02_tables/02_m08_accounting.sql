CREATE TABLE dbo.CashCounts (
  CashCountId UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_CashCounts_Id DEFAULT NEWSEQUENTIALID(), CashShiftId UNIQUEIDENTIFIER NOT NULL,
  Denomination DECIMAL(18,2) NOT NULL, Quantity INT NOT NULL, Amount AS (Denomination * Quantity) PERSISTED,
  CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_CashCounts_CreatedAt DEFAULT SYSUTCDATETIME(), CreatedBy VARCHAR(100) NOT NULL,
  CONSTRAINT PK_CashCounts PRIMARY KEY(CashCountId), CONSTRAINT UQ_CashCounts_Shift_Denom UNIQUE(CashShiftId, Denomination),
  CONSTRAINT FK_CashCounts_Shift FOREIGN KEY(CashShiftId) REFERENCES dbo.CashShifts(CashShiftId), CONSTRAINT CK_CashCounts_Values CHECK(Denomination > 0 AND Quantity >= 0)
);
CREATE TABLE dbo.CashDiscrepancies (
  CashDiscrepancyId UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_CashDiscrepancies_Id DEFAULT NEWSEQUENTIALID(), CashShiftId UNIQUEIDENTIFIER NOT NULL,
  Amount DECIMAL(18,2) NOT NULL, Reason NVARCHAR(500) NULL, Status VARCHAR(20) NOT NULL CONSTRAINT DF_CashDiscrepancies_Status DEFAULT 'PENDING',
  ApprovedBy UNIQUEIDENTIFIER NULL, ResolvedAt DATETIME2 NULL, CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_CashDiscrepancies_CreatedAt DEFAULT SYSUTCDATETIME(), CreatedBy VARCHAR(100) NOT NULL,
  CONSTRAINT PK_CashDiscrepancies PRIMARY KEY(CashDiscrepancyId), CONSTRAINT FK_CashDiscrepancies_Shift FOREIGN KEY(CashShiftId) REFERENCES dbo.CashShifts(CashShiftId),
  CONSTRAINT FK_CashDiscrepancies_Approver FOREIGN KEY(ApprovedBy) REFERENCES dbo.Users(UserId), CONSTRAINT CK_CashDiscrepancies_Amount CHECK(Amount <> 0),
  CONSTRAINT CK_CashDiscrepancies_Status CHECK(Status IN ('PENDING','APPROVED','RESOLVED','REJECTED'))
);
CREATE TABLE dbo.AccountingPeriods (
  AccountingPeriodId UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_AccountingPeriods_Id DEFAULT NEWSEQUENTIALID(), Code VARCHAR(20) NOT NULL,
  StartsOn DATE NOT NULL, EndsOn DATE NOT NULL, Status VARCHAR(20) NOT NULL CONSTRAINT DF_AccountingPeriods_Status DEFAULT 'OPEN',
  ClosedBy UNIQUEIDENTIFIER NULL, ClosedAt DATETIME2 NULL, CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_AccountingPeriods_CreatedAt DEFAULT SYSUTCDATETIME(), CreatedBy VARCHAR(100) NOT NULL,
  CONSTRAINT PK_AccountingPeriods PRIMARY KEY(AccountingPeriodId), CONSTRAINT UQ_AccountingPeriods_Code UNIQUE(Code),
  CONSTRAINT FK_AccountingPeriods_Closer FOREIGN KEY(ClosedBy) REFERENCES dbo.Users(UserId), CONSTRAINT CK_AccountingPeriods_Dates CHECK(EndsOn >= StartsOn),
  CONSTRAINT CK_AccountingPeriods_Status CHECK(Status IN ('OPEN','CLOSED'))
);
CREATE TABLE dbo.Accounts (
  AccountId UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_Accounts_Id DEFAULT NEWSEQUENTIALID(), Code VARCHAR(30) NOT NULL,
  Name NVARCHAR(200) NOT NULL, AccountType VARCHAR(30) NOT NULL, ParentAccountId UNIQUEIDENTIFIER NULL, IsActive BIT NOT NULL CONSTRAINT DF_Accounts_Active DEFAULT 1,
  CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Accounts_CreatedAt DEFAULT SYSUTCDATETIME(), CreatedBy VARCHAR(100) NOT NULL, Version ROWVERSION NOT NULL,
  CONSTRAINT PK_Accounts PRIMARY KEY(AccountId), CONSTRAINT UQ_Accounts_Code UNIQUE(Code), CONSTRAINT FK_Accounts_Parent FOREIGN KEY(ParentAccountId) REFERENCES dbo.Accounts(AccountId),
  CONSTRAINT CK_Accounts_Type CHECK(AccountType IN ('ASSET','LIABILITY','EQUITY','REVENUE','EXPENSE'))
);
CREATE TABLE dbo.JournalEntries (
  JournalEntryId UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_JournalEntries_Id DEFAULT NEWSEQUENTIALID(), EntryNo VARCHAR(40) NOT NULL,
  SourceEventId UNIQUEIDENTIFIER NOT NULL, SourceDocumentId UNIQUEIDENTIFIER NULL, AccountingRuleVersionId UNIQUEIDENTIFIER NOT NULL,
  EventType VARCHAR(80) NOT NULL, AccountingPeriodId UNIQUEIDENTIFIER NOT NULL, BranchId UNIQUEIDENTIFIER NOT NULL, Currency CHAR(3) NOT NULL CONSTRAINT DF_JournalEntries_Currency DEFAULT 'VND',
  DocumentDate DATE NOT NULL, PostingDate DATE NOT NULL, Status VARCHAR(20) NOT NULL CONSTRAINT DF_JournalEntries_Status DEFAULT 'DRAFT',
  CreatedByUserId UNIQUEIDENTIFIER NOT NULL, ApprovedBy UNIQUEIDENTIFIER NULL, PostedAt DATETIME2 NULL, OriginalId UNIQUEIDENTIFIER NULL,
  CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_JournalEntries_CreatedAt DEFAULT SYSUTCDATETIME(), Version ROWVERSION NOT NULL,
  CONSTRAINT PK_JournalEntries PRIMARY KEY(JournalEntryId), CONSTRAINT UQ_JournalEntries_No UNIQUE(EntryNo),
  CONSTRAINT UQ_JournalEntries_Source_Rule_Event UNIQUE(SourceEventId, AccountingRuleVersionId, EventType),
  CONSTRAINT FK_JournalEntries_Rule FOREIGN KEY(AccountingRuleVersionId) REFERENCES dbo.AccountingRuleVersions(AccountingRuleVersionId),
  CONSTRAINT FK_JournalEntries_Period FOREIGN KEY(AccountingPeriodId) REFERENCES dbo.AccountingPeriods(AccountingPeriodId), CONSTRAINT FK_JournalEntries_Branch FOREIGN KEY(BranchId) REFERENCES dbo.Branches(BranchId),
  CONSTRAINT FK_JournalEntries_Creator FOREIGN KEY(CreatedByUserId) REFERENCES dbo.Users(UserId), CONSTRAINT FK_JournalEntries_Approver FOREIGN KEY(ApprovedBy) REFERENCES dbo.Users(UserId),
  CONSTRAINT FK_JournalEntries_Original FOREIGN KEY(OriginalId) REFERENCES dbo.JournalEntries(JournalEntryId),
  CONSTRAINT CK_JournalEntries_MakerChecker CHECK(ApprovedBy IS NULL OR ApprovedBy <> CreatedByUserId), CONSTRAINT CK_JournalEntries_Status CHECK(Status IN ('DRAFT','SUBMITTED','APPROVED','POSTED','REVERSED'))
);
CREATE TABLE dbo.JournalLines (
  JournalLineId UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_JournalLines_Id DEFAULT NEWSEQUENTIALID(), JournalEntryId UNIQUEIDENTIFIER NOT NULL,
  [LineNo] INT NOT NULL, AccountId UNIQUEIDENTIFIER NOT NULL, Debit DECIMAL(18,2) NOT NULL CONSTRAINT DF_JournalLines_Debit DEFAULT 0,
  Credit DECIMAL(18,2) NOT NULL CONSTRAINT DF_JournalLines_Credit DEFAULT 0, Description NVARCHAR(500) NULL,
  CONSTRAINT PK_JournalLines PRIMARY KEY(JournalLineId), CONSTRAINT UQ_JournalLines_Entry_Line UNIQUE(JournalEntryId, [LineNo]),
  CONSTRAINT FK_JournalLines_Entry FOREIGN KEY(JournalEntryId) REFERENCES dbo.JournalEntries(JournalEntryId), CONSTRAINT FK_JournalLines_Account FOREIGN KEY(AccountId) REFERENCES dbo.Accounts(AccountId),
  CONSTRAINT CK_JournalLines_Amounts CHECK(Debit >= 0 AND Credit >= 0 AND ((Debit > 0 AND Credit = 0) OR (Credit > 0 AND Debit = 0)))
);
EXEC(N'CREATE TRIGGER dbo.TR_JournalEntries_PostBalanced ON dbo.JournalEntries AFTER UPDATE AS
BEGIN
  SET NOCOUNT ON;
  IF EXISTS (
    SELECT 1 FROM inserted i JOIN deleted d ON d.JournalEntryId=i.JournalEntryId
    WHERE i.Status=''POSTED'' AND d.Status<>''POSTED''
      AND NOT EXISTS (SELECT 1 FROM dbo.JournalLines l WHERE l.JournalEntryId=i.JournalEntryId)
  ) THROW 51200, ''Posted journal entry must have lines.'', 1;
  IF EXISTS (
    SELECT 1 FROM inserted i JOIN deleted d ON d.JournalEntryId=i.JournalEntryId
    CROSS APPLY (SELECT SUM(l.Debit) Debit, SUM(l.Credit) Credit FROM dbo.JournalLines l WHERE l.JournalEntryId=i.JournalEntryId) totals
    WHERE i.Status=''POSTED'' AND d.Status<>''POSTED'' AND (totals.Debit <> totals.Credit OR totals.Debit IS NULL)
  ) THROW 51201, ''Journal entry debit and credit must balance before posting.'', 1;
END');
