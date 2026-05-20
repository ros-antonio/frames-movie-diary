import express from 'express';
import cors from 'cors';
import { apiRoutes } from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { authenticate } from './middleware/auth.js';
import { globalApiLimiter, globalApiSlowdown } from './middleware/abuseProtection.js';

export function createApp() {
  const app = express();

  app.use(cors({
    origin: true,
    credentials: true,
  }));
  app.use(express.json({ limit: '10mb' }));

  app.use('/api', globalApiSlowdown);
  app.use('/api', globalApiLimiter);

  // Apply auth middleware globally (skips auth endpoints automatically)
  app.use('/api', authenticate);
  app.use('/api', apiRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

