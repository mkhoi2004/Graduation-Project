import { BadRequestException, Body, Controller, Get, Inject, Injectable, Post, UseGuards } from '@nestjs/common';
import { AuthGuard, Roles } from './auth.js';
import { Database, sql } from './db.js';
import { createHash, validPassword } from './security/password.js';
import { routeId } from './http.js';

type NewUser = { username: string; displayName: string; password: string; roles: string[] };

@Injectable()
export class UsersService {
  constructor(@Inject(Database) private readonly db: Database) {}
  async list() {
    const result = await this.db.request().query('SELECT Id,Username,DisplayName,IsActive FROM dbo.Users ORDER BY Id DESC');
    return result.recordset.map((row: { Id: unknown; Username: string; DisplayName: string; IsActive: boolean }) =>
      ({ id: routeId(row.Id), username: row.Username, displayName: row.DisplayName, isActive: row.IsActive }));
  }
  async roles() {
    const result = await this.db.request().query('SELECT Id,Code,Name FROM dbo.Roles ORDER BY Code');
    return result.recordset.map((row: { Id: unknown; Code: string; Name: string }) =>
      ({ id: routeId(row.Id), code: row.Code, name: row.Name }));
  }
  async create(input: NewUser) {
    if (typeof input?.username !== 'string' || input.username.trim().length < 3 || input.username.length > 100 ||
        typeof input.displayName !== 'string' || !input.displayName.trim() || input.displayName.length > 150 ||
        !validPassword(input.password) || !Array.isArray(input.roles) || !input.roles.length ||
        !input.roles.every(role => typeof role === 'string' && role.length <= 40 && role.length > 0))
      throw new BadRequestException('Tên, mật khẩu hơn 8 ký tự có ký tự đặc biệt và vai trò hợp lệ là bắt buộc.');
    const id = await this.db.transaction(async tx => {
      const created = await this.db.request(tx).input('Username', sql.VarChar(100), input.username.trim())
        .input('Name', sql.NVarChar(150), input.displayName.trim())
        .input('Hash', sql.VarChar(500), createHash(input.password))
        .query('INSERT dbo.Users(Username,DisplayName,PasswordHash) OUTPUT inserted.Id VALUES(@Username,@Name,@Hash)');
      const userId = routeId(created.recordset[0].Id);
      for (const code of new Set(input.roles.map(role => role.toUpperCase()))) {
        const assignment = await this.db.request(tx).input('UserId', sql.BigInt, userId)
          .input('Code', sql.VarChar(40), code)
          .query('INSERT dbo.UserRoles(UserId,RoleId) SELECT @UserId,Id FROM dbo.Roles WHERE Code=@Code');
        if (assignment.rowsAffected[0] !== 1) throw new BadRequestException(`Vai trò không tồn tại: ${code}`);
      }
      return userId;
    });
    return { id };
  }
  async createRole(input: { code: string; name: string }) {
    if (typeof input?.code !== 'string' || input.code.trim().length < 2 || input.code.length > 40 ||
        !/^[A-Za-z][A-Za-z0-9_]*$/.test(input.code) ||
        typeof input.name !== 'string' || !input.name.trim() || input.name.length > 120)
      throw new BadRequestException('Mã/tên vai trò không hợp lệ.');
    const result = await this.db.request().input('Code', sql.VarChar(40), input.code.trim().toUpperCase())
      .input('Name', sql.NVarChar(120), input.name.trim())
      .query('INSERT dbo.Roles(Code,Name) OUTPUT inserted.Id VALUES(@Code,@Name)');
    return { id: routeId(result.recordset[0].Id) };
  }
}

@Controller('api/users')
@UseGuards(AuthGuard)
@Roles('ADMIN')
export class UsersController {
  constructor(@Inject(UsersService) private readonly users: UsersService) {}
  @Get()
  list() { return this.users.list(); }
  @Get('roles')
  roles() { return this.users.roles(); }
  @Post()
  create(@Body() input: NewUser) { return this.users.create(input); }
  @Post('roles')
  createRole(@Body() input: { code: string; name: string }) { return this.users.createRole(input); }
}
