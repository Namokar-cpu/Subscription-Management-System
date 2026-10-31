import { randomUUID } from 'node:crypto';
import { Prisma, Role, SubscriptionStatus } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { HttpError } from '../../common/errors';
import { prisma } from '../../database/prisma';
import { authenticate, allowRoles } from '../auth/authenticate';

export const subscriptionsRouter = Router();

const createSubscriptionSchema = z.object({
  planId: z.string().trim().min(1).max(64),
});

subscriptionsRouter.post('/', authenticate, allowRoles(Role.CUSTOMER), async (req, res, next) => {
  try {
    const { planId } = createSubscriptionSchema.parse(req.body);
    const customerId = req.auth?.customerId;
    if (!customerId) throw new HttpError(403, 'A customer profile is required to start a subscription.');

    const subscription = await prisma.$transaction(async (tx) => {
      const now = new Date();
      const plan = await tx.plan.findFirst({
        where: {
          id: planId,
          active: true,
          AND: [
            { OR: [{ availableFrom: null }, { availableFrom: { lte: now } }] },
            { OR: [{ availableUntil: null }, { availableUntil: { gte: now } }] },
          ],
        },
        include: {
          products: {
            orderBy: { product: { name: 'asc' } },
            include: { product: true },
          },
        },
      });

      if (!plan) throw new HttpError(404, 'Plan not found or is not currently available.');
      if (plan.products.length === 0) throw new HttpError(409, 'This plan has no products configured.');
      if (plan.products.some((entry) => !entry.product.active)) {
        throw new HttpError(409, 'This plan includes a product that is currently unavailable.');
      }

      const planPrice = new Prisma.Decimal(plan.price);
      return tx.subscription.create({
        data: {
          number: `SUB-${randomUUID().replace(/-/g, '').slice(0, 20).toUpperCase()}`,
          customerId,
          planId: plan.id,
          status: SubscriptionStatus.DRAFT,
          currency: plan.currency,
          autoRenew: plan.allowRenewal,
          subtotal: planPrice,
          grandTotal: planPrice,
          lines: {
            create: {
              productName: plan.name,
              variantName: `${plan.intervalCount} ${plan.billingUnit.toLowerCase()} subscription plan`,
              quantity: 1,
              unitPrice: planPrice,
              lineTotal: planPrice,
            },
          },
        },
        select: {
          id: true,
          number: true,
          status: true,
          currency: true,
          subtotal: true,
          grandTotal: true,
          autoRenew: true,
          startDate: true,
          nextBillingDate: true,
          createdAt: true,
          plan: {
            select: {
              id: true,
              name: true,
              billingUnit: true,
              intervalCount: true,
              price: true,
              currency: true,
              products: {
                where: { product: { active: true } },
                orderBy: { product: { name: 'asc' } },
                select: { quantity: true, product: { select: { id: true, name: true, type: true } } },
              },
            },
          },
          lines: {
            select: { productName: true, quantity: true, unitPrice: true, lineTotal: true },
          },
        },
      });
    });

    res.status(201).json({ data: subscription, message: 'Subscription draft created. Complete payment to activate it.' });
  } catch (error) {
    next(error);
  }
});
