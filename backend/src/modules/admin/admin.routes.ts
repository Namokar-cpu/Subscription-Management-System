import { BillingUnit, InvoiceStatus, PaymentAttemptStatus, Prisma, Role, SubscriptionStatus } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { HttpError } from '../../common/errors';
import { env } from '../../config/env';
import { prisma } from '../../database/prisma';
import { authenticate, allowRoles } from '../auth/authenticate';

export const adminRouter = Router();
adminRouter.use(authenticate, allowRoles(Role.ADMIN, Role.STAFF));

const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().max(160).optional(),
  status: z.string().trim().max(40).optional(),
});
const customerSchema = z.object({ name: z.string().trim().min(1).max(160), companyName: z.string().trim().max(160).nullable().optional(), phone: z.string().trim().max(40).nullable().optional(), billingEmail: z.string().email().max(254).nullable().optional(), taxNumber: z.string().trim().max(80).nullable().optional() });
const productSchema = z.object({ name: z.string().trim().min(1).max(160), description: z.string().trim().max(1000).nullable().optional(), type: z.string().trim().max(80).nullable().optional(), salesPrice: z.coerce.number().min(0).max(1_000_000_000), currency: z.string().length(3).default('INR'), active: z.boolean().default(true) });
const planSchema = z.object({ name: z.string().trim().min(1).max(160), description: z.string().trim().max(1000).nullable().optional(), billingUnit: z.nativeEnum(BillingUnit), intervalCount: z.coerce.number().int().min(1).max(120).default(1), price: z.coerce.number().min(0).max(1_000_000_000), currency: z.string().length(3).default('INR'), minimumQuantity: z.coerce.number().int().min(1).max(10000).default(1), allowPause: z.boolean().default(false), allowRenewal: z.boolean().default(true), active: z.boolean().default(true), productIds: z.array(z.string().min(1)).max(100).optional() });

function pageResult<T>(items: T[], total: number, page: number, pageSize: number) {
  return { data: items, pagination: { page, pageSize, total, pageCount: Math.ceil(total / pageSize) } };
}

adminRouter.get('/dashboard', async (_req, res, next) => {
  try {
    const now = new Date();
    const monthFrom = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const upcomingUntil = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const [activeSubscriptions, customerCount, productCount, activePlanCount, allActiveSubs, invoices, upcomingRenewals, attempts, recentPayments, revenuePayments, subscriptionStatuses] = await Promise.all([
      prisma.subscription.count({ where: { status: SubscriptionStatus.ACTIVE } }),
      prisma.customer.count(),
      prisma.product.count({ where: { active: true } }),
      prisma.plan.count({ where: { active: true } }),
      prisma.subscription.findMany({ where: { status: SubscriptionStatus.ACTIVE }, select: { planId: true, grandTotal: true, currency: true, plan: { select: { name: true, billingUnit: true, intervalCount: true } } } }),
      prisma.invoice.findMany({ where: { status: { notIn: [InvoiceStatus.PAID, InvoiceStatus.VOID, InvoiceStatus.CANCELLED] } }, select: { total: true, payments: { select: { amount: true } } } }),
      prisma.subscription.count({ where: { status: SubscriptionStatus.ACTIVE, nextBillingDate: { gte: now, lte: upcomingUntil } } }),
      prisma.paymentAttempt.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.payment.findMany({ orderBy: { paidAt: 'desc' }, take: 8, include: { invoice: { select: { number: true, customer: { select: { name: true, companyName: true } } } } } }),
      prisma.payment.findMany({ where: { paidAt: { gte: monthFrom } }, select: { amount: true, paidAt: true, invoice: { select: { currency: true } } } }),
      prisma.subscription.groupBy({ by: ['status'], _count: { _all: true } }),
    ]);

    const mrrByCurrency = new Map<string, Prisma.Decimal>();
    for (const subscription of allActiveSubs) {
      const interval = Math.max(1, subscription.plan.intervalCount);
      const total = new Prisma.Decimal(subscription.grandTotal);
      const monthlyFactor: Record<BillingUnit, number> = { DAY: 30.4375, WEEK: 52 / 12, MONTH: 1, YEAR: 1 / 12 };
      const monthly = total.mul(monthlyFactor[subscription.plan.billingUnit]).div(interval);
      mrrByCurrency.set(subscription.currency, (mrrByCurrency.get(subscription.currency) ?? new Prisma.Decimal(0)).add(monthly));
    }
    const outstandingInvoices = invoices.filter((invoice) => {
      const paid = invoice.payments.reduce((sum, payment) => sum.add(payment.amount), new Prisma.Decimal(0));
      return new Prisma.Decimal(invoice.total).minus(paid).greaterThan(0);
    }).length;
    const captured = attempts.find((attempt) => attempt.status === PaymentAttemptStatus.CAPTURED)?._count._all ?? 0;
    const failed = attempts.find((attempt) => attempt.status === PaymentAttemptStatus.FAILED)?._count._all ?? 0;
    const decidedAttempts = captured + failed;
    const monthKeys = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
      return { key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`, label: date.toLocaleString('en', { month: 'short' }) };
    });
    const revenueByMonth = monthKeys.map(({ key, label }) => {
      const values: Record<string, number> = {};
      for (const payment of revenuePayments) {
        const paymentKey = `${payment.paidAt.getFullYear()}-${String(payment.paidAt.getMonth() + 1).padStart(2, '0')}`;
        if (paymentKey === key) {
          const currency = payment.invoice.currency;
          values[currency] = (values[currency] ?? 0) + Number(payment.amount);
        }
      }
      return { month: label, values };
    });
    const planRevenue = new Map<string, { planId: string; plan: string; currency: string; amount: Prisma.Decimal }>();
    for (const subscription of allActiveSubs) {
      const key = `${subscription.planId}:${subscription.currency}`;
      const current = planRevenue.get(key);
      planRevenue.set(key, { planId: subscription.planId, plan: subscription.plan.name, currency: subscription.currency, amount: (current?.amount ?? new Prisma.Decimal(0)).add(subscription.grandTotal) });
    }

    res.json({ data: {
      metrics: {
        activeSubscriptions,
        activeCustomers: customerCount,
        activeProducts: productCount,
        activePlans: activePlanCount,
        outstandingInvoices,
        upcomingRenewals,
        paymentSuccessRate: decidedAttempts ? captured / decidedAttempts : null,
        mrrByCurrency: Array.from(mrrByCurrency, ([currency, amount]) => ({ currency, amount })),
      },
      revenueByMonth,
      revenueByPlan: Array.from(planRevenue.values()),
      subscriptionStatuses: subscriptionStatuses.map((item) => ({ status: item.status, count: item._count._all })),
      recentPayments: recentPayments.map((payment) => ({ id: payment.id, amount: payment.amount, method: payment.method, reference: payment.reference, paidAt: payment.paidAt, invoice: payment.invoice })),
      integrationStatus: { razorpayConfigured: Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET), emailConfigured: Boolean(env.RESEND_API_KEY) },
    } });
  } catch (error) { next(error); }
});

adminRouter.get('/customers', async (req, res, next) => {
  try {
    const { page, pageSize, search } = listQuery.parse(req.query);
    const where: Prisma.CustomerWhereInput = search ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { companyName: { contains: search, mode: 'insensitive' } }, { billingEmail: { contains: search, mode: 'insensitive' } }] } : {};
    const [items, total] = await Promise.all([
      prisma.customer.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: 'desc' }, include: { _count: { select: { subscriptions: true, invoices: true } } } }),
      prisma.customer.count({ where }),
    ]);
    res.json(pageResult(items.map(({ id, name, companyName, phone, billingEmail, taxNumber, createdAt, _count }) => ({ id, name, companyName, phone, billingEmail, taxNumber, createdAt, subscriptionCount: _count.subscriptions, invoiceCount: _count.invoices })), total, page, pageSize));
  } catch (error) { next(error); }
});

adminRouter.post('/customers', async (req, res, next) => {
  try {
    const input = customerSchema.parse(req.body);
    const customer = await prisma.customer.create({ data: input });
    res.status(201).json({ data: customer });
  } catch (error) { next(error); }
});

adminRouter.patch('/customers/:customerId', async (req, res, next) => {
  try {
    const input = customerSchema.partial().parse(req.body);
    if (!Object.keys(input).length) throw new HttpError(400, 'Provide at least one customer field to update.');
    const customer = await prisma.customer.update({ where: { id: req.params.customerId }, data: input });
    res.json({ data: customer });
  } catch (error) { next(error); }
});

adminRouter.get('/products', async (req, res, next) => {
  try {
    const { page, pageSize, search, status } = listQuery.parse(req.query);
    const where: Prisma.ProductWhereInput = {
      ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
      ...(status === 'active' ? { active: true } : status === 'inactive' ? { active: false } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.product.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { name: 'asc' }, include: { variants: { orderBy: { name: 'asc' } } } }),
      prisma.product.count({ where }),
    ]);
    res.json(pageResult(items, total, page, pageSize));
  } catch (error) { next(error); }
});

adminRouter.post('/products', async (req, res, next) => {
  try {
    const input = productSchema.parse(req.body);
    const product = await prisma.product.create({ data: { ...input, salesPrice: new Prisma.Decimal(input.salesPrice) } });
    res.status(201).json({ data: product });
  } catch (error) { next(error); }
});

adminRouter.patch('/products/:productId', async (req, res, next) => {
  try {
    const input = productSchema.partial().parse(req.body);
    if (!Object.keys(input).length) throw new HttpError(400, 'Provide at least one product field to update.');
    const product = await prisma.product.update({ where: { id: req.params.productId }, data: { ...input, ...(input.salesPrice !== undefined ? { salesPrice: new Prisma.Decimal(input.salesPrice) } : {}) } });
    res.json({ data: product });
  } catch (error) { next(error); }
});

adminRouter.get('/plans', async (req, res, next) => {
  try {
    const { page, pageSize, search, status } = listQuery.parse(req.query);
    const where: Prisma.PlanWhereInput = {
      ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
      ...(status === 'active' ? { active: true } : status === 'inactive' ? { active: false } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.plan.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: [{ price: 'asc' }, { name: 'asc' }], include: { products: { include: { product: { select: { id: true, name: true, active: true } } } }, _count: { select: { subscriptions: true } } } }),
      prisma.plan.count({ where }),
    ]);
    res.json(pageResult(items.map(({ _count, ...plan }) => ({ ...plan, subscriptionCount: _count.subscriptions })), total, page, pageSize));
  } catch (error) { next(error); }
});

adminRouter.get('/invoices', async (req, res, next) => {
  try {
    const { page, pageSize, search, status } = listQuery.parse(req.query);
    const where: Prisma.InvoiceWhereInput = {
      ...(status && Object.values(InvoiceStatus).includes(status as InvoiceStatus) ? { status: status as InvoiceStatus } : {}),
      ...(search ? { OR: [{ number: { contains: search, mode: 'insensitive' } }, { customer: { name: { contains: search, mode: 'insensitive' } } }] } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.invoice.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: 'desc' }, include: { customer: { select: { id: true, name: true, companyName: true } }, subscription: { select: { number: true, plan: { select: { name: true } } } }, payments: { select: { amount: true } } } }),
      prisma.invoice.count({ where }),
    ]);
    const data = items.map(({ payments, ...invoice }) => {
      const paid = payments.reduce((sum, payment) => sum.add(payment.amount), new Prisma.Decimal(0));
      const balanceDue = new Prisma.Decimal(invoice.total).minus(paid);
      return { ...invoice, balanceDue: balanceDue.greaterThan(0) ? balanceDue : new Prisma.Decimal(0) };
    });
    res.json(pageResult(data, total, page, pageSize));
  } catch (error) { next(error); }
});

adminRouter.post('/plans', async (req, res, next) => {
  try {
    const input = planSchema.parse(req.body);
    const { productIds = [], ...values } = input;
    if (!productIds.length) throw new HttpError(400, 'Choose at least one product for this plan.');
    const productCount = await prisma.product.count({ where: { id: { in: productIds }, active: true } });
    if (productCount !== new Set(productIds).size) throw new HttpError(400, 'Choose distinct active products for this plan.');
    const plan = await prisma.plan.create({ data: { ...values, price: new Prisma.Decimal(values.price), products: { create: productIds.map((productId) => ({ productId, quantity: 1 })) } } });
    res.status(201).json({ data: plan });
  } catch (error) { next(error); }
});

adminRouter.patch('/plans/:planId', async (req, res, next) => {
  try {
    const input = planSchema.partial().parse(req.body);
    if (!Object.keys(input).length) throw new HttpError(400, 'Provide at least one plan field to update.');
    const { productIds, ...values } = input;
    if (productIds && productIds.length) {
      const productCount = await prisma.product.count({ where: { id: { in: productIds }, active: true } });
      if (productCount !== new Set(productIds).size) throw new HttpError(400, 'Choose distinct active products for this plan.');
    }
    const plan = await prisma.$transaction(async (tx) => {
      if (productIds) {
        await tx.planProduct.deleteMany({ where: { planId: req.params.planId } });
        if (productIds.length) await tx.planProduct.createMany({ data: productIds.map((productId) => ({ planId: req.params.planId, productId, quantity: 1 })) });
      }
      return tx.plan.update({ where: { id: req.params.planId }, data: { ...values, ...(values.price !== undefined ? { price: new Prisma.Decimal(values.price) } : {}) } });
    });
    res.json({ data: plan });
  } catch (error) { next(error); }
});

adminRouter.get('/subscriptions', async (req, res, next) => {
  try {
    const { page, pageSize, search, status } = listQuery.parse(req.query);
    const where: Prisma.SubscriptionWhereInput = {
      ...(status && Object.values(SubscriptionStatus).includes(status as SubscriptionStatus) ? { status: status as SubscriptionStatus } : {}),
      ...(search ? { OR: [{ number: { contains: search, mode: 'insensitive' } }, { customer: { name: { contains: search, mode: 'insensitive' } } }, { plan: { name: { contains: search, mode: 'insensitive' } } }] } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.subscription.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: 'desc' }, include: { customer: { select: { id: true, name: true, billingEmail: true } }, plan: { select: { id: true, name: true, billingUnit: true, intervalCount: true } } } }),
      prisma.subscription.count({ where }),
    ]);
    res.json(pageResult(items, total, page, pageSize));
  } catch (error) { next(error); }
});

adminRouter.get('/payments', async (req, res, next) => {
  try {
    const { page, pageSize, search } = listQuery.parse(req.query);
    const where: Prisma.PaymentWhereInput = search ? { OR: [{ reference: { contains: search, mode: 'insensitive' } }, { invoice: { number: { contains: search, mode: 'insensitive' } } }, { invoice: { customer: { name: { contains: search, mode: 'insensitive' } } } }] } : {};
    const [items, total] = await Promise.all([
      prisma.payment.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { paidAt: 'desc' }, include: { invoice: { select: { id: true, number: true, currency: true, customer: { select: { id: true, name: true, companyName: true } } } } } }),
      prisma.payment.count({ where }),
    ]);
    res.json(pageResult(items, total, page, pageSize));
  } catch (error) { next(error); }
});

adminRouter.get('/integrations', (_req, res) => {
  res.json({ data: [
    { id: 'razorpay', name: 'Razorpay', category: 'Payments', status: env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET ? 'configured' : 'not configured', detail: 'Hosted checkout and server-side payment verification.' },
    { id: 'resend', name: 'Resend', category: 'Email', status: env.RESEND_API_KEY ? 'configured' : 'not configured', detail: 'Account verification email delivery.' },
  ] });
});
