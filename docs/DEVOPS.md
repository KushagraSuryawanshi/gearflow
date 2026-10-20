# GearFlow Deployment and Operations

## 1. Deployment overview

GearFlow uses one path from a change to a running release:

```text
local development
  -> GitHub Actions verification
  -> immutable GHCR images tagged with the commit SHA
  -> staging EC2 in Sydney
  -> Playwright test against the deployed staging URL
  -> production EC2 in Sydney using the same SHA
  -> Prometheus, Node Exporter and Grafana monitoring
```

Local Docker Compose builds images from the working tree. The release path instead pulls published images from GitHub Container Registry (GHCR). Staging and production run on separate servers with separate databases, credentials and Compose project names.

## 2. CI/CD pipeline

[`.github/workflows/ci.yml`](../.github/workflows/ci.yml) runs for pull requests to `main` and pushes to `main`.

The `checks` job starts PostgreSQL 16 and then:

1. Installs dependencies with `npm ci`.
2. Generates the Prisma client.
3. Checks formatting.
4. Runs linting and type checking.
5. Runs the test suites and the API coverage-threshold check.
6. Builds the workspaces.

For a pull request, verification is the end of the pipeline. Images are not published and no environment is deployed.

For a push or merge to `main`, the dependency chain is:

```text
checks
  -> package
  -> deploy-staging
  -> staging-e2e
  -> deploy-production
```

`package` publishes the release images. The staging job copies the deployment configuration to the staging server, signs the server into GHCR and deploys the commit SHA. The E2E job then tests the deployed `STAGING_URL`. Production promotion runs only after that test succeeds and deploys the same commit SHA with the production monitoring configuration.

Each job declares the preceding job with `needs`, so a failed or skipped dependency prevents later jobs from running. GitHub environments named `staging` and `production` scope the deployment jobs and their secrets.

## 3. Immutable release artifacts

The package job publishes three images:

| Image                                             | Purpose                                                      |
| ------------------------------------------------- | ------------------------------------------------------------ |
| `ghcr.io/<namespace>/gearflow-api:<commit-sha>`   | Compiled Express API runtime                                 |
| `ghcr.io/<namespace>/gearflow-web:<commit-sha>`   | Compiled React application served by Nginx                   |
| `ghcr.io/<namespace>/gearflow-tools:<commit-sha>` | Prisma migrations, staging seed and admin bootstrap commands |

Every tag is the full Git commit SHA from `github.sha`. The GHCR namespace is the lower-case repository owner.

The release rule is:

```text
BUILD ONCE -> TEST STAGING -> PROMOTE THE SAME SHA TO PRODUCTION
```

Production pulls the already-published SHA-tagged images. It does not rebuild them.

## 4. Local Docker development

The root [`docker-compose.yml`](../docker-compose.yml) is for local development and is separate from the Compose files under `infra/deploy`. It builds from the working tree, exposes PostgreSQL and the API for development, and has an optional demo seed profile.

```sh
cp .env.example .env
docker compose up --build -d
docker compose --profile seed run --rm seed
docker compose down
```

The default example uses the web application at `http://localhost:8080` and PostgreSQL on host port `5433`. The seed command is explicit; normal startup does not insert demo data.

Useful repository checks are:

```sh
npm ci
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
```

## 5. Release Compose architecture

[`infra/deploy/compose.release.yml`](../infra/deploy/compose.release.yml) defines the normal release services:

- `db` runs PostgreSQL 16 Alpine and stores its data in the named `postgres-data` volume.
- `migrate` uses the SHA-tagged `gearflow-tools` image to run `prisma migrate deploy` once.
- `api` uses the SHA-tagged API image and starts only after migrations complete successfully.
- `web` uses the SHA-tagged web image, starts after the API becomes healthy and publishes the configured web port.

Startup ordering is:

```text
PostgreSQL healthy
  -> prisma migrate deploy succeeds
  -> API starts and becomes healthy
  -> web starts
```

The API and web containers both have HTTP health checks. The deployment script also polls `/api/health` through the published web port for up to 30 attempts and prints relevant Compose status and logs if the application never becomes healthy.

The deployment script uses Compose project names `gearflow-staging` and `gearflow-production`. Because the environments are also on separate EC2 instances, their containers, named PostgreSQL volumes and databases are independent.

## 6. Staging environment

Staging runs on its own EC2 instance in the Sydney region with its own `.env`, credentials and persistent PostgreSQL volume. `deploy.sh` combines the release and staging Compose files, then runs the `seed` profile after the normal services start. The staging seed is idempotent and supplies the demo users and equipment required by the deployed browser test.

GitHub Actions runs Playwright against `STAGING_URL`, not against a local Vite server. The deployed booking test performs this flow:

```text
borrower signs in and requests available equipment
  -> staff signs in and approves the request
  -> borrower signs in, verifies it is ready to collect and cancels it
  -> borrower verifies the cancelled booking in the Past list
```

CI allows two retries. Each attempt derives a distinct future date range from `E2E_RUN_ID` and the retry number, so a failed attempt does not leave a booking date that poisons the next attempt. On failure, the workflow uploads the Playwright report and test results for seven days. A failed staging deployment or E2E test blocks production promotion.

## 7. Production environment

Production runs on a separate EC2 instance in the Sydney region with its own PostgreSQL volume, `.env` and credentials. It pulls the exact SHA-tagged images that passed staging. The production deployment does not include `compose.staging.yml` and therefore does not run the demo seed; the seed code also refuses to run when `NODE_ENV=production`.

The production server publishes the web service on port 80. Nginx serves the frontend and proxies API traffic. HTTPS and a custom domain are outside the current project scope, so the implemented deployment should not be described as providing TLS.

## 8. Production admin bootstrap

The supported way to create the first production administrator is the one-time `bootstrap-admin` service in the release Compose file. It:

- uses the same SHA-tagged `gearflow-tools` image as release migrations;
- is available only under the `bootstrap` profile and is not started by normal deployments;
- requires `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_NAME` and `BOOTSTRAP_ADMIN_PASSWORD`;
- validates the email, trims the name and requires a password of at least 12 characters;
- waits for migrations to complete;
- takes a PostgreSQL advisory lock to serialize simultaneous bootstrap attempts;
- refuses to run if any administrator already exists;
- refuses to change a user that already has the requested email;
- hashes the password before creating the user with the `ADMIN` role.

Run it on the production server from the deployment root, using the deployed release SHA and entering real values only in the shell session:

```sh
export IMAGE_TAG='<deployed-commit-sha>'

read -r -p 'Admin email: ' BOOTSTRAP_ADMIN_EMAIL
read -r -p 'Admin name: ' BOOTSTRAP_ADMIN_NAME
read -r -s -p 'Admin password: ' BOOTSTRAP_ADMIN_PASSWORD
printf '\n'

export BOOTSTRAP_ADMIN_EMAIL BOOTSTRAP_ADMIN_NAME BOOTSTRAP_ADMIN_PASSWORD

docker compose \
  --env-file "$HOME/gearflow/.env" \
  --project-name gearflow-production \
  --file "$HOME/gearflow/infra/deploy/compose.release.yml" \
  --profile bootstrap run --rm \
  -e BOOTSTRAP_ADMIN_EMAIL \
  -e BOOTSTRAP_ADMIN_NAME \
  -e BOOTSTRAP_ADMIN_PASSWORD \
  bootstrap-admin

unset BOOTSTRAP_ADMIN_EMAIL BOOTSTRAP_ADMIN_NAME BOOTSTRAP_ADMIN_PASSWORD
```

The credential variables should be provided ephemerally and must not be stored in the server `.env` file or committed to Git. This mechanism was successfully used to create the initial production administrator, and login to the production application was verified.

## 9. Monitoring

Production adds [`compose.monitoring.yml`](../infra/deploy/compose.monitoring.yml), which runs:

- Prometheus for metric collection and time-series storage;
- Node Exporter for host CPU, memory and other operating-system metrics;
- Grafana with a provisioned Prometheus data source and the `GearFlow Overview` dashboard.

Prometheus scrapes every 15 seconds:

- `api:3000/api/metrics` on the private Compose network;
- `node-exporter:9100` on the private Compose network.

The API exports default Node.js process metrics with the `gearflow_` prefix. Its request middleware also exports:

- `gearflow_http_requests_total`, labelled by HTTP method, Express route and status code;
- `gearflow_http_request_duration_seconds`, a histogram with the same labels and buckets from 5 milliseconds to 5 seconds.

The provisioned dashboard contains:

- **Host CPU usage**, calculated from non-idle Node Exporter CPU time;
- **Host memory usage**, calculated from available and total memory;
- **API request latency**, showing p95 and p50 over five minutes;
- **API request rate**, grouped by method, route and status code over five minutes.

Prometheus and Grafana publish only to `127.0.0.1` on the production host. Access them through an SSH tunnel rather than opening their ports publicly. For Grafana:

```sh
ssh -i <path-to-key> -L 3001:127.0.0.1:3001 <server-user>@<production-host>
```

Then open `http://127.0.0.1:3001` locally and use the Grafana credentials stored on the server. Do not put those credentials in documentation or Git.

## 10. Nginx and public exposure

The web container runs Nginx on container port 80. It serves the compiled frontend, falls back to `index.html` for client-side routes and proxies `/api/` to `api:3000` on the private Compose network.

Nginx handles `/api/metrics` with an exact-match rule that returns `404`, so application metrics are not exposed through the public web service. `/api/health` remains available through the general API proxy and is used by health checks.

Only the web service is published publicly. PostgreSQL, the API container, Prometheus and Grafana do not have public host bindings. Prometheus and Grafana use localhost-only bindings; PostgreSQL and the API are reachable only inside the Compose network.

## 11. Server bootstrap

[`bootstrap-ubuntu.sh`](../infra/deploy/bootstrap-ubuntu.sh) prepares an Ubuntu server by:

- installing CA certificates and `curl`;
- adding Docker's official Ubuntu apt repository and signing key;
- installing Docker Engine, the Docker CLI, containerd, Buildx and the Docker Compose plugin;
- enabling and starting Docker;
- adding the current user to the `docker` group;
- creating `~/gearflow` with permissions limited to that user.

The user must sign out and back in once for Docker group membership to take effect. The script does not create the server `.env`; that file must be provisioned separately.

## 12. Required GitHub Secrets

The workflow expects these secret names:

| Secret               | Purpose                                              |
| -------------------- | ---------------------------------------------------- |
| `GHCR_DEPLOY_USER`   | Account used by both servers to authenticate to GHCR |
| `GHCR_DEPLOY_TOKEN`  | Token used by both servers to pull release images    |
| `STAGING_HOST`       | Staging server hostname or address                   |
| `STAGING_USER`       | SSH user for staging                                 |
| `STAGING_SSH_KEY`    | Private SSH key for staging deployment               |
| `STAGING_URL`        | Public base URL used by the deployed Playwright test |
| `PRODUCTION_HOST`    | Production server hostname or address                |
| `PRODUCTION_USER`    | SSH user for production                              |
| `PRODUCTION_SSH_KEY` | Private SSH key for production deployment            |

The workflow's built-in `GITHUB_TOKEN` publishes packages during the package job; it is not a separately configured repository secret.

## 13. Server environment variables

Each server has its own `~/gearflow/.env`, based on [`infra/deploy/.env.server.example`](../infra/deploy/.env.server.example). Staging and production must use different credentials.

| Variable                     | Purpose                                               |
| ---------------------------- | ----------------------------------------------------- |
| `POSTGRES_DB`                | PostgreSQL database name                              |
| `POSTGRES_USER`              | PostgreSQL application user                           |
| `POSTGRES_PASSWORD`          | PostgreSQL password                                   |
| `JWT_SECRET`                 | Secret used to sign and verify application JWTs       |
| `GHCR_NAMESPACE`             | Lower-case GitHub owner containing the release images |
| `WEB_PORT`                   | Host port published for the Nginx web service         |
| `WEB_BIND_ADDRESS`           | Host address on which the web service listens         |
| `PROMETHEUS_PORT`            | Host loopback port for Prometheus                     |
| `GRAFANA_PORT`               | Host loopback port for Grafana                        |
| `GF_SECURITY_ADMIN_USER`     | Initial Grafana administrator username                |
| `GF_SECURITY_ADMIN_PASSWORD` | Initial Grafana administrator password                |

`DEPLOY_ENV` and `IMAGE_TAG` are supplied to `deploy.sh` by the workflow rather than stored in this file. The deployment fails early when either is missing or invalid. Bootstrap credentials are also intentionally absent from the server environment template.

## 14. Deployment evidence and current verified state

The current project work has verified the following release path and runtime behavior:

- CI verification has passed on successful workflow runs.
- Immutable SHA-tagged API, web and tools images have been published.
- The staging deployment and deployed Playwright staging gate have succeeded.
- The same tested SHA has been promoted to production.
- The staging application has been opened and used successfully.
- The production application is reachable.
- Grafana is running.
- Prometheus is receiving data from both the GearFlow API target and Node Exporter.
- The provisioned `GearFlow Overview` dashboard displays CPU, memory, API latency and request-rate data.
- The initial production administrator was bootstrapped successfully, and login to the production application was verified.

## 15. Operational notes

- Production is intentionally not demo-seeded. Only staging deployment runs the seed profile.
- Normal deployments must not enable the `bootstrap` profile.
- Identify and troubleshoot releases by their Git commit SHA image tag.
- Keep application, database, registry, SSH and Grafana secrets outside Git.
- HTTPS and custom-domain configuration are outside the current project scope.
