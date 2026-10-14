import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { ApiError } from '../utils/api-error.js';

export function createAuthService({ userRepo, jwtSecret, jwtExpiresIn }) {
  return {
    async login({ username, password, ip = '127.0.0.1' }) {
      if (!username || !password) {
        throw ApiError.badRequest('MISSING_FIELDS', 'Vui lòng nhập tên đăng nhập và mật khẩu');
      }

      const trimmedUsername = String(username).trim();
      const user = await userRepo.findByUsername(trimmedUsername);

      if (!user || !user.isActive) {
        await userRepo.createAuditLog({
          actorName: trimmedUsername,
          roleCode: null,
          purpose: 'AUTHENTICATION',
          action: 'LOGIN',
          objectType: 'AUTH',
          objectId: null,
          outcome: 'DENIED',
          source: ip,
        });
        throw ApiError.unauthorized('INVALID_CREDENTIALS', 'Tên đăng nhập hoặc mật khẩu không chính xác');
      }

      const isMatch = await bcrypt.compare(String(password), user.passwordHash);
      if (!isMatch) {
        await userRepo.createAuditLog({
          actorId: user.userId,
          actorName: user.username,
          roleCode: user.role?.code,
          purpose: 'AUTHENTICATION',
          action: 'LOGIN',
          objectType: 'AUTH',
          objectId: user.userId,
          outcome: 'DENIED',
          source: ip,
        });
        throw ApiError.unauthorized('INVALID_CREDENTIALS', 'Tên đăng nhập hoặc mật khẩu không chính xác');
      }

      const payload = {
        userId: user.userId,
        username: user.username,
        displayName: user.displayName,
        role: user.role?.code,
        roleId: user.roleId,
        branchId: user.branchId,
        branchCode: user.branch?.code,
        isApprover: Boolean(user.isApprover),
      };

      const token = jwt.sign(payload, jwtSecret, { expiresIn: jwtExpiresIn || '1h' });

      // Audit successful login
      await userRepo.createAuditLog({
        actorId: user.userId,
        actorName: user.username,
        roleCode: user.role?.code,
        purpose: 'AUTHENTICATION',
        action: 'LOGIN',
        objectType: 'AUTH',
        objectId: user.userId,
        outcome: 'ALLOWED',
        source: ip,
      });

      return {
        token,
        user: {
          userId: user.userId,
          username: user.username,
          displayName: user.displayName,
          role: user.role?.code,
          roleName: user.role?.name,
          branchId: user.branchId,
          branchName: user.branch?.name,
          isApprover: Boolean(user.isApprover),
        },
      };
    },

    async getCurrentUser(userId) {
      const user = await userRepo.findById(userId);
      if (!user || !user.isActive) {
        throw ApiError.unauthorized('ACCOUNT_DISABLED', 'Tài khoản không tồn tại hoặc đã bị khóa');
      }
      return {
        userId: user.userId,
        username: user.username,
        displayName: user.displayName,
        role: user.role?.code,
        roleName: user.role?.name,
        branchId: user.branchId,
        branchCode: user.branch?.code,
        branchName: user.branch?.name,
        isApprover: Boolean(user.isApprover),
        createdAt: user.createdAt,
      };
    },
  };
}
