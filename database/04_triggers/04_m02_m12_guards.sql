DECLARE @ArchiveTargets TABLE(TableName SYSNAME, IdColumn SYSNAME);
INSERT @ArchiveTargets VALUES
('Rooms','RoomId'),('Services','ServiceId'),('Suppliers','SupplierId'),('ConsentTemplates','ConsentTemplateId'),
('Patients','PatientId'),('Appointments','AppointmentId'),('Warehouses','WarehouseId'),('Items','ItemId'),('Assets','AssetId');
DECLARE @Table SYSNAME, @Id SYSNAME, @Columns NVARCHAR(MAX), @Sql NVARCHAR(MAX);
DECLARE archive_cursor CURSOR LOCAL FAST_FORWARD FOR SELECT TableName, IdColumn FROM @ArchiveTargets;
OPEN archive_cursor;
FETCH NEXT FROM archive_cursor INTO @Table, @Id;
WHILE @@FETCH_STATUS=0
BEGIN
  SELECT @Columns=STRING_AGG(QUOTENAME(c.name), ',') WITHIN GROUP(ORDER BY c.column_id)
  FROM sys.columns c WHERE c.object_id=OBJECT_ID(N'dbo.' + @Table) AND c.is_computed=0;
  SET @Sql=N'CREATE TRIGGER dbo.' + QUOTENAME('TR_' + @Table + '_Archive') + N' ON dbo.' + QUOTENAME(@Table) + N' INSTEAD OF DELETE AS
  BEGIN SET NOCOUNT ON;
    DECLARE @Actor VARCHAR(100)=TRY_CONVERT(VARCHAR(100),SESSION_CONTEXT(N''username''));
    IF NULLIF(LTRIM(RTRIM(@Actor)),'''') IS NULL THROW 51020,''SESSION_CONTEXT username is required for archive.'',1;
    INSERT dbo.' + QUOTENAME(@Table + '_Deleted') + N'(' + @Columns + N',DeletedAt,DeletedBy)
      SELECT ' + @Columns + N',SYSUTCDATETIME(),@Actor FROM deleted;
    DELETE source FROM dbo.' + QUOTENAME(@Table) + N' source JOIN deleted d ON source.' + QUOTENAME(@Id) + N'=d.' + QUOTENAME(@Id) + N';
  END';
  EXEC sys.sp_executesql @Sql;
  SET @Sql=N'CREATE TRIGGER dbo.' + QUOTENAME('TR_' + @Table + '_ImmutableId') + N' ON dbo.' + QUOTENAME(@Table) + N' AFTER UPDATE AS
  BEGIN SET NOCOUNT ON; IF UPDATE(' + QUOTENAME(@Id) + N') THROW 51021,''Primary ID cannot be updated.'',1; END';
  EXEC sys.sp_executesql @Sql;
  FETCH NEXT FROM archive_cursor INTO @Table, @Id;
END
CLOSE archive_cursor; DEALLOCATE archive_cursor;

DECLARE @ImmutableTargets TABLE(TableName SYSNAME, IdColumn SYSNAME);
INSERT @ImmutableTargets VALUES
('Visits','VisitId'),('EmrVersions','EmrVersionId'),('Consents','ConsentId'),('ServiceCompletionEvents','ServiceCompletionEventId'),
('PaymentTransactions','PaymentTransactionId'),('Deposits','DepositId'),('DepositApplications','DepositApplicationId'),('Refunds','RefundId'),
('InsuranceClaimVersions','InsuranceClaimVersionId'),('StockMovements','StockMovementId'),('SterilizationCycles','SterilizationCycleId'),
('JournalEntries','JournalEntryId'),('JournalLines','JournalLineId'),('AccessAuditLogs','AuditId');
DECLARE immutable_cursor CURSOR LOCAL FAST_FORWARD FOR SELECT TableName, IdColumn FROM @ImmutableTargets WHERE TableName<>'AccessAuditLogs';
OPEN immutable_cursor;
FETCH NEXT FROM immutable_cursor INTO @Table, @Id;
WHILE @@FETCH_STATUS=0
BEGIN
  SET @Sql=N'CREATE TRIGGER dbo.' + QUOTENAME('TR_' + @Table + '_NoDelete') + N' ON dbo.' + QUOTENAME(@Table) + N' INSTEAD OF DELETE AS
  BEGIN THROW 51023,''Business records cannot be physically deleted; cancel, void, reverse or adjust them.'',1; END';
  EXEC sys.sp_executesql @Sql;
  SET @Sql=N'CREATE TRIGGER dbo.' + QUOTENAME('TR_' + @Table + '_ImmutableId') + N' ON dbo.' + QUOTENAME(@Table) + N' AFTER UPDATE AS
  BEGIN SET NOCOUNT ON; IF UPDATE(' + QUOTENAME(@Id) + N') THROW 51021,''Primary ID cannot be updated.'',1; END';
  EXEC sys.sp_executesql @Sql;
  FETCH NEXT FROM immutable_cursor INTO @Table, @Id;
END
CLOSE immutable_cursor; DEALLOCATE immutable_cursor;
