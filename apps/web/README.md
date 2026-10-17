# GearFlow frontend

One React application for borrowers, staff and administrators. The interface follows the team implementation contract: seeded accounts sign in, all roles can borrow, staff operate the loan desk, and administrators manage inventory and access. Public registration is intentionally absent from that contract.

## Run locally

From the repository root:

```sh
npm ci
npm run dev --workspace=@gearflow/web
```

Start the API separately using the backend team's instructions. Vite forwards `/api` to `http://127.0.0.1:3000` in development. To use a different API server, set `GEARFLOW_API_TARGET` in `apps/web/.env.local` or the shell before starting Vite.

The browser always requests relative `/api/...` URLs. The production build uses the existing Nginx reverse proxy, so changing servers does not require rebuilding the frontend. No credentials or API hostnames are embedded in the application bundle.

## Screens

| Route               | Access       | Purpose                                        |
| ------------------- | ------------ | ---------------------------------------------- |
| `/login`            | Everyone     | Sign in with an existing account               |
| `/equipment`        | Signed in    | Search and filter the equipment collection     |
| `/equipment/:id`    | Signed in    | View details and request booking dates         |
| `/bookings`         | Signed in    | View own bookings and cancel eligible requests |
| `/requests`         | Staff, admin | Review pending requests                        |
| `/loans`            | Staff, admin | Record collections and returns                 |
| `/admin/equipment`  | Admin        | Create, edit and delete equipment              |
| `/admin/categories` | Admin        | Create, edit and delete categories             |
| `/admin/users`      | Admin        | View accounts and change roles                 |

Staff and administrators also see maintenance controls and booking history on each equipment page. Booking details use the records returned by the agreed list endpoints; there is no invented single-booking endpoint.

## Integration notes

`src/lib/api.ts` contains the contract calls and shared response/error handling. `src/types/api.ts` describes the response objects. Successful JSON responses must use `{ data: ... }`, and errors must use `{ error: { code, message } }`. Delete operations also accept HTTP 204.

The bearer token lives in tab-scoped `sessionStorage`. Reloading checks `/auth/me`; signing out clears the token. An authenticated 401 returns the user to sign-in. Network failures preserve the session and offer retry.

Role and ownership checks control the interface, while the API remains responsible for authorisation, date validity, overlapping bookings and valid status transitions. An equipment status of `AVAILABLE` is labelled **Open for requests**, since it does not guarantee availability on particular dates. Conflict responses keep the entered dates visible. All dates are sent as `YYYY-MM-DD`; same-day bookings are allowed.

The catalogue uses the full equipment and category lists for local search and filtering. Each physical item has its own card. Category illustrations are decorative SVGs, not claimed equipment photos. No image endpoint is assumed.

## Verification

From the repository root:

```sh
npm run lint
npm run typecheck
npm run test --workspace=@gearflow/web
npm run build
npx playwright install chromium
npm run test:ui --workspace=@gearflow/web
```

Unit tests cover API request/response handling, session expiry, booking controls and date rules. The browser suite covers the borrower-to-staff lifecycle, cancellation, self-approval prevention, maintenance, administration, API failures and mobile navigation. It saves representative desktop and mobile screenshots in `apps/web/test-results`, with an HTML report in `apps/web/playwright-report`.

Browser fixtures exist only under `tests/browser` and intercept HTTP requests in Playwright. They never enter the application bundle. These tests verify frontend behaviour against the agreed contract; they do not prove that the backend enforces its business rules. Run the integration owner's real staging acceptance suite once the backend is available.

For an environment with a preinstalled Chromium executable, `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` can override the browser path for this UI suite. The default uses Playwright's installed Chromium. The suite runs a local Vite server on port 4174 and does not change the shared staging/deployment test configuration.

## Design and dependencies

The equipment room uses restrained green and paper colours, compact operational tables and category illustrations. The sidebar is shared across roles and becomes a modal navigation menu on small screens. Tables scroll within their own region, dialogs use the browser's native modal behaviour, and controls retain visible keyboard focus.

The light/dark theme control is available on the sign-in screen and in the workspace header. The initial theme follows the device preference; a manual choice is saved in `localStorage` under `gearflow.theme`. If storage is blocked, switching still works for the current page session. Shared colour tokens cover forms, tables, dialogs, status badges and equipment illustrations, including native date inputs. Browser tests check preference persistence, keyboard access, mobile layout and the storage fallback.

The implementation uses the repository's existing React, TypeScript, Vite, Tailwind, Vitest and Playwright dependencies. No additional runtime libraries are required. Changes stay within `apps/web`; backend, database and deployment ownership remain with their respective teammates.
