import express from 'express';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { categoriesRouter } from './modules/categories/categories.routes.js';
import { equipmentRouter } from './modules/equipment/equipment.routes.js';
import { bookingsRouter } from './modules/bookings/bookings.routes.js';
import { usersRouter } from './modules/users/users.routes.js';
import { metricsHandler, observeHttpRequests } from './metrics.js';
export function createApp() {
  const app = express();

  app.use(observeHttpRequests);
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ data: { status: 'ok' } });
  });
  app.get('/api/metrics', metricsHandler);
  app.use('/api/auth', authRouter);
  app.use('/api/categories', categoriesRouter);
  app.use('/api/equipment', equipmentRouter);
  app.use('/api/bookings', bookingsRouter);
  app.use('/api/users', usersRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export const app = createApp();
