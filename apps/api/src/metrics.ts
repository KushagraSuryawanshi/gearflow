import type { RequestHandler } from 'express';
import { collectDefaultMetrics, Counter, Histogram, register } from '@prometheus-io/client';
collectDefaultMetrics({ prefix: 'gearflow_' });

const httpRequests = new Counter({
  name: 'gearflow_http_requests_total',
  help: 'Total HTTP requests handled by the GearFlow API.',
  labelNames: ['method', 'route', 'status_code'] as const,
});

const httpRequestDuration = new Histogram({
  name: 'gearflow_http_request_duration_seconds',
  help: 'GearFlow API HTTP request duration in seconds.',
  labelNames: ['method', 'route', 'status_code'] as const,
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
});

function routeLabel(path: unknown, baseUrl: string): string {
  if (typeof path !== 'string') return 'unmatched';
  if (!baseUrl) return path;
  return path === '/' ? baseUrl : `${baseUrl}${path}`;
}

export const observeHttpRequests: RequestHandler = (req, res, next) => {
  const started = process.hrtime.bigint();

  res.on('finish', () => {
    const labels = {
      method: req.method,
      route: routeLabel(req.route?.path, req.baseUrl),
      status_code: String(res.statusCode),
    };
    const seconds = Number(process.hrtime.bigint() - started) / 1_000_000_000;

    httpRequests.inc(labels);
    httpRequestDuration.observe(labels, seconds);
  });

  next();
};

export const metricsHandler: RequestHandler = async (_req, res) => {
  res.setHeader('Content-Type', register.contentType);
  res.send(await register.metrics());
};
