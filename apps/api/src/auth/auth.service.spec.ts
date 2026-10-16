import { JwtService } from '@nestjs/jwt';
import { describe, expect, it } from 'vitest';
import { AuthService } from './auth.service.js';
import type { AuthUser, UsersRepository } from './users.repository.js';
import type { PasswordHasher } from './password-hasher.js';

const demoUser: AuthUser = {
  id: 1,
  username: 'doctor',
  fullName: 'Bác sĩ Demo',
  passwordHash: 'stored-hash',
  isActive: true,
  role: {
    code: 'DOCTOR',
    name: 'Bác sĩ thực hiện',
  },
};

function createService(passwordMatches = true) {
  const usersRepository: UsersRepository = {
    findActiveByUsername: async (username) =>
      username === demoUser.username ? demoUser : null,
  };
  const passwordHasher: PasswordHasher = {
    compare: async () => passwordMatches,
    hash: async () => 'unused-test-hash',
  };
  const jwtService = new JwtService({ secret: 'test-secret' });

  return new AuthService(usersRepository, passwordHasher, jwtService);
}

describe('AuthService', () => {
  it('returns a JWT and role information for valid credentials', async () => {
    const result = await createService().login({
      username: 'doctor',
      password: 'Dental@123',
    });

    expect(result.accessToken).toEqual(expect.any(String));
    expect(result.user).toEqual({
      id: 1,
      username: 'doctor',
      fullName: 'Bác sĩ Demo',
      role: 'DOCTOR',
      roleName: 'Bác sĩ thực hiện',
    });
  });

  it('rejects invalid credentials without revealing which field failed', async () => {
    await expect(
      createService(false).login({
        username: 'doctor',
        password: 'wrong-password',
      }),
    ).rejects.toThrow('Tên đăng nhập hoặc mật khẩu không đúng');
  });
});
