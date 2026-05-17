# Deployment

This repository deploys the 0x2c.dev admin SPA. It does not run a web server container and it does not configure public routing. The workflow builds static files with Vite's `/admin/` base path and publishes them to the deployment host for an external routing server to serve under `/admin/`.

Related repositories:

- `../blog-frontend`: public reader SPA static files.
- `../blog-admin-frontend`: admin SPA static files.
- `../blog-backend`: backend API Docker container.

## Branches And Environments

The same workflow handles CI and deployment:

| Git ref | GitHub Environment | Public URL | Deploys |
| --- | --- | --- | --- |
| Pull request to `develop` or `master` | none | none | No |
| Push to `develop` | `development` | `https://dev.0x2c.dev/admin/` | Yes |
| Push to `master` | `production` | `https://0x2c.dev/admin/` | Yes |
| Manual `workflow_dispatch` on another ref | `preview` context | none | No |

Production approval is configured in GitHub repository settings, not in YAML. Configure required reviewers for the `production` environment. Development normally has no required reviewers.

## External Infrastructure

The admin deployment assumes these already exist:

- A Linux host reachable by SSH.
- An external routing/static server that serves files from the deployed `www` directory under `/admin/`.
- Backend API routing through the same public origin under `/api/`.

The app is built with `base: '/admin/'` in production and Vue Router uses `import.meta.env.BASE_URL`. The external routing server must serve admin assets and SPA fallback correctly under `/admin/`.

Default deployment directories:

```text
/opt/0x2c-blog/production/admin/www
/opt/0x2c-blog/development/admin/www
```

## GitHub Secrets

Define these in both the `development` and `production` GitHub Environments for this repository.

Required secrets:

- `VPS_HOST`: SSH hostname or IP address.
- `VPS_SSH_USER`: SSH user.
- `VPS_SSH_PRIVATE_KEY`: private key for `VPS_SSH_USER`.

Optional secrets:

- `VPS_SSH_PORT`: SSH port. Defaults to `22`.
- `DEPLOY_ROOT`: root deployment directory. Defaults to `/opt/0x2c-blog`.

No API URL secret is needed for normal deployment. The app is built to call `/api` on the same public origin.

Workflow-provided variables used by `scripts/deploy.sh`:

- `DEPLOY_ENVIRONMENT`: `development` or `production`, from `scripts/resolve-deployment-context.sh`.
- `DIST_DIR`: optional local override for the static files directory. The workflow uses the default `dist`.

## Scripts

- `scripts/resolve-deployment-context.sh`: maps the GitHub event/ref to deployment outputs such as environment name and environment URL.
- `scripts/deploy.sh`: validates that `dist/index.html` exists, archives `dist`, uploads it over SSH, and atomically publishes it as the remote `www` directory.

## Workflow Process

1. Checkout and resolve deployment context.
   The workflow runs `scripts/resolve-deployment-context.sh`. Pull requests build but set `deploy=false`. Pushes to `develop` and `master` set `deploy=true`.

2. Install dependencies and build static files.
   The workflow runs:

   ```bash
   npm ci
   npm run build
   ```

3. Upload the static artifact.
   The workflow uploads `dist/` as the `admin-dist` artifact. This artifact is used by the deploy job so deployment uses exactly the files that passed the build.

4. Deploy over SSH on deployable branches.
   The deploy job runs in the selected GitHub Environment. For production, GitHub waits for required reviewers before exposing production environment secrets. The workflow downloads `admin-dist` back into `dist/` and runs `scripts/deploy.sh`.

5. Publish static files on the VPS.
   The deploy script uploads `admin-static.tar.gz` to:

   ```text
   {DEPLOY_ROOT}/{environment}/admin
   ```

   It extracts into `www.next`, moves the old `www` to `www.previous`, then promotes `www.next` to `www`.

## External Routing Shape

Production routing should serve:

```text
/admin/ -> /opt/0x2c-blog/production/admin/www with SPA fallback
```

Development routing should serve:

```text
/admin/ -> /opt/0x2c-blog/development/admin/www with SPA fallback
```

The routing server should also proxy `/api/` to the backend API. Admin route refreshes such as `/admin/posts` require SPA fallback to the admin `index.html`.

## Operational Notes

- The admin deployment does not restart a service. The external routing server serves files from the `www` directory.
- Rollback means moving `www.previous` back to `www` on the VPS or redeploying a previous commit.
- Post-deploy checks are `https://{host}/admin/`, a refreshed admin route, and a representative `/api/` call through the public origin.
