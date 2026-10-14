export function errorHandler(error, req, res, _next) {
  const invalidJson = error.type === 'entity.parse.failed';
  const tooLarge = error.type === 'entity.too.large';
  const status = invalidJson ? 400 : tooLarge ? 413 : 500;
  const code = invalidJson ? 'INVALID_JSON' : tooLarge ? 'PAYLOAD_TOO_LARGE' : 'INTERNAL_ERROR';
  if (status === 500) req.logger?.error({ requestId: req.requestId, code }, 'Request failed');
  res.status(status).json({ error: { code, requestId: req.requestId } });
}
