export function createUserController({ userService }) {
  return {
    async getUsers(req, res, next) {
      try {
        const { page, pageSize, search, roleId, branchId, isActive } = req.query;
        const result = await userService.getUsers({
          page: page ? parseInt(page, 10) : 1,
          pageSize: pageSize ? parseInt(pageSize, 10) : 20,
          search,
          roleId,
          branchId,
          isActive: isActive !== undefined ? isActive === 'true' : undefined,
        });
        res.status(200).json({ status: 'ok', data: result });
      } catch (error) {
        next(error);
      }
    },

    async getUserById(req, res, next) {
      try {
        const user = await userService.getUserById(req.params.id);
        res.status(200).json({ status: 'ok', data: user });
      } catch (error) {
        next(error);
      }
    },

    async createUser(req, res, next) {
      try {
        const user = await userService.createUser(req.body, req.user.username);
        res.status(201).json({ status: 'ok', data: user });
      } catch (error) {
        next(error);
      }
    },

    async updateUser(req, res, next) {
      try {
        const user = await userService.updateUser(req.params.id, req.body, req.user.username);
        res.status(200).json({ status: 'ok', data: user });
      } catch (error) {
        next(error);
      }
    },

    async softDeleteUser(req, res, next) {
      try {
        const result = await userService.softDeleteUser(req.params.id, req.user.username);
        res.status(200).json({ status: 'ok', data: result });
      } catch (error) {
        next(error);
      }
    },

    async getDeletedUsers(req, res, next) {
      try {
        const list = await userService.getDeletedUsers(req.user.username);
        res.status(200).json({ status: 'ok', data: list });
      } catch (error) {
        next(error);
      }
    },

    async restoreUser(req, res, next) {
      try {
        const restored = await userService.restoreUser(req.params.id, req.user.username);
        res.status(200).json({ status: 'ok', data: restored });
      } catch (error) {
        next(error);
      }
    },

    async getRoles(_req, res, next) {
      try {
        const roles = await userService.getRoles();
        res.status(200).json({ status: 'ok', data: roles });
      } catch (error) {
        next(error);
      }
    },

    async getBranches(_req, res, next) {
      try {
        const branches = await userService.getBranches();
        res.status(200).json({ status: 'ok', data: branches });
      } catch (error) {
        next(error);
      }
    },

    async getAuditLogs(req, res, next) {
      try {
        const { page, pageSize, actorName, objectType, outcome, startDate, endDate } = req.query;
        const logs = await userService.getAuditLogs({
          page: page ? parseInt(page, 10) : 1,
          pageSize: pageSize ? parseInt(pageSize, 10) : 50,
          actorName,
          objectType,
          outcome,
          startDate,
          endDate,
        }, req.user.username);
        res.status(200).json({ status: 'ok', data: logs });
      } catch (error) {
        next(error);
      }
    },
  };
}
