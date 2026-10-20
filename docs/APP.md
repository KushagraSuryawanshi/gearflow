# GearFlow Application

## Why it exists

An organisation may have cameras, audio gear, computers or other physical equipment shared between many people. It needs a straightforward way to request an item, approve a loan, record the handover and keep the item's booking history. GearFlow keeps that work in one application rather than splitting it across messages and spreadsheets.

## Roles

### Borrower

Borrowers can browse and filter the equipment catalogue, open an item, and request it for a start and end date. They see only their own bookings and can cancel their pending or approved bookings.

### Staff

Staff can do everything a borrower can. They also review pending requests, approve or reject them, record collection and return, change an item's maintenance status, and view booking history for an item. A staff member cannot approve a request they made themselves.

### Administrator

Administrators have the staff tools and can create, edit and delete equipment and categories. They can list users and change another user's role. Administrators cannot change their own role or approve their own booking request.

## Booking lifecycle

```text
Pending ------> Approved ------> Collected ------> Returned
  |               |
  +-> Rejected    +-> Cancelled
  |
  +-> Cancelled
```

- **Pending:** created by any signed-in user when they request an item.
- **Approved:** a staff member or administrator approves a pending request. The reviewer must not be the person who made it.
- **Rejected:** a staff member or administrator rejects a pending request.
- **Collected:** staff or an administrator records the handover of an approved booking.
- **Returned:** staff or an administrator records the return of a collected booking.
- **Cancelled:** the booking owner cancels their own pending or approved booking.

Rejected, returned and cancelled bookings are finished. A collected booking can only move to returned.

## Booking rules

The API applies these rules:

- Dates use `YYYY-MM-DD`, the start date cannot be after the end date, and a one-day booking is valid.
- A request cannot be created for equipment that is under maintenance.
- Approved and collected bookings reserve an item. Their date ranges are inclusive, so a new range that starts on an existing booking's end date overlaps it.
- Pending requests may overlap. The API checks availability again when one is approved.
- Only the booking owner can cancel it, and cancellation is allowed only while it is pending or approved.
- Only staff and administrators can review requests, record collection/return, change maintenance status or view an item's full booking history.
- Staff and administrators cannot approve their own requests.
- Equipment and category management and user-role changes are administrator-only.

The frontend hides actions a user should not have, but that is only a UI convenience. Authentication, roles, ownership and status transitions are enforced by the backend.

## Equipment

Each physical item is a separate `Equipment` record, even when several items are the same model. That lets bookings, maintenance status and history belong to the exact item being handed out.

Categories organise the catalogue and can be used as a filter. Staff and administrators can mark equipment as under maintenance; administrators manage the equipment and category records themselves. The frontend uses local decorative artwork based on the item name or category. It does not treat that artwork as a product photo.

## Authentication and permissions

`POST /api/auth/login` checks the email and password and returns an eight-hour JWT. The token contains the user's ID as its subject, not a cached role. Authenticated requests send it as a bearer token.

For every authenticated request, the API verifies the token and loads the current user and role from PostgreSQL. This means an administrator's role change takes effect without waiting for an existing token to expire. Route middleware and booking service checks then apply role, ownership and self-approval rules. The frontend keeps the token in tab-scoped `sessionStorage` and uses `GET /api/auth/me` to restore the session after a reload.

## Application architecture

```text
Browser
  -> Nginx
     -> React static files
     -> /api proxy -> Express API -> Prisma -> PostgreSQL
```

The Docker Compose stack has four normal startup services:

- `db` runs PostgreSQL and stores its data in a named volume.
- `migrate` is a one-shot service that runs `prisma migrate deploy` after the database is healthy.
- `api` starts only after migrations finish successfully.
- `web` serves the built React app through Nginx and starts after the API health check passes.

The optional `seed` profile runs the local demo seed after migrations. It is separate from normal startup so demo accounts and equipment are not silently inserted into every environment.

## API

All application routes except login and health require a valid bearer token.

### Auth

- `POST /api/auth/login`
- `GET /api/auth/me`

### Equipment

- `GET /api/equipment` with an optional `categoryId` filter
- `GET /api/equipment/:id`
- `POST /api/equipment`
- `PATCH /api/equipment/:id`
- `DELETE /api/equipment/:id`
- `PATCH /api/equipment/:id/maintenance`
- `GET /api/equipment/:id/bookings`

### Categories

- `GET /api/categories`
- `POST /api/categories`
- `PATCH /api/categories/:id`
- `DELETE /api/categories/:id`

### Bookings

- `POST /api/bookings`
- `GET /api/bookings/mine`
- `PATCH /api/bookings/:id/cancel`
- `GET /api/bookings/pending`
- `GET /api/bookings/active`
- `PATCH /api/bookings/:id/review`
- `PATCH /api/bookings/:id/collect`
- `PATCH /api/bookings/:id/return`

### Users

- `GET /api/users`
- `PATCH /api/users/:id/role`

`GET /api/health` is the container health endpoint. There is currently no metrics endpoint.

## Database

The main models are:

- `User`: name, email, password hash and role.
- `Category`: a named group containing equipment.
- `Equipment`: one physical item, its category, description and availability/maintenance status.
- `Booking`: the item, borrower, inclusive date range and current status.

Application code checks for overlapping approved or collected bookings before creating or approving one. PostgreSQL also has a GiST exclusion constraint over the equipment ID and inclusive date range for those two statuses. The database rule matters because two approvals can pass an application-level check at nearly the same time; the constraint still allows only one to succeed. A separate database check prevents an end date from being earlier than its start date.

## Testing

The API tests use Vitest and Supertest against a separate PostgreSQL test database. They cover login and token behaviour, current roles, route permissions, equipment and category changes, the complete booking lifecycle, inclusive overlaps, concurrent approval, the database constraint, maintenance, cancellation and self-approval prevention.

Frontend Vitest tests cover API errors, session expiry, booking controls and date handling. Playwright browser tests run against request fixtures and cover the main borrower-to-staff flow, rejection, cancellation, maintenance, inventory/category administration, role changes, error recovery, themes, keyboard navigation and responsive layouts.
