-- SSMS: Query > SQLCMD Mode. Adjust ProjectRoot only if the repository moves.
:On Error exit
:r ".\database\01_create_database.sql"
SET XACT_ABORT ON;
SET ANSI_NULLS ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET QUOTED_IDENTIFIER ON;
SET NUMERIC_ROUNDABORT OFF;
BEGIN TRY
  BEGIN TRANSACTION;
  DECLARE @LockResult INT;
  EXEC @LockResult = sys.sp_getapplock @Resource=N'dental-foundation-bootstrap',
    @LockMode=N'Exclusive', @LockOwner=N'Transaction', @LockTimeout=10000;
  IF @LockResult < 0 THROW 51000, 'Cannot acquire schema installation lock.', 1;

  IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE is_ms_shipped = 0)
  BEGIN
:r ".\database\02_tables\02_m01_foundation.sql"
:r ".\database\02_tables\02_m02_catalog.sql"
:r ".\database\02_tables\02_m03_patient_visit.sql"
:r ".\database\02_tables\02_m05_clinical.sql"
:r ".\database\02_tables\02_m06_billing.sql"
:r ".\database\02_tables\02_m07_inventory.sql"
:r ".\database\02_tables\02_m08_accounting.sql"
:r ".\database\02_tables\02_m09_insurance.sql"
:r ".\database\02_tables\02_m10_operations.sql"
:r ".\database\02_tables\02_m11_hr.sql"
:r ".\database\02_tables\02_m12_reconciliation.sql"
:r ".\database\03_deleted_tables\03_m01_foundation.sql"
:r ".\database\03_deleted_tables\03_m02_m12_archives.sql"
:r ".\database\04_triggers\04_m01_foundation.sql"
:r ".\database\04_triggers\04_m02_m12_guards.sql"
:r ".\database\05_constraints_indexes.sql"
    INSERT dbo.SchemaMigrations(MigrationId) VALUES ('001-full-schema');
  END
  ELSE
  BEGIN
    IF OBJECT_ID(N'dbo.SchemaMigrations', N'U') IS NULL
      THROW 51001, 'Existing database is not a recognized foundation. No changes were applied.', 1;
    EXEC(N'IF NOT EXISTS (SELECT 1 FROM dbo.SchemaMigrations WHERE MigrationId = ''001-full-schema'')
      THROW 51002, ''Existing schema version is not supported. No changes were applied.'', 1;');
  END;
:r ".\database\verify.sql"
  COMMIT TRANSACTION;
  PRINT 'Full project schema installed/verified. Run npm run seed from backend.';
END TRY
BEGIN CATCH
  IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
  THROW;
END CATCH;
GO
