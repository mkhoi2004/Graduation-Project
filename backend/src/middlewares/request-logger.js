import { randomUUID } from 'node:crypto';

export function requestLogger(logger) {
  return (req, res, next) => {
    req.requestId = randomUUID();
    req.logger = logger;
    res.set('X-Request-Id', req.requestId);
    const started = performance.now();
    res.on('finish', () => logger.info({
      requestId: req.requestId, method: req.method, status: res.statusCode,
      durationMs: Math.round(performance.now() - started),
      // Intentionally no URL/query/body/headers/SQL, which may contain patient data.
    }, 'HTTP request'));
    next();
  };
}
