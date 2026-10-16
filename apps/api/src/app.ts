import express from 'express';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { categoriesRouter } from './modules/categories/categories.routes.js';
import { equipmentRouter } from './modules/equipment/equipment.routes.js';
import { bookingsRouter } from './modules/bookings/bookings.routes.js';

export function createApp() {
  const app = express();

  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ data: { status: 'ok' } });
  });
  app.use('/api/auth', authRouter);
  app.use('/api/categories', categoriesRouter);
  app.use('/api/equipment', equipmentRouter);
  app.use('/api/bookings', bookingsRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export const app = createApp();
