-- For scripts/test-database.ps1 only. All inserted fixtures roll back.
SET XACT_ABORT OFF;
BEGIN TRANSACTION;
EXEC sys.sp_set_session_context @key=N'username', @value=N'foundation-test';
INSERT dbo.Roles(Code, Name, CreatedBy) VALUES ('ADMIN', N'Test admin', 'test');
INSERT dbo.Branches(Code, Name, CreatedBy) VALUES ('TEST', N'Test branch', 'test');
DECLARE @Role UNIQUEIDENTIFIER = (SELECT RoleId FROM dbo.Roles WHERE Code='ADMIN');
DECLARE @Branch UNIQUEIDENTIFIER = (SELECT BranchId FROM dbo.Branches WHERE Code='TEST');
DELETE dbo.Branches WHERE BranchId=@Branch;
IF NOT EXISTS (SELECT 1 FROM dbo.Branches_Deleted WHERE BranchId=@Branch AND DeletedBy='foundation-test')
  THROW 51030, 'Archive lost identity or actor.', 1;
IF EXISTS (SELECT 1 FROM dbo.Branches WHERE BranchId=@Branch)
  THROW 51031, 'Archive did not remove active row.', 1;
ROLLBACK TRANSACTION;

BEGIN TRY
  INSERT dbo.Roles(Code, Name, CreatedBy) VALUES ('INVALID', N'Invalid role', 'test');
  THROW 51032, 'Invalid role accepted.', 1;
END TRY
BEGIN CATCH
  IF ERROR_NUMBER() <> 547 THROW;
END CATCH;

BEGIN TRANSACTION;
INSERT dbo.AccessAuditLogs(ActorName, Purpose, Action, ObjectType, Outcome, Source)
VALUES ('test', N'test', 'READ', 'test', 'ALLOWED', 'local-test');
COMMIT TRANSACTION;
BEGIN TRY
  DELETE dbo.AccessAuditLogs;
  THROW 51033, 'Audit deletion accepted.', 1;
END TRY
BEGIN CATCH
  IF ERROR_NUMBER() <> 51022 THROW;
END CATCH;
IF (SELECT COUNT(*) FROM dbo.AccessAuditLogs) <> 1 THROW 51034, 'Audit was deleted.', 1;
PRINT 'SQL smoke passed: archive preserves actor/identity; role check and audit deletion guard enforced.';
