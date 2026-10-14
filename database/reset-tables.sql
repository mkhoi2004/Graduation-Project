-- DESTRUCTIVE: SQLCMD Mode required. Drops only user tables in [Graduation Project], then rebuilds them.
:On Error exit
USE [Graduation Project];
GO
IF CONVERT(sysname, SERVERPROPERTY('MachineName')) <> N'DESKTOP-F5CFA0D'
   OR CONVERT(sysname, SERVERPROPERTY('InstanceName')) <> N'SQLEXPRESS'
  THROW 51300, 'Safety check failed: expected DESKTOP-F5CFA0D\SQLEXPRESS.', 1;
GO
SET XACT_ABORT ON;
BEGIN TRY
  BEGIN TRANSACTION;
  DECLARE @LockResult INT, @Sql NVARCHAR(MAX);
  EXEC @LockResult=sys.sp_getapplock @Resource=N'dental-project-reset-tables', @LockMode=N'Exclusive', @LockOwner=N'Transaction', @LockTimeout=10000;
  IF @LockResult < 0 THROW 51301, 'Cannot acquire table reset lock.', 1;

  SELECT @Sql=STRING_AGG(CONVERT(NVARCHAR(MAX),
    N'ALTER TABLE ' + QUOTENAME(OBJECT_SCHEMA_NAME(parent_object_id)) + N'.' + QUOTENAME(OBJECT_NAME(parent_object_id)) +
    N' DROP CONSTRAINT ' + QUOTENAME(name) + N';'), CHAR(10))
  FROM sys.foreign_keys WHERE is_ms_shipped=0;
  IF NULLIF(@Sql,N'') IS NOT NULL EXEC sys.sp_executesql @Sql;

  SELECT @Sql=STRING_AGG(CONVERT(NVARCHAR(MAX),
    N'DROP TABLE ' + QUOTENAME(SCHEMA_NAME(schema_id)) + N'.' + QUOTENAME(name) + N';'), CHAR(10))
  FROM sys.tables WHERE is_ms_shipped=0;
  IF NULLIF(@Sql,N'') IS NOT NULL EXEC sys.sp_executesql @Sql;

  IF EXISTS(SELECT 1 FROM sys.tables WHERE is_ms_shipped=0)
    THROW 51302, 'Some user tables remain; reset rolled back.', 1;
  COMMIT TRANSACTION;
  PRINT 'Old user tables removed; database and database-level permissions preserved.';
END TRY
BEGIN CATCH
  IF XACT_STATE()<>0 ROLLBACK TRANSACTION;
  THROW;
END CATCH;
GO
:r ".\database\bootstrap.sql"
:r ".\database\06_seed.sql"
