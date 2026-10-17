import type {
  AuthResult,
  Booking,
  BookingInput,
  Category,
  Equipment,
  EquipmentInput,
  Role,
  User,
} from '../types/api';

const tokenKey = 'gearflow.token';
export const sessionExpiredEvent = 'gearflow:session-expired';

export function getToken() {
  return sessionStorage.getItem(tokenKey);
}

export function setToken(token: string | null) {
  if (token) sessionStorage.setItem(tokenKey, token);
  else sessionStorage.removeItem(tokenKey);
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  if (options.body) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`/api${path}`, { ...options, headers });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError(
      'Could not reach GearFlow. Check your connection and try again.',
      0,
      'NETWORK_ERROR',
    );
  }

  if (response.status === 401 && token && path !== '/auth/login') {
    setToken(null);
    window.dispatchEvent(new Event(sessionExpiredEvent));
  }
  if (response.status === 204 && response.ok) return undefined as T;

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new ApiError(
      'The server returned an unexpected response. Please try again.',
      response.status,
      'INVALID_RESPONSE',
    );
  }
  if (!response.ok) {
    const error = isRecord(body) && isRecord(body.error) ? body.error : {};
    throw new ApiError(
      typeof error.message === 'string' ? error.message : 'The request could not be completed.',
      response.status,
      typeof error.code === 'string' ? error.code : 'REQUEST_FAILED',
    );
  }
  if (!isRecord(body) || !('data' in body)) {
    throw new ApiError(
      'The server returned an unexpected response. Please try again.',
      response.status,
      'INVALID_RESPONSE',
    );
  }
  return body.data as T;
}

const idPath = (id: string) => encodeURIComponent(id);
const send = (method: string, body?: unknown): RequestInit => ({
  method,
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});

export const api = {
  login: (email: string, password: string) =>
    request<AuthResult>('/auth/login', send('POST', { email, password })),
  me: (signal?: AbortSignal) => request<User>('/auth/me', signal ? { signal } : {}),
  equipment: (signal?: AbortSignal) => request<Equipment[]>('/equipment', signal ? { signal } : {}),
  equipmentById: (id: string, signal?: AbortSignal) =>
    request<Equipment>(`/equipment/${idPath(id)}`, signal ? { signal } : {}),
  createEquipment: (body: EquipmentInput) => request<Equipment>('/equipment', send('POST', body)),
  updateEquipment: (id: string, body: EquipmentInput) =>
    request<Equipment>(`/equipment/${idPath(id)}`, send('PATCH', body)),
  deleteEquipment: (id: string) => request<void>(`/equipment/${idPath(id)}`, send('DELETE')),
  maintenance: (id: string, underMaintenance: boolean) =>
    request<Equipment>(`/equipment/${idPath(id)}/maintenance`, send('PATCH', { underMaintenance })),
  categories: (signal?: AbortSignal) =>
    request<Category[]>('/categories', signal ? { signal } : {}),
  createCategory: (name: string) => request<Category>('/categories', send('POST', { name })),
  updateCategory: (id: string, name: string) =>
    request<Category>(`/categories/${idPath(id)}`, send('PATCH', { name })),
  deleteCategory: (id: string) => request<void>(`/categories/${idPath(id)}`, send('DELETE')),
  createBooking: (body: BookingInput) => request<Booking>('/bookings', send('POST', body)),
  myBookings: (signal?: AbortSignal) =>
    request<Booking[]>('/bookings/mine', signal ? { signal } : {}),
  cancelBooking: (id: string) => request<Booking>(`/bookings/${idPath(id)}/cancel`, send('PATCH')),
  pendingBookings: (signal?: AbortSignal) =>
    request<Booking[]>('/bookings/pending', signal ? { signal } : {}),
  activeBookings: (signal?: AbortSignal) =>
    request<Booking[]>('/bookings/active', signal ? { signal } : {}),
  reviewBooking: (id: string, decision: 'APPROVED' | 'REJECTED') =>
    request<Booking>(`/bookings/${idPath(id)}/review`, send('PATCH', { decision })),
  collectBooking: (id: string) =>
    request<Booking>(`/bookings/${idPath(id)}/collect`, send('PATCH')),
  returnBooking: (id: string) => request<Booking>(`/bookings/${idPath(id)}/return`, send('PATCH')),
  equipmentBookings: (id: string, signal?: AbortSignal) =>
    request<Booking[]>(`/equipment/${idPath(id)}/bookings`, signal ? { signal } : {}),
  users: (signal?: AbortSignal) => request<User[]>('/users', signal ? { signal } : {}),
  updateRole: (id: string, role: Role) =>
    request<User>(`/users/${idPath(id)}/role`, send('PATCH', { role })),
};

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}
