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
SET NOCOUNT ON;
IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE is_disabled=1 OR is_not_trusted=1)
    THROW 51200, 'Disabled or untrusted CHECK constraint', 1;
IF EXISTS (SELECT 1 FROM sys.foreign_keys WHERE is_disabled=1 OR is_not_trusted=1)
    THROW 51201, 'Disabled or untrusted FOREIGN KEY', 1;
GO

DECLARE @error INT=0;
DECLARE @tag VARCHAR(40)='VERIFY_'+REPLACE(CONVERT(VARCHAR(36),NEWID()),'-','');
BEGIN TRAN;
BEGIN TRY
    INSERT dbo.Users(Username,DisplayName,PasswordHash)
      VALUES (@tag,N'User without doctor role','test');
    DECLARE @userId BIGINT = (SELECT Id FROM dbo.Users WHERE Username=@tag);
    INSERT dbo.Patients(FullName,BirthYear) VALUES (N'Bệnh nhân kiểm thử',2000);
    DECLARE @patientId BIGINT = (SELECT MAX(Id) FROM dbo.Patients WHERE FullName=N'Bệnh nhân kiểm thử');
    INSERT dbo.Visits(PatientId,DoctorUserId,BranchCode) VALUES(@patientId,@userId,'TEST');
    COMMIT;
END TRY
BEGIN CATCH
    SET @error=ERROR_NUMBER();
    IF XACT_STATE()<>0 ROLLBACK;
END CATCH;
IF @error<>51101 THROW 51202, 'Ineligible doctor was not rejected', 1;
PRINT 'PASS: doctor assignment requires active DOCTOR role';
GO

DECLARE @error INT=0;
DECLARE @tag VARCHAR(40)='VERIFY_'+REPLACE(CONVERT(VARCHAR(36),NEWID()),'-','');
BEGIN TRAN;
BEGIN TRY
    INSERT dbo.Users(Username,DisplayName,PasswordHash)
      VALUES (@tag,N'Người duyệt thử','test');
    DECLARE @userId BIGINT=(SELECT Id FROM dbo.Users WHERE Username=@tag);
    INSERT dbo.Patients(FullName,BirthYear) VALUES (N'Bệnh nhân kiểm thử',2000);
    DECLARE @patientId BIGINT=(SELECT MAX(Id) FROM dbo.Patients WHERE FullName=N'Bệnh nhân kiểm thử');
    INSERT dbo.Visits(PatientId,BranchCode) VALUES(@patientId,'TEST');
    DECLARE @visitId BIGINT=(SELECT MAX(Id) FROM dbo.Visits WHERE PatientId=@patientId);
    INSERT dbo.Services(Code,Name) VALUES (@tag+'A',N'Dịch vụ A');
    DECLARE @serviceA BIGINT=(SELECT Id FROM dbo.Services WHERE Code=@tag+'A');
    INSERT dbo.Services(Code,Name) VALUES (@tag+'B',N'Dịch vụ B');
    DECLARE @serviceB BIGINT=(SELECT Id FROM dbo.Services WHERE Code=@tag+'B');
    INSERT dbo.ServicePrices(ServiceId,UnitPrice,EffectiveFrom,ApprovedByUserId)
      VALUES(@serviceA,100000,DATEADD(day,-1,SYSUTCDATETIME()),@userId);
    DECLARE @priceId BIGINT=(SELECT MAX(Id) FROM dbo.ServicePrices WHERE ServiceId=@serviceA);
    INSERT dbo.ServiceLines(VisitId,ServiceId,PriceId,Quantity,UnitPrice)
      VALUES(@visitId,@serviceB,@priceId,1,100000);
    COMMIT;
END TRY
BEGIN CATCH
    SET @error=ERROR_NUMBER();
    IF XACT_STATE()<>0 ROLLBACK;
END CATCH;
IF @error<>51102 THROW 51203, 'Mismatched service price was not rejected', 1;
PRINT 'PASS: service line price must match its service';
GO

DECLARE @error INT=0;
BEGIN TRAN;
BEGIN TRY
    DECLARE @tag VARCHAR(40)='VERIFY_'+REPLACE(CONVERT(VARCHAR(36),NEWID()),'-','');
    INSERT dbo.Patients(FullName,BirthYear,Phone) VALUES(N'Bệnh nhân kiểm thử',2000,LEFT(@tag,20));
    DECLARE @patientId BIGINT=(SELECT Id FROM dbo.Patients WHERE Phone=LEFT(@tag,20));
    INSERT dbo.Visits(PatientId,BranchCode,Status,StartedAt)
      VALUES(@patientId,'TEST','IN_PROGRESS',SYSUTCDATETIME());
    DECLARE @visitId BIGINT=(SELECT MAX(Id) FROM dbo.Visits WHERE PatientId=@patientId);
    DELETE FROM dbo.Visits WHERE Id=@visitId;
    COMMIT;
END TRY
BEGIN CATCH
    SET @error=ERROR_NUMBER();
    IF XACT_STATE()<>0 ROLLBACK;
END CATCH;
IF @error<>51020 THROW 51204, 'Started visit DELETE was not blocked', 1;
PRINT 'PASS: started visit cannot be deleted directly';
GO

DECLARE @error INT=0;
BEGIN TRAN;
BEGIN TRY
    INSERT dbo.AuditLogs(Action,EntityName,Detail) VALUES('VERIFY','AuditLogs',N'original');
    DECLARE @id BIGINT=(SELECT MAX(Id) FROM dbo.AuditLogs WHERE Action='VERIFY');
    UPDATE dbo.AuditLogs SET Detail=N'changed' WHERE Id=@id;
    COMMIT;
END TRY
BEGIN CATCH
    SET @error=ERROR_NUMBER();
    IF XACT_STATE()<>0 ROLLBACK;
END CATCH;
IF @error<>51107 THROW 51205, 'Audit log UPDATE was not blocked', 1;
PRINT 'PASS: audit log cannot be edited';
GO
