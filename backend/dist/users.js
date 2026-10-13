var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { BadRequestException, Body, Controller, Get, Inject, Injectable, Post, UseGuards } from '@nestjs/common';
import { AuthGuard, Roles } from './auth.js';
import { Database, sql } from './db.js';
import { createHash, validPassword } from './security/password.js';
import { routeId } from './http.js';
let UsersService = class UsersService {
    db;
    constructor(db) {
        this.db = db;
    }
    async list() {
        const result = await this.db.request().query('SELECT Id,Username,DisplayName,IsActive FROM dbo.Users ORDER BY Id DESC');
        return result.recordset.map((row) => ({ id: routeId(row.Id), username: row.Username, displayName: row.DisplayName, isActive: row.IsActive }));
    }
    async roles() {
        const result = await this.db.request().query('SELECT Id,Code,Name FROM dbo.Roles ORDER BY Code');
        return result.recordset.map((row) => ({ id: routeId(row.Id), code: row.Code, name: row.Name }));
    }
    async create(input) {
        if (typeof input?.username !== 'string' || input.username.trim().length < 3 || input.username.length > 100 ||
            typeof input.displayName !== 'string' || !input.displayName.trim() || input.displayName.length > 150 ||
            !validPassword(input.password) || !Array.isArray(input.roles) || !input.roles.length ||
            !input.roles.every(role => typeof role === 'string' && role.length <= 40 && role.length > 0))
            throw new BadRequestException('Tên, mật khẩu hơn 8 ký tự có ký tự đặc biệt và vai trò hợp lệ là bắt buộc.');
        const id = await this.db.transaction(async (tx) => {
            const created = await this.db.request(tx).input('Username', sql.VarChar(100), input.username.trim())
                .input('Name', sql.NVarChar(150), input.displayName.trim())
                .input('Hash', sql.VarChar(500), createHash(input.password))
                .query('INSERT dbo.Users(Username,DisplayName,PasswordHash) OUTPUT inserted.Id VALUES(@Username,@Name,@Hash)');
            const userId = routeId(created.recordset[0].Id);
            for (const code of new Set(input.roles.map(role => role.toUpperCase()))) {
                const assignment = await this.db.request(tx).input('UserId', sql.BigInt, userId)
                    .input('Code', sql.VarChar(40), code)
                    .query('INSERT dbo.UserRoles(UserId,RoleId) SELECT @UserId,Id FROM dbo.Roles WHERE Code=@Code');
                if (assignment.rowsAffected[0] !== 1)
                    throw new BadRequestException(`Vai trò không tồn tại: ${code}`);
            }
            return userId;
        });
        return { id };
    }
    async createRole(input) {
        if (typeof input?.code !== 'string' || input.code.trim().length < 2 || input.code.length > 40 ||
            !/^[A-Za-z][A-Za-z0-9_]*$/.test(input.code) ||
            typeof input.name !== 'string' || !input.name.trim() || input.name.length > 120)
            throw new BadRequestException('Mã/tên vai trò không hợp lệ.');
        const result = await this.db.request().input('Code', sql.VarChar(40), input.code.trim().toUpperCase())
            .input('Name', sql.NVarChar(120), input.name.trim())
            .query('INSERT dbo.Roles(Code,Name) OUTPUT inserted.Id VALUES(@Code,@Name)');
        return { id: routeId(result.recordset[0].Id) };
    }
};
UsersService = __decorate([
    Injectable(),
    __param(0, Inject(Database)),
    __metadata("design:paramtypes", [Database])
], UsersService);
export { UsersService };
let UsersController = class UsersController {
    users;
    constructor(users) {
        this.users = users;
    }
    list() { return this.users.list(); }
    roles() { return this.users.roles(); }
    create(input) { return this.users.create(input); }
    createRole(input) { return this.users.createRole(input); }
};
__decorate([
    Get(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "list", null);
__decorate([
    Get('roles'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "roles", null);
__decorate([
    Post(),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "create", null);
__decorate([
    Post('roles'),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], UsersController.prototype, "createRole", null);
UsersController = __decorate([
    Controller('api/users'),
    UseGuards(AuthGuard),
    Roles('ADMIN'),
    __param(0, Inject(UsersService)),
    __metadata("design:paramtypes", [UsersService])
], UsersController);
export { UsersController };
