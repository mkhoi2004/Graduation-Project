import { Database, sql } from './db.js';
import { createHash } from './security/password.js';
import { routeId } from './http.js';

const accounts = [
  { username: 'admin', name: 'Quản trị viên', password: 'Admin1234@', role: 'ADMIN', roleName: 'Quản trị hệ thống' },
  { username: 'receptionist', name: 'Lễ tân', password: 'Reception1234@', role: 'RECEPTIONIST', roleName: 'Lễ tân' },
  { username: 'doctor', name: 'Bác sĩ', password: 'Doctor1234@', role: 'DOCTOR', roleName: 'Bác sĩ' },
] as const;

export async function seedLocalAccounts(db: Database): Promise<boolean> {
  if (process.env.NODE_ENV !== 'development') throw new Error('Chỉ tạo tài khoản mẫu trong môi trường development.');
  return db.transaction(async tx => {
    const count = await db.request(tx).query('SELECT COUNT_BIG(*) AS Count FROM dbo.Users WITH (UPDLOCK,HOLDLOCK)');
    if (Number(count.recordset[0].Count) !== 0) return false;
    for (const account of accounts) {
      const role = await db.request(tx).input('Code', sql.VarChar(40), account.role)
        .input('RoleName', sql.NVarChar(120), account.roleName)
        .query(`IF NOT EXISTS(SELECT 1 FROM dbo.Roles WITH (UPDLOCK,HOLDLOCK) WHERE Code=@Code)
          INSERT dbo.Roles(Code,Name) VALUES(@Code,@RoleName);
          SELECT Id FROM dbo.Roles WHERE Code=@Code`);
      const roleId = routeId(role.recordset[0].Id);
      const user = await db.request(tx).input('Username', sql.VarChar(100), account.username)
        .input('Name', sql.NVarChar(150), account.name).input('Hash', sql.VarChar(500), createHash(account.password))
        .query('INSERT dbo.Users(Username,DisplayName,PasswordHash) OUTPUT inserted.Id VALUES(@Username,@Name,@Hash)');
      await db.request(tx).input('UserId', sql.BigInt, routeId(user.recordset[0].Id))
        .input('RoleId', sql.BigInt, roleId)
        .query('INSERT dbo.UserRoles(UserId,RoleId) VALUES(@UserId,@RoleId)');
    }
    return true;
  }, sql.ISOLATION_LEVEL.SERIALIZABLE);
}
