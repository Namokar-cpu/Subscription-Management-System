# Subscription Management System

An early-stage hackathon project for managing customers, subscription plans, recurring billing, invoices, and payment records. The goal is to give a business one place to organize subscription information and track what customers owe.

## Current progress

This repository currently contains the first backend foundation, built with TypeScript, Express, PostgreSQL, and Prisma:

- Initial database models for users, customers, products, plans, subscriptions, invoices, and payments
- Account registration and login endpoints, plus an authenticated current-user endpoint
- A health endpoint that checks the database connection
- Local PostgreSQL setup with Docker Compose

This is a work in progress. The customer and billing workflows are not complete yet, and there is no finished frontend in this repository.

## Project structure

```text
backend/
  prisma/       Database schema and administrator seed script
  src/          Express API, authentication, and health endpoint
  Dockerfile    API container build
  docker-compose.yml
  README.md     Backend setup and endpoint details
```

## Run the backend locally

1. Install Node.js 20+ and Docker Desktop (or PostgreSQL 15+).
2. Open a terminal in `backend/`.
3. Copy `.env.example` to `.env` and set private values, including a random JWT secret of at least 32 characters.
4. Start the database with `docker compose up -d database`, or use your own PostgreSQL database.
5. Run `npm install`, then `npm run db:generate`.
6. Run `npm run db:migrate -- --name foundation` and `npm run dev`.

The API listens on `http://localhost:4000` by default. See [backend/README.md](backend/README.md) for endpoint and setup details.

## Current API endpoints

- `GET /api/v1/health` — check API/database availability
- `POST /api/v1/auth/register` — create a customer account (pending verification)
- `POST /api/v1/auth/login` — sign in an active account
- `GET /api/v1/auth/me` — get the signed-in account (Bearer token required)

## Next steps

Build out the product and plan management flows, subscription lifecycle, invoice and payment workflows, and then a user interface. Payment gateway, tax, email verification, and billing policies still need decisions before real billing is enabled.

## Hackathon progress updates

To post a progress snapshot about every hour, save your work and run these commands from the repository root:

```bash
git status
git add README.md backend
git commit -m "Describe the progress made"
git push
```

For future updates, `git add -A` stages all changed and new files. Review `git status` before committing, and never commit `.env`, passwords, API keys, or other secrets. Each push creates a visible checkpoint in the GitHub repository history.
