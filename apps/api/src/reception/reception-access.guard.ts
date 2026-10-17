import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

export interface AuthenticatedUser {
  sub: number;
  username: string;
  role: string;
}

@Injectable()
export class ReceptionAccessGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Thiếu phiên đăng nhập hợp lệ.');
    }
    try {
      const payload = await this.jwt.verifyAsync<AuthenticatedUser>(token);
      if (payload.role !== 'RECEPTION_STAFF' && payload.role !== 'ADMIN') {
        throw new ForbiddenException('Bạn không có quyền truy cập module tiếp nhận.');
      }
      request.user = payload;
      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) throw error;
      throw new UnauthorizedException('Phiên đăng nhập không hợp lệ hoặc đã hết hạn.');
    }
  }
}
