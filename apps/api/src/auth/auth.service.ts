import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto.js';
import { PasswordHasher } from './password-hasher.js';
import { UsersRepository } from './users.repository.js';

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
}
