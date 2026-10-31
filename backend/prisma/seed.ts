import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { AccountStatus, PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  if (!email || !password || password.length < 16) {
    throw new Error('Set BOOTSTRAP_ADMIN_EMAIL and a BOOTSTRAP_ADMIN_PASSWORD of at least 16 characters before seeding.');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.upsert({
    where: { email },
    create: { email, passwordHash, role: Role.ADMIN, status: AccountStatus.ACTIVE },
    // Do not replace existing credentials or change an existing account's role.
    update: {},
  });
  console.log(`Bootstrap administrator is ready: ${email}`);

  const customer = await prisma.customer.upsert({
    where: { id: 'demo_customer_brightloop' },
    create: {
      id: 'demo_customer_brightloop',
      name: 'Aarav Mehta',
      companyName: 'Northstar Studio',
      billingEmail: 'billing@northstar.example',
      phone: '+91 90000 12345',
    },
    update: {},
  });

  const workspace = await prisma.product.upsert({
    where: { id: 'demo_product_workspace' },
    create: {
      id: 'demo_product_workspace',
      name: 'Subscription Workspace',
      description: 'Core workspace access for a customer account.',
      type: 'SOFTWARE',
      salesPrice: '999.00',
      costPrice: '250.00',
      currency: 'INR',
    },
    update: {},
  });

  const automation = await prisma.product.upsert({
    where: { id: 'demo_product_automation' },
    create: {
      id: 'demo_product_automation',
      name: 'Email Automation',
      description: 'Automated customer email workflows.',
      type: 'ADD_ON',
      salesPrice: '499.00',
      costPrice: '120.00',
      currency: 'INR',
    },
    update: {},
  });

  await prisma.productVariant.upsert({
    where: { productId_name: { productId: workspace.id, name: 'Additional user seat' } },
    create: {
      productId: workspace.id,
      name: 'Additional user seat',
      priceAdjustment: '299.00',
    },
    update: {},
  });

  const starterPlan = await prisma.plan.upsert({
    where: { id: 'demo_plan_starter_monthly' },
    create: {
      id: 'demo_plan_starter_monthly',
      name: 'Starter Monthly',
      description: 'Monthly plan with one workspace and optional add-ons.',
      billingUnit: 'MONTH',
      intervalCount: 1,
      price: '1499.00',
      currency: 'INR',
      minimumQuantity: 1,
      allowPause: true,
      allowRenewal: true,
      active: true,
    },
    update: {},
  });

  const growthPlan = await prisma.plan.upsert({
    where: { id: 'demo_plan_growth_annual' },
    create: {
      id: 'demo_plan_growth_annual',
      name: 'Growth Annual',
      description: 'Annual plan bundling workspace access and email automation.',
      billingUnit: 'YEAR',
      intervalCount: 1,
      price: '17990.00',
      currency: 'INR',
      minimumQuantity: 1,
      allowPause: false,
      allowRenewal: true,
      active: true,
    },
    update: {},
  });

  await prisma.planProduct.upsert({
    where: { planId_productId: { planId: starterPlan.id, productId: workspace.id } },
    create: { planId: starterPlan.id, productId: workspace.id, quantity: 1 },
    update: {},
  });
  await prisma.planProduct.upsert({
    where: { planId_productId: { planId: growthPlan.id, productId: workspace.id } },
    create: { planId: growthPlan.id, productId: workspace.id, quantity: 1 },
    update: {},
  });
  await prisma.planProduct.upsert({
    where: { planId_productId: { planId: growthPlan.id, productId: automation.id } },
    create: { planId: growthPlan.id, productId: automation.id, quantity: 1 },
    update: {},
  });

  await prisma.invoice.upsert({
    where: { id: 'demo_invoice_starter_001' },
    create: {
      id: 'demo_invoice_starter_001',
      number: 'DEMO-INV-0001',
      customerId: customer.id,
      status: 'SENT',
      currency: 'INR',
      customerSnapshot: {
        name: customer.name,
        companyName: customer.companyName,
        billingEmail: customer.billingEmail,
      },
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      subtotal: '1499.00',
      taxTotal: '0.00',
      discountTotal: '0.00',
      total: '1499.00',
      lines: {
        create: [{
          description: 'Starter Monthly plan - demo invoice',
          quantity: 1,
          unitPrice: '1499.00',
          taxRate: '0.0000',
          discount: '0.00',
          lineTotal: '1499.00',
        }],
      },
    },
    update: {},
  });

  console.log('Demo PostgreSQL data is ready: 1 customer, 2 products, 1 variant, 2 plans and 1 invoice.');
  console.log(`Demo customer id: ${customer.id}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => prisma.$disconnect());
