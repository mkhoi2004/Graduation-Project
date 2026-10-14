export function createHealthController(health) {
  return {
    live: (_req, res) => res.json({ status: 'ok', service: 'dental-erp-api' }),
    ready: async (_req, res) => {
      const result = await health.readiness();
      res.status(result.statusCode).json(result.body);
    },
  };
}
