-- Run after 001_schema.sql. SQL Server 2017+ (STRING_AGG).
USE [Graduation Project];
GO
SET NOCOUNT ON;
DECLARE @name SYSNAME, @archive SYSNAME, @trigger SYSNAME;
DECLARE @cols NVARCHAR(MAX), @sourceCols NVARCHAR(MAX), @sql NVARCHAR(MAX), @guard NVARCHAR(MAX);

DECLARE main_tables CURSOR LOCAL FAST_FORWARD FOR
SELECT t.name
FROM sys.tables AS t
JOIN sys.schemas AS s ON s.schema_id = t.schema_id
WHERE s.name = N'dbo'
  AND t.name NOT LIKE N'%[_]Deleted'
  AND EXISTS (SELECT 1 FROM sys.columns AS c WHERE c.object_id = t.object_id AND c.name = N'Id')
ORDER BY t.name;
OPEN main_tables;
FETCH NEXT FROM main_tables INTO @name;
WHILE @@FETCH_STATUS = 0
BEGIN
    SET @archive = @name + N'_Deleted';
    SET @trigger = N'TR_' + @name + N'_ArchiveDelete';

    IF OBJECT_ID(N'dbo.' + @archive, N'U') IS NULL
    BEGIN
        SET @sql = N'SELECT TOP (0) * INTO dbo.' + QUOTENAME(@archive) +
            N' FROM dbo.' + QUOTENAME(@name) + N';
              ALTER TABLE dbo.' + QUOTENAME(@archive) + N' ADD
                DeletedAt DATETIME2(3) NOT NULL,
                DeletedBy NVARCHAR(128) NOT NULL,
                DeletedLogin NVARCHAR(128) NOT NULL,
                DeleteReason NVARCHAR(500) NULL,
                ArchiveBatchId UNIQUEIDENTIFIER NOT NULL;
              CREATE INDEX ' + QUOTENAME(N'IX_' + @archive + N'_Id') +
            N' ON dbo.' + QUOTENAME(@archive) + N'(Id, DeletedAt);';
        EXEC sys.sp_executesql @sql;
    END;

    SELECT @cols = STRING_AGG(CONVERT(NVARCHAR(MAX), QUOTENAME(c.name)), N',') WITHIN GROUP (ORDER BY c.column_id),
           @sourceCols = STRING_AGG(CONVERT(NVARCHAR(MAX), N'd.' + QUOTENAME(c.name)), N',') WITHIN GROUP (ORDER BY c.column_id)
    FROM sys.columns AS c
    WHERE c.object_id = OBJECT_ID(N'dbo.' + @name)
      AND c.is_computed = 0;

    SET @guard = CASE @name
        WHEN N'Visits' THEN N'IF EXISTS (SELECT 1 FROM deleted WHERE Status<>''REGISTERED'') THROW 51020, ''Started visits cannot be deleted'', 1;'
        WHEN N'ServiceLines' THEN N'IF EXISTS (SELECT 1 FROM deleted WHERE Status=''COMPLETED'') THROW 51021, ''Completed services cannot be deleted'', 1;'
        WHEN N'EmrRecords' THEN N'IF EXISTS (SELECT 1 FROM deleted WHERE Status IN (''SIGNED'',''AMENDED'')) THROW 51022, ''Signed EMR cannot be deleted'', 1;'
        WHEN N'Consents' THEN N'IF EXISTS (SELECT 1 FROM deleted WHERE Status IN (''SIGNED'',''REVOKED'')) THROW 51023, ''Signed consent cannot be deleted'', 1;'
        WHEN N'PaymentTransactions' THEN N'IF EXISTS (SELECT 1 FROM deleted WHERE Status=''CONFIRMED'') THROW 51024, ''Confirmed payments cannot be deleted'', 1;'
        WHEN N'JournalEntries' THEN N'IF EXISTS (SELECT 1 FROM deleted WHERE Status IN (''POSTED'',''REVERSED'')) THROW 51025, ''Posted journals cannot be deleted'', 1;'
        WHEN N'StockMovements' THEN N'IF EXISTS (SELECT 1 FROM deleted) THROW 51026, ''Stock movement ledger cannot be deleted'', 1;'
        WHEN N'AuditLogs' THEN N'IF EXISTS (SELECT 1 FROM deleted) THROW 51027, ''Audit log cannot be deleted'', 1;'
        ELSE N''
    END;

    SET @sql = N'CREATE OR ALTER TRIGGER dbo.' + QUOTENAME(@trigger) +
        N' ON dbo.' + QUOTENAME(@name) + N' INSTEAD OF DELETE AS
          BEGIN
              SET NOCOUNT ON;
              IF NOT EXISTS (SELECT 1 FROM deleted) RETURN;
              ' + @guard + N'
              DECLARE @batch UNIQUEIDENTIFIER = NEWID();
              DELETE live FROM dbo.' + QUOTENAME(@name) + N' AS live
              INNER JOIN deleted AS d ON d.Id = live.Id;
              INSERT INTO dbo.' + QUOTENAME(@archive) + N' (' + @cols + N',DeletedAt,DeletedBy,DeletedLogin,DeleteReason,ArchiveBatchId)
              SELECT ' + @sourceCols + N',SYSUTCDATETIME(),
                     COALESCE(CONVERT(NVARCHAR(128),SESSION_CONTEXT(N''ActorId'')),ORIGINAL_LOGIN()),
                     ORIGINAL_LOGIN(),
                     CONVERT(NVARCHAR(500),SESSION_CONTEXT(N''DeleteReason'')),
                     @batch
              FROM deleted AS d;
          END;';
    EXEC sys.sp_executesql @sql;

    FETCH NEXT FROM main_tables INTO @name;
END;
CLOSE main_tables;
DEALLOCATE main_tables;
GO

-- No ON DELETE CASCADE is configured. A parent with live children cannot be
-- removed. A failed FK check prevents the archive INSERT from running.
-- The application sets ActorId/DeleteReason through sp_set_session_context
-- in the same connection and transaction before DELETE.
