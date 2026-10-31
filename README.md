# Brightloop — Subscription Management

Brightloop is a hackathon MVP for managing subscription plans, customer accounts, invoices, and payments in one workspace. Customers can choose an available plan and pay its invoice through Razorpay Checkout. Staff and admins can manage catalog records and review billing activity.

> This project is under active development. Some workflows listed below are incomplete; see [Current limitations](#current-limitations).

## What you can do

- Browse the public product page and create a customer account.
- Verify an account by email, then sign in to a protected customer workspace.
- Browse available plans, create a draft subscription and invoice, and pay using Razorpay Checkout.
- Review subscription and invoice history and download invoice PDFs.
- Use the staff/admin workspace to review dashboard metrics and manage customers, products, plans, subscriptions, invoices, and payments.
- Switch between dark and light themes.

## Technology

| Area | Stack |
| --- | --- |
| Frontend | React, Vite, React Router |
| API | Node.js, Express, TypeScript |
| Database | PostgreSQL, Prisma |
| Email verification | Resend |
| Online payments | Razorpay |

## Run locally

### Prerequisites

- Node.js 20 or later and npm
- Docker Desktop, or a local PostgreSQL 15+ server
- Optional for email and payment workflows: Resend and Razorpay test credentials

### 1. Start PostgreSQL

From `backend/`, start the bundled database service:

```bash
docker compose up -d database
```

This starts PostgreSQL on port `5432` with a local `brightloop` database. For a non-local database, update `DATABASE_URL` in `backend/.env` accordingly.

### 2. Configure and start the API

In a terminal at the repository root:

```bash
cd backend
```

Copy `.env.example` to `.env` and set a private `JWT_ACCESS_SECRET` of at least 32 characters. Set `DATABASE_URL` if you are not using the bundled local database. To enable the corresponding integrations, also configure `RESEND_API_KEY`, `EMAIL_FROM`, `PUBLIC_API_URL`, `RAZORPAY_KEY_ID`, and `RAZORPAY_KEY_SECRET`.

Then run:

```bash
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

The API listens at `http://localhost:4000`. The seed command creates the bootstrap admin and a small set of demo catalog and invoice records. Set `BOOTSTRAP_ADMIN_EMAIL` and a strong `BOOTSTRAP_ADMIN_PASSWORD` in `.env` before running it.

### 3. Configure and start the frontend

In a second terminal at the repository root:

```bash
cd frontend
```

Copy `.env.example` to `.env` if you need to change `VITE_API_BASE_URL`. For local development it defaults to `http://localhost:4000/api/v1`. Make sure the backend's `FRONTEND_ORIGIN` matches `http://localhost:5173`, then run:

```bash
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

### Optional dashboard sample data

To populate local dashboards with a larger set of visibly simulated records, run this from `backend/` after the standard seed:

```bash
npm run db:seed:demo
```

This command checks that `NODE_ENV=development` and `DATABASE_URL` point to the local `brightloop` database. Its sample payments are not real Razorpay transactions. Do not point it at production data.

## Main API routes

All routes are under `/api/v1`.

| Route | Purpose |
| --- | --- |
| `GET /health` | Check API and database health |
| `/auth/*` | Register, verify email, log in, and get the current user |
| `GET /catalog/products`, `GET /catalog/plans` | Browse available catalog items |
| `POST /subscriptions` | Create a customer subscription draft |
| `POST /subscriptions/:subscriptionId/invoice` | Create or retrieve its first invoice |
| `GET /invoices`, `GET /invoices/:invoiceId` | View authorized invoice records |
| `GET /invoices/:invoiceId/pdf` | Download an invoice PDF |
| `POST /invoices/:invoiceId/order` | Create or reuse a Razorpay order |
| `POST /payments/razorpay/verify` | Verify and record a captured payment |
| `/admin/*` | Staff/admin dashboard and management APIs |

See [backend/README.md](backend/README.md) for detailed route and configuration notes, and [frontend/README.md](frontend/README.md) for frontend-specific setup.

## Repository layout

```text
backend/
  prisma/       Database schema, migrations, and seed scripts
  src/          API routes, authentication, integrations, and services
frontend/
  src/          React pages, components, API clients, and styles
```

## Security notes

- Keep real credentials in local `.env` files. The repository ignores them; only `.env.example` templates belong in Git.
- Razorpay's secret key stays on the backend. Payment amounts are calculated from invoice balances, and successful checkout results are verified server-side.
- Email verification tokens are stored hashed and are single-use.
- Use Razorpay Test Mode keys for development. Do not treat simulated dashboard data as real payments.

## Current limitations

- Subscription cancellation, pause/resume, automated renewal billing, and background failed-payment handling are not implemented.
- Quotations, staff/user administration, organization settings, and customer-to-user account assignment are not implemented.
- Payment success metrics use recorded captured and failed attempts; pending attempts are excluded.
- Invoice PDFs are saved to local backend storage, which is not shared across multiple API servers.
- Landing page integrations are examples unless the workspace reports a configured integration. Privacy and terms links are drafts, not legal policies.
