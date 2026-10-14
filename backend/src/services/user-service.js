import bcrypt from 'bcrypt';
import { ApiError } from '../utils/api-error.js';
import { passwordSchema } from '../validators/password.js';

export function createUserService({ userRepo }) {
  return {
    async getUsers(params) {
      return userRepo.listUsers(params);
    },

    async getUserById(id) {
      const user = await userRepo.findById(id);
      if (!user) {
        throw ApiError.notFound('USER_NOT_FOUND', 'Không tìm thấy người dùng');
      }
      return user;
    },

    async createUser(data, actorUsername) {
      const existing = await userRepo.findByUsername(data.username);
      if (existing) {
        throw ApiError.conflict('USERNAME_EXISTS', 'Tên đăng nhập đã được sử dụng');
      }

      // Validate password policy: >8 chars, upper, lower, number, special char
      let validPassword;
      try {
        validPassword = passwordSchema.parse(data.password);
      } catch (err) {
        throw ApiError.badRequest('WEAK_PASSWORD', 'Mật khẩu phải từ 9 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt');
      }

      const passwordHash = await bcrypt.hash(validPassword, 12);

      const user = await userRepo.createUser({
        username: data.username.trim(),
        displayName: data.displayName.trim(),
        passwordHash,
        roleId: data.roleId,
        branchId: data.branchId,
        isApprover: Boolean(data.isApprover),
        isActive: data.isActive !== false,
        createdBy: actorUsername,
      });

      await userRepo.createAuditLog({
        actorName: actorUsername,
        purpose: 'USER_MANAGEMENT',
        action: 'CREATE_USER',
        objectType: 'USERS',
        objectId: user.userId,
        outcome: 'ALLOWED',
        source: 'API',
      });

      return userRepo.findById(user.userId);
    },

    async updateUser(id, data, actorUsername) {
      const existing = await userRepo.findById(id);
      if (!existing) {
        throw ApiError.notFound('USER_NOT_FOUND', 'Không tìm thấy người dùng');
      }

      let passwordHash;
      if (data.password) {
        let validPassword;
        try {
          validPassword = passwordSchema.parse(data.password);
        } catch {
          throw ApiError.badRequest('WEAK_PASSWORD', 'Mật khẩu phải từ 9 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt');
        }
        passwordHash = await bcrypt.hash(validPassword, 12);
      }

      const updated = await userRepo.updateUser(id, {
        displayName: data.displayName,
        roleId: data.roleId,
        branchId: data.branchId,
        isApprover: data.isApprover,
        isActive: data.isActive,
        passwordHash,
      });

      await userRepo.createAuditLog({
        actorName: actorUsername,
        purpose: 'USER_MANAGEMENT',
        action: 'UPDATE_USER',
        objectType: 'USERS',
        objectId: id,
        outcome: 'ALLOWED',
        source: 'API',
      });

      return updated;
    },

    async softDeleteUser(id, actorUsername) {
      const existing = await userRepo.findById(id);
      if (!existing) {
        throw ApiError.notFound('USER_NOT_FOUND', 'Không tìm thấy người dùng');
      }

      if (existing.username === actorUsername) {
        throw ApiError.badRequest('CANNOT_DELETE_SELF', 'Không thể tự xóa tài khoản của chính mình');
      }

      const success = await userRepo.softDeleteUser(id, actorUsername);
      if (!success) {
        throw ApiError.internal('DELETE_FAILED', 'Không thể xóa người dùng');
      }

      await userRepo.createAuditLog({
        actorName: actorUsername,
        purpose: 'USER_MANAGEMENT',
        action: 'SOFT_DELETE_USER',
        objectType: 'USERS',
        objectId: id,
        outcome: 'ALLOWED',
        source: 'API',
      });

      return { success: true, message: 'Đã chuyển người dùng vào danh sách lưu trữ' };
    },

    async getDeletedUsers(actorUsername) {
      await userRepo.createAuditLog({
        actorName: actorUsername,
        purpose: 'VIEW_ARCHIVES',
        action: 'VIEW_DELETED_USERS',
        objectType: 'USERS_DELETED',
        objectId: null,
        outcome: 'ALLOWED',
        source: 'API',
      });
      return userRepo.listDeletedUsers();
    },

    async restoreUser(id, actorUsername) {
      const restored = await userRepo.restoreUser(id, actorUsername);
      if (!restored) {
        throw ApiError.notFound('ARCHIVE_NOT_FOUND', 'Không tìm thấy bản ghi người dùng đã xóa');
      }

      await userRepo.createAuditLog({
        actorName: actorUsername,
        purpose: 'RESTORE_RECORD',
        action: 'RESTORE_USER',
        objectType: 'USERS',
        objectId: id,
        outcome: 'ALLOWED',
        source: 'API',
      });

      return restored;
    },

    async getRoles() {
      return userRepo.listRoles();
    },

    async getBranches() {
      return userRepo.listBranches();
    },

    async getAuditLogs(params, actorUsername) {
      await userRepo.createAuditLog({
        actorName: actorUsername,
        purpose: 'SECURITY_AUDIT',
        action: 'VIEW_AUDIT_LOGS',
        objectType: 'ACCESS_AUDIT_LOGS',
        objectId: null,
        outcome: 'ALLOWED',
        source: 'API',
      });
      return userRepo.listAuditLogs(params);
    },
  };
}
