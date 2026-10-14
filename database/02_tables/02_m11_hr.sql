CREATE TABLE dbo.Employees (
  EmployeeId UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_Employees_Id DEFAULT NEWSEQUENTIALID(), UserId UNIQUEIDENTIFIER NOT NULL,
  EmployeeCode VARCHAR(30) NOT NULL, BaseSalary DECIMAL(18,2) NOT NULL CONSTRAINT DF_Employees_Salary DEFAULT 0,
  Status VARCHAR(20) NOT NULL CONSTRAINT DF_Employees_Status DEFAULT 'ACTIVE', CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Employees_CreatedAt DEFAULT SYSUTCDATETIME(), CreatedBy VARCHAR(100) NOT NULL, Version ROWVERSION NOT NULL,
  CONSTRAINT PK_Employees PRIMARY KEY(EmployeeId), CONSTRAINT UQ_Employees_User UNIQUE(UserId), CONSTRAINT UQ_Employees_Code UNIQUE(EmployeeCode),
  CONSTRAINT FK_Employees_User FOREIGN KEY(UserId) REFERENCES dbo.Users(UserId), CONSTRAINT CK_Employees_Salary CHECK(BaseSalary >= 0),
  CONSTRAINT CK_Employees_Status CHECK(Status IN ('ACTIVE','INACTIVE','TERMINATED'))
);
CREATE TABLE dbo.CommissionRuleVersions (
  CommissionRuleVersionId UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_CommissionRules_Id DEFAULT NEWSEQUENTIALID(), ServiceId UNIQUEIDENTIFIER NULL,
  VersionNo INT NOT NULL, Basis VARCHAR(30) NOT NULL, RatePercent DECIMAL(7,4) NOT NULL, EffectiveFrom DATETIME2 NOT NULL, EffectiveTo DATETIME2 NULL,
  Status VARCHAR(20) NOT NULL CONSTRAINT DF_CommissionRules_Status DEFAULT 'DRAFT', ApprovedBy UNIQUEIDENTIFIER NULL,
  CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_CommissionRules_CreatedAt DEFAULT SYSUTCDATETIME(), CreatedBy VARCHAR(100) NOT NULL,
  CONSTRAINT PK_CommissionRuleVersions PRIMARY KEY(CommissionRuleVersionId), CONSTRAINT FK_CommissionRules_Service FOREIGN KEY(ServiceId) REFERENCES dbo.Services(ServiceId),
  CONSTRAINT FK_CommissionRules_Approver FOREIGN KEY(ApprovedBy) REFERENCES dbo.Users(UserId), CONSTRAINT CK_CommissionRules_Rate CHECK(RatePercent BETWEEN 0 AND 100),
  CONSTRAINT CK_CommissionRules_Period CHECK(EffectiveTo IS NULL OR EffectiveTo > EffectiveFrom), CONSTRAINT CK_CommissionRules_Basis CHECK(Basis IN ('COMPLETION','CONFIRMED_COLLECTION')),
  CONSTRAINT CK_CommissionRules_Status CHECK(Status IN ('DRAFT','APPROVED','RETIRED'))
);
CREATE TABLE dbo.PayrollPeriods (
  PayrollPeriodId UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_PayrollPeriods_Id DEFAULT NEWSEQUENTIALID(), Code VARCHAR(20) NOT NULL,
  StartsOn DATE NOT NULL, EndsOn DATE NOT NULL, Status VARCHAR(20) NOT NULL CONSTRAINT DF_PayrollPeriods_Status DEFAULT 'OPEN',
  LockedAt DATETIME2 NULL, CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_PayrollPeriods_CreatedAt DEFAULT SYSUTCDATETIME(), CreatedBy VARCHAR(100) NOT NULL,
  CONSTRAINT PK_PayrollPeriods PRIMARY KEY(PayrollPeriodId), CONSTRAINT UQ_PayrollPeriods_Code UNIQUE(Code), CONSTRAINT CK_PayrollPeriods_Dates CHECK(EndsOn >= StartsOn),
  CONSTRAINT CK_PayrollPeriods_Status CHECK(Status IN ('OPEN','CALCULATED','LOCKED'))
);
CREATE TABLE dbo.Commissions (
  CommissionId UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_Commissions_Id DEFAULT NEWSEQUENTIALID(), EmployeeId UNIQUEIDENTIFIER NOT NULL,
  ServiceCompletionEventId UNIQUEIDENTIFIER NOT NULL, CommissionRuleVersionId UNIQUEIDENTIFIER NOT NULL, PayrollPeriodId UNIQUEIDENTIFIER NOT NULL,
  BasisAmount DECIMAL(18,2) NOT NULL, CommissionAmount DECIMAL(18,2) NOT NULL, Status VARCHAR(20) NOT NULL CONSTRAINT DF_Commissions_Status DEFAULT 'CALCULATED',
  CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Commissions_CreatedAt DEFAULT SYSUTCDATETIME(), CreatedBy VARCHAR(100) NOT NULL,
  CONSTRAINT PK_Commissions PRIMARY KEY(CommissionId), CONSTRAINT UQ_Commissions_Event_Employee_Rule UNIQUE(ServiceCompletionEventId, EmployeeId, CommissionRuleVersionId),
  CONSTRAINT FK_Commissions_Employee FOREIGN KEY(EmployeeId) REFERENCES dbo.Employees(EmployeeId), CONSTRAINT FK_Commissions_Completion FOREIGN KEY(ServiceCompletionEventId) REFERENCES dbo.ServiceCompletionEvents(ServiceCompletionEventId),
  CONSTRAINT FK_Commissions_Rule FOREIGN KEY(CommissionRuleVersionId) REFERENCES dbo.CommissionRuleVersions(CommissionRuleVersionId), CONSTRAINT FK_Commissions_Period FOREIGN KEY(PayrollPeriodId) REFERENCES dbo.PayrollPeriods(PayrollPeriodId),
  CONSTRAINT CK_Commissions_Amounts CHECK(BasisAmount >= 0 AND CommissionAmount >= 0), CONSTRAINT CK_Commissions_Status CHECK(Status IN ('CALCULATED','APPROVED','PAID','REVERSED'))
);
CREATE TABLE dbo.CommissionAdjustments (
  CommissionAdjustmentId UNIQUEIDENTIFIER NOT NULL CONSTRAINT DF_CommissionAdjustments_Id DEFAULT NEWSEQUENTIALID(), CommissionId UNIQUEIDENTIFIER NOT NULL,
  PayrollPeriodId UNIQUEIDENTIFIER NOT NULL, Amount DECIMAL(18,2) NOT NULL, Reason NVARCHAR(500) NOT NULL,
  CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_CommissionAdjustments_CreatedAt DEFAULT SYSUTCDATETIME(), CreatedBy VARCHAR(100) NOT NULL,
  CONSTRAINT PK_CommissionAdjustments PRIMARY KEY(CommissionAdjustmentId), CONSTRAINT FK_CommissionAdjustments_Commission FOREIGN KEY(CommissionId) REFERENCES dbo.Commissions(CommissionId),
  CONSTRAINT FK_CommissionAdjustments_Period FOREIGN KEY(PayrollPeriodId) REFERENCES dbo.PayrollPeriods(PayrollPeriodId), CONSTRAINT CK_CommissionAdjustments_Amount CHECK(Amount <> 0)
);
