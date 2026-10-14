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
  });
  console.log('Foundation seed complete: five roles, six demo accounts and one branch ensured. Existing users kept unchanged.');
} catch {
  console.error('Seed failed and its transaction was rolled back. Run npm run db:check and verify database/bootstrap.sql. No secrets logged.');
  process.exitCode = 1;
} finally {
  await database.close();
}
