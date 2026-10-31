import { InvoiceStatus, Prisma, Role, SubscriptionStatus } from '@prisma/client';
import { Router } from 'express';
import { HttpError } from '../../common/errors';
import { prisma } from '../../database/prisma';
import { authenticate, allowRoles } from '../auth/authenticate';
import { addBillingInterval } from './subscription-period.service';

export const subscriptionInvoicesRouter = Router();

function invoiceResponse(invoice: {
  id: string;
  number: string;
  status: InvoiceStatus;
  currency: string;
  subtotal: Prisma.Decimal;
  taxTotal: Prisma.Decimal;
  discountTotal: Prisma.Decimal;
  total: Prisma.Decimal;
  dueDate: Date | null;
  periodStart: Date | null;
  periodEnd: Date | null;
  subscriptionId: string | null;
}, reused: boolean) {
  return {
    id: invoice.id,
    number: invoice.number,
    status: invoice.status,
    currency: invoice.currency,
    subtotal: invoice.subtotal,
    taxTotal: invoice.taxTotal,
    discountTotal: invoice.discountTotal,
    total: invoice.total,
    dueDate: invoice.dueDate,
    periodStart: invoice.periodStart,
    periodEnd: invoice.periodEnd,
    subscriptionId: invoice.subscriptionId,
    reused,
  };
}

subscriptionInvoicesRouter.post('/:subscriptionId/invoice', authenticate, allowRoles(Role.CUSTOMER), async (req, res, next) => {
  try {
    const customerId = req.auth?.customerId;
    if (!customerId) throw new HttpError(403, 'A customer profile is required to create an invoice.');

    const result = await prisma.$transaction(async (tx) => {
      const subscription = await tx.subscription.findUnique({
        where: { id: req.params.subscriptionId },
        include: { customer: true, plan: true },
      });
      if (!subscription || subscription.customerId !== customerId) {
        throw new HttpError(404, 'Subscription not found.');
      }

      const existingInvoice = await tx.invoice.findFirst({
        where: { subscriptionId: subscription.id },
      });
      if (existingInvoice) return { invoice: existingInvoice, reused: true };
      if (subscription.status !== SubscriptionStatus.DRAFT) {
        throw new HttpError(409, 'An invoice cannot be created for this subscription in its current status.');
      }

      const periodStart = subscription.createdAt;
      const periodEnd = addBillingInterval(periodStart, subscription.plan.billingUnit, subscription.plan.intervalCount);
      const total = new Prisma.Decimal(subscription.grandTotal);
      const invoice = await tx.invoice.create({
        data: {
          number: `INV-${periodStart.toISOString().slice(0, 10).replace(/-/g, '')}-${subscription.id.slice(-8).toUpperCase()}`,
          customerId: subscription.customerId,
          subscriptionId: subscription.id,
          status: InvoiceStatus.SENT,
          currency: subscription.currency,
          customerSnapshot: {
            name: subscription.customer.name,
            companyName: subscription.customer.companyName,
            billingEmail: subscription.customer.billingEmail,
            phone: subscription.customer.phone,
            taxNumber: subscription.customer.taxNumber,
          },
          periodStart,
          periodEnd,
          subtotal: subscription.subtotal,
          taxTotal: subscription.taxTotal,
          discountTotal: subscription.discountTotal,
          total,
          lines: {
            create: {
              description: `${subscription.plan.name} subscription`,
              quantity: 1,
              unitPrice: total,
              taxRate: 0,
              discount: 0,
              lineTotal: total,
            },
          },
        },
      });

      await tx.subscription.update({
        where: { id: subscription.id },
        data: { status: SubscriptionStatus.CONFIRMED },
      });
      return { invoice, reused: false };
    });

    res.status(result.reused ? 200 : 201).json({
      data: invoiceResponse(result.invoice, result.reused),
      message: result.reused ? 'The invoice for this subscription already exists.' : 'Invoice created and ready for payment.',
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      try {
        const customerId = req.auth?.customerId;
        const existingInvoice = await prisma.invoice.findFirst({
          where: { subscription: { id: req.params.subscriptionId, customerId: customerId ?? undefined } },
        });
        if (existingInvoice) {
          res.status(200).json({
            data: invoiceResponse(existingInvoice, true),
            message: 'The invoice for this subscription already exists.',
          });
          return;
        }
      } catch (lookupError) {
        next(lookupError);
        return;
      }
    }
    next(error);
  }
});
