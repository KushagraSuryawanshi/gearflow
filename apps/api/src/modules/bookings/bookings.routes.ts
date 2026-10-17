import { Router } from 'express';
import { z } from 'zod';
import { idParamsSchema, parse } from '../../lib/validate.js';
import { authenticate, currentUser } from '../../middleware/authenticate.js';
import { requireRole } from '../../middleware/requireRole.js';
import {
  cancelBooking,
  collectBooking,
  createBooking,
  listActiveBookings,
  listMyBookings,
  listPendingBookings,
  returnBooking,
  reviewBooking,
} from './booking.service.js';

const createBookingSchema = z.object({
  equipmentId: z.string().min(1),
  startDate: z.iso.date(),
  endDate: z.iso.date(),
});

const reviewSchema = z.object({ decision: z.enum(['APPROVED', 'REJECTED']) });

export const bookingsRouter = Router();

bookingsRouter.use(authenticate);

// The borrower always comes from the login token, never from the request body.
bookingsRouter.post('/', async (req, res) => {
  const input = parse(createBookingSchema, req.body);
  const booking = await createBooking(currentUser(req).id, input);
  res.status(201).json({ data: booking });
});

bookingsRouter.get('/mine', async (req, res) => {
  res.json({ data: await listMyBookings(currentUser(req).id) });
});

bookingsRouter.patch('/:id/cancel', async (req, res) => {
  const { id } = parse(idParamsSchema, req.params);
  res.json({ data: await cancelBooking(currentUser(req), id) });
});

bookingsRouter.get('/pending', requireRole('STAFF', 'ADMIN'), async (_req, res) => {
  res.json({ data: await listPendingBookings() });
});

bookingsRouter.get('/active', requireRole('STAFF', 'ADMIN'), async (_req, res) => {
  res.json({ data: await listActiveBookings() });
});

bookingsRouter.patch('/:id/review', requireRole('STAFF', 'ADMIN'), async (req, res) => {
  const { id } = parse(idParamsSchema, req.params);
  const { decision } = parse(reviewSchema, req.body);
  res.json({ data: await reviewBooking(currentUser(req), id, decision) });
});

bookingsRouter.patch('/:id/collect', requireRole('STAFF', 'ADMIN'), async (req, res) => {
  const { id } = parse(idParamsSchema, req.params);
  res.json({ data: await collectBooking(id) });
});

bookingsRouter.patch('/:id/return', requireRole('STAFF', 'ADMIN'), async (req, res) => {
  const { id } = parse(idParamsSchema, req.params);
  res.json({ data: await returnBooking(id) });
});
