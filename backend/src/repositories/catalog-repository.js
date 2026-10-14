import { Op, QueryTypes } from 'sequelize';
import { setSessionUser, clearSessionUser } from '../utils/session-context.js';
import { toDecimal } from '../utils/money.js';

export function createCatalogRepository({ sequelize, models }) {
  const { Room, Service, ServicePriceVersion, Supplier, SystemConfigVersion, ConsentTemplate } = models;

  return {
    // SERVICES
    async listServices({ page = 1, pageSize = 50, search = '', isActive } = {}) {
      const where = {};
      if (search) {
        where[Op.or] = [
          { code: { [Op.like]: `%${search}%` } },
          { name: { [Op.like]: `%${search}%` } },
        ];
      }
      if (isActive !== undefined) where.isActive = isActive;

      const offset = (Math.max(1, page) - 1) * Math.max(1, pageSize);
      const limit = Math.max(1, Math.min(100, pageSize));

      const { count, rows } = await Service.findAndCountAll({
        where,
        order: [['code', 'ASC']],
        limit,
        offset,
      });

      // Fetch active price for each service
      const now = new Date();
      const servicesWithPrice = await Promise.all(rows.map(async (s) => {
        const activePrice = await ServicePriceVersion.findOne({
          where: {
            serviceId: s.serviceId,
            status: 'APPROVED',
            effectiveFrom: { [Op.lte]: now },
            [Op.or]: [
              { effectiveTo: null },
              { effectiveTo: { [Op.gt]: now } },
            ],
          },
          order: [['effectiveFrom', 'DESC'], ['versionNo', 'DESC']],
        });
        return {
          ...s.toJSON(),
          currentPrice: activePrice ? toDecimal(activePrice.unitPrice).toFixed(2) : null,
          priceVersionNo: activePrice ? activePrice.versionNo : null,
        };
      }));

      return {
        total: count,
        page: Math.max(1, page),
        pageSize: limit,
        totalPages: Math.ceil(count / limit),
        items: servicesWithPrice,
      };
    },

    async findServiceById(serviceId) {
      const service = await Service.findByPk(serviceId);
      if (!service) return null;

      const priceVersions = await ServicePriceVersion.findAll({
        where: { serviceId },
        order: [['versionNo', 'DESC']],
      });

      return {
        ...service.toJSON(),
        priceVersions,
      };
    },

    async createService(data) {
      return Service.create({
        code: data.code.trim().toUpperCase(),
        name: data.name.trim(),
        requiresConsent: Boolean(data.requiresConsent),
        requiresSterilePack: Boolean(data.requiresSterilePack),
        isActive: data.isActive !== false,
        createdBy: data.createdBy,
      });
    },

    async updateService(serviceId, data) {
      const service = await Service.findByPk(serviceId);
      if (!service) return null;

      if (data.name !== undefined) service.name = data.name.trim();
      if (data.requiresConsent !== undefined) service.requiresConsent = Boolean(data.requiresConsent);
      if (data.requiresSterilePack !== undefined) service.requiresSterilePack = Boolean(data.requiresSterilePack);
      if (data.isActive !== undefined) service.isActive = Boolean(data.isActive);

      await service.save();
      return service;
    },

    async softDeleteService(serviceId, username) {
      return sequelize.transaction(async transaction => {
        // Check if service is referenced by clinical ServiceLines
        const lines = await sequelize.query(
          `SELECT TOP 1 1 FROM dbo.ServiceLines WHERE ServiceId = :serviceId`,
          { replacements: { serviceId }, type: QueryTypes.SELECT, transaction },
        );
        if (lines && lines.length > 0) {
          const error = new Error('Dịch vụ đã được sử dụng trong các lượt khám, không thể xóa. Vui lòng chuyển sang ngưng hoạt động (IsActive=false).');
          error.code = 'SERVICE_IN_USE';
          error.statusCode = 409;
          throw error;
        }

        // Delete price versions first to satisfy foreign key constraint
        await sequelize.query(
          `DELETE FROM dbo.ServicePriceVersions WHERE ServiceId = :serviceId`,
          { replacements: { serviceId }, transaction },
        );

        await setSessionUser(sequelize, transaction, username);
        try {
          const service = await Service.findByPk(serviceId, { transaction });
          if (!service) return false;
          await service.destroy({ transaction });
          return true;
        } finally {
          await clearSessionUser(sequelize, transaction);
        }
      });
    },

    async listDeletedServices() {
      return sequelize.query(
        `SELECT ServiceId, Code, Name, RequiresConsent, RequiresSterilePack, IsActive, CreatedAt, CreatedBy, DeletedAt, DeletedBy
         FROM dbo.Services_Deleted ORDER BY DeletedAt DESC`,
        { type: QueryTypes.SELECT },
      );
    },

    async restoreService(serviceId, username) {
      return sequelize.transaction(async transaction => {
        const deleted = await sequelize.query(
          `SELECT TOP 1 * FROM dbo.Services_Deleted WHERE ServiceId = :serviceId ORDER BY DeletedAt DESC`,
          { replacements: { serviceId }, type: QueryTypes.SELECT, transaction },
        );
        if (deleted.length === 0) return null;
        const record = deleted[0];

        await sequelize.query(
          `INSERT INTO dbo.Services (ServiceId, Code, Name, RequiresConsent, RequiresSterilePack, IsActive, CreatedAt, CreatedBy)
           VALUES (:serviceId, :code, :name, :requiresConsent, :requiresSterilePack, :isActive, SYSUTCDATETIME(), :restoredBy)`,
          {
            replacements: {
              serviceId: record.ServiceId,
              code: record.Code,
              name: record.Name,
              requiresConsent: record.RequiresConsent ? 1 : 0,
              requiresSterilePack: record.RequiresSterilePack ? 1 : 0,
              isActive: record.IsActive ? 1 : 0,
              restoredBy: username,
            },
            transaction,
          },
        );

        await sequelize.query(`DELETE FROM dbo.Services_Deleted WHERE ServiceId = :serviceId`, {
          replacements: { serviceId },
          transaction,
        });

        return Service.findByPk(serviceId, { transaction });
      });
    },

    // SERVICE PRICE VERSIONS (AT-16 & AT-21)
    async checkPriceOverlap({ serviceId, branchId = null, effectiveFrom, effectiveTo = null, excludeVersionId = null }) {
      // Overlap rule: (StartA < EndB) and (EndA > StartB)
      // Where NULL End means infinity (open-ended)
      const replacements = {
        serviceId,
        branchId: branchId || null,
        newFrom: effectiveFrom,
        newTo: effectiveTo,
        excludeId: excludeVersionId || '00000000-0000-0000-0000-000000000000',
      };

      const overlapping = await sequelize.query(
        `SELECT PriceVersionId, VersionNo, EffectiveFrom, EffectiveTo
         FROM dbo.ServicePriceVersions
         WHERE ServiceId = :serviceId
           AND (BranchId = :branchId OR (BranchId IS NULL AND :branchId IS NULL))
           AND Status = 'APPROVED'
           AND PriceVersionId <> :excludeId
           AND (
             (:newTo IS NULL AND (EffectiveTo IS NULL OR EffectiveTo > :newFrom))
             OR
             (:newTo IS NOT NULL AND (EffectiveTo IS NULL OR EffectiveTo > :newFrom) AND (:newTo > EffectiveFrom))
           )`,
        { replacements, type: QueryTypes.SELECT },
      );

      return overlapping.length > 0;
    },

    async getNextPriceVersionNo(serviceId, branchId = null) {
      const row = await ServicePriceVersion.findOne({
        where: {
          serviceId,
          ...(branchId ? { branchId } : { branchId: null }),
        },
        order: [['versionNo', 'DESC']],
        attributes: ['versionNo'],
      });
      return row ? row.versionNo + 1 : 1;
    },

    async createPriceVersion(data) {
      const versionNo = await this.getNextPriceVersionNo(data.serviceId, data.branchId);
      return ServicePriceVersion.create({
        serviceId: data.serviceId,
        branchId: data.branchId || null,
        versionNo,
        unitPrice: data.unitPrice,
        effectiveFrom: data.effectiveFrom,
        effectiveTo: data.effectiveTo || null,
        status: 'DRAFT',
        createdBy: data.createdBy,
      });
    },

    async approvePriceVersion(priceVersionId, approverUserId) {
      const version = await ServicePriceVersion.findByPk(priceVersionId);
      if (!version) return null;

      // Check overlap before approval (AT-21)
      const hasOverlap = await this.checkPriceOverlap({
        serviceId: version.serviceId,
        branchId: version.branchId,
        effectiveFrom: version.effectiveFrom,
        effectiveTo: version.effectiveTo,
        excludeVersionId: version.priceVersionId,
      });

      if (hasOverlap) {
        const error = new Error('Hai phiên bản giá cùng phạm vi và thời gian hiệu lực không được duyệt đồng thời (AT-21)');
        error.code = 'PRICE_VERSION_OVERLAP';
        throw error;
      }

      version.status = 'APPROVED';
      version.approvedBy = approverUserId;
      await version.save();
      return version;
    },

    // ROOMS / CHAIRS
    async listRooms({ branchId, roomType, isActive } = {}) {
      const where = {};
      if (branchId) where.branchId = branchId;
      if (roomType) where.roomType = roomType;
      if (isActive !== undefined) where.isActive = isActive;

      return Room.findAll({
        where,
        order: [['code', 'ASC']],
      });
    },

    async createRoom(data) {
      return Room.create({
        branchId: data.branchId,
        code: data.code.trim().toUpperCase(),
        name: data.name.trim(),
        roomType: data.roomType || 'CHAIR',
        isActive: data.isActive !== false,
        createdBy: data.createdBy,
      });
    },

    async softDeleteRoom(roomId, username) {
      return sequelize.transaction(async transaction => {
        await setSessionUser(sequelize, transaction, username);
        try {
          const room = await Room.findByPk(roomId, { transaction });
          if (!room) return false;
          await room.destroy({ transaction });
          return true;
        } finally {
          await clearSessionUser(sequelize, transaction);
        }
      });
    },

    // SUPPLIERS
    async listSuppliers({ search = '', isActive } = {}) {
      const where = {};
      if (search) {
        where[Op.or] = [
          { code: { [Op.like]: `%${search}%` } },
          { name: { [Op.like]: `%${search}%` } },
        ];
      }
      if (isActive !== undefined) where.isActive = isActive;

      return Supplier.findAll({
        where,
        order: [['code', 'ASC']],
      });
    },

    async createSupplier(data) {
      return Supplier.create({
        code: data.code.trim().toUpperCase(),
        name: data.name.trim(),
        phone: data.phone?.trim() || null,
        taxCode: data.taxCode?.trim() || null,
        isActive: data.isActive !== false,
        createdBy: data.createdBy,
      });
    },

    async softDeleteSupplier(supplierId, username) {
      return sequelize.transaction(async transaction => {
        await setSessionUser(sequelize, transaction, username);
        try {
          const supplier = await Supplier.findByPk(supplierId, { transaction });
          if (!supplier) return false;
          await supplier.destroy({ transaction });
          return true;
        } finally {
          await clearSessionUser(sequelize, transaction);
        }
      });
    },

    // SYSTEM CONFIG (VERSIONED)
    async getSystemConfig(configKey, scopeCode = 'GLOBAL') {
      const now = new Date();
      return SystemConfigVersion.findOne({
        where: {
          configKey,
          scopeCode,
          status: 'APPROVED',
          effectiveFrom: { [Op.lte]: now },
          [Op.or]: [
            { effectiveTo: null },
            { effectiveTo: { [Op.gt]: now } },
          ],
        },
        order: [['versionNo', 'DESC']],
      });
    },

    async listSystemConfigs() {
      return SystemConfigVersion.findAll({
        order: [['configKey', 'ASC'], ['versionNo', 'DESC']],
      });
    },
  };
}
