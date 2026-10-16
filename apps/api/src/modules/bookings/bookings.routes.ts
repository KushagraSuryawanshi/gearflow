import { Router } from 'express';
import { z } from 'zod';
import { idParamsSchema, parse } from '../../lib/validate.js';
import { authenticate, currentUser } from '../../middleware/authenticate.js';
import { cancelBooking, createBooking, listMyBookings } from './booking.service.js';

const createBookingSchema = z.object({
  equipmentId: z.string().min(1),
  startDate: z.iso.date(),
  endDate: z.iso.date(),
});

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
