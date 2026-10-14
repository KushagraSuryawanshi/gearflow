# GearFlow

GearFlow is a university group project for managing shared equipment. This repository currently contains the project foundation only; application features will be added in later work.

## Repository layout

- `apps/web` — React frontend
- `apps/api` — Express backend and Prisma schema
- `e2e` — Playwright end-to-end tests
- `infra/nginx` — web server and API proxy configuration
- `infra/monitoring` — reserved for future monitoring configuration
- `docs` — project documentation
- `.github/workflows` — CI workflows

## Development

Copy `.env.example` to `.env` when local environment values are needed. Install dependencies with `npm install`. The available checks are:

```text
npm run lint
npm run typecheck
npm test
npm run build
```

Branch and review expectations are documented in [CONTRIBUTING.md](CONTRIBUTING.md).
