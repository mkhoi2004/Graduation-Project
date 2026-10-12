-- Run with sqlcmd -b -S ".\SQLEXPRESS" -E -i database/001_schema.sql
-- Requires a SQL Server login with CREATE DATABASE and db_owner for initial setup.
IF DB_ID(N'Graduation Project') IS NULL EXEC(N'CREATE DATABASE [Graduation Project]');
GO
USE [Graduation Project];
GO
SET ANSI_NULLS ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET QUOTED_IDENTIFIER ON;
SET NUMERIC_ROUNDABORT OFF;
GO
IF OBJECT_ID(N'dbo.EntityIdSeq', N'SO') IS NULL EXEC(N'CREATE SEQUENCE dbo.EntityIdSeq AS BIGINT START WITH 1 INCREMENT BY 1 NO CYCLE');
GO

IF OBJECT_ID(N'dbo.Roles', N'U') IS NULL
CREATE TABLE dbo.Roles (
    Id BIGINT NOT NULL CONSTRAINT PK_Roles PRIMARY KEY DEFAULT (NEXT VALUE FOR dbo.EntityIdSeq),
    Code VARCHAR(40) NOT NULL CONSTRAINT UQ_Roles_Code UNIQUE,
    Name NVARCHAR(120) NOT NULL,
    CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_Roles_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT CK_Roles_Code CHECK (LEN(Code) >= 2)
);
GO
IF OBJECT_ID(N'dbo.Users', N'U') IS NULL
CREATE TABLE dbo.Users (
    Id BIGINT NOT NULL CONSTRAINT PK_Users PRIMARY KEY DEFAULT (NEXT VALUE FOR dbo.EntityIdSeq),
    Username VARCHAR(100) NOT NULL CONSTRAINT UQ_Users_Username UNIQUE,
    DisplayName NVARCHAR(150) NOT NULL,
    PasswordHash VARCHAR(500) NOT NULL,
    IsActive BIT NOT NULL CONSTRAINT DF_Users_IsActive DEFAULT 1,
    CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_Users_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT CK_Users_Username CHECK (LEN(Username) >= 3)
);
GO
IF OBJECT_ID(N'dbo.UserRoles', N'U') IS NULL
CREATE TABLE dbo.UserRoles (
    Id BIGINT NOT NULL CONSTRAINT PK_UserRoles PRIMARY KEY DEFAULT (NEXT VALUE FOR dbo.EntityIdSeq),
    UserId BIGINT NOT NULL CONSTRAINT FK_UserRoles_Users REFERENCES dbo.Users(Id),
    RoleId BIGINT NOT NULL CONSTRAINT FK_UserRoles_Roles REFERENCES dbo.Roles(Id),
    CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_UserRoles_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_UserRoles_User_Role UNIQUE (UserId, RoleId)
);
GO
IF OBJECT_ID(N'dbo.Patients', N'U') IS NULL
CREATE TABLE dbo.Patients (
    Id BIGINT NOT NULL CONSTRAINT PK_Patients PRIMARY KEY DEFAULT (NEXT VALUE FOR dbo.EntityIdSeq),
    FullName NVARCHAR(200) NOT NULL,
    DateOfBirth DATE NULL,
    BirthYear SMALLINT NULL,
    Phone VARCHAR(20) NULL,
    IdentityNumberEncrypted VARBINARY(512) NULL,
    Allergies NVARCHAR(1000) NULL,
    MedicalHistory NVARCHAR(MAX) NULL,
    GuardianName NVARCHAR(200) NULL,
    MergedIntoPatientId BIGINT NULL CONSTRAINT FK_Patients_MergedInto REFERENCES dbo.Patients(Id),
    CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_Patients_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_Patients_UpdatedAt DEFAULT SYSUTCDATETIME(),
    Version INT NOT NULL CONSTRAINT DF_Patients_Version DEFAULT 1,
    CONSTRAINT CK_Patients_Name CHECK (LEN(LTRIM(RTRIM(FullName))) >= 2),
    CONSTRAINT CK_Patients_Birth CHECK (DateOfBirth IS NOT NULL OR BirthYear IS NOT NULL),
    CONSTRAINT CK_Patients_BirthYear CHECK (BirthYear IS NULL OR BirthYear BETWEEN 1900 AND 2100),
    CONSTRAINT CK_Patients_Merge CHECK (MergedIntoPatientId IS NULL OR MergedIntoPatientId <> Id),
    CONSTRAINT CK_Patients_Version CHECK (Version > 0)
);
GO
IF OBJECT_ID(N'dbo.Services', N'U') IS NULL
CREATE TABLE dbo.Services (
    Id BIGINT NOT NULL CONSTRAINT PK_Services PRIMARY KEY DEFAULT (NEXT VALUE FOR dbo.EntityIdSeq),
    Code VARCHAR(40) NOT NULL CONSTRAINT UQ_Services_Code UNIQUE,
    Name NVARCHAR(200) NOT NULL,
    RequiresConsent BIT NOT NULL CONSTRAINT DF_Services_Consent DEFAULT 0,
    IsActive BIT NOT NULL CONSTRAINT DF_Services_Active DEFAULT 1,
    CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_Services_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT CK_Services_Name CHECK (LEN(LTRIM(RTRIM(Name))) >= 2)
);
GO
IF OBJECT_ID(N'dbo.ServicePrices', N'U') IS NULL
CREATE TABLE dbo.ServicePrices (
    Id BIGINT NOT NULL CONSTRAINT PK_ServicePrices PRIMARY KEY DEFAULT (NEXT VALUE FOR dbo.EntityIdSeq),
    ServiceId BIGINT NOT NULL CONSTRAINT FK_ServicePrices_Services REFERENCES dbo.Services(Id),
    UnitPrice DECIMAL(19,4) NOT NULL,
    Currency CHAR(3) NOT NULL CONSTRAINT DF_ServicePrices_Currency DEFAULT 'VND',
    EffectiveFrom DATETIME2(3) NOT NULL,
    EffectiveTo DATETIME2(3) NULL,
    ApprovedByUserId BIGINT NOT NULL CONSTRAINT FK_ServicePrices_Users REFERENCES dbo.Users(Id),
    CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_ServicePrices_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT CK_ServicePrices_Price CHECK (UnitPrice >= 0),
    CONSTRAINT CK_ServicePrices_Range CHECK (EffectiveTo IS NULL OR EffectiveTo > EffectiveFrom),
    CONSTRAINT UQ_ServicePrices_Start UNIQUE (ServiceId, EffectiveFrom)
);
GO
CREATE OR ALTER TRIGGER dbo.TR_ServicePrices_NoOverlap ON dbo.ServicePrices AFTER INSERT,UPDATE AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (
        SELECT 1 FROM inserted AS i
        JOIN dbo.ServicePrices AS p WITH (UPDLOCK,HOLDLOCK)
          ON p.ServiceId=i.ServiceId AND p.Id<>i.Id
         AND i.EffectiveFrom<COALESCE(p.EffectiveTo,CONVERT(DATETIME2(3),'9999-12-31'))
         AND p.EffectiveFrom<COALESCE(i.EffectiveTo,CONVERT(DATETIME2(3),'9999-12-31'))
    ) THROW 51010, 'Overlapping service price versions are not allowed', 1;
END;
GO
IF OBJECT_ID(N'dbo.Visits', N'U') IS NULL
CREATE TABLE dbo.Visits (
    Id BIGINT NOT NULL CONSTRAINT PK_Visits PRIMARY KEY DEFAULT (NEXT VALUE FOR dbo.EntityIdSeq),
    PatientId BIGINT NOT NULL CONSTRAINT FK_Visits_Patients REFERENCES dbo.Patients(Id),
    DoctorUserId BIGINT NULL CONSTRAINT FK_Visits_Doctor REFERENCES dbo.Users(Id),
    BranchCode VARCHAR(40) NOT NULL,
    Status VARCHAR(30) NOT NULL CONSTRAINT DF_Visits_Status DEFAULT 'REGISTERED',
    VisitType VARCHAR(30) NOT NULL CONSTRAINT DF_Visits_Type DEFAULT 'STANDARD',
    StartedAt DATETIME2(3) NULL,
    ClosedAt DATETIME2(3) NULL,
    CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_Visits_CreatedAt DEFAULT SYSUTCDATETIME(),
    Version INT NOT NULL CONSTRAINT DF_Visits_Version DEFAULT 1,
    CONSTRAINT CK_Visits_Status CHECK (Status IN ('REGISTERED','IN_PROGRESS','CLINICAL_COMPLETED','CLOSED','ON_HOLD','CANCELLED','EMERGENCY_TRANSFER')),
    CONSTRAINT CK_Visits_Type CHECK (VisitType IN ('STANDARD','FOLLOW_UP','WARRANTY')),
    CONSTRAINT CK_Visits_Version CHECK (Version > 0)
);
GO
IF OBJECT_ID(N'dbo.EmrRecords', N'U') IS NULL
CREATE TABLE dbo.EmrRecords (
    Id BIGINT NOT NULL CONSTRAINT PK_EmrRecords PRIMARY KEY DEFAULT (NEXT VALUE FOR dbo.EntityIdSeq),
    VisitId BIGINT NOT NULL CONSTRAINT FK_EmrRecords_Visits REFERENCES dbo.Visits(Id),
    AuthorUserId BIGINT NOT NULL CONSTRAINT FK_EmrRecords_Users REFERENCES dbo.Users(Id),
    Diagnosis NVARCHAR(MAX) NULL,
    Findings NVARCHAR(MAX) NULL,
    TreatmentResult NVARCHAR(MAX) NULL,
    Aftercare NVARCHAR(MAX) NULL,
    Status VARCHAR(20) NOT NULL CONSTRAINT DF_EmrRecords_Status DEFAULT 'DRAFT',
    SignedAt DATETIME2(3) NULL,
    CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_EmrRecords_CreatedAt DEFAULT SYSUTCDATETIME(),
    Version INT NOT NULL CONSTRAINT DF_EmrRecords_Version DEFAULT 1,
    CONSTRAINT CK_EmrRecords_Status CHECK (Status IN ('DRAFT','PENDING_SIGNATURE','SIGNED','AMENDED')),
    CONSTRAINT CK_EmrRecords_Signed CHECK (Status <> 'SIGNED' OR SignedAt IS NOT NULL),
    CONSTRAINT CK_EmrRecords_Version CHECK (Version > 0)
);
GO
IF OBJECT_ID(N'dbo.Consents', N'U') IS NULL
CREATE TABLE dbo.Consents (
    Id BIGINT NOT NULL CONSTRAINT PK_Consents PRIMARY KEY DEFAULT (NEXT VALUE FOR dbo.EntityIdSeq),
    VisitId BIGINT NOT NULL CONSTRAINT FK_Consents_Visits REFERENCES dbo.Visits(Id),
    ServiceId BIGINT NOT NULL CONSTRAINT FK_Consents_Services REFERENCES dbo.Services(Id),
    ToothSite VARCHAR(30) NULL,
    Status VARCHAR(20) NOT NULL CONSTRAINT DF_Consents_Status DEFAULT 'DRAFT',
    SignedAt DATETIME2(3) NULL,
    RevokedAt DATETIME2(3) NULL,
    DocumentHash VARCHAR(128) NULL,
    CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_Consents_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT CK_Consents_Status CHECK (Status IN ('DRAFT','PRESENTED','SIGNED','REVOKED')),
    CONSTRAINT CK_Consents_Signed CHECK (Status NOT IN ('SIGNED','REVOKED') OR SignedAt IS NOT NULL),
    CONSTRAINT CK_Consents_Revoked CHECK (Status <> 'REVOKED' OR RevokedAt IS NOT NULL)
);
GO
IF OBJECT_ID(N'dbo.ServiceLines', N'U') IS NULL
CREATE TABLE dbo.ServiceLines (
    Id BIGINT NOT NULL CONSTRAINT PK_ServiceLines PRIMARY KEY DEFAULT (NEXT VALUE FOR dbo.EntityIdSeq),
    VisitId BIGINT NOT NULL CONSTRAINT FK_ServiceLines_Visits REFERENCES dbo.Visits(Id),
    ServiceId BIGINT NOT NULL CONSTRAINT FK_ServiceLines_Services REFERENCES dbo.Services(Id),
    PriceId BIGINT NOT NULL CONSTRAINT FK_ServiceLines_Prices REFERENCES dbo.ServicePrices(Id),
    Quantity DECIMAL(12,3) NOT NULL,
    UnitPrice DECIMAL(19,4) NOT NULL,
    Discount DECIMAL(19,4) NOT NULL CONSTRAINT DF_ServiceLines_Discount DEFAULT 0,
    TaxAmount DECIMAL(19,4) NOT NULL CONSTRAINT DF_ServiceLines_Tax DEFAULT 0,
    Status VARCHAR(20) NOT NULL CONSTRAINT DF_ServiceLines_Status DEFAULT 'PLANNED',
    CompletionEventKey UNIQUEIDENTIFIER NULL,
    CompletedAt DATETIME2(3) NULL,
    CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_ServiceLines_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT CK_ServiceLines_Money CHECK (Quantity > 0 AND UnitPrice >= 0 AND Discount >= 0 AND Discount <= Quantity * UnitPrice AND TaxAmount >= 0),
    CONSTRAINT CK_ServiceLines_Status CHECK (Status IN ('PLANNED','COMPLETED','CANCELLED','ADJUSTED')),
    CONSTRAINT CK_ServiceLines_Completed CHECK (Status <> 'COMPLETED' OR (CompletionEventKey IS NOT NULL AND CompletedAt IS NOT NULL))
);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_ServiceLines_CompletionEventKey' AND object_id = OBJECT_ID(N'dbo.ServiceLines'))
CREATE UNIQUE INDEX UX_ServiceLines_CompletionEventKey ON dbo.ServiceLines(CompletionEventKey) WHERE CompletionEventKey IS NOT NULL;
GO
IF OBJECT_ID(N'dbo.InsuranceCompanies', N'U') IS NULL
CREATE TABLE dbo.InsuranceCompanies (
    Id BIGINT NOT NULL CONSTRAINT PK_InsuranceCompanies PRIMARY KEY DEFAULT (NEXT VALUE FOR dbo.EntityIdSeq),
    Code VARCHAR(40) NOT NULL CONSTRAINT UQ_InsuranceCompanies_Code UNIQUE,
    Name NVARCHAR(200) NOT NULL,
    IsActive BIT NOT NULL CONSTRAINT DF_InsuranceCompanies_Active DEFAULT 1,
    CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_InsuranceCompanies_CreatedAt DEFAULT SYSUTCDATETIME()
);
GO
IF OBJECT_ID(N'dbo.InsuranceClaims', N'U') IS NULL
CREATE TABLE dbo.InsuranceClaims (
    Id BIGINT NOT NULL CONSTRAINT PK_InsuranceClaims PRIMARY KEY DEFAULT (NEXT VALUE FOR dbo.EntityIdSeq),
    VisitId BIGINT NOT NULL CONSTRAINT FK_InsuranceClaims_Visits REFERENCES dbo.Visits(Id),
    CompanyId BIGINT NOT NULL CONSTRAINT FK_InsuranceClaims_Companies REFERENCES dbo.InsuranceCompanies(Id),
    ClaimNumber VARCHAR(80) NOT NULL CONSTRAINT UQ_InsuranceClaims_Number UNIQUE,
    SubmittedAmount DECIMAL(19,4) NOT NULL,
    ApprovedAmount DECIMAL(19,4) NULL,
    ReceivedAmount DECIMAL(19,4) NOT NULL CONSTRAINT DF_InsuranceClaims_Received DEFAULT 0,
    Status VARCHAR(25) NOT NULL CONSTRAINT DF_InsuranceClaims_Status DEFAULT 'DRAFT',
    Version INT NOT NULL CONSTRAINT DF_InsuranceClaims_Version DEFAULT 1,
    CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_InsuranceClaims_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT CK_InsuranceClaims_Amounts CHECK (SubmittedAmount >= 0 AND (ApprovedAmount IS NULL OR (ApprovedAmount >= 0 AND ApprovedAmount <= SubmittedAmount)) AND ReceivedAmount >= 0),
    CONSTRAINT CK_InsuranceClaims_Status CHECK (Status IN ('DRAFT','VALIDATED','SUBMITTED','ACKNOWLEDGED','APPROVED','PARTIALLY_APPROVED','REJECTED','DISPUTED','SETTLED','CLOSED')),
    CONSTRAINT CK_InsuranceClaims_Version CHECK (Version > 0)
);
GO
IF OBJECT_ID(N'dbo.InsuranceClaimLines', N'U') IS NULL
CREATE TABLE dbo.InsuranceClaimLines (
    Id BIGINT NOT NULL CONSTRAINT PK_InsuranceClaimLines PRIMARY KEY DEFAULT (NEXT VALUE FOR dbo.EntityIdSeq),
    ClaimId BIGINT NOT NULL CONSTRAINT FK_InsuranceClaimLines_Claims REFERENCES dbo.InsuranceClaims(Id),
    ServiceLineId BIGINT NOT NULL CONSTRAINT FK_InsuranceClaimLines_ServiceLines REFERENCES dbo.ServiceLines(Id),
    ClaimedAmount DECIMAL(19,4) NOT NULL,
    ApprovedAmount DECIMAL(19,4) NULL,
    CONSTRAINT CK_InsuranceClaimLines_Amounts CHECK (ClaimedAmount >= 0 AND (ApprovedAmount IS NULL OR (ApprovedAmount >= 0 AND ApprovedAmount <= ClaimedAmount))),
    CONSTRAINT UQ_InsuranceClaimLines_Claim_Service UNIQUE (ClaimId, ServiceLineId)
);
GO
IF OBJECT_ID(N'dbo.CashShifts', N'U') IS NULL
CREATE TABLE dbo.CashShifts (
    Id BIGINT NOT NULL CONSTRAINT PK_CashShifts PRIMARY KEY DEFAULT (NEXT VALUE FOR dbo.EntityIdSeq),
    CashierUserId BIGINT NOT NULL CONSTRAINT FK_CashShifts_Users REFERENCES dbo.Users(Id),
    BranchCode VARCHAR(40) NOT NULL,
    OpeningFloat DECIMAL(19,4) NOT NULL,
    CountedCash DECIMAL(19,4) NULL,
    Status VARCHAR(20) NOT NULL CONSTRAINT DF_CashShifts_Status DEFAULT 'OPEN',
    OpenedAt DATETIME2(3) NOT NULL CONSTRAINT DF_CashShifts_Opened DEFAULT SYSUTCDATETIME(),
    ClosedAt DATETIME2(3) NULL,
    CONSTRAINT CK_CashShifts_Amounts CHECK (OpeningFloat >= 0 AND (CountedCash IS NULL OR CountedCash >= 0)),
    CONSTRAINT CK_CashShifts_Status CHECK (Status IN ('OPEN','CLOSED','RECONCILED'))
);
GO
IF OBJECT_ID(N'dbo.Deposits', N'U') IS NULL
CREATE TABLE dbo.Deposits (
    Id BIGINT NOT NULL CONSTRAINT PK_Deposits PRIMARY KEY DEFAULT (NEXT VALUE FOR dbo.EntityIdSeq),
    PatientId BIGINT NOT NULL CONSTRAINT FK_Deposits_Patients REFERENCES dbo.Patients(Id),
    VisitId BIGINT NULL CONSTRAINT FK_Deposits_Visits REFERENCES dbo.Visits(Id),
    Amount DECIMAL(19,4) NOT NULL,
    AppliedAmount DECIMAL(19,4) NOT NULL CONSTRAINT DF_Deposits_Applied DEFAULT 0,
    RefundedAmount DECIMAL(19,4) NOT NULL CONSTRAINT DF_Deposits_Refunded DEFAULT 0,
    Status VARCHAR(20) NOT NULL CONSTRAINT DF_Deposits_Status DEFAULT 'PENDING',
    CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_Deposits_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT CK_Deposits_Amounts CHECK (Amount > 0 AND AppliedAmount >= 0 AND RefundedAmount >= 0 AND AppliedAmount + RefundedAmount <= Amount),
    CONSTRAINT CK_Deposits_Status CHECK (Status IN ('PENDING','CONFIRMED','CLOSED'))
);
GO
IF OBJECT_ID(N'dbo.PaymentTransactions', N'U') IS NULL
CREATE TABLE dbo.PaymentTransactions (
    Id BIGINT NOT NULL CONSTRAINT PK_PaymentTransactions PRIMARY KEY DEFAULT (NEXT VALUE FOR dbo.EntityIdSeq),
    VisitId BIGINT NULL CONSTRAINT FK_PaymentTransactions_Visits REFERENCES dbo.Visits(Id),
    DepositId BIGINT NULL CONSTRAINT FK_PaymentTransactions_Deposits REFERENCES dbo.Deposits(Id),
    CashShiftId BIGINT NULL CONSTRAINT FK_PaymentTransactions_Shifts REFERENCES dbo.CashShifts(Id),
    IdempotencyKey UNIQUEIDENTIFIER NOT NULL CONSTRAINT UQ_PaymentTransactions_Key UNIQUE,
    ExternalReference VARCHAR(120) NULL,
    Method VARCHAR(20) NOT NULL,
    Direction VARCHAR(10) NOT NULL CONSTRAINT DF_PaymentTransactions_Direction DEFAULT 'IN',
    Amount DECIMAL(19,4) NOT NULL,
    Status VARCHAR(20) NOT NULL CONSTRAINT DF_PaymentTransactions_Status DEFAULT 'INITIATED',
    ConfirmedAt DATETIME2(3) NULL,
    CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_PaymentTransactions_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT CK_PaymentTransactions_Target CHECK (VisitId IS NOT NULL OR DepositId IS NOT NULL),
    CONSTRAINT CK_PaymentTransactions_Method CHECK (Method IN ('CASH','BANK','QR','CARD')),
    CONSTRAINT CK_PaymentTransactions_Direction CHECK (Direction IN ('IN','OUT')),
    CONSTRAINT CK_PaymentTransactions_Amount CHECK (Amount > 0),
    CONSTRAINT CK_PaymentTransactions_Status CHECK (Status IN ('INITIATED','PENDING','CONFIRMED','FAILED')),
    CONSTRAINT CK_PaymentTransactions_CashShift CHECK (Method <> 'CASH' OR CashShiftId IS NOT NULL),
    CONSTRAINT CK_PaymentTransactions_Confirmed CHECK (Status <> 'CONFIRMED' OR ConfirmedAt IS NOT NULL)
);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_PaymentTransactions_ExternalReference' AND object_id = OBJECT_ID(N'dbo.PaymentTransactions'))
CREATE UNIQUE INDEX UX_PaymentTransactions_ExternalReference ON dbo.PaymentTransactions(ExternalReference) WHERE ExternalReference IS NOT NULL;
GO
IF OBJECT_ID(N'dbo.DepositApplications', N'U') IS NULL
CREATE TABLE dbo.DepositApplications (
    Id BIGINT NOT NULL CONSTRAINT PK_DepositApplications PRIMARY KEY DEFAULT (NEXT VALUE FOR dbo.EntityIdSeq),
    DepositId BIGINT NOT NULL CONSTRAINT FK_DepositApplications_Deposits REFERENCES dbo.Deposits(Id),
    VisitId BIGINT NOT NULL CONSTRAINT FK_DepositApplications_Visits REFERENCES dbo.Visits(Id),
    IdempotencyKey UNIQUEIDENTIFIER NOT NULL CONSTRAINT UQ_DepositApplications_Key UNIQUE,
    Amount DECIMAL(19,4) NOT NULL CONSTRAINT CK_DepositApplications_Amount CHECK (Amount > 0),
    AppliedAt DATETIME2(3) NOT NULL CONSTRAINT DF_DepositApplications_AppliedAt DEFAULT SYSUTCDATETIME()
);
GO
IF OBJECT_ID(N'dbo.InventoryItems', N'U') IS NULL
CREATE TABLE dbo.InventoryItems (
    Id BIGINT NOT NULL CONSTRAINT PK_InventoryItems PRIMARY KEY DEFAULT (NEXT VALUE FOR dbo.EntityIdSeq),
    Code VARCHAR(50) NOT NULL CONSTRAINT UQ_InventoryItems_Code UNIQUE,
    Name NVARCHAR(200) NOT NULL,
    Unit NVARCHAR(40) NOT NULL,
    SerialTracked BIT NOT NULL CONSTRAINT DF_InventoryItems_Serial DEFAULT 0,
    IsActive BIT NOT NULL CONSTRAINT DF_InventoryItems_Active DEFAULT 1
);
GO
IF OBJECT_ID(N'dbo.StockLots', N'U') IS NULL
CREATE TABLE dbo.StockLots (
    Id BIGINT NOT NULL CONSTRAINT PK_StockLots PRIMARY KEY DEFAULT (NEXT VALUE FOR dbo.EntityIdSeq),
    ItemId BIGINT NOT NULL CONSTRAINT FK_StockLots_Items REFERENCES dbo.InventoryItems(Id),
    BranchCode VARCHAR(40) NOT NULL,
    LotNumber VARCHAR(80) NOT NULL,
    SerialNumber VARCHAR(100) NULL,
    ExpiresOn DATE NULL,
    OnHand DECIMAL(18,3) NOT NULL CONSTRAINT DF_StockLots_OnHand DEFAULT 0,
    Reserved DECIMAL(18,3) NOT NULL CONSTRAINT DF_StockLots_Reserved DEFAULT 0,
    Quarantined DECIMAL(18,3) NOT NULL CONSTRAINT DF_StockLots_Quarantined DEFAULT 0,
    Blocked DECIMAL(18,3) NOT NULL CONSTRAINT DF_StockLots_Blocked DEFAULT 0,
    UnitCost DECIMAL(19,4) NOT NULL CONSTRAINT DF_StockLots_UnitCost DEFAULT 0,
    Status VARCHAR(20) NOT NULL CONSTRAINT DF_StockLots_Status DEFAULT 'AVAILABLE',
    CONSTRAINT UQ_StockLots_Item_Branch_Lot_Serial UNIQUE (ItemId, BranchCode, LotNumber, SerialNumber),
    CONSTRAINT CK_StockLots_Qty CHECK (OnHand >= 0 AND Reserved >= 0 AND Quarantined >= 0 AND Blocked >= 0 AND OnHand >= Reserved + Quarantined + Blocked),
    CONSTRAINT CK_StockLots_Cost CHECK (UnitCost >= 0),
    CONSTRAINT CK_StockLots_Status CHECK (Status IN ('AVAILABLE','QUARANTINED','BLOCKED','EXPIRED','RECALLED'))
);
GO
IF OBJECT_ID(N'dbo.StockReservations', N'U') IS NULL
CREATE TABLE dbo.StockReservations (
    Id BIGINT NOT NULL CONSTRAINT PK_StockReservations PRIMARY KEY DEFAULT (NEXT VALUE FOR dbo.EntityIdSeq),
    StockLotId BIGINT NOT NULL CONSTRAINT FK_StockReservations_Lots REFERENCES dbo.StockLots(Id),
    VisitId BIGINT NOT NULL CONSTRAINT FK_StockReservations_Visits REFERENCES dbo.Visits(Id),
    IdempotencyKey UNIQUEIDENTIFIER NOT NULL CONSTRAINT UQ_StockReservations_Key UNIQUE,
    Quantity DECIMAL(18,3) NOT NULL,
    Status VARCHAR(20) NOT NULL CONSTRAINT DF_StockReservations_Status DEFAULT 'RESERVED',
    ExpiresAt DATETIME2(3) NOT NULL,
    CONSTRAINT CK_StockReservations_Qty CHECK (Quantity > 0),
    CONSTRAINT CK_StockReservations_Status CHECK (Status IN ('RESERVED','CONSUMED','RELEASED'))
);
GO
IF OBJECT_ID(N'dbo.StockMovements', N'U') IS NULL
CREATE TABLE dbo.StockMovements (
    Id BIGINT NOT NULL CONSTRAINT PK_StockMovements PRIMARY KEY DEFAULT (NEXT VALUE FOR dbo.EntityIdSeq),
    StockLotId BIGINT NOT NULL CONSTRAINT FK_StockMovements_Lots REFERENCES dbo.StockLots(Id),
    VisitId BIGINT NULL CONSTRAINT FK_StockMovements_Visits REFERENCES dbo.Visits(Id),
    MovementType VARCHAR(20) NOT NULL,
    Quantity DECIMAL(18,3) NOT NULL,
    UnitCost DECIMAL(19,4) NOT NULL,
    SourceEventKey UNIQUEIDENTIFIER NOT NULL CONSTRAINT UQ_StockMovements_Key UNIQUE,
    CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_StockMovements_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT CK_StockMovements_Type CHECK (MovementType IN ('RECEIPT','CONSUME','RETURN','DISPOSE','ADJUSTMENT')),
    CONSTRAINT CK_StockMovements_Qty CHECK (Quantity > 0 AND UnitCost >= 0)
);
GO
IF OBJECT_ID(N'dbo.SterilizationCycles', N'U') IS NULL
CREATE TABLE dbo.SterilizationCycles (
    Id BIGINT NOT NULL CONSTRAINT PK_SterilizationCycles PRIMARY KEY DEFAULT (NEXT VALUE FOR dbo.EntityIdSeq),
    EquipmentCode VARCHAR(80) NOT NULL,
    Status VARCHAR(20) NOT NULL CONSTRAINT DF_SterilizationCycles_Status DEFAULT 'RUNNING',
    StartedAt DATETIME2(3) NOT NULL CONSTRAINT DF_SterilizationCycles_Started DEFAULT SYSUTCDATETIME(),
    CompletedAt DATETIME2(3) NULL,
    CheckedByUserId BIGINT NULL CONSTRAINT FK_SterilizationCycles_Users REFERENCES dbo.Users(Id),
    IndicatorResult NVARCHAR(200) NULL,
    CONSTRAINT CK_SterilizationCycles_Status CHECK (Status IN ('RUNNING','PASSED','FAILED')),
    CONSTRAINT CK_SterilizationCycles_Final CHECK (Status = 'RUNNING' OR (CompletedAt IS NOT NULL AND CheckedByUserId IS NOT NULL))
);
GO
IF OBJECT_ID(N'dbo.InstrumentPacks', N'U') IS NULL
CREATE TABLE dbo.InstrumentPacks (
    Id BIGINT NOT NULL CONSTRAINT PK_InstrumentPacks PRIMARY KEY DEFAULT (NEXT VALUE FOR dbo.EntityIdSeq),
    CycleId BIGINT NOT NULL CONSTRAINT FK_InstrumentPacks_Cycles REFERENCES dbo.SterilizationCycles(Id),
    PackCode VARCHAR(80) NOT NULL CONSTRAINT UQ_InstrumentPacks_Code UNIQUE,
    ExpiresAt DATETIME2(3) NOT NULL,
    Status VARCHAR(20) NOT NULL CONSTRAINT DF_InstrumentPacks_Status DEFAULT 'QUARANTINED',
    UsedVisitId BIGINT NULL CONSTRAINT FK_InstrumentPacks_Visits REFERENCES dbo.Visits(Id),
    CONSTRAINT CK_InstrumentPacks_Status CHECK (Status IN ('QUARANTINED','AVAILABLE','USED','EXPIRED','DAMAGED')),
    CONSTRAINT CK_InstrumentPacks_Used CHECK (Status <> 'USED' OR UsedVisitId IS NOT NULL)
);
GO
IF OBJECT_ID(N'dbo.LabTickets', N'U') IS NULL
CREATE TABLE dbo.LabTickets (
    Id BIGINT NOT NULL CONSTRAINT PK_LabTickets PRIMARY KEY DEFAULT (NEXT VALUE FOR dbo.EntityIdSeq),
    VisitId BIGINT NOT NULL CONSTRAINT FK_LabTickets_Visits REFERENCES dbo.Visits(Id),
    ParentTicketId BIGINT NULL CONSTRAINT FK_LabTickets_Parent REFERENCES dbo.LabTickets(Id),
    VendorName NVARCHAR(200) NOT NULL,
    Instructions NVARCHAR(MAX) NOT NULL,
    DueAt DATETIME2(3) NULL,
    Cost DECIMAL(19,4) NOT NULL CONSTRAINT DF_LabTickets_Cost DEFAULT 0,
    Status VARCHAR(20) NOT NULL CONSTRAINT DF_LabTickets_Status DEFAULT 'DRAFT',
    CONSTRAINT CK_LabTickets_Cost CHECK (Cost >= 0),
    CONSTRAINT CK_LabTickets_Status CHECK (Status IN ('DRAFT','SENT','RECEIVED','QC_PASSED','QC_FAILED','REWORK','CLOSED'))
);
GO
IF OBJECT_ID(N'dbo.JournalEntries', N'U') IS NULL
CREATE TABLE dbo.JournalEntries (
    Id BIGINT NOT NULL CONSTRAINT PK_JournalEntries PRIMARY KEY DEFAULT (NEXT VALUE FOR dbo.EntityIdSeq),
    SourceEventKey UNIQUEIDENTIFIER NOT NULL,
    EventType VARCHAR(60) NOT NULL,
    RuleVersion INT NOT NULL,
    DocumentDate DATE NOT NULL,
    AccountingDate DATE NOT NULL,
    BranchCode VARCHAR(40) NOT NULL,
    Currency CHAR(3) NOT NULL CONSTRAINT DF_JournalEntries_Currency DEFAULT 'VND',
    Status VARCHAR(20) NOT NULL CONSTRAINT DF_JournalEntries_Status DEFAULT 'DRAFT',
    PreparedByUserId BIGINT NOT NULL CONSTRAINT FK_JournalEntries_Preparer REFERENCES dbo.Users(Id),
    ApprovedByUserId BIGINT NULL CONSTRAINT FK_JournalEntries_Approver REFERENCES dbo.Users(Id),
    ReversalOfId BIGINT NULL CONSTRAINT FK_JournalEntries_Reversal REFERENCES dbo.JournalEntries(Id),
    CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_JournalEntries_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_JournalEntries_Source UNIQUE (SourceEventKey, EventType, RuleVersion),
    CONSTRAINT CK_JournalEntries_Status CHECK (Status IN ('DRAFT','SUBMITTED','APPROVED','POSTED','REVERSED')),
    CONSTRAINT CK_JournalEntries_Rule CHECK (RuleVersion > 0),
    CONSTRAINT CK_JournalEntries_SoD CHECK (ApprovedByUserId IS NULL OR ApprovedByUserId <> PreparedByUserId)
);
GO
IF OBJECT_ID(N'dbo.JournalLines', N'U') IS NULL
CREATE TABLE dbo.JournalLines (
    Id BIGINT NOT NULL CONSTRAINT PK_JournalLines PRIMARY KEY DEFAULT (NEXT VALUE FOR dbo.EntityIdSeq),
    JournalEntryId BIGINT NOT NULL CONSTRAINT FK_JournalLines_Entries REFERENCES dbo.JournalEntries(Id),
    AccountCode VARCHAR(30) NOT NULL,
    Debit DECIMAL(19,4) NOT NULL CONSTRAINT DF_JournalLines_Debit DEFAULT 0,
    Credit DECIMAL(19,4) NOT NULL CONSTRAINT DF_JournalLines_Credit DEFAULT 0,
    CONSTRAINT CK_JournalLines_Amounts CHECK (Debit >= 0 AND Credit >= 0 AND ((Debit > 0 AND Credit = 0) OR (Credit > 0 AND Debit = 0)))
);
GO
IF OBJECT_ID(N'dbo.WarrantyCases', N'U') IS NULL
CREATE TABLE dbo.WarrantyCases (
    Id BIGINT NOT NULL CONSTRAINT PK_WarrantyCases PRIMARY KEY DEFAULT (NEXT VALUE FOR dbo.EntityIdSeq),
    OriginalServiceLineId BIGINT NOT NULL CONSTRAINT FK_WarrantyCases_ServiceLines REFERENCES dbo.ServiceLines(Id),
    FollowUpVisitId BIGINT NULL CONSTRAINT FK_WarrantyCases_Visits REFERENCES dbo.Visits(Id),
    Status VARCHAR(20) NOT NULL CONSTRAINT DF_WarrantyCases_Status DEFAULT 'OPEN',
    Reason NVARCHAR(500) NOT NULL,
    CreatedAt DATETIME2(3) NOT NULL CONSTRAINT DF_WarrantyCases_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT CK_WarrantyCases_Status CHECK (Status IN ('OPEN','APPROVED','REJECTED','CLOSED'))
);
GO
IF OBJECT_ID(N'dbo.Employees', N'U') IS NULL
CREATE TABLE dbo.Employees (
    Id BIGINT NOT NULL CONSTRAINT PK_Employees PRIMARY KEY DEFAULT (NEXT VALUE FOR dbo.EntityIdSeq),
    UserId BIGINT NULL CONSTRAINT FK_Employees_Users REFERENCES dbo.Users(Id),
    EmployeeCode VARCHAR(40) NOT NULL CONSTRAINT UQ_Employees_Code UNIQUE,
    FullName NVARCHAR(200) NOT NULL,
    BranchCode VARCHAR(40) NOT NULL,
    Status VARCHAR(20) NOT NULL CONSTRAINT DF_Employees_Status DEFAULT 'ACTIVE',
    CONSTRAINT CK_Employees_Status CHECK (Status IN ('ACTIVE','ON_LEAVE','INACTIVE'))
);
GO
IF OBJECT_ID(N'dbo.Assets', N'U') IS NULL
CREATE TABLE dbo.Assets (
    Id BIGINT NOT NULL CONSTRAINT PK_Assets PRIMARY KEY DEFAULT (NEXT VALUE FOR dbo.EntityIdSeq),
    AssetCode VARCHAR(50) NOT NULL CONSTRAINT UQ_Assets_Code UNIQUE,
    Name NVARCHAR(200) NOT NULL,
    BranchCode VARCHAR(40) NOT NULL,
    Status VARCHAR(20) NOT NULL CONSTRAINT DF_Assets_Status DEFAULT 'AVAILABLE',
    MaintenanceDueAt DATETIME2(3) NULL,
    CONSTRAINT CK_Assets_Status CHECK (Status IN ('AVAILABLE','MAINTENANCE','OUT_OF_SERVICE','RETIRED'))
);
GO
IF OBJECT_ID(N'dbo.AuditLogs', N'U') IS NULL
CREATE TABLE dbo.AuditLogs (
    Id BIGINT NOT NULL CONSTRAINT PK_AuditLogs PRIMARY KEY DEFAULT (NEXT VALUE FOR dbo.EntityIdSeq),
    ActorUserId BIGINT NULL CONSTRAINT FK_AuditLogs_Users REFERENCES dbo.Users(Id),
    Action VARCHAR(80) NOT NULL,
    EntityName VARCHAR(80) NOT NULL,
    EntityId BIGINT NULL,
    Detail NVARCHAR(2000) NULL,
    OccurredAt DATETIME2(3) NOT NULL CONSTRAINT DF_AuditLogs_OccurredAt DEFAULT SYSUTCDATETIME()
);
GO

-- FK indexes for the principal navigation and filtering paths.
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_Visits_Patient_Created' AND object_id=OBJECT_ID(N'dbo.Visits')) CREATE INDEX IX_Visits_Patient_Created ON dbo.Visits(PatientId,CreatedAt DESC);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_ServiceLines_Visit' AND object_id=OBJECT_ID(N'dbo.ServiceLines')) CREATE INDEX IX_ServiceLines_Visit ON dbo.ServiceLines(VisitId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_Payments_Visit_Status' AND object_id=OBJECT_ID(N'dbo.PaymentTransactions')) CREATE INDEX IX_Payments_Visit_Status ON dbo.PaymentTransactions(VisitId,Status);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IX_StockLots_Item_Branch' AND object_id=OBJECT_ID(N'dbo.StockLots')) CREATE INDEX IX_StockLots_Item_Branch ON dbo.StockLots(ItemId,BranchCode,ExpiresOn);
GO
