import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

export interface AuthenticatedPersonnelUser {
  sub: number;
  username: string;
  role: string;
}

@Injectable()
export class PersonnelAccessGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedPersonnelUser }>();
    const [scheme, token] = request.headers.authorization?.split(' ') ?? [];

    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Thiếu phiên đăng nhập hợp lệ.');
    }

    try {
      const payload = await this.jwt.verifyAsync<AuthenticatedPersonnelUser>(token);
      const isPrivileged = ['ADMIN', 'HR', 'MANAGER'].includes(payload.role);

      // Self-service endpoints allowed for any authenticated staff (Universal Check-in/out & Profile/Payslips)
      const path = request.path;
      const isSelfService =
        path.includes('/my-') ||
        path.includes('/me') ||
        path.includes('/attendance/status') ||
        path.includes('/attendance/check-in') ||
        path.includes('/attendance/check-out') ||
        (request.method === 'GET' && path.includes('/working-hours'));

      if (!isPrivileged && !isSelfService) {
        throw new ForbiddenException('Bạn không có quyền truy cập phân hệ Hành chính Nhân sự.');
      }

      request.user = payload;
      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) throw error;
      throw new UnauthorizedException('Phiên đăng nhập không hợp lệ hoặc đã hết hạn.');
    }
  }
}
