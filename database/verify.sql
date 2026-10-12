-- Run after 001_schema.sql and 002_archive.sql with sqlcmd -b.
USE [Graduation Project];
GO
SET NOCOUNT ON;
IF EXISTS (
    SELECT 1 FROM sys.tables AS t
    JOIN sys.schemas AS s ON s.schema_id = t.schema_id
    WHERE s.name = N'dbo' AND t.name NOT LIKE N'%[_]Deleted'
      AND NOT EXISTS (SELECT 1 FROM sys.tables AS a WHERE a.schema_id = t.schema_id AND a.name = t.name + N'_Deleted')
) THROW 51000, 'Missing archive table', 1;

IF EXISTS (
    SELECT 1 FROM sys.tables AS t
    JOIN sys.schemas AS s ON s.schema_id = t.schema_id
    WHERE s.name = N'dbo' AND t.name NOT LIKE N'%[_]Deleted'
      AND NOT EXISTS (SELECT 1 FROM sys.triggers AS tr WHERE tr.parent_id = t.object_id AND tr.is_instead_of_trigger = 1)
) THROW 51001, 'Missing archive trigger', 1;
IF EXISTS (
    SELECT 1 FROM sys.tables AS t JOIN sys.schemas AS s ON s.schema_id=t.schema_id
    WHERE s.name=N'dbo' AND t.name NOT LIKE N'%[_]Deleted'
      AND NOT EXISTS (SELECT 1 FROM sys.key_constraints AS k WHERE k.parent_object_id=t.object_id AND k.type='PK')
) THROW 51011, 'Main table without primary key', 1;
IF EXISTS (
    SELECT 1 FROM sys.tables AS t
    JOIN sys.schemas AS s ON s.schema_id=t.schema_id AND s.name=N'dbo'
    JOIN sys.tables AS a ON a.schema_id=t.schema_id AND a.name=t.name+N'_Deleted'
    JOIN sys.columns AS c ON c.object_id=t.object_id
    LEFT JOIN sys.columns AS ac ON ac.object_id=a.object_id AND ac.name=c.name
    WHERE t.name NOT LIKE N'%[_]Deleted'
      AND (ac.column_id IS NULL OR ac.system_type_id<>c.system_type_id OR ac.max_length<>c.max_length
        OR ac.precision<>c.precision OR ac.scale<>c.scale OR ac.is_nullable<>c.is_nullable)
) THROW 51012, 'Archive column shape differs from live table', 1;
GO

BEGIN TRAN;
BEGIN TRY
    DECLARE @ids TABLE (Id BIGINT NOT NULL);
    DECLARE @tag VARCHAR(40) = 'VERIFY_' + REPLACE(CONVERT(VARCHAR(36), NEWID()), '-', '');
    INSERT dbo.Roles(Code, Name) OUTPUT inserted.Id INTO @ids(Id)
    VALUES (@tag + 'A', N'Archive check A'), (@tag + 'B', N'Archive check B');

    EXEC sys.sp_set_session_context @key=N'ActorId', @value=N'verify-runner';
    EXEC sys.sp_set_session_context @key=N'DeleteReason', @value=N'multirow verification';
    DELETE FROM dbo.Roles WHERE Id IN (SELECT Id FROM @ids);
    IF (SELECT COUNT(*) FROM dbo.Roles_Deleted WHERE Id IN (SELECT Id FROM @ids) AND DeletedBy=N'verify-runner') <> 2
        THROW 51002, 'Multirow delete did not archive two rows', 1;
    IF EXISTS (SELECT 1 FROM dbo.Roles WHERE Id IN (SELECT Id FROM @ids))
        THROW 51003, 'Deleted rows remain live', 1;

    DECLARE @roleId BIGINT, @userId BIGINT;
    INSERT dbo.Roles(Code, Name) VALUES (@tag + 'C', N'FK check');
    SELECT @roleId = Id FROM dbo.Roles WHERE Code = @tag + 'C';
    INSERT dbo.Users(Username, DisplayName, PasswordHash)
    VALUES (@tag, N'FK check user', 'test-only-hash');
    SELECT @userId = Id FROM dbo.Users WHERE Username = @tag;
    INSERT dbo.UserRoles(UserId,RoleId) VALUES (@userId,@roleId);

    BEGIN TRY
        DELETE FROM dbo.Roles WHERE Id=@roleId;
        THROW 51004, 'FK-restricted parent delete unexpectedly succeeded', 1;
    END TRY
    BEGIN CATCH
        IF ERROR_NUMBER() = 51004 THROW;
        IF ERROR_NUMBER() <> 547 THROW;
    END CATCH;
    IF NOT EXISTS (SELECT 1 FROM dbo.Roles WHERE Id=@roleId)
        THROW 51005, 'FK-restricted role was removed', 1;
    IF EXISTS (SELECT 1 FROM dbo.Roles_Deleted WHERE Id=@roleId)
        THROW 51006, 'Failed delete left a false archive row', 1;

    ROLLBACK;
    PRINT 'PASS: archive coverage, multirow archival and FK rejection';
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0 ROLLBACK;
    THROW;
END CATCH;
GO

-- Commit a disposable source row, then check it only after the failed
-- DELETE transaction has been rolled back.
DECLARE @tag2 VARCHAR(40) = 'VERIFY_' + REPLACE(CONVERT(VARCHAR(36), NEWID()), '-', '');
INSERT dbo.Roles(Code, Name) VALUES (@tag2, N'Archive write must fail');
DECLARE @archiveFailureId BIGINT = (SELECT Id FROM dbo.Roles WHERE Code=@tag2);
ALTER TABLE dbo.Roles_Deleted WITH NOCHECK ADD CONSTRAINT CK_Roles_Deleted_Verify
  CHECK (Name <> N'Archive write must fail');
DECLARE @deleteError INT = 0;
BEGIN TRY
    BEGIN TRAN;
    DELETE FROM dbo.Roles WHERE Id=@archiveFailureId;
    COMMIT;
END TRY
BEGIN CATCH
    SET @deleteError = ERROR_NUMBER();
    IF XACT_STATE() <> 0 ROLLBACK;
END CATCH;
DECLARE @liveRows INT = (SELECT COUNT(*) FROM dbo.Roles WHERE Id=@archiveFailureId);
DECLARE @archiveRows INT = (SELECT COUNT(*) FROM dbo.Roles_Deleted WHERE Id=@archiveFailureId);
ALTER TABLE dbo.Roles_Deleted DROP CONSTRAINT CK_Roles_Deleted_Verify;
IF @liveRows=1 DELETE FROM dbo.Roles WHERE Id=@archiveFailureId;
DELETE FROM dbo.Roles_Deleted WHERE Id=@archiveFailureId;
IF @deleteError <> 547 THROW 51007, 'Archive-write failure was not rejected by its CHECK', 1;
IF @liveRows <> 1 THROW 51008, 'Archive-write failure removed live row after rollback', 1;
IF @archiveRows <> 0 THROW 51009, 'Archive-write failure persisted archived row', 1;
PRINT 'PASS: archive-write failure preserved live row after rollback';
GO
