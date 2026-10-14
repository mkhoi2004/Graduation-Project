export function errorHandler(error, req, res, _next) {
  const invalidJson = error.type === 'entity.parse.failed';
  const tooLarge = error.type === 'entity.too.large';
  const status = error.statusCode || (invalidJson ? 400 : tooLarge ? 413 : 500);
  const code = error.code || (invalidJson ? 'INVALID_JSON' : tooLarge ? 'PAYLOAD_TOO_LARGE' : 'INTERNAL_ERROR');

  if (status === 500) {
    req.logger?.error({ requestId: req.requestId, code, message: error.message }, 'Request failed');
  }

  const errorBody = { code, requestId: req.requestId };
  if (error.message && status < 500) {
    errorBody.message = error.message;
  }
  if (error.details) {
    errorBody.details = error.details;
  }

  res.status(status).json({ error: errorBody });
}
