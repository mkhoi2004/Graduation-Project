import bcrypt from 'bcrypt';
import { Transaction } from 'sequelize';
import { env } from '../config/load-env.js';
import { createDatabase } from '../config/db.js';
import { passwordSchema } from '../validators/password.js';

// Local demo credentials only. No patient/clinical data is seeded.
const accounts = [
  ['ADMIN', 'Quản trị', 'admin', 'Admin1234@', false],
  ['RECEPTIONIST', 'Nhân viên tiếp nhận', 'receptionist', 'Receptionist1234@', false],
  ['DOCTOR', 'Bác sĩ', 'doctor', 'Doctor1234@', false],
  ['ACCOUNTANT', 'Kế toán', 'accountant', 'Accountant1234@', false],
  ['ACCOUNTANT', 'Kế toán', 'approver', 'Approver1234@', true],
  ['WAREHOUSE', 'Quản lý kho', 'warehouse', 'WarehouseManager1234@', false],
];
const database = createDatabase(env.db);
try {
  await database.checkDatabase();
  const hashed = await Promise.all(accounts.map(async account => ({
    account, hash: await bcrypt.hash(passwordSchema.parse(account[3]), 12),
  })));
  await database.sequelize.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE }, async transaction => {
    const query = (sql, replacements = {}) => database.sequelize.query(sql, { transaction, replacements });
    // Serialize seed runs; never reset an existing user's password/role/permissions.
    await query(`DECLARE @result int;
      EXEC @result = sys.sp_getapplock @Resource=N'dental-foundation-seed', @LockMode=N'Exclusive', @LockOwner=N'Transaction', @LockTimeout=10000;
      IF @result < 0 THROW 51010, 'Cannot acquire seed lock', 1;`);
    await query(`IF NOT EXISTS (SELECT 1 FROM dbo.Branches WHERE Code='LOCAL')
      INSERT dbo.Branches(Code, Name, CreatedBy) VALUES ('LOCAL', N'Phòng khám Nha khoa Local', 'seed')
    ELSE
      UPDATE dbo.Branches SET Name = N'Phòng khám Nha khoa Local' WHERE Code='LOCAL';`);
    for (const { account: [code, name, username, , approver], hash } of hashed) {
      await query(`IF NOT EXISTS (SELECT 1 FROM dbo.Roles WHERE Code=:code)
        INSERT dbo.Roles(Code, Name, CreatedBy) VALUES (:code, :name, 'seed')
      ELSE
        UPDATE dbo.Roles SET Name = :name WHERE Code = :code;`, { code, name });
      await query(`IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE Username=:username)
        INSERT dbo.Users(Username, DisplayName, PasswordHash, RoleId, BranchId, IsApprover, CreatedBy)
        SELECT :username, :name, :hash, r.RoleId, b.BranchId, :approver, 'seed'
        FROM dbo.Roles r CROSS JOIN dbo.Branches b WHERE r.Code=:code AND b.Code='LOCAL'
      ELSE
        UPDATE dbo.Users SET DisplayName = :name WHERE Username = :username;`,
      { username, name, hash, approver: approver ? 1 : 0, code });
    }

    // Ensure catalog rooms and chairs have proper Vietnamese names
    await query(`
      DECLARE @BranchId UNIQUEIDENTIFIER = (SELECT BranchId FROM dbo.Branches WHERE Code='LOCAL');
      IF NOT EXISTS (SELECT 1 FROM dbo.Rooms WHERE BranchId=@BranchId AND Code='CHAIR-01')
        INSERT dbo.Rooms(BranchId, Code, Name, RoomType, CreatedBy) VALUES(@BranchId, 'CHAIR-01', N'Ghế nha số 1', 'CHAIR', 'seed')
      ELSE
        UPDATE dbo.Rooms SET Name = N'Ghế nha số 1' WHERE BranchId=@BranchId AND Code='CHAIR-01';

      IF NOT EXISTS (SELECT 1 FROM dbo.Rooms WHERE BranchId=@BranchId AND Code='STERILE-01')
        INSERT dbo.Rooms(BranchId, Code, Name, RoomType, CreatedBy) VALUES(@BranchId, 'STERILE-01', N'Phòng tiệt trùng', 'STERILIZATION', 'seed')
      ELSE
        UPDATE dbo.Rooms SET Name = N'Phòng tiệt trùng' WHERE BranchId=@BranchId AND Code='STERILE-01';

      -- Services
      IF NOT EXISTS (SELECT 1 FROM dbo.Services WHERE Code='EXAM')
        INSERT dbo.Services(Code, Name, CreatedBy) VALUES('EXAM', N'Khám và tư vấn', 'seed')
      ELSE
        UPDATE dbo.Services SET Name = N'Khám và tư vấn' WHERE Code='EXAM';

      IF NOT EXISTS (SELECT 1 FROM dbo.Services WHERE Code='CLEANING')
        INSERT dbo.Services(Code, Name, CreatedBy) VALUES('CLEANING', N'Cạo vôi răng', 'seed')
      ELSE
        UPDATE dbo.Services SET Name = N'Cạo vôi răng' WHERE Code='CLEANING';

      -- Suppliers
      IF NOT EXISTS (SELECT 1 FROM dbo.Suppliers WHERE Code='LOCAL-SUPPLIER')
        INSERT dbo.Suppliers(Code, Name, CreatedBy) VALUES('LOCAL-SUPPLIER', N'Nhà cung cấp mẫu', 'seed')
      ELSE
        UPDATE dbo.Suppliers SET Name = N'Nhà cung cấp mẫu' WHERE Code='LOCAL-SUPPLIER';

      -- Warehouses
      IF NOT EXISTS (SELECT 1 FROM dbo.Warehouses WHERE BranchId=@BranchId AND Code='MAIN')
        INSERT dbo.Warehouses(BranchId, Code, Name, CreatedBy) VALUES(@BranchId, 'MAIN', N'Kho chính', 'seed')
      ELSE
        UPDATE dbo.Warehouses SET Name = N'Kho chính' WHERE BranchId=@BranchId AND Code='MAIN';

      -- Items
      IF NOT EXISTS (SELECT 1 FROM dbo.Items WHERE Code='GLOVE-M')
        INSERT dbo.Items(Code, Name, BaseUnit, ConversionFactor, CreatedBy) VALUES('GLOVE-M', N'Găng tay y tế M', 'BOX', 1, 'seed')
      ELSE
        UPDATE dbo.Items SET Name = N'Găng tay y tế M' WHERE Code='GLOVE-M';

      -- Accounts
      IF NOT EXISTS (SELECT 1 FROM dbo.Accounts WHERE Code='111')
        INSERT dbo.Accounts(Code, Name, AccountType, CreatedBy) VALUES('111', N'Tiền mặt', 'ASSET', 'seed')
      ELSE
        UPDATE dbo.Accounts SET Name = N'Tiền mặt' WHERE Code='111';

      IF NOT EXISTS (SELECT 1 FROM dbo.Accounts WHERE Code='131')
        INSERT dbo.Accounts(Code, Name, AccountType, CreatedBy) VALUES('131', N'Phải thu', 'ASSET', 'seed')
      ELSE
        UPDATE dbo.Accounts SET Name = N'Phải thu' WHERE Code='131';

      IF NOT EXISTS (SELECT 1 FROM dbo.Accounts WHERE Code='3387')
        INSERT dbo.Accounts(Code, Name, AccountType, CreatedBy) VALUES('3387', N'Doanh thu chưa thực hiện/tiền cọc', 'LIABILITY', 'seed')
      ELSE
        UPDATE dbo.Accounts SET Name = N'Doanh thu chưa thực hiện/tiền cọc' WHERE Code='3387';

      IF NOT EXISTS (SELECT 1 FROM dbo.Accounts WHERE Code='511')
        INSERT dbo.Accounts(Code, Name, AccountType, CreatedBy) VALUES('511', N'Doanh thu dịch vụ', 'REVENUE', 'seed')
      ELSE
        UPDATE dbo.Accounts SET Name = N'Doanh thu dịch vụ' WHERE Code='511';

      IF NOT EXISTS (SELECT 1 FROM dbo.Accounts WHERE Code='632')
        INSERT dbo.Accounts(Code, Name, AccountType, CreatedBy) VALUES('632', N'Giá vốn cấu hình mẫu', 'EXPENSE', 'seed')
      ELSE
        UPDATE dbo.Accounts SET Name = N'Giá vốn cấu hình mẫu' WHERE Code='632';
    `);
  });
  console.log('Foundation seed complete: five roles, six demo accounts, branch, rooms, services, warehouse, items and accounts ensured with proper UTF-8.');
} catch {
  console.error('Seed failed and its transaction was rolled back. Run npm run db:check and verify database/bootstrap.sql. No secrets logged.');
  process.exitCode = 1;
} finally {
  await database.close();
}
