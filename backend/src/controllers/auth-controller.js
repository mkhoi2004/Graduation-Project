export function createAuthController({ authService }) {
  return {
    async login(req, res, next) {
      try {
        const { username, password } = req.body;
        const result = await authService.login({
          username,
          password,
          ip: req.ip || req.connection.remoteAddress,
        });
        res.status(200).json({ status: 'ok', data: result });
      } catch (error) {
        next(error);
      }
    },

    async me(req, res, next) {
      try {
        const user = await authService.getCurrentUser(req.user.userId);
        res.status(200).json({ status: 'ok', data: user });
      } catch (error) {
        next(error);
      }
    },

    async logout(_req, res) {
      res.status(200).json({ status: 'ok', message: 'Đăng xuất thành công' });
    },
  };
}
