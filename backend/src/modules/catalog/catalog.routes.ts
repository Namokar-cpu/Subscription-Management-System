import { randomUUID } from 'node:crypto';
import { InvoiceStatus, Prisma, Role } from '@prisma/client';
import { Router } from 'express';
import { prisma } from '../../database/prisma';
import { authenticate } from '../auth/authenticate';
import { HttpError } from '../../common/errors';

export const catalogRouter = Router();

catalogRouter.post('/products/:productId/invoice', authenticate, async (req, res, next) => {
  try {
    if (req.auth?.role !== Role.CUSTOMER) throw new HttpError(403, 'Sign in with a customer account to purchase a product.');
    const customerId = req.auth.customerId;
    if (!customerId) throw new HttpError(403, 'A customer profile is required to purchase a product.');

    const [product, customer] = await Promise.all([
      prisma.product.findFirst({ where: { id: req.params.productId, active: true } }),
      prisma.customer.findUnique({ where: { id: customerId } }),
    ]);
    if (!product) throw new HttpError(404, 'Product not found or is not currently available.');
    if (!customer) throw new HttpError(403, 'A customer profile is required to purchase a product.');
    if (product.currency !== 'INR') throw new HttpError(400, 'Online checkout currently supports INR products only.');

    const invoice = await prisma.invoice.create({
      data: {
        number: `INV-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase()}`,
        customerId,
        status: InvoiceStatus.SENT,
        currency: product.currency,
        customerSnapshot: {
          name: customer.name,
          companyName: customer.companyName,
          billingEmail: customer.billingEmail,
          phone: customer.phone,
        },
        subtotal: product.salesPrice,
        taxTotal: new Prisma.Decimal(0),
        discountTotal: new Prisma.Decimal(0),
        total: product.salesPrice,
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        lines: {
          create: {
            description: product.name,
            quantity: 1,
            unitPrice: product.salesPrice,
            taxRate: new Prisma.Decimal(0),
            discount: new Prisma.Decimal(0),
            lineTotal: product.salesPrice,
          },
        },
      },
      select: { id: true, number: true, total: true, currency: true },
    });

    res.status(201).json({ data: invoice, message: 'Product invoice is ready for Razorpay checkout.' });
  } catch (error) {
    next(error);
  }
});

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
