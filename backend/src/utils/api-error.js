export class ApiError extends Error {
  constructor(statusCode, code, message, details = null) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }

  static badRequest(code, message, details = null) {
    return new ApiError(400, code, message, details);
  }

  static unauthorized(code = 'UNAUTHORIZED', message = 'Authentication required') {
    return new ApiError(401, code, message);
  }

  static forbidden(code = 'FORBIDDEN', message = 'Access denied') {
    return new ApiError(403, code, message);
  }

  static notFound(code = 'NOT_FOUND', message = 'Resource not found') {
    return new ApiError(404, code, message);
  }

  static conflict(code = 'CONFLICT', message = 'Resource conflict or state violation') {
    return new ApiError(409, code, message);
  }

  static unprocessable(code = 'UNPROCESSABLE_ENTITY', message = 'Validation failed', details = null) {
    return new ApiError(422, code, message, details);
  }

  static internal(code = 'INTERNAL_ERROR', message = 'Internal server error') {
    return new ApiError(500, code, message);
  }
}
