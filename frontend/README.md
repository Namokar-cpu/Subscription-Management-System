# Brightloop frontend

## Local development

1. Copy `.env.example` to `.env` and set `VITE_API_BASE_URL` if the backend is not at `http://localhost:4000/api/v1`.
2. From this folder run `npm install` and `npm run dev`.
3. Keep the backend running at the configured URL. The backend CORS origin should match the frontend origin (`http://localhost:5173` by default).

The customer workspace uses registration, login, catalog, subscription, invoice, PDF, and Razorpay verification APIs. The admin/staff workspace uses protected dashboard and management APIs. The access token stays in session storage for the current browser tab. Razorpay's public key ID is returned by the backend; its secret stays server-side.

Admin routes include searchable, paginated list views for customers, products, plans, subscriptions, invoices, and payments. Customer, product, and plan records can be created or edited. Quotations, user administration, organization settings, and subscription lifecycle actions still need backend support.
