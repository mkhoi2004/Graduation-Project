-- Run after 001_schema.sql and 002_archive.sql. Safe to rerun.
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

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name=N'CK_Patients_BirthConsistency')
    ALTER TABLE dbo.Patients WITH CHECK ADD CONSTRAINT CK_Patients_BirthConsistency
      CHECK (DateOfBirth IS NULL OR BirthYear IS NULL OR BirthYear=YEAR(DateOfBirth));
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name=N'CK_Visits_ClosedAt')
    ALTER TABLE dbo.Visits WITH CHECK ADD CONSTRAINT CK_Visits_ClosedAt
      CHECK ((Status='CLOSED' AND ClosedAt IS NOT NULL) OR (Status<>'CLOSED' AND ClosedAt IS NULL));
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name=N'CK_CashShifts_ClosedAt')
    ALTER TABLE dbo.CashShifts WITH CHECK ADD CONSTRAINT CK_CashShifts_ClosedAt
      CHECK ((Status='OPEN' AND ClosedAt IS NULL) OR (Status<>'OPEN' AND ClosedAt IS NOT NULL));
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name=N'CK_InsuranceClaims_ReceivedLimit')
    ALTER TABLE dbo.InsuranceClaims WITH CHECK ADD CONSTRAINT CK_InsuranceClaims_ReceivedLimit
      CHECK (ApprovedAmount IS NULL OR ReceivedAmount<=ApprovedAmount);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=N'UX_StockLots_Item_Serial' AND object_id=OBJECT_ID(N'dbo.StockLots'))
    CREATE UNIQUE INDEX UX_StockLots_Item_Serial ON dbo.StockLots(ItemId,SerialNumber) WHERE SerialNumber IS NOT NULL;
GO

CREATE OR ALTER TRIGGER dbo.TR_Visits_DoctorEligibility ON dbo.Visits AFTER INSERT,UPDATE AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (
        SELECT 1 FROM inserted AS i
        LEFT JOIN dbo.Users AS u ON u.Id=i.DoctorUserId AND u.IsActive=1
        WHERE i.DoctorUserId IS NOT NULL
          AND (u.Id IS NULL OR NOT EXISTS (
              SELECT 1 FROM dbo.UserRoles AS ur JOIN dbo.Roles AS r ON r.Id=ur.RoleId
              WHERE ur.UserId=i.DoctorUserId AND r.Code='DOCTOR'))
    ) THROW 51101, 'Assigned doctor must be active and have DOCTOR role', 1;
END;
GO

CREATE OR ALTER TRIGGER dbo.TR_ServiceLines_PriceIntegrity ON dbo.ServiceLines AFTER INSERT,UPDATE AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (
        SELECT 1 FROM inserted AS i JOIN dbo.ServicePrices AS p ON p.Id=i.PriceId
        WHERE p.ServiceId<>i.ServiceId OR i.UnitPrice<>p.UnitPrice
          OR i.CreatedAt<p.EffectiveFrom
          OR (p.EffectiveTo IS NOT NULL AND i.CreatedAt>=p.EffectiveTo)
    ) THROW 51102, 'Service line must use the matching effective approved price', 1;
END;
GO

CREATE OR ALTER TRIGGER dbo.TR_ServicePrices_ProtectReferenced ON dbo.ServicePrices AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    IF (UPDATE(ServiceId) OR UPDATE(UnitPrice) OR UPDATE(EffectiveFrom) OR UPDATE(EffectiveTo))
      AND EXISTS (SELECT 1 FROM inserted AS i JOIN dbo.ServiceLines AS l ON l.PriceId=i.Id)
        THROW 51103, 'Referenced service price versions are immutable', 1;
END;
GO

CREATE OR ALTER TRIGGER dbo.TR_InsuranceClaimLines_SameVisit ON dbo.InsuranceClaimLines AFTER INSERT,UPDATE AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (
        SELECT 1 FROM inserted AS i
        JOIN dbo.InsuranceClaims AS c ON c.Id=i.ClaimId
        JOIN dbo.ServiceLines AS l ON l.Id=i.ServiceLineId
        WHERE c.VisitId<>l.VisitId
    ) THROW 51104, 'Claim line and service line must belong to the same visit', 1;
END;
GO

CREATE OR ALTER TRIGGER dbo.TR_DepositApplications_Ownership ON dbo.DepositApplications AFTER INSERT,UPDATE AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (
        SELECT 1 FROM inserted AS i
        JOIN dbo.Deposits AS d ON d.Id=i.DepositId
        JOIN dbo.Visits AS v ON v.Id=i.VisitId
        WHERE d.PatientId<>v.PatientId OR d.Status<>'CONFIRMED'
    ) THROW 51105, 'Deposit must be confirmed and belong to the visit patient', 1;
END;
GO

CREATE OR ALTER TRIGGER dbo.TR_PaymentTransactions_DepositVisit ON dbo.PaymentTransactions AFTER INSERT,UPDATE AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (
        SELECT 1 FROM inserted AS i
        JOIN dbo.Deposits AS d ON d.Id=i.DepositId
        JOIN dbo.Visits AS v ON v.Id=i.VisitId
        WHERE d.PatientId<>v.PatientId
    ) THROW 51106, 'Payment deposit and visit must belong to the same patient', 1;
END;
GO

CREATE OR ALTER TRIGGER dbo.TR_AuditLogs_Immutable ON dbo.AuditLogs AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (SELECT 1 FROM inserted)
        THROW 51107, 'Audit log entries are immutable', 1;
END;
GO
