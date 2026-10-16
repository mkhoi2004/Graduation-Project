import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import {
  BcryptPasswordHasher,
  PasswordHasher,
} from './password-hasher.js';
import {
  PrismaUsersRepository,
  UsersRepository,
} from './users.repository.js';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: '8h' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    { provide: UsersRepository, useClass: PrismaUsersRepository },
    { provide: PasswordHasher, useClass: BcryptPasswordHasher },
  ],
})
export class AuthModule {}
