EXEC(N'CREATE TRIGGER dbo.TR_Roles_Archive ON dbo.Roles INSTEAD OF DELETE AS
BEGIN
  SET NOCOUNT ON;
  DECLARE @Actor VARCHAR(100) = TRY_CONVERT(VARCHAR(100), SESSION_CONTEXT(N''username''));
  IF NULLIF(LTRIM(RTRIM(@Actor)), '''') IS NULL
    THROW 51020, ''SESSION_CONTEXT username is required for archive.'', 1;
  INSERT dbo.Roles_Deleted (RoleId, Code, Name, CreatedAt, CreatedBy, Version, DeletedAt, DeletedBy)
    SELECT RoleId, Code, Name, CreatedAt, CreatedBy, Version, SYSUTCDATETIME(), @Actor FROM deleted;
  DELETE source FROM dbo.Roles source JOIN deleted d ON source.RoleId=d.RoleId;
END');
EXEC(N'CREATE TRIGGER dbo.TR_Roles_ImmutableId ON dbo.Roles AFTER UPDATE AS
BEGIN
  SET NOCOUNT ON;
  IF UPDATE(RoleId) THROW 51021, ''Primary ID cannot be updated.'', 1;
END');
EXEC(N'CREATE TRIGGER dbo.TR_Branches_Archive ON dbo.Branches INSTEAD OF DELETE AS
BEGIN
  SET NOCOUNT ON;
  DECLARE @Actor VARCHAR(100) = TRY_CONVERT(VARCHAR(100), SESSION_CONTEXT(N''username''));
  IF NULLIF(LTRIM(RTRIM(@Actor)), '''') IS NULL
    THROW 51020, ''SESSION_CONTEXT username is required for archive.'', 1;
  INSERT dbo.Branches_Deleted (BranchId, Code, Name, CreatedAt, CreatedBy, Version, DeletedAt, DeletedBy)
    SELECT BranchId, Code, Name, CreatedAt, CreatedBy, Version, SYSUTCDATETIME(), @Actor FROM deleted;
  DELETE source FROM dbo.Branches source JOIN deleted d ON source.BranchId=d.BranchId;
END');
EXEC(N'CREATE TRIGGER dbo.TR_Branches_ImmutableId ON dbo.Branches AFTER UPDATE AS
BEGIN
  SET NOCOUNT ON;
  IF UPDATE(BranchId) THROW 51021, ''Primary ID cannot be updated.'', 1;
END');

EXEC(N'CREATE TRIGGER dbo.TR_Users_Archive ON dbo.Users INSTEAD OF DELETE AS
BEGIN
  SET NOCOUNT ON;
  DECLARE @Actor VARCHAR(100) = TRY_CONVERT(VARCHAR(100), SESSION_CONTEXT(N''username''));
  IF NULLIF(LTRIM(RTRIM(@Actor)), '''') IS NULL
    THROW 51020, ''SESSION_CONTEXT username is required for archive.'', 1;
  INSERT dbo.Users_Deleted (UserId, Username, DisplayName, PasswordHash, RoleId, BranchId, IsApprover, IsActive, CreatedAt, CreatedBy, Version, DeletedAt, DeletedBy)
    SELECT UserId, Username, DisplayName, PasswordHash, RoleId, BranchId, IsApprover, IsActive, CreatedAt, CreatedBy, Version, SYSUTCDATETIME(), @Actor FROM deleted;
  DELETE source FROM dbo.Users source JOIN deleted d ON source.UserId=d.UserId;
END');
EXEC(N'CREATE TRIGGER dbo.TR_Users_ImmutableId ON dbo.Users AFTER UPDATE AS
BEGIN
  SET NOCOUNT ON;
  IF UPDATE(UserId) THROW 51021, ''Primary ID cannot be updated.'', 1;
END');
EXEC(N'CREATE TRIGGER dbo.TR_AccessAuditLogs_AppendOnly ON dbo.AccessAuditLogs INSTEAD OF UPDATE, DELETE AS
BEGIN
  THROW 51022, ''AccessAuditLogs are append-only.'', 1;
END');
-- End foundation triggers.
