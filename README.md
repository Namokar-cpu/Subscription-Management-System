# Brightloop Subscription Management

Brightloop is a subscription and billing workspace built with React, Vite, Express, TypeScript, PostgreSQL, and Prisma. The website follows the supplied design reference and connects the customer purchase flow and supported business screens to the local API.

## Start locally

### Backend

1. Start PostgreSQL and confirm the `brightloop` database is available.
2. In `backend/`, create `.env` from `.env.example` if needed. Keep real credentials only in `.env`; never commit it.
3. Run `npm install` if dependencies are not installed.
4. Run `npm run db:generate`, `npm run db:migrate`, and `npm run db:seed` as needed.
5. Run `npm run dev`. The API defaults to `http://localhost:4000`.

### Frontend

1. In `frontend/`, create `.env` from `.env.example` if needed. The default API URL is `http://localhost:4000/api/v1`.
2. Confirm `backend/.env` has `FRONTEND_ORIGIN=http://localhost:5173`.
3. Run `npm install`, then `npm run dev` from `frontend/`.
4. Open `http://localhost:5173`.

New customer accounts require clicking the verification link sent by Resend before login. Subscription checkout uses Razorpay; use Test Mode keys while developing. Razorpay's secret key remains on the backend.

## Implemented

- Responsive public landing page based on the supplied wireframe.
- Registration, email verification instructions, login, session restoration for the current tab, protected workspace routes, and logout.
- Customer plan catalog, draft subscription and invoice creation, Razorpay Checkout, server-side payment verification, and activation response.
- Customer subscription and invoice history, invoice PDF download, and account-scoped record access.
- Admin/staff overview metrics, six-month recorded payment chart, recent payments, subscription and payment analytics, and non-secret Razorpay/Resend configuration status.
- Admin/staff paginated and searchable customer, product, plan, subscription, invoice, and payment lists. Customer/product/plan records can be created and edited through validated APIs.
- Shared loading, empty, error, status, and form states.

## Current limitations

- Quotations, staff/user administration, organization settings, and customer-to-user account assignment are not implemented in the backend.
- Subscription cancellation, pause/resume, renewal scheduling, background billing, and automated failed-payment state updates are not implemented.
- The payment success rate uses captured and failed attempts recorded by the backend; pending attempts are excluded.
- Integrations shown on the landing page are clearly marked as examples. Only the configured Razorpay and Resend services are reflected in the workspace.
- Privacy and terms links are marked as unpublished drafts; they are not legal policies.

See `backend/README.md` for API routes and database details, and `frontend/README.md` for frontend setup.
