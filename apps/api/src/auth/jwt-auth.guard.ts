import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { SERVER_BOOT_ID } from './auth.service.js';

export interface AuthenticatedUserPayload {
  sub: number;
  username: string;
  role: string;
  serverBootId?: string;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUserPayload }>();
    const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Thiếu token xác thực hợp lệ.');
    }
    try {
      const payload = await this.jwt.verifyAsync<AuthenticatedUserPayload>(token);
      if (payload.serverBootId && payload.serverBootId !== SERVER_BOOT_ID) {
        throw new UnauthorizedException('Phiên đăng nhập đã hết hạn do máy chủ đã khởi động lại.');
      }
      request.user = payload;
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Token không hợp lệ hoặc đã hết hạn.');
    }
  }
}
