import { Injectable } from '@nestjs/common';
import { PrismaService } from '../infrastructure/database/prisma.service.js';

export interface AuthUser {
  id: number;
  username: string;
  fullName: string;
  passwordHash: string;
  isActive: boolean;
  role: {
    code: string;
    name: string;
  };
}

export abstract class UsersRepository {
  abstract findActiveByUsername(username: string): Promise<AuthUser | null>;
}

@Injectable()
export class PrismaUsersRepository implements UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findActiveByUsername(username: string): Promise<AuthUser | null> {
    return this.prisma.user.findFirst({
      where: {
        username: username.trim().toLowerCase(),
        isActive: true,
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        passwordHash: true,
        isActive: true,
        role: {
          select: {
            code: true,
            name: true,
          },
        },
      },
    });
  }
}
