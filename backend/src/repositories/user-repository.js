import { Op, QueryTypes } from 'sequelize';
import { setSessionUser, clearSessionUser } from '../utils/session-context.js';

export function createUserRepository({ sequelize, models }) {
  const { User, Role, Branch, AccessAuditLog } = models;

  return {
    async findByUsername(username) {
      return User.findOne({
        where: { username },
        include: [
          { model: Role, as: 'role', attributes: ['roleId', 'code', 'name'] },
          { model: Branch, as: 'branch', attributes: ['branchId', 'code', 'name'] },
        ],
      });
    },

    async findById(userId) {
      return User.findByPk(userId, {
        attributes: ['userId', 'username', 'displayName', 'roleId', 'branchId', 'isApprover', 'isActive', 'createdAt', 'createdBy'],
        include: [
          { model: Role, as: 'role', attributes: ['roleId', 'code', 'name'] },
          { model: Branch, as: 'branch', attributes: ['branchId', 'code', 'name'] },
        ],
      });
    },

    async listUsers({ page = 1, pageSize = 20, search = '', roleId, branchId, isActive } = {}) {
      const where = {};
      if (search) {
        where[Op.or] = [
          { username: { [Op.like]: `%${search}%` } },
          { displayName: { [Op.like]: `%${search}%` } },
        ];
      }
      if (roleId) where.roleId = roleId;
      if (branchId) where.branchId = branchId;
      if (isActive !== undefined) where.isActive = isActive;

      const offset = (Math.max(1, page) - 1) * Math.max(1, pageSize);
      const limit = Math.max(1, Math.min(100, pageSize));

      const { count, rows } = await User.findAndCountAll({
        where,
        attributes: ['userId', 'username', 'displayName', 'roleId', 'branchId', 'isApprover', 'isActive', 'createdAt', 'createdBy'],
        include: [
          { model: Role, as: 'role', attributes: ['roleId', 'code', 'name'] },
          { model: Branch, as: 'branch', attributes: ['branchId', 'code', 'name'] },
        ],
        order: [['createdAt', 'DESC']],
        limit,
        offset,
      });

      return {
        total: count,
        page: Math.max(1, page),
        pageSize: limit,
        totalPages: Math.ceil(count / limit),
        items: rows,
      };
    },

    async createUser(data) {
      return User.create({
        username: data.username,
        displayName: data.displayName,
        passwordHash: data.passwordHash,
        roleId: data.roleId,
        branchId: data.branchId,
        isApprover: Boolean(data.isApprover),
        isActive: data.isActive !== false,
        createdBy: data.createdBy,
      });
    },

    async updateUser(userId, data) {
      const user = await User.findByPk(userId);
      if (!user) return null;

      if (data.displayName !== undefined) user.displayName = data.displayName;
      if (data.roleId !== undefined) user.roleId = data.roleId;
      if (data.branchId !== undefined) user.branchId = data.branchId;
      if (data.isApprover !== undefined) user.isApprover = Boolean(data.isApprover);
      if (data.isActive !== undefined) user.isActive = Boolean(data.isActive);
      if (data.passwordHash) user.passwordHash = data.passwordHash;

      await user.save();
      return this.findById(userId);
    },

    async softDeleteUser(userId, deletedByUsername) {
      return sequelize.transaction(async transaction => {
        // Set session context for trigger archive
        await setSessionUser(sequelize, transaction, deletedByUsername);
        try {
          const user = await User.findByPk(userId, { transaction });
          if (!user) return false;
          await user.destroy({ transaction });
          return true;
        } finally {
          await clearSessionUser(sequelize, transaction);
        }
      });
    },

    async listDeletedUsers() {
      return sequelize.query(
        `SELECT u.UserId, u.Username, u.DisplayName, u.RoleId, r.Code AS RoleCode, r.Name AS RoleName,
                u.BranchId, b.Code AS BranchCode, b.Name AS BranchName,
                u.IsApprover, u.DeletedAt, u.DeletedBy
         FROM dbo.Users_Deleted u
         LEFT JOIN dbo.Roles r ON u.RoleId = r.RoleId
         LEFT JOIN dbo.Branches b ON u.BranchId = b.BranchId
         ORDER BY u.DeletedAt DESC`,
        { type: QueryTypes.SELECT },
      );
    },

    async restoreUser(userId, restoredByUsername) {
      return sequelize.transaction(async transaction => {
        const deletedRows = await sequelize.query(
          `SELECT TOP 1 * FROM dbo.Users_Deleted WHERE UserId = :userId ORDER BY DeletedAt DESC`,
          { replacements: { userId }, type: QueryTypes.SELECT, transaction },
        );
        if (deletedRows.length === 0) return null;
        const record = deletedRows[0];

        // Re-insert into Users table
        await sequelize.query(
          `INSERT INTO dbo.Users (UserId, Username, DisplayName, PasswordHash, RoleId, BranchId, IsApprover, IsActive, CreatedAt, CreatedBy)
           VALUES (:userId, :username, :displayName, :passwordHash, :roleId, :branchId, :isApprover, 1, SYSUTCDATETIME(), :restoredBy)`,
          {
            replacements: {
              userId: record.UserId,
              username: record.Username,
              displayName: record.DisplayName,
              passwordHash: record.PasswordHash,
              roleId: record.RoleId,
              branchId: record.BranchId,
              isApprover: record.IsApprover ? 1 : 0,
              restoredBy: restoredByUsername,
            },
            transaction,
          },
        );

        // Delete from Users_Deleted
        await sequelize.query(
          `DELETE FROM dbo.Users_Deleted WHERE UserId = :userId`,
          { replacements: { userId }, transaction },
        );

        return this.findById(userId);
      });
    },

    async listRoles() {
      return Role.findAll({ order: [['code', 'ASC']] });
    },

    async listBranches() {
      return Branch.findAll({ order: [['code', 'ASC']] });
    },

    async createAuditLog(logData) {
      try {
        return await AccessAuditLog.create({
          actorId: logData.actorId || null,
          actorName: logData.actorName || 'ANONYMOUS',
          roleCode: logData.roleCode || null,
          purpose: logData.purpose || 'GENERAL_ACCESS',
          action: logData.action,
          objectType: logData.objectType,
          objectId: logData.objectId ? String(logData.objectId) : null,
          outcome: logData.outcome || 'ALLOWED',
          source: logData.source || 'API',
        });
      } catch (err) {
        // Audit log creation should not break application flow, but should be logged to console
        console.error('Failed to write AccessAuditLog:', err.message);
        return null;
      }
    },

    async listAuditLogs({ page = 1, pageSize = 50, actorName, objectType, outcome, startDate, endDate } = {}) {
      const where = {};
      if (actorName) where.actorName = { [Op.like]: `%${actorName}%` };
      if (objectType) where.objectType = objectType;
      if (outcome) where.outcome = outcome;
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt[Op.gte] = new Date(startDate);
        if (endDate) where.createdAt[Op.lte] = new Date(endDate);
      }

      const offset = (Math.max(1, page) - 1) * Math.max(1, pageSize);
      const limit = Math.max(1, Math.min(100, pageSize));

      const { count, rows } = await AccessAuditLog.findAndCountAll({
        where,
        order: [['createdAt', 'DESC']],
        limit,
        offset,
      });

      return {
        total: count,
        page: Math.max(1, page),
        pageSize: limit,
        totalPages: Math.ceil(count / limit),
        items: rows,
      };
    },
  };
}
