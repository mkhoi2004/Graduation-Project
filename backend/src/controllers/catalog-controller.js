export function createCatalogController({ catalogService }) {
  return {
    async getServices(req, res, next) {
      try {
        const { page, pageSize, search, isActive } = req.query;
        const result = await catalogService.getServices({
          page: page ? parseInt(page, 10) : 1,
          pageSize: pageSize ? parseInt(pageSize, 10) : 50,
          search,
          isActive: isActive !== undefined ? isActive === 'true' : undefined,
        });
        res.status(200).json({ status: 'ok', data: result });
      } catch (error) {
        next(error);
      }
    },

    async getServiceById(req, res, next) {
      try {
        const service = await catalogService.getServiceById(req.params.id);
        res.status(200).json({ status: 'ok', data: service });
      } catch (error) {
        next(error);
      }
    },

    async createService(req, res, next) {
      try {
        const service = await catalogService.createService(req.body, req.user.username);
        res.status(201).json({ status: 'ok', data: service });
      } catch (error) {
        next(error);
      }
    },

    async updateService(req, res, next) {
      try {
        const service = await catalogService.updateService(req.params.id, req.body, req.user.username);
        res.status(200).json({ status: 'ok', data: service });
      } catch (error) {
        next(error);
      }
    },

    async deleteService(req, res, next) {
      try {
        const result = await catalogService.softDeleteService(req.params.id, req.user.username);
        res.status(200).json({ status: 'ok', data: result });
      } catch (error) {
        next(error);
      }
    },

    async getDeletedServices(req, res, next) {
      try {
        const list = await catalogService.getDeletedServices(req.user.username);
        res.status(200).json({ status: 'ok', data: list });
      } catch (error) {
        next(error);
      }
    },

    async restoreService(req, res, next) {
      try {
        const service = await catalogService.restoreService(req.params.id, req.user.username);
        res.status(200).json({ status: 'ok', data: service });
      } catch (error) {
        next(error);
      }
    },

    async createPriceVersion(req, res, next) {
      try {
        const version = await catalogService.createPriceVersion(req.params.id, req.body, req.user.username);
        res.status(201).json({ status: 'ok', data: version });
      } catch (error) {
        next(error);
      }
    },

    async approvePriceVersion(req, res, next) {
      try {
        const approved = await catalogService.approvePriceVersion(req.params.versionId, req.user);
        res.status(200).json({ status: 'ok', data: approved });
      } catch (error) {
        next(error);
      }
    },

    async getRooms(req, res, next) {
      try {
        const { branchId, roomType, isActive } = req.query;
        const rooms = await catalogService.getRooms({
          branchId,
          roomType,
          isActive: isActive !== undefined ? isActive === 'true' : undefined,
        });
        res.status(200).json({ status: 'ok', data: rooms });
      } catch (error) {
        next(error);
      }
    },

    async createRoom(req, res, next) {
      try {
        const room = await catalogService.createRoom(req.body, req.user.username);
        res.status(201).json({ status: 'ok', data: room });
      } catch (error) {
        next(error);
      }
    },

    async deleteRoom(req, res, next) {
      try {
        const result = await catalogService.softDeleteRoom(req.params.id, req.user.username);
        res.status(200).json({ status: 'ok', data: result });
      } catch (error) {
        next(error);
      }
    },

    async getSuppliers(req, res, next) {
      try {
        const { search, isActive } = req.query;
        const suppliers = await catalogService.getSuppliers({
          search,
          isActive: isActive !== undefined ? isActive === 'true' : undefined,
        });
        res.status(200).json({ status: 'ok', data: suppliers });
      } catch (error) {
        next(error);
      }
    },

    async createSupplier(req, res, next) {
      try {
        const supplier = await catalogService.createSupplier(req.body, req.user.username);
        res.status(201).json({ status: 'ok', data: supplier });
      } catch (error) {
        next(error);
      }
    },

    async deleteSupplier(req, res, next) {
      try {
        const result = await catalogService.softDeleteSupplier(req.params.id, req.user.username);
        res.status(200).json({ status: 'ok', data: result });
      } catch (error) {
        next(error);
      }
    },

    async getConfigs(_req, res, next) {
      try {
        const configs = await catalogService.getSystemConfigs();
        res.status(200).json({ status: 'ok', data: configs });
      } catch (error) {
        next(error);
      }
    },
  };
}
