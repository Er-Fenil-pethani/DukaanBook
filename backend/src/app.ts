import express from 'express';
import cors from 'cors';
import path from 'path';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';
import posRoutes from './routes/pos';
import healthRoutes from './routes/health';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.use('/uploads', express.static(path.resolve(env.UPLOAD_DIR)));

  app.use('/api/v1/health', healthRoutes);
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/admin', adminRoutes);
  app.use('/api/v1/pos', posRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
