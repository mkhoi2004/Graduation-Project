SET NOCOUNT ON;
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
  EXEC @LockResult=sys.sp_getapplock @Resource=N'dental-project-seed', @LockMode=N'Exclusive', @LockOwner=N'Transaction', @LockTimeout=10000;
  IF @LockResult < 0 THROW 51400, 'Cannot acquire seed lock.', 1;

  IF NOT EXISTS(SELECT 1 FROM dbo.Branches WHERE Code='LOCAL')
    INSERT dbo.Branches(Code,Name,CreatedBy) VALUES('LOCAL',N'Phòng khám local','seed');
  IF NOT EXISTS(SELECT 1 FROM dbo.Roles WHERE Code='ADMIN') INSERT dbo.Roles(Code,Name,CreatedBy) VALUES('ADMIN',N'Quản trị','seed');
  IF NOT EXISTS(SELECT 1 FROM dbo.Roles WHERE Code='RECEPTIONIST') INSERT dbo.Roles(Code,Name,CreatedBy) VALUES('RECEPTIONIST',N'Nhân viên tiếp nhận','seed');
  IF NOT EXISTS(SELECT 1 FROM dbo.Roles WHERE Code='DOCTOR') INSERT dbo.Roles(Code,Name,CreatedBy) VALUES('DOCTOR',N'Bác sĩ','seed');
  IF NOT EXISTS(SELECT 1 FROM dbo.Roles WHERE Code='ACCOUNTANT') INSERT dbo.Roles(Code,Name,CreatedBy) VALUES('ACCOUNTANT',N'Kế toán','seed');
  IF NOT EXISTS(SELECT 1 FROM dbo.Roles WHERE Code='WAREHOUSE') INSERT dbo.Roles(Code,Name,CreatedBy) VALUES('WAREHOUSE',N'Quản lý kho','seed');

  DECLARE @Branch UNIQUEIDENTIFIER=(SELECT BranchId FROM dbo.Branches WHERE Code='LOCAL');
  IF NOT EXISTS(SELECT 1 FROM dbo.Users WHERE Username='admin')
    INSERT dbo.Users(Username,DisplayName,PasswordHash,RoleId,BranchId,IsApprover,CreatedBy)
      SELECT 'admin',N'Quản trị local','$2b$12$4R41TYf9xPlNvLyTyR/tDeu1IHuOP2V//0QiR2sEV5G.4.OzScEEG',RoleId,@Branch,0,'seed' FROM dbo.Roles WHERE Code='ADMIN';
  IF NOT EXISTS(SELECT 1 FROM dbo.Users WHERE Username='receptionist')
    INSERT dbo.Users(Username,DisplayName,PasswordHash,RoleId,BranchId,IsApprover,CreatedBy)
      SELECT 'receptionist',N'Nhân viên tiếp nhận','$2b$12$QbfN8Q5q7WpPjEv5lcTGWumJBuJG0iIThoeuulhy7NLS2cb3zXmzy',RoleId,@Branch,0,'seed' FROM dbo.Roles WHERE Code='RECEPTIONIST';
  IF NOT EXISTS(SELECT 1 FROM dbo.Users WHERE Username='doctor')
    INSERT dbo.Users(Username,DisplayName,PasswordHash,RoleId,BranchId,IsApprover,CreatedBy)
      SELECT 'doctor',N'Bác sĩ mẫu','$2b$12$lBaGicsvXz0a.5jZ5mPWeeNpme1QkJUzekKsQZJwlkKOTEQipKNna',RoleId,@Branch,0,'seed' FROM dbo.Roles WHERE Code='DOCTOR';
  IF NOT EXISTS(SELECT 1 FROM dbo.Users WHERE Username='accountant')
    INSERT dbo.Users(Username,DisplayName,PasswordHash,RoleId,BranchId,IsApprover,CreatedBy)
      SELECT 'accountant',N'Kế toán viên','$2b$12$DCUrLtEUP0j5m8xsnj3wUuKEkm0P5NGKC6XFEWKpXeThgVsFzy9uq',RoleId,@Branch,0,'seed' FROM dbo.Roles WHERE Code='ACCOUNTANT';
  IF NOT EXISTS(SELECT 1 FROM dbo.Users WHERE Username='approver')
    INSERT dbo.Users(Username,DisplayName,PasswordHash,RoleId,BranchId,IsApprover,CreatedBy)
      SELECT 'approver',N'Kế toán duyệt','$2b$12$QKHP8Mbx.sivt2FVinAEkeEX/HcnvfuMQINU5JCXWGO6S9Pt4wYJC',RoleId,@Branch,1,'seed' FROM dbo.Roles WHERE Code='ACCOUNTANT';
  IF NOT EXISTS(SELECT 1 FROM dbo.Users WHERE Username='warehouse')
    INSERT dbo.Users(Username,DisplayName,PasswordHash,RoleId,BranchId,IsApprover,CreatedBy)
      SELECT 'warehouse',N'Quản lý kho','$2b$12$.8riEyO181wyg.HdkNENWO7pBVFVWMyV.TkEnrmpyWQbQ1j4T.4Cm',RoleId,@Branch,0,'seed' FROM dbo.Roles WHERE Code='WAREHOUSE';

  DECLARE @Approver UNIQUEIDENTIFIER=(SELECT UserId FROM dbo.Users WHERE Username='approver');
  IF NOT EXISTS(SELECT 1 FROM dbo.Rooms WHERE BranchId=@Branch AND Code='CHAIR-01')
    INSERT dbo.Rooms(BranchId,Code,Name,RoomType,CreatedBy) VALUES(@Branch,'CHAIR-01',N'Ghế nha số 1','CHAIR','seed');
  IF NOT EXISTS(SELECT 1 FROM dbo.Rooms WHERE BranchId=@Branch AND Code='STERILE-01')
    INSERT dbo.Rooms(BranchId,Code,Name,RoomType,CreatedBy) VALUES(@Branch,'STERILE-01',N'Phòng tiệt trùng','STERILIZATION','seed');
  IF NOT EXISTS(SELECT 1 FROM dbo.Services WHERE Code='EXAM') INSERT dbo.Services(Code,Name,CreatedBy) VALUES('EXAM',N'Khám và tư vấn','seed');
  IF NOT EXISTS(SELECT 1 FROM dbo.Services WHERE Code='CLEANING') INSERT dbo.Services(Code,Name,CreatedBy) VALUES('CLEANING',N'Cạo vôi răng','seed');
  IF NOT EXISTS(SELECT 1 FROM dbo.ServicePriceVersions p JOIN dbo.Services s ON s.ServiceId=p.ServiceId WHERE s.Code='EXAM' AND p.VersionNo=1)
    INSERT dbo.ServicePriceVersions(ServiceId,BranchId,VersionNo,UnitPrice,EffectiveFrom,Status,ApprovedBy,CreatedBy)
      SELECT ServiceId,@Branch,1,100000,'2026-01-01','APPROVED',@Approver,'seed' FROM dbo.Services WHERE Code='EXAM';
  IF NOT EXISTS(SELECT 1 FROM dbo.ServicePriceVersions p JOIN dbo.Services s ON s.ServiceId=p.ServiceId WHERE s.Code='CLEANING' AND p.VersionNo=1)
    INSERT dbo.ServicePriceVersions(ServiceId,BranchId,VersionNo,UnitPrice,EffectiveFrom,Status,ApprovedBy,CreatedBy)
      SELECT ServiceId,@Branch,1,300000,'2026-01-01','APPROVED',@Approver,'seed' FROM dbo.Services WHERE Code='CLEANING';

  IF NOT EXISTS(SELECT 1 FROM dbo.Suppliers WHERE Code='LOCAL-SUPPLIER') INSERT dbo.Suppliers(Code,Name,CreatedBy) VALUES('LOCAL-SUPPLIER',N'Nhà cung cấp mẫu','seed');
  IF NOT EXISTS(SELECT 1 FROM dbo.Warehouses WHERE BranchId=@Branch AND Code='MAIN') INSERT dbo.Warehouses(BranchId,Code,Name,CreatedBy) VALUES(@Branch,'MAIN',N'Kho chính','seed');
  IF NOT EXISTS(SELECT 1 FROM dbo.Items WHERE Code='GLOVE-M') INSERT dbo.Items(Code,Name,BaseUnit,ConversionFactor,CreatedBy) VALUES('GLOVE-M',N'Găng tay y tế M','BOX',1,'seed');
  DECLARE @Warehouse UNIQUEIDENTIFIER=(SELECT WarehouseId FROM dbo.Warehouses WHERE BranchId=@Branch AND Code='MAIN');
  DECLARE @Item UNIQUEIDENTIFIER=(SELECT ItemId FROM dbo.Items WHERE Code='GLOVE-M');
  IF NOT EXISTS(SELECT 1 FROM dbo.StockLots WHERE ItemId=@Item AND WarehouseId=@Warehouse AND LotNumber='SEED-LOT-01')
    INSERT dbo.StockLots(ItemId,WarehouseId,LotNumber,ExpiryDate,Status,UnitCost,CreatedBy) VALUES(@Item,@Warehouse,'SEED-LOT-01','2027-12-31','RELEASED',50000,'seed');
  DECLARE @Lot UNIQUEIDENTIFIER=(SELECT StockLotId FROM dbo.StockLots WHERE ItemId=@Item AND WarehouseId=@Warehouse AND LotNumber='SEED-LOT-01');
  IF NOT EXISTS(SELECT 1 FROM dbo.StockBalances WHERE WarehouseId=@Warehouse AND ItemId=@Item AND StockLotId=@Lot)
    INSERT dbo.StockBalances(WarehouseId,ItemId,StockLotId,OnHand) VALUES(@Warehouse,@Item,@Lot,10);

  IF NOT EXISTS(SELECT 1 FROM dbo.Accounts WHERE Code='111') INSERT dbo.Accounts(Code,Name,AccountType,CreatedBy) VALUES('111',N'Tiền mặt','ASSET','seed');
  IF NOT EXISTS(SELECT 1 FROM dbo.Accounts WHERE Code='131') INSERT dbo.Accounts(Code,Name,AccountType,CreatedBy) VALUES('131',N'Phải thu','ASSET','seed');
  IF NOT EXISTS(SELECT 1 FROM dbo.Accounts WHERE Code='3387') INSERT dbo.Accounts(Code,Name,AccountType,CreatedBy) VALUES('3387',N'Doanh thu chưa thực hiện/tiền cọc','LIABILITY','seed');
  IF NOT EXISTS(SELECT 1 FROM dbo.Accounts WHERE Code='511') INSERT dbo.Accounts(Code,Name,AccountType,CreatedBy) VALUES('511',N'Doanh thu dịch vụ','REVENUE','seed');
  IF NOT EXISTS(SELECT 1 FROM dbo.Accounts WHERE Code='632') INSERT dbo.Accounts(Code,Name,AccountType,CreatedBy) VALUES('632',N'Giá vốn cấu hình mẫu','EXPENSE','seed');

  IF NOT EXISTS(SELECT 1 FROM dbo.SystemConfigVersions WHERE ConfigKey='MAX_ROUNDING_AMOUNT' AND ScopeCode='GLOBAL' AND VersionNo=1)
    INSERT dbo.SystemConfigVersions(ConfigKey,ScopeCode,VersionNo,ValueJson,EffectiveFrom,Status,ApprovedBy,CreatedBy)
      VALUES('MAX_ROUNDING_AMOUNT','GLOBAL',1,N'{"amount":"1000.00","currency":"VND"}','2026-01-01','APPROVED',@Approver,'seed');
  IF NOT EXISTS(SELECT 1 FROM dbo.SystemConfigVersions WHERE ConfigKey='CASH_OVER_SHORT_THRESHOLD' AND ScopeCode='GLOBAL' AND VersionNo=1)
    INSERT dbo.SystemConfigVersions(ConfigKey,ScopeCode,VersionNo,ValueJson,EffectiveFrom,Status,ApprovedBy,CreatedBy)
      VALUES('CASH_OVER_SHORT_THRESHOLD','GLOBAL',1,N'{"amount":"100000.00","currency":"VND"}','2026-01-01','APPROVED',@Approver,'seed');

  COMMIT TRANSACTION;
  PRINT 'Seed complete: 5 roles, 6 users, branch, rooms, services/prices, warehouse/item/lot, accounts and versioned configs.';
END TRY
BEGIN CATCH
  IF XACT_STATE()<>0 ROLLBACK TRANSACTION;
  THROW;
END CATCH;
