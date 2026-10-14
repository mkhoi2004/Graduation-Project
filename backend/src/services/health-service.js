export function createHealthService({ checkDatabase }) {
  // Share simultaneous probes, but never cache success across requests.
  let pending;
  return {
    async readiness() {
      try {
        pending ??= Promise.resolve().then(checkDatabase).finally(() => { pending = undefined; });
        await pending;
        return { statusCode: 200, body: { status: 'ok', database: 'ready' } };
      } catch {
        return { statusCode: 503, body: { status: 'degraded', database: 'unavailable', code: 'DATABASE_NOT_READY' } };
      }
    },
  };
}
