# Brightloop Subscription Management API

Phase 1 backend foundation for the subscription management system workflow. The API uses Express, TypeScript, PostgreSQL and Prisma.

## Start locally

1. Install Node.js 20+ and PostgreSQL 15+.
2. From `backend/`, copy `.env.example` to `.env` and set a private JWT secret of at least 32 characters and the PostgreSQL connection string.
3. Run `npm install`.
4. Run `npm run db:generate` and `npm run db:migrate -- --name foundation`.
5. Run `npm run dev`.

The API listens on `http://localhost:4000` by default. `GET /api/v1/health` checks the database connection.

## Initial endpoints

- `POST /api/v1/auth/register` — create a customer account and profile. New accounts are pending verification.
- `POST /api/v1/auth/login` — issue a short-lived bearer access token for active accounts.
- `GET /api/v1/auth/me` — return the authenticated account.

Registration requires `email`, `password` (9+ characters, upper/lowercase and special character), and `name`; `companyName` is optional. Login is rate-limited. Passwords use bcrypt and access tokens use a server-side secret.

## Workflow decisions still needed

The design document leaves several domain policies open. The initial schema defaults to INR and models manual payments; before billing is enabled, confirm payment gateway needs, invoice numbering rules, partial/overpayments, proration, billing timezone, tax selection, discount stacking, failed-payment handling and cancellation/pause effects. Email delivery and verification-token issuance must be wired to the chosen provider before customer self-registration is opened. Do not activate pending customer accounts manually in production without verifying their email.

This initial slice establishes the database foundation and auth/health API. Domain endpoints and background billing workers are the next implementation phases.
