# GearFlow

GearFlow is a web app for managing shared equipment bookings and loans inside an organisation. Users can browse individual items, request them for a date range, and follow each booking through approval, collection and return. Staff run the loan desk, while administrators manage the inventory, categories and user roles.

## What it does

- **Borrower:** browses and filters equipment, requests booking dates, views their own bookings and cancels eligible requests.
- **Staff:** can also review requests, record collections and returns, set maintenance status, and view an item's booking history.
- **Administrator:** has the staff tools plus equipment, category and user-role management.

All three roles can make bookings. Staff and administrators still need another staff member or administrator to approve a booking they made themselves.

## Main flow

A new request starts as **Pending**. Staff or an administrator can **Approve** or **Reject** it. An approved booking is marked **Collected** at handover and **Returned** when the item comes back. The person who made a booking can cancel it while it is pending or approved.

Approved and collected bookings cannot overlap for the same physical item. Pending requests may overlap, so availability is checked again during approval. Equipment under maintenance cannot receive new booking requests, and users can only view and cancel their own bookings. Permission and ownership rules are enforced by the API, including the rule that staff and administrators cannot approve their own requests.

## Stack

- **Frontend:** React, TypeScript, Vite and Tailwind CSS
- **Backend:** Node.js, Express, TypeScript, Zod and JWT authentication
- **Database:** PostgreSQL and Prisma
- **Testing:** Vitest, Supertest and Playwright
- **Platform:** Docker, Docker Compose, Nginx and GitHub Actions

## Running locally

You need Git, Docker and Docker Compose. Clone the repository, then create the local environment file from the example:

```sh
git clone <repository-url>
cd gearflow
cp .env.example .env
```

The example publishes PostgreSQL on host port `5433` to avoid a common local PostgreSQL port conflict. Change `POSTGRES_PORT` in `.env` if that port is already in use.

Build and start the application:

```sh
docker compose up --build -d
```

Compose waits for PostgreSQL to become healthy, runs `prisma migrate deploy` in the one-shot `migrate` service, and starts the API only after migration succeeds. Normal Compose startup does not need `prisma migrate dev`.

Load the demo data explicitly after startup:

```sh
docker compose --profile seed run --rm seed
```

Open [http://localhost:8080](http://localhost:8080). The web container serves the React build through Nginx and proxies `/api` requests to the API container.

### Demo accounts

The seed creates these local demo accounts:

| Role          | Email                    |
| ------------- | ------------------------ |
| Borrower      | `borrower@gearflow.test` |
| Staff         | `staff@gearflow.test`    |
| Administrator | `admin@gearflow.test`    |

Their shared password is `GearFlow-demo-1`. These credentials are for local/demo use only.

## Useful commands

```sh
# Start or rebuild the container stack
docker compose up --build -d

# Stop the stack
docker compose down

# Load or refresh the idempotent demo seed
docker compose --profile seed run --rm seed

# Install dependencies for checks outside Docker
npm ci

# Formatting, linting and type checks
npm run format:check
npm run lint
npm run typecheck

# API and frontend unit tests
npm test

# Frontend browser tests
npm run test:ui --workspace=@gearflow/web

# Production builds
npm run build
```

The API tests expect PostgreSQL at the `TEST_DATABASE_URL` environment variable. If it is not set, they use the local test database on port `5433` and create that database if needed.

## Project structure

```text
apps/
  web/       React frontend and its unit/browser tests
  api/       Express API, Prisma schema, migrations and API tests
e2e/         Shared Playwright test workspace
infra/       Nginx configuration
docs/        Application documentation
```

Repository-wide scripts and the Compose configuration live at the root. The current GitHub Actions workflow runs linting, type checks, unit/API tests and builds against PostgreSQL.

## Testing

The API suite covers authentication, permissions, equipment and category management, booking transitions, overlap handling, maintenance, cancellation and self-approval. It currently has 176 tests and enforces 80% line and branch coverage when `npm run test:coverage --workspace=@gearflow/api` is run.

The frontend has 16 Vitest unit tests for API/session handling and booking UI rules. Its 9 Playwright browser tests exercise the main borrower, staff and administrator flows, along with failure states, themes, keyboard use and responsive layouts.

## More detail

[docs/APP.md](docs/APP.md) describes the roles, booking rules, architecture, routes and data model in more detail.

## Deployment

Deployment work is handled separately and is not finished yet. It will build on the repository's container setup and CI workflow; staging, production, release publishing and monitoring are not documented as completed features.
