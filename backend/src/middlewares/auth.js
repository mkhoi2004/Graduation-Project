import jwt from 'jsonwebtoken';
import { ApiError } from '../utils/api-error.js';

export function createAuthMiddlewares({ jwtSecret, userRepo }) {
  async function authenticate(req, res, next) {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw ApiError.unauthorized('MISSING_TOKEN', 'Bearer authorization token required');
      }

      const token = authHeader.slice(7).trim();
      let decoded;
      try {
        decoded = jwt.verify(token, jwtSecret);
      } catch (err) {
        if (err.name === 'TokenExpiredError') {
          throw ApiError.unauthorized('TOKEN_EXPIRED', 'Authentication token has expired');
        }
        throw ApiError.unauthorized('INVALID_TOKEN', 'Invalid authentication token');
      }

      // Check if user still exists and is active
      const user = await userRepo.findById(decoded.userId);
      if (!user || !user.isActive) {
        throw ApiError.unauthorized('ACCOUNT_DISABLED', 'User account is disabled or no longer exists');
      }

      req.user = {
        userId: user.userId,
        username: user.username,
        displayName: user.displayName,
        role: user.role?.code,
        roleId: user.roleId,
        branchId: user.branchId,
        branchCode: user.branch?.code,
        isApprover: Boolean(user.isApprover),
      };

      next();
    } catch (error) {
      next(error);
    }
  }

  function authorize(...allowedRoles) {
    return async (req, res, next) => {
      try {
        if (!req.user) {
          throw ApiError.unauthorized('UNAUTHENTICATED', 'Authentication required before authorization');
        }

        const userRole = req.user.role;
        if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
          // Log access denial to AccessAuditLogs
          await userRepo.createAuditLog({
            actorId: req.user.userId,
            actorName: req.user.username,
            roleCode: userRole,
            purpose: req.headers['x-access-purpose'] || 'UNAUTHORIZED_ACCESS_ATTEMPT',
            action: req.method,
            objectType: req.baseUrl + req.path,
            objectId: req.params.id || null,
            outcome: 'DENIED',
            source: req.ip || 'API',
          });

          throw ApiError.forbidden('FORBIDDEN', `Role '${userRole}' is not permitted to perform this action`);
        }

        next();
      } catch (error) {
        next(error);
      }
    };
  }

  return { authenticate, authorize };
}
