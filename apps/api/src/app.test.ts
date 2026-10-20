import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from './app.js';

describe('app basics', () => {
  it('reports health', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: { status: 'ok' } });
  });

  it('exposes Prometheus process and HTTP metrics', async () => {
    await request(app).get('/api/health');
    const response = await request(app).get('/api/metrics');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/plain');
    expect(response.text).toContain('gearflow_process_cpu_seconds_total');
    expect(response.text).toContain('gearflow_http_requests_total');
    expect(response.text).toContain('gearflow_http_request_duration_seconds_bucket');
    expect(response.text).toContain('route="/api/health"');
  });

  it('returns a NOT_FOUND error for unknown routes', async () => {
    const response = await request(app).get('/api/nope');

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('returns a VALIDATION_ERROR for malformed JSON', async () => {
    const response = await request(app)
      .post('/api/health')
      .set('Content-Type', 'application/json')
      .send('{bad json');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});
