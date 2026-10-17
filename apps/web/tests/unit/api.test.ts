import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api, sessionExpiredEvent, setToken } from '../../src/lib/api';

const fetchMock = vi.fn<typeof fetch>();
const dispatchEvent = vi.fn();

beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal('sessionStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  });
  vi.stubGlobal('window', { dispatchEvent });
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
  dispatchEvent.mockReset();
});
afterEach(() => vi.unstubAllGlobals());

describe('API contract', () => {
  it('uses a relative URL, bearer token and only the agreed booking fields', async () => {
    setToken('session-token');
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ data: { id: 'booking-1' } }), { status: 201 }),
    );
    await expect(
      api.createBooking({ equipmentId: 'camera', startDate: '2026-11-05', endDate: '2026-11-07' }),
    ).resolves.toEqual({ id: 'booking-1' });
    const [url, options] = fetchMock.mock.calls[0]!;
    expect(url).toBe('/api/bookings');
    expect(options?.method).toBe('POST');
    expect(new Headers(options?.headers).get('Authorization')).toBe('Bearer session-token');
    expect(JSON.parse(String(options?.body))).toEqual({
      equipmentId: 'camera',
      startDate: '2026-11-05',
      endDate: '2026-11-07',
    });
  });
  it('keeps business-rule failures available to the UI', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          error: { code: 'BOOKING_CONFLICT', message: 'Those dates are already booked.' },
        }),
        { status: 409 },
      ),
    );
    await expect(api.reviewBooking('booking-1', 'APPROVED')).rejects.toMatchObject({
      status: 409,
      code: 'BOOKING_CONFLICT',
      message: 'Those dates are already booked.',
    });
  });
  it('expires the session on an authenticated 401', async () => {
    setToken('expired');
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: { code: 'UNAUTHORIZED', message: 'Expired' } }), {
        status: 401,
      }),
    );
    await expect(api.me()).rejects.toMatchObject({ status: 401 });
    expect(sessionStorage.getItem('gearflow.token')).toBeNull();
    expect(dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: sessionExpiredEvent }),
    );
  });
  it('keeps invalid login credentials separate from session expiry', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          error: { code: 'INVALID_CREDENTIALS', message: 'Check your credentials.' },
        }),
        { status: 401 },
      ),
    );
    await expect(api.login('alex@example.test', 'wrong')).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
    });
    expect(dispatchEvent).not.toHaveBeenCalled();
  });
  it('supports a successful deletion with no response body and escapes IDs', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await expect(api.deleteEquipment('item/a b')).resolves.toBeUndefined();
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/equipment/item%2Fa%20b');
  });
  it('does not mistake a proxy HTML page for API data', async () => {
    fetchMock.mockResolvedValue(new Response('<html>not JSON</html>'));
    await expect(api.equipment()).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  });
  it('distinguishes connection problems from aborted navigation requests', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await expect(api.equipment()).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
    const aborted = new DOMException('Request aborted', 'AbortError');
    fetchMock.mockRejectedValueOnce(aborted);
    await expect(api.equipment()).rejects.toBe(aborted);
  });
});
