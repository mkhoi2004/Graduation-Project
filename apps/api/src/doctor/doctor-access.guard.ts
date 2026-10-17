import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

export interface AuthenticatedDoctor {
  sub: number;
  username: string;
  role: string;
}

@Injectable()
export class DoctorAccessGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedDoctor }>();
    const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Thiếu phiên đăng nhập hợp lệ.');
    }
    try {
      const payload = await this.jwt.verifyAsync<AuthenticatedDoctor>(token);
      if (payload.role !== 'DOCTOR' && payload.role !== 'ADMIN') {
        throw new ForbiddenException('Bạn không có quyền truy cập phân hệ Bác sĩ.');
      }
      request.user = payload;
      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) throw error;
      throw new UnauthorizedException('Phiên đăng nhập không hợp lệ hoặc đã hết hạn.');
    }
  }
}
