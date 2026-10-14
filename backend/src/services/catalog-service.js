import { ApiError } from '../utils/api-error.js';
import { toDecimal, isNegative } from '../utils/money.js';

export function createCatalogService({ catalogRepo, userRepo }) {
  return {
    // SERVICES
    async getServices(params) {
      return catalogRepo.listServices(params);
    },

    async getServiceById(id) {
      const service = await catalogRepo.findServiceById(id);
      if (!service) throw ApiError.notFound('SERVICE_NOT_FOUND', 'Không tìm thấy dịch vụ');
      return service;
    },

    async createService(data, actorUsername) {
      if (!data.code || !data.name) {
        throw ApiError.badRequest('MISSING_FIELDS', 'Mã và tên dịch vụ là bắt buộc');
      }

      const service = await catalogRepo.createService({
        code: data.code,
        name: data.name,
        requiresConsent: data.requiresConsent,
        requiresSterilePack: data.requiresSterilePack,
        isActive: data.isActive,
        createdBy: actorUsername,
      });

      // If initial price provided, create draft price version
      if (data.initialPrice !== undefined && data.initialPrice !== null && data.initialPrice !== '') {
        const price = toDecimal(data.initialPrice);
        if (isNegative(price)) {
          throw ApiError.badRequest('INVALID_PRICE', 'Giá dịch vụ không được là số âm');
        }
        await catalogRepo.createPriceVersion({
          serviceId: service.serviceId,
          branchId: data.branchId || null,
          unitPrice: price.toFixed(2),
          effectiveFrom: data.effectiveFrom || new Date().toISOString(),
          effectiveTo: null,
          createdBy: actorUsername,
        });
      }

      await userRepo.createAuditLog({
        actorName: actorUsername,
        purpose: 'CATALOG_MANAGEMENT',
        action: 'CREATE_SERVICE',
        objectType: 'SERVICES',
        objectId: service.serviceId,
        outcome: 'ALLOWED',
        source: 'API',
      });

      return catalogRepo.findServiceById(service.serviceId);
    },

    async updateService(id, data, actorUsername) {
      const updated = await catalogRepo.updateService(id, data);
      if (!updated) throw ApiError.notFound('SERVICE_NOT_FOUND', 'Không tìm thấy dịch vụ');

      await userRepo.createAuditLog({
        actorName: actorUsername,
        purpose: 'CATALOG_MANAGEMENT',
        action: 'UPDATE_SERVICE',
        objectType: 'SERVICES',
        objectId: id,
        outcome: 'ALLOWED',
        source: 'API',
      });

      return updated;
    },

    async softDeleteService(id, actorUsername) {
      const success = await catalogRepo.softDeleteService(id, actorUsername);
      if (!success) throw ApiError.notFound('SERVICE_NOT_FOUND', 'Không tìm thấy dịch vụ để xóa');

      await userRepo.createAuditLog({
        actorName: actorUsername,
        purpose: 'CATALOG_MANAGEMENT',
        action: 'SOFT_DELETE_SERVICE',
        objectType: 'SERVICES',
        objectId: id,
        outcome: 'ALLOWED',
        source: 'API',
      });

      return { success: true, message: 'Dịch vụ đã được chuyển vào lưu trữ (Soft-Delete)' };
    },

    async getDeletedServices(actorUsername) {
      await userRepo.createAuditLog({
        actorName: actorUsername,
        purpose: 'VIEW_ARCHIVES',
        action: 'VIEW_DELETED_SERVICES',
        objectType: 'SERVICES_DELETED',
        objectId: null,
        outcome: 'ALLOWED',
        source: 'API',
      });
      return catalogRepo.listDeletedServices();
    },

    async restoreService(id, actorUsername) {
      const restored = await catalogRepo.restoreService(id, actorUsername);
      if (!restored) throw ApiError.notFound('ARCHIVE_NOT_FOUND', 'Không tìm thấy bản ghi dịch vụ đã xóa');

      await userRepo.createAuditLog({
        actorName: actorUsername,
        purpose: 'RESTORE_RECORD',
        action: 'RESTORE_SERVICE',
        objectType: 'SERVICES',
        objectId: id,
        outcome: 'ALLOWED',
        source: 'API',
      });

      return restored;
    },

    // PRICE VERSIONS (AT-16 & AT-21 & MAKER-CHECKER)
    async createPriceVersion(serviceId, data, actorUsername) {
      const price = toDecimal(data.unitPrice);
      if (isNegative(price)) {
        throw ApiError.badRequest('INVALID_PRICE', 'Giá dịch vụ không được là số âm');
      }

      if (!data.effectiveFrom) {
        throw ApiError.badRequest('MISSING_DATE', 'Ngày bắt đầu hiệu lực là bắt buộc');
      }

      if (data.effectiveTo && new Date(data.effectiveTo) <= new Date(data.effectiveFrom)) {
        throw ApiError.badRequest('INVALID_PERIOD', 'Ngày kết thúc phải lớn hơn ngày bắt đầu');
      }

      const version = await catalogRepo.createPriceVersion({
        serviceId,
        branchId: data.branchId || null,
        unitPrice: price.toFixed(2),
        effectiveFrom: data.effectiveFrom,
        effectiveTo: data.effectiveTo || null,
        createdBy: actorUsername,
      });

      return version;
    },

    async approvePriceVersion(priceVersionId, user) {
      // Maker-Checker principle: Approver cannot approve own submission unless specifically overridden by admin policy
      // But user must have isApprover=true or role='ADMIN'
      if (!user.isApprover && user.role !== 'ADMIN') {
        throw ApiError.forbidden('APPROVER_PERMISSION_REQUIRED', 'Chỉ người dùng có quyền duyệt (Approver) hoặc Admin mới được duyệt giá');
      }

      try {
        const approved = await catalogRepo.approvePriceVersion(priceVersionId, user.userId);
        if (!approved) throw ApiError.notFound('PRICE_VERSION_NOT_FOUND', 'Không tìm thấy phiên bản giá');

        await userRepo.createAuditLog({
          actorName: user.username,
          roleCode: user.role,
          purpose: 'PRICE_APPROVAL',
          action: 'APPROVE_PRICE_VERSION',
          objectType: 'SERVICE_PRICE_VERSIONS',
          objectId: priceVersionId,
          outcome: 'ALLOWED',
          source: 'API',
        });

        return approved;
      } catch (err) {
        if (err.code === 'PRICE_VERSION_OVERLAP') {
          throw ApiError.conflict('PRICE_VERSION_OVERLAP', err.message);
        }
        throw err;
      }
    },

    // ROOMS / CHAIRS
    async getRooms(params) {
      return catalogRepo.listRooms(params);
    },

    async createRoom(data, actorUsername) {
      if (!data.code || !data.name || !data.branchId) {
        throw ApiError.badRequest('MISSING_FIELDS', 'Mã, tên phòng/ghế và chi nhánh là bắt buộc');
      }

      const room = await catalogRepo.createRoom({
        branchId: data.branchId,
        code: data.code,
        name: data.name,
        roomType: data.roomType,
        isActive: data.isActive,
        createdBy: actorUsername,
      });

      return room;
    },

    async softDeleteRoom(id, actorUsername) {
      const success = await catalogRepo.softDeleteRoom(id, actorUsername);
      if (!success) throw ApiError.notFound('ROOM_NOT_FOUND', 'Không tìm thấy phòng/ghế để xóa');
      return { success: true, message: 'Đã xóa phòng/ghế (Soft-Delete)' };
    },

    // SUPPLIERS
    async getSuppliers(params) {
      return catalogRepo.listSuppliers(params);
    },

    async createSupplier(data, actorUsername) {
      if (!data.code || !data.name) {
        throw ApiError.badRequest('MISSING_FIELDS', 'Mã và tên nhà cung cấp là bắt buộc');
      }
      return catalogRepo.createSupplier({
        code: data.code,
        name: data.name,
        phone: data.phone,
        taxCode: data.taxCode,
        isActive: data.isActive,
        createdBy: actorUsername,
      });
    },

    async softDeleteSupplier(id, actorUsername) {
      const success = await catalogRepo.softDeleteSupplier(id, actorUsername);
      if (!success) throw ApiError.notFound('SUPPLIER_NOT_FOUND', 'Không tìm thấy nhà cung cấp');
      return { success: true, message: 'Đã xóa nhà cung cấp' };
    },

    // CONFIG
    async getSystemConfigs() {
      return catalogRepo.listSystemConfigs();
    },

    async getSystemConfig(key, scope) {
      return catalogRepo.getSystemConfig(key, scope);
    },
  };
}
