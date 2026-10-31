import { Router } from 'express';
import { prisma } from '../../database/prisma';
import { authenticate } from '../auth/authenticate';

export const catalogRouter = Router();

catalogRouter.get('/products', authenticate, async (_req, res, next) => {
  try {
    const products = await prisma.product.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        description: true,
        type: true,
        salesPrice: true,
        currency: true,
        variants: {
          where: { active: true },
          orderBy: { name: 'asc' },
          select: { id: true, name: true, priceAdjustment: true },
        },
      },
    });
    res.json({ data: products });
  } catch (error) {
    next(error);
  }
});

catalogRouter.get('/plans', authenticate, async (_req, res, next) => {
  try {
    const now = new Date();
    const plans = await prisma.plan.findMany({
      where: {
        active: true,
        AND: [
          { OR: [{ availableFrom: null }, { availableFrom: { lte: now } }] },
          { OR: [{ availableUntil: null }, { availableUntil: { gte: now } }] },
        ],
      },
      orderBy: [{ price: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        description: true,
        billingUnit: true,
        intervalCount: true,
        price: true,
        currency: true,
        minimumQuantity: true,
        allowPause: true,
        allowRenewal: true,
        availableFrom: true,
        availableUntil: true,
        products: {
          where: { product: { active: true } },
          orderBy: { product: { name: 'asc' } },
          select: {
            quantity: true,
            product: { select: { id: true, name: true, description: true, type: true } },
          },
        },
      },
    });
    res.json({ data: plans });
  } catch (error) {
    next(error);
  }
});
