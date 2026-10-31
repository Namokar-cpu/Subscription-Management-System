# Brightloop API

The backend uses Express, TypeScript, PostgreSQL, and Prisma.

## Local setup

1. Start PostgreSQL and create the `brightloop` database.
2. Copy `.env.example` to `.env` and configure private values. Keep secrets out of Git and browser code.
3. From this folder run `npm install`, `npm run db:generate`, `npm run db:migrate`, and `npm run db:seed`.
4. Run `npm run dev`. The default API address is `http://localhost:4000`.

The Vite frontend defaults to `http://localhost:5173`; set `FRONTEND_ORIGIN` to that exact origin for local CORS.

## Routes

### Authentication and customer billing

- `GET /api/v1/health` — API and database health.
- `POST /api/v1/auth/register` — create a pending customer account and send a verification email.
- `GET /api/v1/auth/verify-email?token=...` — consume a single-use email verification link.
- `POST /api/v1/auth/resend-verification` — request a fresh verification email.
- `POST /api/v1/auth/login` and `GET /api/v1/auth/me` — issue and check a bearer access token.
- `GET /api/v1/catalog/products` and `GET /api/v1/catalog/plans` — list available catalog records.
- `GET /api/v1/subscriptions` — list subscriptions belonging to the signed-in customer.
- `POST /api/v1/subscriptions` — create a draft subscription from an available plan.
- `POST /api/v1/subscriptions/:subscriptionId/invoice` — create or return its first invoice.
- `GET /api/v1/invoices` and `GET /api/v1/invoices/:invoiceId` — read authorized invoice history and details.
- `GET /api/v1/invoices/:invoiceId/pdf` — generate and download the invoice PDF.
- `POST /api/v1/invoices/:invoiceId/order` — create or reuse a Razorpay order for the invoice balance.
- `POST /api/v1/payments/razorpay/verify` — verify the checkout signature and captured payment with Razorpay before recording it.

### Administrator and staff

All `/api/v1/admin/*` routes require an active ADMIN or STAFF bearer token.

- `GET /api/v1/admin/dashboard` — counts and totals from saved customers, invoices, subscriptions, payments, and attempts.
- `GET /api/v1/admin/integrations` — non-secret configured/not-configured status for Razorpay and Resend.
- `/api/v1/admin/customers` — paginated/searchable customer list, plus `POST` and `PATCH`.
- `/api/v1/admin/products` — paginated/searchable product list, plus `POST` and `PATCH`.
- `/api/v1/admin/plans` — paginated/searchable plan list, plus `POST` and `PATCH`; plan changes can select included active products through `productIds`.
- `GET /api/v1/admin/subscriptions` — paginated/searchable subscription records with an optional status filter.
- `GET /api/v1/admin/invoices` — paginated/searchable invoice records with an optional status filter.
- `GET /api/v1/admin/payments` — paginated/searchable verified payments.

List routes accept `page`, `pageSize` (1–100), and `search`; applicable routes also accept `status`. Request bodies are validated, and authorization is enforced by the API as well as the UI.

## Security and workflow notes

- Passwords are hashed with bcrypt. Access tokens are signed on the server. Login and email actions are rate limited.
- New customer accounts remain pending until email verification succeeds.
- Razorpay secrets remain in backend `.env`; the order amount comes from the invoice balance. The backend verifies the signature and checks Razorpay's captured payment before activating a subscription.
- Invoice PDFs are stored under `backend/storage/invoices/` during local development; this folder is excluded from Git.
- Keep Razorpay in Test Mode while developing. Use a verified sender domain and a public `PUBLIC_API_URL` before deploying verification emails.

## Not implemented yet

Quotations, user/role administration, organization settings, customer-to-user assignment, subscription cancellation/pause/resume, recurring billing workers, and automated failed-attempt updates are not implemented. No UI should treat these as live features.
