-- Local development data only. Run with sqlcmd -f 65001 after 001-003 and local account bootstrap.
-- Re-runnable: DEMO identifiers and deterministic event keys prevent duplicates.
USE [Graduation Project];
GO
SET NOCOUNT ON;
SET XACT_ABORT ON;
SET ANSI_NULLS ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET QUOTED_IDENTIFIER ON;
SET NUMERIC_ROUNDABORT OFF;
GO

BEGIN TRY
    BEGIN TRANSACTION;
    IF UNICODE(SUBSTRING(N'Bệnh',2,1)) <> 7879
        THROW 51201, 'Run sqlcmd with -f 65001 to preserve Vietnamese text', 1;

    DECLARE @admin BIGINT = (SELECT Id FROM dbo.Users WHERE Username='admin');
    DECLARE @reception BIGINT = (SELECT Id FROM dbo.Users WHERE Username='receptionist');
    DECLARE @doctor BIGINT = (SELECT Id FROM dbo.Users WHERE Username='doctor');
    DECLARE @doctorRole BIGINT = (SELECT Id FROM dbo.Roles WHERE Code='DOCTOR');
    DECLARE @receptionRole BIGINT = (SELECT Id FROM dbo.Roles WHERE Code='RECEPTIONIST');
    IF @admin IS NULL OR @reception IS NULL OR @doctor IS NULL
       OR @doctorRole IS NULL OR @receptionRole IS NULL
        THROW 51200, 'Run local account bootstrap before 004_demo_data.sql', 1;

    IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE Username='demo.doctor')
        INSERT dbo.Users(Username, DisplayName, PasswordHash)
        VALUES ('demo.doctor', N'Bác sĩ demo',
          'pbkdf2-sha256$210000$3iIlWriD29ss3ubC/Yr59w==$jm8IUEXCUt5s39CKnBKJMKx9THhh6ZIRMhFqZxV3yx4=');
    IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE Username='demo.receptionist')
        INSERT dbo.Users(Username, DisplayName, PasswordHash)
        VALUES ('demo.receptionist', N'Lễ tân demo',
          'pbkdf2-sha256$210000$VTJrJ7bjcZNUVdMRvpgsNQ==$yNBY/+ZFiholn77s1MtMw+gqZxQNS2moF9Pd6Aeyduk=');
    DECLARE @demoDoctor BIGINT = (SELECT Id FROM dbo.Users WHERE Username='demo.doctor');
    DECLARE @demoReception BIGINT = (SELECT Id FROM dbo.Users WHERE Username='demo.receptionist');
    -- Repair only demo labels damaged by an older sqlcmd run without -f 65001.
    UPDATE dbo.Users SET DisplayName=N'Bác sĩ demo'
      WHERE Id=@demoDoctor AND UNICODE(SUBSTRING(DisplayName,2,1))=195;
    UPDATE dbo.Users SET DisplayName=N'Lễ tân demo'
      WHERE Id=@demoReception AND UNICODE(SUBSTRING(DisplayName,2,1))=225;
    IF NOT EXISTS (SELECT 1 FROM dbo.UserRoles WHERE UserId=@demoDoctor AND RoleId=@doctorRole)
        INSERT dbo.UserRoles(UserId,RoleId) VALUES (@demoDoctor,@doctorRole);
    IF NOT EXISTS (SELECT 1 FROM dbo.UserRoles WHERE UserId=@demoReception AND RoleId=@receptionRole)
        INSERT dbo.UserRoles(UserId,RoleId) VALUES (@demoReception,@receptionRole);

    DECLARE @i INT = 1;
    WHILE @i <= 5
    BEGIN
        DECLARE @suffix VARCHAR(2) = RIGHT('0'+CONVERT(VARCHAR(2),@i),2);
        DECLARE @branch VARCHAR(40) = 'DEMO-'+@suffix;
        DECLARE @patient BIGINT, @service BIGINT, @price BIGINT, @visit BIGINT;
        DECLARE @serviceLine BIGINT, @company BIGINT, @claim BIGINT;
        DECLARE @shift BIGINT, @deposit BIGINT, @item BIGINT, @lot BIGINT;
        DECLARE @cycle BIGINT, @journal BIGINT;
        DECLARE @amount DECIMAL(19,4) = CONVERT(DECIMAL(19,4),100000*@i);
        DECLARE @guidSuffix VARCHAR(12) = RIGHT('000000000000'+CONVERT(VARCHAR(12),@i),12);

        IF NOT EXISTS (SELECT 1 FROM dbo.Patients WHERE Phone='00000000'+@suffix)
            INSERT dbo.Patients(FullName,DateOfBirth,BirthYear,Phone,Allergies,MedicalHistory)
            VALUES (N'Bệnh nhân demo '+@suffix,DATEADD(YEAR,-25-@i,CONVERT(DATE,'2026-01-01')),
              2001-@i,'00000000'+@suffix,N'Không ghi nhận',N'Hồ sơ giả lập phục vụ kiểm thử local');
        SELECT @patient=Id FROM dbo.Patients WHERE Phone='00000000'+@suffix;

        IF NOT EXISTS (SELECT 1 FROM dbo.Services WHERE Code='DEMO-SVC-'+@suffix)
            INSERT dbo.Services(Code,Name,RequiresConsent)
            VALUES ('DEMO-SVC-'+@suffix,N'Dịch vụ nha khoa demo '+@suffix,1);
        SELECT @service=Id FROM dbo.Services WHERE Code='DEMO-SVC-'+@suffix;

        IF NOT EXISTS (SELECT 1 FROM dbo.ServicePrices WHERE ServiceId=@service)
            INSERT dbo.ServicePrices(ServiceId,UnitPrice,EffectiveFrom,ApprovedByUserId)
            VALUES (@service,@amount,CONVERT(DATETIME2(3),'2026-01-01'),@admin);
        SELECT @price=Id FROM dbo.ServicePrices WHERE ServiceId=@service;

        IF NOT EXISTS (SELECT 1 FROM dbo.Visits WHERE PatientId=@patient AND BranchCode=@branch)
            INSERT dbo.Visits(PatientId,DoctorUserId,BranchCode,Status,VisitType,StartedAt)
            VALUES (@patient,CASE WHEN @i=5 THEN @demoDoctor ELSE @doctor END,
              @branch,'IN_PROGRESS','STANDARD',DATEADD(DAY,-@i,SYSUTCDATETIME()));
        SELECT @visit=Id FROM dbo.Visits WHERE PatientId=@patient AND BranchCode=@branch;

        IF NOT EXISTS (SELECT 1 FROM dbo.EmrRecords WHERE VisitId=@visit)
            INSERT dbo.EmrRecords(VisitId,AuthorUserId,Diagnosis,Findings,TreatmentResult,Aftercare)
            VALUES (@visit,CASE WHEN @i=5 THEN @demoDoctor ELSE @doctor END,
              N'Chẩn đoán giả lập '+@suffix,N'Khám tổng quát mẫu',N'Ghi nhận mẫu',N'Tái khám theo lịch mẫu');

        IF NOT EXISTS (SELECT 1 FROM dbo.Consents WHERE VisitId=@visit AND ServiceId=@service)
            INSERT dbo.Consents(VisitId,ServiceId,Status,SignedAt,DocumentHash)
            VALUES (@visit,@service,'SIGNED',SYSUTCDATETIME(),'DEMO-CONSENT-'+@suffix);

        IF NOT EXISTS (SELECT 1 FROM dbo.ServiceLines WHERE VisitId=@visit AND ServiceId=@service)
            INSERT dbo.ServiceLines(VisitId,ServiceId,PriceId,Quantity,UnitPrice,Status,CompletionEventKey,CompletedAt)
            VALUES (@visit,@service,@price,1,@amount,'COMPLETED',
              CONVERT(UNIQUEIDENTIFIER,'00000000-0000-0000-0004-'+@guidSuffix),SYSUTCDATETIME());
        SELECT @serviceLine=Id FROM dbo.ServiceLines WHERE VisitId=@visit AND ServiceId=@service;

        -- Private insurer examples: no BHYT benefit or patient-pay calculation.
        IF NOT EXISTS (SELECT 1 FROM dbo.InsuranceCompanies WHERE Code='DEMO-INS-'+@suffix)
            INSERT dbo.InsuranceCompanies(Code,Name)
            VALUES ('DEMO-INS-'+@suffix,N'Bảo hiểm tư nhân demo '+@suffix);
        SELECT @company=Id FROM dbo.InsuranceCompanies WHERE Code='DEMO-INS-'+@suffix;
        IF NOT EXISTS (SELECT 1 FROM dbo.InsuranceClaims WHERE ClaimNumber='DEMO-CLAIM-'+@suffix)
            INSERT dbo.InsuranceClaims(VisitId,CompanyId,ClaimNumber,SubmittedAmount,Status)
            VALUES (@visit,@company,'DEMO-CLAIM-'+@suffix,@amount,'DRAFT');
        SELECT @claim=Id FROM dbo.InsuranceClaims WHERE ClaimNumber='DEMO-CLAIM-'+@suffix;
        IF NOT EXISTS (SELECT 1 FROM dbo.InsuranceClaimLines WHERE ClaimId=@claim AND ServiceLineId=@serviceLine)
            INSERT dbo.InsuranceClaimLines(ClaimId,ServiceLineId,ClaimedAmount)
            VALUES (@claim,@serviceLine,@amount);

        IF NOT EXISTS (SELECT 1 FROM dbo.CashShifts WHERE CashierUserId=@reception AND BranchCode=@branch)
            INSERT dbo.CashShifts(CashierUserId,BranchCode,OpeningFloat,Status)
            VALUES (@reception,@branch,CONVERT(DECIMAL(19,4),500000),'OPEN');
        SELECT @shift=Id FROM dbo.CashShifts WHERE CashierUserId=@reception AND BranchCode=@branch;

        IF NOT EXISTS (SELECT 1 FROM dbo.Deposits WHERE PatientId=@patient AND VisitId=@visit)
            INSERT dbo.Deposits(PatientId,VisitId,Amount,AppliedAmount,Status)
            VALUES (@patient,@visit,@amount,@amount/2,'CONFIRMED');
        SELECT @deposit=Id FROM dbo.Deposits WHERE PatientId=@patient AND VisitId=@visit;
        IF NOT EXISTS (SELECT 1 FROM dbo.PaymentTransactions WHERE IdempotencyKey=
          CONVERT(UNIQUEIDENTIFIER,'00000000-0000-0000-0001-'+@guidSuffix))
            INSERT dbo.PaymentTransactions(VisitId,DepositId,CashShiftId,IdempotencyKey,
              ExternalReference,Method,Direction,Amount,Status,ConfirmedAt)
            VALUES (@visit,@deposit,@shift,
              CONVERT(UNIQUEIDENTIFIER,'00000000-0000-0000-0001-'+@guidSuffix),
              'DEMO-PAY-'+@suffix,'CASH','IN',@amount,'CONFIRMED',SYSUTCDATETIME());
        IF NOT EXISTS (SELECT 1 FROM dbo.DepositApplications WHERE IdempotencyKey=
          CONVERT(UNIQUEIDENTIFIER,'00000000-0000-0000-0005-'+@guidSuffix))
            INSERT dbo.DepositApplications(DepositId,VisitId,IdempotencyKey,Amount)
            VALUES (@deposit,@visit,
              CONVERT(UNIQUEIDENTIFIER,'00000000-0000-0000-0005-'+@guidSuffix),@amount/2);

        IF NOT EXISTS (SELECT 1 FROM dbo.InventoryItems WHERE Code='DEMO-ITEM-'+@suffix)
            INSERT dbo.InventoryItems(Code,Name,Unit)
            VALUES ('DEMO-ITEM-'+@suffix,N'Vật tư nha khoa demo '+@suffix,N'Cái');
        SELECT @item=Id FROM dbo.InventoryItems WHERE Code='DEMO-ITEM-'+@suffix;
        IF NOT EXISTS (SELECT 1 FROM dbo.StockLots WHERE ItemId=@item AND BranchCode=@branch AND LotNumber='DEMO-LOT-'+@suffix)
            INSERT dbo.StockLots(ItemId,BranchCode,LotNumber,ExpiresOn,OnHand,Reserved,UnitCost)
            VALUES (@item,@branch,'DEMO-LOT-'+@suffix,CONVERT(DATE,'2028-12-31'),20,2,@amount/10);
        SELECT @lot=Id FROM dbo.StockLots WHERE ItemId=@item AND BranchCode=@branch AND LotNumber='DEMO-LOT-'+@suffix;
        IF NOT EXISTS (SELECT 1 FROM dbo.StockReservations WHERE IdempotencyKey=
          CONVERT(UNIQUEIDENTIFIER,'00000000-0000-0000-0006-'+@guidSuffix))
            INSERT dbo.StockReservations(StockLotId,VisitId,IdempotencyKey,Quantity,ExpiresAt)
            VALUES (@lot,@visit,CONVERT(UNIQUEIDENTIFIER,'00000000-0000-0000-0006-'+@guidSuffix),
              2,DATEADD(DAY,30,SYSUTCDATETIME()));
        IF NOT EXISTS (SELECT 1 FROM dbo.StockMovements WHERE SourceEventKey=
          CONVERT(UNIQUEIDENTIFIER,'00000000-0000-0000-0002-'+@guidSuffix))
            INSERT dbo.StockMovements(StockLotId,MovementType,Quantity,UnitCost,SourceEventKey)
            VALUES (@lot,'RECEIPT',20,@amount/10,
              CONVERT(UNIQUEIDENTIFIER,'00000000-0000-0000-0002-'+@guidSuffix));

        IF NOT EXISTS (SELECT 1 FROM dbo.SterilizationCycles WHERE EquipmentCode='DEMO-AUTOCLAVE-'+@suffix)
            INSERT dbo.SterilizationCycles(EquipmentCode,Status,StartedAt,CompletedAt,CheckedByUserId,IndicatorResult)
            VALUES ('DEMO-AUTOCLAVE-'+@suffix,'PASSED',DATEADD(HOUR,-2,SYSUTCDATETIME()),
              DATEADD(HOUR,-1,SYSUTCDATETIME()),@doctor,N'Đạt');
        SELECT @cycle=Id FROM dbo.SterilizationCycles WHERE EquipmentCode='DEMO-AUTOCLAVE-'+@suffix;
        IF NOT EXISTS (SELECT 1 FROM dbo.InstrumentPacks WHERE PackCode='DEMO-PACK-'+@suffix)
            INSERT dbo.InstrumentPacks(CycleId,PackCode,ExpiresAt,Status)
            VALUES (@cycle,'DEMO-PACK-'+@suffix,DATEADD(MONTH,6,SYSUTCDATETIME()),'AVAILABLE');

        IF NOT EXISTS (SELECT 1 FROM dbo.LabTickets WHERE VisitId=@visit AND VendorName=N'Lab demo '+@suffix)
            INSERT dbo.LabTickets(VisitId,VendorName,Instructions,DueAt,Cost,Status)
            VALUES (@visit,N'Lab demo '+@suffix,N'Chỉ định kỹ thuật giả lập',
              DATEADD(DAY,7,SYSUTCDATETIME()),@amount/2,'DRAFT');

        IF NOT EXISTS (SELECT 1 FROM dbo.JournalEntries WHERE SourceEventKey=
          CONVERT(UNIQUEIDENTIFIER,'00000000-0000-0000-0003-'+@guidSuffix))
            INSERT dbo.JournalEntries(SourceEventKey,EventType,RuleVersion,DocumentDate,
              AccountingDate,BranchCode,Status,PreparedByUserId)
            VALUES (CONVERT(UNIQUEIDENTIFIER,'00000000-0000-0000-0003-'+@guidSuffix),
              'DEMO_PAYMENT',1,CONVERT(DATE,SYSUTCDATETIME()),
              CONVERT(DATE,SYSUTCDATETIME()),@branch,'DRAFT',@reception);
        SELECT @journal=Id FROM dbo.JournalEntries WHERE SourceEventKey=
          CONVERT(UNIQUEIDENTIFIER,'00000000-0000-0000-0003-'+@guidSuffix);
        IF NOT EXISTS (SELECT 1 FROM dbo.JournalLines WHERE JournalEntryId=@journal AND AccountCode='1111')
            INSERT dbo.JournalLines(JournalEntryId,AccountCode,Debit,Credit)
            VALUES (@journal,'1111',@amount,0);
        IF NOT EXISTS (SELECT 1 FROM dbo.JournalLines WHERE JournalEntryId=@journal AND AccountCode='1311')
            INSERT dbo.JournalLines(JournalEntryId,AccountCode,Debit,Credit)
            VALUES (@journal,'1311',0,@amount);

        IF NOT EXISTS (SELECT 1 FROM dbo.WarrantyCases WHERE OriginalServiceLineId=@serviceLine)
            INSERT dbo.WarrantyCases(OriginalServiceLineId,Status,Reason)
            VALUES (@serviceLine,'OPEN',N'Tình huống bảo hành giả lập '+@suffix);
        UPDATE dbo.WarrantyCases SET FollowUpVisitId=NULL
          WHERE OriginalServiceLineId=@serviceLine AND FollowUpVisitId=@visit;
        IF NOT EXISTS (SELECT 1 FROM dbo.Employees WHERE EmployeeCode='DEMO-EMP-'+@suffix)
            INSERT dbo.Employees(UserId,EmployeeCode,FullName,BranchCode)
            VALUES (CASE @i WHEN 1 THEN @admin WHEN 2 THEN @reception WHEN 3 THEN @doctor
              WHEN 4 THEN @demoReception ELSE @demoDoctor END,
              'DEMO-EMP-'+@suffix,N'Nhân viên demo '+@suffix,@branch);
        IF NOT EXISTS (SELECT 1 FROM dbo.Assets WHERE AssetCode='DEMO-ASSET-'+@suffix)
            INSERT dbo.Assets(AssetCode,Name,BranchCode,MaintenanceDueAt)
            VALUES ('DEMO-ASSET-'+@suffix,N'Thiết bị nha khoa demo '+@suffix,
              @branch,DATEADD(MONTH,3,SYSUTCDATETIME()));
        IF NOT EXISTS (SELECT 1 FROM dbo.AuditLogs WHERE Action='DEMO_SEED' AND EntityName='Patients' AND EntityId=@patient)
            INSERT dbo.AuditLogs(ActorUserId,Action,EntityName,EntityId,Detail)
            VALUES (@admin,'DEMO_SEED','Patients',@patient,N'Dữ liệu giả lập local '+@suffix);

        IF UNICODE(SUBSTRING((SELECT FullName FROM dbo.Patients WHERE Id=@patient),2,1))=225
        BEGIN
            UPDATE dbo.Patients SET FullName=N'Bệnh nhân demo '+@suffix,
              Allergies=N'Không ghi nhận', MedicalHistory=N'Hồ sơ giả lập phục vụ kiểm thử local'
              WHERE Id=@patient;
            UPDATE dbo.Services SET Name=N'Dịch vụ nha khoa demo '+@suffix WHERE Id=@service;
            UPDATE dbo.EmrRecords SET Diagnosis=N'Chẩn đoán giả lập '+@suffix,
              Findings=N'Khám tổng quát mẫu',TreatmentResult=N'Ghi nhận mẫu',
              Aftercare=N'Tái khám theo lịch mẫu' WHERE VisitId=@visit;
            UPDATE dbo.InsuranceCompanies SET Name=N'Bảo hiểm tư nhân demo '+@suffix WHERE Id=@company;
            UPDATE dbo.InventoryItems SET Name=N'Vật tư nha khoa demo '+@suffix,Unit=N'Cái' WHERE Id=@item;
            UPDATE dbo.SterilizationCycles SET IndicatorResult=N'Đạt' WHERE Id=@cycle;
            UPDATE dbo.LabTickets SET Instructions=N'Chỉ định kỹ thuật giả lập' WHERE VisitId=@visit;
            UPDATE dbo.WarrantyCases SET Reason=N'Tình huống bảo hành giả lập '+@suffix
              WHERE OriginalServiceLineId=@serviceLine;
            UPDATE dbo.Employees SET FullName=N'Nhân viên demo '+@suffix
              WHERE EmployeeCode='DEMO-EMP-'+@suffix;
            UPDATE dbo.Assets SET Name=N'Thiết bị nha khoa demo '+@suffix
              WHERE AssetCode='DEMO-ASSET-'+@suffix;
        END;

        SET @i += 1;
    END;
    -- Historical audit entries are immutable; preserve any earlier damaged text
    -- and record the repair of the editable demo rows as one new event.
    IF EXISTS (SELECT 1 FROM dbo.AuditLogs WHERE Action='DEMO_SEED'
      AND UNICODE(SUBSTRING(Detail,2,1))=225)
      AND NOT EXISTS (SELECT 1 FROM dbo.AuditLogs WHERE Action='DEMO_ENCODING_REPAIR')
        INSERT dbo.AuditLogs(ActorUserId,Action,EntityName,Detail)
        VALUES (@admin,'DEMO_ENCODING_REPAIR','AuditLogs',
          N'Đã sửa nhãn demo; giữ nguyên nhật ký cũ do quy tắc bất biến.');
    COMMIT TRANSACTION;
    PRINT 'Demo data seed completed.';
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
GO
