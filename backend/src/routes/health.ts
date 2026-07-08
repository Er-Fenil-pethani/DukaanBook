import { Router } from 'express';
import { prisma } from '../config/prisma';

const router = Router();

router.get('/', async (_req, res) => {
  let dbConnected = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbConnected = true;
  } catch {
    dbConnected = false;
  }
  res.json({
    status: dbConnected ? 'ok' : 'degraded',
    dbConnected,
    timestamp: new Date().toISOString(),
  });
});

export default router;
