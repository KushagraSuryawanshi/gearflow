import { expect, type Page } from '@playwright/test';
import type { Booking, BookingStatus, Category, Equipment, Role, User } from '../../src/types/api';

export const accounts: Record<'borrower' | 'staff' | 'admin', User> = {
  borrower: { id: 'u1', name: 'Alex Morgan', email: 'alex@example.test', role: 'BORROWER' },
  staff: { id: 'u2', name: 'Sam Chen', email: 'sam@example.test', role: 'STAFF' },
  admin: { id: 'u3', name: 'Jamie Lee', email: 'jamie@example.test', role: 'ADMIN' },
};

export async function signIn(page: Page, role: keyof typeof accounts) {
  await page.getByLabel('Email address').fill(accounts[role].email);
  await page.getByLabel('Password', { exact: true }).fill('fixture-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Equipment', exact: true })).toBeVisible();
}

export async function installContractFixture(page: Page) {
  const categories: Category[] = [
    { id: 'c1', name: 'Cameras' },
    { id: 'c2', name: 'Audio' },
    { id: 'c3', name: 'Lighting' },
    { id: 'c4', name: 'Computers' },
    { id: 'c5', name: 'Support' },
  ];
  const equipment: Equipment[] = [
    {
      id: 'e1',
      name: 'Canon EOS R6 #001',
      description:
        'Full-frame mirrorless camera with a 24–105mm lens. Includes a battery and carry case.',
      category: categories[0]!,
      status: 'AVAILABLE',
    },
    {
      id: 'e2',
      name: 'RØDE NT1 Microphone',
      description: 'Studio condenser microphone for clear vocals, interviews and recordings.',
      category: categories[1]!,
      status: 'AVAILABLE',
    },
    {
      id: 'e3',
      name: 'Aputure Light Storm 120d',
      description: 'Daylight LED light with a softbox and stand. Ready for your next shoot.',
      category: categories[2]!,
      status: 'AVAILABLE',
    },
    {
      id: 'e4',
      name: 'MacBook Pro 14-inch #001',
      description: 'Portable editing workstation. Includes a USB-C power adapter.',
      category: categories[3]!,
      status: 'AVAILABLE',
    },
    {
      id: 'e5',
      name: 'Manfrotto Tripod #001',
      description: 'A sturdy aluminium tripod with a fluid head and quick-release plate.',
      category: categories[4]!,
      status: 'AVAILABLE',
    },
    {
      id: 'e6',
      name: 'Canon EOS R6 #002',
      description: 'Second camera body. Currently being serviced by the equipment team.',
      category: categories[0]!,
      status: 'UNDER_MAINTENANCE',
    },
  ];
  function booking(
    id: string,
    item: Equipment,
    status: BookingStatus,
    borrower = accounts.borrower,
  ): Booking {
    return {
      id,
      equipment: { id: item.id, name: item.name },
      borrower,
      startDate: '2026-11-05',
      endDate: '2026-11-07',
      status,
      createdAt: '2026-10-17T10:00:00Z',
      updatedAt: '2026-10-17T10:00:00Z',
    };
  }
  const state = {
    users: structuredClone(Object.values(accounts)),
    categories,
    equipment,
    bookings: [
      booking('b1', equipment[0]!, 'PENDING'),
      booking('b2', equipment[2]!, 'APPROVED'),
      booking('b3', equipment[1]!, 'COLLECTED'),
      booking('b4', equipment[4]!, 'PENDING', accounts.staff),
      booking('b5', equipment[4]!, 'RETURNED'),
    ],
    calls: [] as { method: string; path: string; body: unknown }[],
    failures: new Map<string, { status: number; code: string; message: string }>(),
  };
  let sequence = 10;
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace(/^\/api/, '');
    const method = request.method();
    const body = (request.postData() ? request.postDataJSON() : {}) as Record<
      string,
      string | boolean
    >;
    state.calls.push({ method, path, body });
    const success = (data: unknown, status = 200) => route.fulfill({ status, json: { data } });
    const failure = (status: number, code: string, message: string) =>
      route.fulfill({ status, json: { error: { code, message } } });
    const forced = state.failures.get(`${method} ${path}`);
    if (forced) {
      await failure(forced.status, forced.code, forced.message);
      return;
    }
    if (path === '/auth/login' && method === 'POST') {
      const user = state.users.find((item) => item.email === body.email);
      if (!user || body.password !== 'fixture-password')
        await failure(401, 'INVALID_CREDENTIALS', 'The email or password is incorrect.');
      else await success({ token: `fixture-${user.id}`, user });
      return;
    }
    const token = request.headers().authorization?.replace('Bearer fixture-', '');
    const user = state.users.find((item) => item.id === token);
    if (!user) {
      await failure(401, 'UNAUTHORIZED', 'Please sign in.');
      return;
    }
    if (path === '/auth/me') {
      await success(user);
      return;
    }
    if (
      (path.startsWith('/users') ||
        (['POST', 'DELETE'].includes(method) && path.startsWith('/equipment')) ||
        (path.startsWith('/categories') && method !== 'GET')) &&
      user.role !== 'ADMIN'
    ) {
      await failure(403, 'FORBIDDEN', 'An administrator account is required.');
      return;
    }
    if (path === '/equipment' && method === 'GET') {
      await success(state.equipment);
      return;
    }
    if (path === '/categories' && method === 'GET') {
      await success(state.categories);
      return;
    }
    if (path === '/users' && method === 'GET') {
      await success(state.users);
      return;
    }
    if (path === '/bookings/mine') {
      await success(state.bookings.filter((item) => item.borrower.id === user.id));
      return;
    }
    if (path === '/bookings' && method === 'POST') {
      expect(Object.keys(body).sort()).toEqual(['endDate', 'equipmentId', 'startDate']);
      const item = state.equipment.find((value) => value.id === body.equipmentId);
      if (!item) {
        await failure(404, 'NOT_FOUND', 'Equipment not found.');
        return;
      }
      if (item.status === 'UNDER_MAINTENANCE') {
        await failure(409, 'EQUIPMENT_UNDER_MAINTENANCE', 'This equipment is under maintenance.');
        return;
      }
      const created = {
        ...booking(`b${sequence++}`, item, 'PENDING', user),
        startDate: String(body.startDate),
        endDate: String(body.endDate),
      };
      state.bookings.push(created);
      await success(created, 201);
      return;
    }
    const categoryMatch = /^\/categories(?:\/([^/]+))?$/.exec(path);
    if (categoryMatch) {
      const category = state.categories.find((item) => item.id === categoryMatch[1]);
      if (method === 'POST') {
        const created = { id: `c${sequence++}`, name: String(body.name) };
        state.categories.push(created);
        await success(created, 201);
        return;
      }
      if (!category) {
        await failure(404, 'NOT_FOUND', 'Category not found.');
        return;
      }
      if (method === 'PATCH') {
        category.name = String(body.name);
        await success(category);
        return;
      }
      if (method === 'DELETE') {
        if (state.equipment.some((item) => item.category.id === category.id))
          await failure(
            409,
            'VALIDATION_ERROR',
            'Reassign the equipment in this category before deleting it.',
          );
        else {
          state.categories = state.categories.filter((item) => item.id !== category.id);
          await route.fulfill({ status: 204 });
        }
        return;
      }
    }
    if (path === '/equipment' && method === 'POST') {
      const category = state.categories.find((item) => item.id === body.categoryId);
      expect(category).toBeDefined();
      const created: Equipment = {
        id: `e${sequence++}`,
        name: String(body.name),
        description: body.description ? String(body.description) : null,
        category: category!,
        status: 'AVAILABLE',
      };
      state.equipment.push(created);
      await success(created, 201);
      return;
    }
    const equipmentMatch = /^\/equipment\/([^/]+)(?:\/(maintenance|bookings))?$/.exec(path);
    if (equipmentMatch) {
      const item = state.equipment.find((value) => value.id === equipmentMatch[1]);
      if (!item) {
        await failure(404, 'NOT_FOUND', 'Equipment not found.');
        return;
      }
      const operation = equipmentMatch[2];
      if (operation && user.role === 'BORROWER') {
        await failure(403, 'FORBIDDEN', 'Staff access is required.');
        return;
      }
      if (operation === 'bookings' && method === 'GET') {
        await success(state.bookings.filter((value) => value.equipment.id === item.id));
        return;
      }
      if (operation === 'maintenance' && method === 'PATCH') {
        expect(typeof body.underMaintenance).toBe('boolean');
        item.status = body.underMaintenance ? 'UNDER_MAINTENANCE' : 'AVAILABLE';
        await success(item);
        return;
      }
      if (method === 'GET') {
        await success(item);
        return;
      }
      if (user.role !== 'ADMIN') {
        await failure(403, 'FORBIDDEN', 'An administrator account is required.');
        return;
      }
      if (method === 'PATCH') {
        item.name = String(body.name);
        item.description = body.description ? String(body.description) : null;
        item.category = state.categories.find((value) => value.id === body.categoryId)!;
        await success(item);
        return;
      }
      if (method === 'DELETE') {
        if (state.bookings.some((value) => value.equipment.id === item.id))
          await failure(
            409,
            'BOOKING_CONFLICT',
            'Equipment with booking records cannot be deleted.',
          );
        else {
          state.equipment = state.equipment.filter((value) => value.id !== item.id);
          await route.fulfill({ status: 204 });
        }
        return;
      }
    }
    const roleMatch = /^\/users\/([^/]+)\/role$/.exec(path);
    if (roleMatch && method === 'PATCH') {
      expect(['BORROWER', 'STAFF', 'ADMIN']).toContain(body.role);
      const person = state.users.find((item) => item.id === roleMatch[1]);
      if (person) {
        person.role = body.role as Role;
        await success(person);
        return;
      }
    }
    const bookingMatch = /^\/bookings\/([^/]+)\/(cancel|review|collect|return)$/.exec(path);
    if (bookingMatch && method === 'PATCH') {
      const item = state.bookings.find((value) => value.id === bookingMatch[1]);
      if (!item) {
        await failure(404, 'NOT_FOUND', 'Booking not found.');
        return;
      }
      const operation = bookingMatch[2];
      if (operation === 'cancel') {
        if (item.borrower.id !== user.id) {
          await failure(403, 'FORBIDDEN', 'Only the owner can cancel.');
          return;
        }
        expect(['PENDING', 'APPROVED']).toContain(item.status);
        item.status = 'CANCELLED';
      } else {
        if (user.role === 'BORROWER') {
          await failure(403, 'FORBIDDEN', 'Staff access is required.');
          return;
        }
        if (operation === 'review') {
          if (body.decision === 'APPROVED' && item.borrower.id === user.id) {
            await failure(
              403,
              'SELF_APPROVAL_NOT_ALLOWED',
              'Another staff member must approve your request.',
            );
            return;
          }
          expect(item.status).toBe('PENDING');
          expect(['APPROVED', 'REJECTED']).toContain(body.decision);
          item.status = body.decision as BookingStatus;
        } else if (operation === 'collect') {
          expect(item.status).toBe('APPROVED');
          item.status = 'COLLECTED';
        } else {
          expect(item.status).toBe('COLLECTED');
          item.status = 'RETURNED';
        }
      }
      await success(item);
      return;
    }
    if (['/bookings/pending', '/bookings/active'].includes(path) && method === 'GET') {
      if (user.role === 'BORROWER') {
        await failure(403, 'FORBIDDEN', 'Staff access is required.');
        return;
      }
      await success(
        state.bookings.filter((item) =>
          path.endsWith('pending')
            ? item.status === 'PENDING'
            : ['APPROVED', 'COLLECTED'].includes(item.status),
        ),
      );
      return;
    }
    throw new Error(`Unexpected contract request: ${method} ${path}`);
  });
  return state;
}
