import { Router } from 'express';
import { prisma } from '../../database/prisma';

export const healthRouter = Router();
healthRouter.get('/', async (_req, res) => {
  await prisma.$queryRaw`SELECT 1`;
  res.json({ data: { status: 'ok', database: 'connected' } });
});
