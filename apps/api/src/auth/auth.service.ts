import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto.js';
import { PasswordHasher } from './password-hasher.js';
import { UsersRepository } from './users.repository.js';

export const SERVER_BOOT_ID = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly jwtService: JwtService,
  ) {}

  async login(credentials: LoginDto) {
    const user = await this.usersRepository.findActiveByUsername(
      credentials.username,
    );
    const passwordMatches =
      user &&
      (await this.passwordHasher.compare(
        credentials.password,
        user.passwordHash,
      ));

    if (!user || !passwordMatches) {
      throw new UnauthorizedException(
        'Tên đăng nhập hoặc mật khẩu không đúng',
      );
    }

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      username: user.username,
      role: user.role.code,
      serverBootId: SERVER_BOOT_ID,
    });

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: 28_800,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role.code,
        roleName: user.role.name,
      },
    };
  }

  async getMe(userId: number) {
    const user = await this.usersRepository.findById(userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Tài khoản không tồn tại hoặc đã bị khóa.');
    }

    return {
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role.code,
        roleName: user.role.name,
      },
    };
  }
}
