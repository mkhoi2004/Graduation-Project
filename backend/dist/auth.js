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
import { Controller, Get, Inject, Injectable, Post, Body, Req, SetMetadata, UnauthorizedException, UseGuards, ForbiddenException, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import jwt from 'jsonwebtoken';
import { Database, sql } from './db.js';
import { safeId } from './validation.js';
import { verifyHash } from './security/password.js';
export const Roles = (...roles) => SetMetadata('roles', roles);
const issuer = 'Graduation.Api';
const audience = 'Graduation.Frontend';
let AuthService = class AuthService {
    db;
    secret;
    constructor(db, secret) {
        this.db = db;
        this.secret = secret;
    }
    async login(username, password) {
        if (typeof username !== 'string' || !username.trim() || typeof password !== 'string' || !password)
            throw new UnauthorizedException();
        const users = await this.db.request().input('Username', sql.VarChar(100), username.trim())
            .query('SELECT Id,Username,PasswordHash FROM dbo.Users WHERE Username=@Username AND IsActive=1');
        const user = users.recordset[0];
        if (!user || !verifyHash(password, user.PasswordHash))
            throw new UnauthorizedException();
        const id = safeId(user.Id);
        const rolesResult = await this.db.request().input('Id', sql.BigInt, id)
            .query('SELECT r.Code FROM dbo.Roles r JOIN dbo.UserRoles ur ON ur.RoleId=r.Id WHERE ur.UserId=@Id');
        const roles = rolesResult.recordset.map((row) => row.Code);
        const token = jwt.sign({ username: user.Username, roles }, this.secret, { algorithm: 'HS256', subject: String(id), issuer, audience, expiresIn: '30m', jwtid: crypto.randomUUID() });
        return { token, username: user.Username, roles };
    }
    verify(token) {
        const claims = jwt.verify(token, this.secret, { issuer, audience, algorithms: ['HS256'] });
        if (typeof claims === 'string' || !claims.sub || typeof claims.username !== 'string' ||
            !Array.isArray(claims.roles) || !claims.roles.every((role) => typeof role === 'string'))
            throw new UnauthorizedException();
        return { id: safeId(claims.sub), username: claims.username, roles: claims.roles };
    }
};
AuthService = __decorate([
    Injectable(),
    __param(0, Inject(Database)),
    __param(1, Inject('JWT_SECRET')),
    __metadata("design:paramtypes", [Database, String])
], AuthService);
export { AuthService };
let AuthGuard = class AuthGuard {
    auth;
    reflector;
    constructor(auth, reflector) {
        this.auth = auth;
        this.reflector = reflector;
    }
    canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const header = request.headers.authorization;
        if (!header?.startsWith('Bearer '))
            throw new UnauthorizedException();
        try {
            request.actor = this.auth.verify(header.slice(7));
        }
        catch {
            throw new UnauthorizedException();
        }
        const required = this.reflector.getAllAndOverride('roles', [context.getHandler(), context.getClass()]);
        if (required?.length && !required.some(role => request.actor.roles.includes(role)))
            throw new ForbiddenException();
        return true;
    }
};
AuthGuard = __decorate([
    Injectable(),
    __param(0, Inject(AuthService)),
    __param(1, Inject(Reflector)),
    __metadata("design:paramtypes", [AuthService, Reflector])
], AuthGuard);
export { AuthGuard };
let LoginRateGuard = class LoginRateGuard {
    windows = new Map();
    canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const address = request.ip ?? request.socket.remoteAddress ?? 'unknown';
        const now = Date.now();
        const current = this.windows.get(address);
        if (!current || current.until < now) {
            this.windows.set(address, { count: 1, until: now + 60_000 });
            return true;
        }
        if (current.count >= 5)
            throw new HttpException('Quá nhiều lần đăng nhập.', HttpStatus.TOO_MANY_REQUESTS);
        current.count++;
        return true;
    }
};
LoginRateGuard = __decorate([
    Injectable()
], LoginRateGuard);
export { LoginRateGuard };
let AuthController = class AuthController {
    auth;
    constructor(auth) {
        this.auth = auth;
    }
    login(body) {
        return this.auth.login(body?.username, body?.password);
    }
    me(request) {
        return { username: request.actor.username, roles: request.actor.roles };
    }
};
__decorate([
    Post('login'),
    UseGuards(LoginRateGuard),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "login", null);
__decorate([
    Get('me'),
    UseGuards(AuthGuard),
    __param(0, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "me", null);
AuthController = __decorate([
    Controller('api/auth'),
    __param(0, Inject(AuthService)),
    __metadata("design:paramtypes", [AuthService])
], AuthController);
export { AuthController };
