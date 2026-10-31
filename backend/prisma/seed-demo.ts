import 'dotenv/config';
import {
  InvoiceStatus,
  PaymentMethod,
  Prisma,
  PrismaClient,
  SubscriptionStatus,
} from '@prisma/client';

const prisma = new PrismaClient();
const DEMO_PREFIX = 'demo500_';
const SAMPLE_COUNT = 500;

function assertLocalDevelopmentDatabase() {
  const urlValue = process.env.DATABASE_URL;
  if (process.env.NODE_ENV !== 'development' || !urlValue) {
    throw new Error('Demo data can only be added when NODE_ENV=development and DATABASE_URL is set.');
  }

  const url = new URL(urlValue);
  const databaseName = decodeURIComponent(url.pathname.replace(/^\//, ''));
  if (!['localhost', '127.0.0.1', '::1'].includes(url.hostname) || databaseName !== 'brightloop') {
    throw new Error('Demo data is restricted to the local brightloop database. No records were created.');
  }
}

function dateMonthsAgo(months: number, day: number) {
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  date.setDate(day);
  date.setHours(12, 0, 0, 0);
  return date;
}

function money(value: Prisma.Decimal | string | number) {
  return new Prisma.Decimal(value).toDecimalPlaces(2);
}

async function main() {
  assertLocalDevelopmentDatabase();

  const [plans, products] = await Promise.all([
    prisma.plan.findMany({ where: { active: true }, orderBy: { createdAt: 'asc' }, take: 2 }),
    prisma.product.findMany({ where: { active: true }, orderBy: { createdAt: 'asc' }, take: 1 }),
  ]);
  if (plans.length === 0 || products.length === 0) {
    throw new Error('Create at least one active plan and product first by running npm run db:seed.');
  }

  const givenNames = ['Aarav', 'Diya', 'Ishaan', 'Anaya', 'Kabir', 'Meera', 'Vivaan', 'Aadhya', 'Arjun', 'Sara'];
  const surnames = ['Shah', 'Patel', 'Rao', 'Mehta', 'Kapoor', 'Nair', 'Iyer', 'Desai', 'Joshi', 'Khan'];
  const now = new Date();
  const customers = Array.from({ length: 100 }, (_, index) => {
    const serial = String(index + 1).padStart(3, '0');
    return {
      id: `${DEMO_PREFIX}customer_${serial}`,
      name: `${givenNames[index % givenNames.length]} ${surnames[Math.floor(index / 10) % surnames.length]}`,
      companyName: `Demo Company ${serial}`,
      phone: `+91 90000 ${String(10000 + index).slice(-5)}`,
      billingEmail: `customer.${serial}@demo.brightloop.test`,
      createdAt: dateMonthsAgo((index % 6), (index % 27) + 1),
      updatedAt: now,
    };
  });
  await prisma.customer.createMany({ data: customers, skipDuplicates: true });

  const subscriptions = customers.map((customer, index) => {
    const serial = String(index + 1).padStart(3, '0');
    const plan = plans[index % plans.length];
    const price = money(plan.price);
    const createdAt = dateMonthsAgo(index % 6, (index % 27) + 1);
    const status = index < 70
      ? SubscriptionStatus.ACTIVE
      : index < 85
        ? SubscriptionStatus.CONFIRMED
        : SubscriptionStatus.DRAFT;
    const active = status === SubscriptionStatus.ACTIVE;
    const expiryDate = active ? new Date(createdAt.getTime() + 365 * 24 * 60 * 60 * 1000) : null;
    return {
      id: `${DEMO_PREFIX}subscription_${serial}`,
      number: `DEMO-SUB-${serial}`,
      customerId: customer.id,
      planId: plan.id,
      status,
      startDate: active ? createdAt : null,
      expiryDate,
      nextBillingDate: active ? new Date(now.getTime() + ((index % 30) + 1) * 24 * 60 * 60 * 1000) : null,
      autoRenew: true,
      currency: plan.currency,
      subtotal: price,
      taxTotal: new Prisma.Decimal(0),
      discountTotal: new Prisma.Decimal(0),
      grandTotal: price,
      createdAt,
      updatedAt: now,
    };
  });
  await prisma.subscription.createMany({ data: subscriptions, skipDuplicates: true });
  await prisma.subscriptionLine.createMany({
    data: subscriptions.map((subscription, index) => ({
      id: `${DEMO_PREFIX}subline_${String(index + 1).padStart(3, '0')}`,
      subscriptionId: subscription.id,
      productName: plans[index % plans.length].name,
      variantName: 'Simulated demo subscription',
      quantity: 1,
      unitPrice: subscription.grandTotal,
      taxRate: new Prisma.Decimal(0),
      discount: new Prisma.Decimal(0),
      lineTotal: subscription.grandTotal,
    })),
    skipDuplicates: true,
  });

  const invoices: Prisma.InvoiceCreateManyInput[] = [];
  const invoiceLineRows: Prisma.InvoiceLineCreateManyInput[] = [];
  const paymentRows: Prisma.PaymentCreateManyInput[] = [];

  function addInvoice(index: number, customerIndex: number, subscriptionIndex: number | null, state: 'paid' | 'partial' | 'open') {
    const serial = String(index + 1).padStart(3, '0');
    const customer = customers[customerIndex];
    const total = money(plans[customerIndex % plans.length].price);
    const createdAt = dateMonthsAgo(index % 6, (index % 27) + 1);
    const dueDate = state === 'open' && index % 2 === 0
      ? dateMonthsAgo(1, (index % 27) + 1)
      : new Date(createdAt.getTime() + 14 * 24 * 60 * 60 * 1000);
    const status = state === 'paid'
      ? InvoiceStatus.PAID
      : state === 'partial'
        ? InvoiceStatus.PARTIALLY_PAID
        : dueDate < now
          ? InvoiceStatus.OVERDUE
          : InvoiceStatus.SENT;
    const invoiceId = `${DEMO_PREFIX}invoice_${serial}`;
    invoices.push({
      id: invoiceId,
      number: `DEMO-INV-${serial}`,
      customerId: customer.id,
      subscriptionId: subscriptionIndex === null ? null : subscriptions[subscriptionIndex].id,
      status,
      currency: plans[customerIndex % plans.length].currency,
      customerSnapshot: {
        name: customer.name,
        companyName: customer.companyName,
        billingEmail: customer.billingEmail,
      },
      periodStart: subscriptionIndex === null ? null : createdAt,
      periodEnd: subscriptionIndex === null ? null : new Date(createdAt.getTime() + 30 * 24 * 60 * 60 * 1000),
      dueDate,
      subtotal: total,
      taxTotal: new Prisma.Decimal(0),
      discountTotal: new Prisma.Decimal(0),
      total,
      createdAt,
    });
    invoiceLineRows.push({
      id: `${DEMO_PREFIX}invline_${serial}`,
      invoiceId,
      description: `Simulated demo invoice ${serial}`,
      quantity: 1,
      unitPrice: total,
      taxRate: new Prisma.Decimal(0),
      discount: new Prisma.Decimal(0),
      lineTotal: total,
    });

    const splitAmounts = state === 'paid' ? [total] : state === 'partial' ? [money(total.mul('0.3')), money(total.mul('0.2'))] : [];
    splitAmounts.forEach((amount, part) => {
      paymentRows.push({
        id: `${DEMO_PREFIX}payment_${String(paymentRows.length + 1).padStart(3, '0')}`,
        invoiceId,
        amount,
        method: index % 2 === 0 ? PaymentMethod.BANK_TRANSFER : PaymentMethod.CASH,
        reference: `DEMO-PAY-${serial}-${part + 1}`,
        note: 'SIMULATED DEMO DATA — not a real payment; no Razorpay transaction occurred.',
        paidAt: createdAt,
        createdAt,
      });
    });
  }

  // One invoice for each of the 100 demo subscriptions.
  for (let index = 0; index < 100; index += 1) {
    addInvoice(index, index, index, index < 70 ? 'paid' : index < 85 ? 'partial' : 'open');
  }
  // Fifty additional one-off demo invoices to show list pagination and mixed billing states.
  for (let index = 100; index < 150; index += 1) {
    const extraIndex = index - 100;
    addInvoice(index, extraIndex, null, extraIndex < 30 ? 'paid' : extraIndex < 40 ? 'partial' : 'open');
  }

  await prisma.invoice.createMany({ data: invoices, skipDuplicates: true });
  await prisma.invoiceLine.createMany({ data: invoiceLineRows, skipDuplicates: true });
  await prisma.payment.createMany({ data: paymentRows, skipDuplicates: true });

  const counts = await Promise.all([
    prisma.customer.count({ where: { id: { startsWith: DEMO_PREFIX } } }),
    prisma.subscription.count({ where: { id: { startsWith: DEMO_PREFIX } } }),
    prisma.invoice.count({ where: { id: { startsWith: DEMO_PREFIX } } }),
    prisma.payment.count({ where: { id: { startsWith: DEMO_PREFIX } } }),
  ]);
  console.log(`Demo dataset ready: ${counts.reduce((sum, count) => sum + count, 0)} demo records: ${counts[0]} customers, ${counts[1]} subscriptions, ${counts[2]} invoices, ${counts[3]} simulated payments.`);
  console.log('Demo payments are marked SIMULATED and are not Razorpay transactions. All generated customer emails use the reserved .test domain.');
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => prisma.$disconnect());
