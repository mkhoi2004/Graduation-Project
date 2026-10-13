import { CanActivate, Controller, ExecutionContext, Get, Inject, Injectable, Post, Body, Req, SetMetadata, UnauthorizedException, UseGuards, ForbiddenException, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import jwt from 'jsonwebtoken';
import type { Request } from 'express';
import { Database, sql } from './db.js';
import { safeId } from './validation.js';
import { verifyHash } from './security/password.js';

export type Actor = { id: number; username: string; roles: string[] };
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);
export type ActorRequest = Request & { actor?: Actor };

const issuer = 'Graduation.Api';
const audience = 'Graduation.Frontend';

@Injectable()
export class AuthService {
  constructor(@Inject(Database) private readonly db: Database, @Inject('JWT_SECRET') private readonly secret: string) {}

  async login(username: string, password: string): Promise<{ token: string; username: string; roles: string[] }> {
    if (typeof username !== 'string' || !username.trim() || typeof password !== 'string' || !password)
      throw new UnauthorizedException();
    const users = await this.db.request().input('Username', sql.VarChar(100), username.trim())
      .query('SELECT Id,Username,PasswordHash FROM dbo.Users WHERE Username=@Username AND IsActive=1');
    const user = users.recordset[0] as { Id: unknown; Username: string; PasswordHash: string } | undefined;
    if (!user || !verifyHash(password, user.PasswordHash)) throw new UnauthorizedException();
    const id = safeId(user.Id);
    const rolesResult = await this.db.request().input('Id', sql.BigInt, id)
      .query('SELECT r.Code FROM dbo.Roles r JOIN dbo.UserRoles ur ON ur.RoleId=r.Id WHERE ur.UserId=@Id');
    const roles = rolesResult.recordset.map((row: { Code: string }) => row.Code);
    const token = jwt.sign({ username: user.Username, roles }, this.secret,
      { algorithm: 'HS256', subject: String(id), issuer, audience, expiresIn: '30m', jwtid: crypto.randomUUID() });
    return { token, username: user.Username, roles };
  }

  verify(token: string): Actor {
    const claims = jwt.verify(token, this.secret, { issuer, audience, algorithms: ['HS256'] });
    if (typeof claims === 'string' || !claims.sub || typeof claims.username !== 'string' ||
        !Array.isArray(claims.roles) || !claims.roles.every((role: unknown) => typeof role === 'string'))
      throw new UnauthorizedException();
    return { id: safeId(claims.sub), username: claims.username, roles: claims.roles };
  }
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(@Inject(AuthService) private readonly auth: AuthService, @Inject(Reflector) private readonly reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<ActorRequest>();
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw new UnauthorizedException();
    try { request.actor = this.auth.verify(header.slice(7)); }
    catch { throw new UnauthorizedException(); }
    const required = this.reflector.getAllAndOverride<string[]>('roles', [context.getHandler(), context.getClass()]);
    if (required?.length && !required.some(role => request.actor!.roles.includes(role)))
      throw new ForbiddenException();
    return true;
  }
}

@Injectable()
export class LoginRateGuard implements CanActivate {
  private readonly windows = new Map<string, { count: number; until: number }>();
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const address = request.ip ?? request.socket.remoteAddress ?? 'unknown';
    const now = Date.now();
    const current = this.windows.get(address);
    if (!current || current.until < now) { this.windows.set(address, { count: 1, until: now + 60_000 }); return true; }
    if (current.count >= 5) throw new HttpException('Quá nhiều lần đăng nhập.', HttpStatus.TOO_MANY_REQUESTS);
    current.count++;
    return true;
  }
}

@Controller('api/auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}
  @Post('login')
  @UseGuards(LoginRateGuard)
  login(@Body() body: { username: string; password: string }) {
    return this.auth.login(body?.username, body?.password);
  }
  @Get('me')
  @UseGuards(AuthGuard)
  me(@Req() request: ActorRequest) {
    return { username: request.actor!.username, roles: request.actor!.roles };
  }
}
