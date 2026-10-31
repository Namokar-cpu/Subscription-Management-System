import { createHmac, timingSafeEqual } from 'node:crypto';
import { InvoiceStatus, PaymentAttemptStatus, PaymentMethod, Prisma } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { HttpError } from '../../common/errors';
import { prisma } from '../../database/prisma';
import { authenticate } from '../auth/authenticate';
import { createRazorpayOrder, fetchRazorpayPayment, getRazorpayKeyId, getRazorpaySecret } from './razorpay.client';

export const razorpayRouter = Router();
razorpayRouter.use(authenticate);

const verifySchema = z.object({
  invoiceId: z.string().min(1),
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().regex(/^[a-f0-9]{64}$/i),
});
const payableStatuses = new Set<InvoiceStatus>([
  InvoiceStatus.CONFIRMED,
  InvoiceStatus.SENT,
  InvoiceStatus.OVERDUE,
  InvoiceStatus.PARTIALLY_PAID,
]);

function assertInvoiceAccess(req: Express.Request, customerId: string) {
  if (req.auth?.role === 'CUSTOMER' && req.auth.customerId !== customerId) {
    throw new HttpError(404, 'Invoice not found.');
  }
}

function signatureIsValid(orderId: string, paymentId: string, signature: string) {
  const expected = createHmac('sha256', getRazorpaySecret()).update(`${orderId}|${paymentId}`).digest();
  const supplied = Buffer.from(signature, 'hex');
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

razorpayRouter.post('/invoices/:invoiceId/order', async (req, res, next) => {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.invoiceId },
      include: { payments: true },
    });
    if (!invoice) throw new HttpError(404, 'Invoice not found.');
    assertInvoiceAccess(req, invoice.customerId);
    if (!payableStatuses.has(invoice.status)) {
      throw new HttpError(409, 'This invoice is not currently payable.');
    }
    if (invoice.currency !== 'INR') throw new HttpError(400, 'Online checkout currently supports INR invoices only.');

    const paid = invoice.payments.reduce((sum, payment) => sum.add(payment.amount), new Prisma.Decimal(0));
    const due = new Prisma.Decimal(invoice.total).minus(paid);
    if (!due.greaterThan(0)) throw new HttpError(409, 'This invoice has no balance due.');
    const amountPaise = due.mul(100).toNumber();
    if (!Number.isSafeInteger(amountPaise)) throw new HttpError(400, 'Invoice amount is outside the supported range.');

    const order = await createRazorpayOrder({
      amount: amountPaise,
      currency: invoice.currency,
      receipt: invoice.number,
      invoiceId: invoice.id,
    });
    await prisma.paymentAttempt.create({
      data: {
        invoiceId: invoice.id,
        providerOrderId: order.id,
        amount: due,
        currency: invoice.currency,
      },
    });

    res.status(201).json({
      data: {
        keyId: getRazorpayKeyId(),
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        invoiceNumber: invoice.number,
      },
    });
  } catch (error) { next(error); }
});

razorpayRouter.post('/razorpay/verify', async (req, res, next) => {
  try {
    const input = verifySchema.parse(req.body);
    const attempt = await prisma.paymentAttempt.findUnique({
      where: { providerOrderId: input.razorpay_order_id },
      include: { invoice: true },
    });
    if (!attempt || attempt.invoiceId !== input.invoiceId) throw new HttpError(404, 'Payment attempt not found.');
    assertInvoiceAccess(req, attempt.invoice.customerId);
    if (!signatureIsValid(input.razorpay_order_id, input.razorpay_payment_id, input.razorpay_signature)) {
      throw new HttpError(400, 'Payment signature is invalid.');
    }

    const existing = await prisma.payment.findUnique({ where: { providerPaymentId: input.razorpay_payment_id } });
    if (existing) {
      if (existing.invoiceId !== attempt.invoiceId) throw new HttpError(409, 'Payment is already linked to another invoice.');
      res.json({ data: { paymentId: existing.id, invoiceId: existing.invoiceId, status: 'recorded' } });
      return;
    }

    const gatewayPayment = await fetchRazorpayPayment(input.razorpay_payment_id);
    const expectedPaise = new Prisma.Decimal(attempt.amount).mul(100).toNumber();
    if (gatewayPayment.order_id !== attempt.providerOrderId || gatewayPayment.amount !== expectedPaise || gatewayPayment.currency !== attempt.currency) {
      throw new HttpError(400, 'Payment details do not match this invoice.');
    }
    if (gatewayPayment.status !== 'captured') throw new HttpError(409, 'Payment is not captured yet.');

    const result = await prisma.$transaction(async (tx) => {
      const payments = await tx.payment.findMany({ where: { invoiceId: attempt.invoiceId }, select: { amount: true } });
      const paidBefore = payments.reduce((sum, payment) => sum.add(payment.amount), new Prisma.Decimal(0));
      const paidAfter = paidBefore.add(attempt.amount);
      const invoiceStatus = paidAfter.greaterThanOrEqualTo(attempt.invoice.total)
        ? InvoiceStatus.PAID
        : InvoiceStatus.PARTIALLY_PAID;

      const payment = await tx.payment.create({
        data: {
          invoiceId: attempt.invoiceId,
          amount: attempt.amount,
          method: PaymentMethod.RAZORPAY,
          reference: input.razorpay_payment_id,
          providerPaymentId: input.razorpay_payment_id,
        },
      });
      await tx.paymentAttempt.update({
        where: { id: attempt.id },
        data: { status: PaymentAttemptStatus.CAPTURED, providerPaymentId: input.razorpay_payment_id },
      });
      await tx.invoice.update({ where: { id: attempt.invoiceId }, data: { status: invoiceStatus } });
      return { payment, invoiceStatus };
    });

    res.json({ data: { paymentId: result.payment.id, invoiceId: attempt.invoiceId, status: result.invoiceStatus } });
  } catch (error) { next(error); }
});
