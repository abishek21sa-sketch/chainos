# ChainOS deployment

ChainOS can run as a static site with a bundled JSON fixture, or as an optional Node API backed by PostgreSQL workspace snapshots.

## Recommended path

Use Vercel for the first public preview. Connect the GitHub repository, set the project root to the folder containing `index.html`, and deploy. The checked-in `vercel.json` runs `npm test` before publishing the root directory. Vercel supports repository-level static configuration through `vercel.json` and can use `outputDirectory` to define the published output.

GitHub Actions runs the validation suite on pushes to `main`; Vercel and Render are the configured hosting providers.

Use Render when the project needs a backend. The checked-in `render.yaml` defines both the existing static site and a separate Node API service, so they can deploy independently from the same repository.

## GitHub and CI setup

1. Create a GitHub repository and copy the contents of this `chainos` folder into its repository root.
2. Commit and push the default branch as `main`.
3. The `Validate ChainOS` workflow installs dependencies with `npm ci` and runs fixture, API, and PostgreSQL-store tests. GitHub Pages is not currently used for hosting.

## Vercel setup

1. Import the GitHub repository into Vercel.
2. Set the project root to the folder containing `vercel.json` if using a monorepo.
3. Keep the build command as `npm test` and the output directory as `.`.
4. Deploy a preview, then promote the production deployment and attach a custom domain if desired.

## Render setup

1. Create or sync a Blueprint from the Git repository. `DATABASE_URL` is intentionally a secret prompt and is not stored in Git. If you are syncing an already-created Blueprint, add `DATABASE_URL` manually in the Render dashboard if the prompt is not shown.
2. Confirm the root directory is the folder containing `render.yaml`.
3. The Blueprint defines the existing static site and a Node web service named `chainos-api`; the API uses `npm test`, `npm start`, and `/api/health`.
4. After the API service is created, open **Data Health → Optional API Source** in the Vercel site, enter the API's public `onrender.com` origin, and click **Connect**. The connection is stored in that browser; no frontend redeploy is needed.
5. Add custom domains from the Render dashboard when ready.

### Render API service

If you prefer to create the API service manually rather than syncing the Blueprint:

1. Choose **Web Service** rather than **Static Site**.
2. Set the build command to `npm test`.
3. Set the start command to `npm start`.
4. Set the health check path to `/api/health`.
5. The initial endpoints are `/api/health`, `/api/fixture`, and `/api/summary`. Set `CHAINOS_ALLOWED_ORIGIN` to the Vercel site origin before connecting browser requests.

To connect the Vercel frontend, enter the Render API service origin in **Data Health → Optional API Source**. The browser checks `/api/health`, saves the origin locally, then tries `/api/fixture`; if the data request fails, it falls back to the bundled fixture. The Vercel origin must be allowed by `CHAINOS_ALLOWED_ORIGIN` on the API.

### PostgreSQL persistence

The API uses PostgreSQL when `DATABASE_URL` is configured; otherwise it serves the bundled fixture. Choose a database with a lifetime that matches the data you intend to keep. Render's [Free Postgres expires after 30 days](https://render.com/docs/free) and its data is deleted after the grace period, so do not use it for durable workspace records. Create an appropriately persistent Render Postgres instance, then add its private connection string as `DATABASE_URL` on the API service. The API creates its snapshot table on startup and seeds the bundled fixture only when that workspace has no saved snapshot. The Blueprint intentionally does not provision a database or select a paid plan.

For local development, use Node.js 22.9 or newer and copy `.env.example` to `.env`; the npm scripts load that file automatically. Run `npm run db:migrate` and `npm run db:seed`. Validate an export without connecting to a database using `npm run db:validate -- path/to/snapshot.json`, then import it with `npm run db:import -- path/to/snapshot.json`. Export the current saved snapshot with `npm run db:export -- path/to/backup.json`; the command refuses to overwrite an existing backup. Every seed/import is stored as a revision in the history table, while the API serves the latest revision. The import/export validates IDs, references, and dates. Use `npm run db:history` to list revisions and `npm run db:restore -- <revision>` to restore one as a new revision. Keep the database URL out of source control and terminal transcripts.

## Before going public

- Replace the synthetic fixture label with a clear “demo data” notice if real-looking data is retained.
- Add a favicon and social preview image.
- Add a privacy-friendly analytics decision, if needed.
- Keep credentials and future API keys out of the static app. Add authentication and role-based access before enabling API writes or connecting live ERP/supplier data; current PostgreSQL imports are CLI-only.

## Platform references

- [Vercel static configuration](https://vercel.com/docs/project-configuration/vercel-json)
- [GitHub Actions workflow syntax](https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions)
- [Render static sites](https://render.com/docs/static-sites)
- [Render Blueprint specification](https://render.com/docs/blueprint-spec)
