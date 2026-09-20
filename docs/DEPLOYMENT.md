# ChainOS deployment

ChainOS is a static site today: HTML, CSS, browser JavaScript, and a JSON fixture. It can deploy without a server or database.

## Recommended path

Use Vercel for the first public preview. Connect the GitHub repository, set the project root to the folder containing `index.html`, and deploy. The checked-in `vercel.json` runs `npm test` before publishing the root directory. Vercel supports repository-level static configuration through `vercel.json` and can use `outputDirectory` to define the published output.

Use GitHub Pages when the goal is a simple portfolio URL with no additional hosting account. The workflow in `.github/workflows/deploy-pages.yml` validates the fixture, uploads the repository as a Pages artifact, and deploys on pushes to `main`. In the repository settings, set Pages to “GitHub Actions” after the first workflow run.

Use Render when the project needs a backend. The checked-in `render.yaml` defines both the existing static site and a separate Node API service, so they can deploy independently from the same repository.

## GitHub setup

1. Create a GitHub repository and copy the contents of this `chainos` folder into its repository root.
2. Commit and push the default branch as `main`.
3. In the repository, open **Settings → Pages → Build and deployment → Source** and select **GitHub Actions**. This one-time step initializes the Pages site; otherwise `actions/configure-pages` returns a 404 “Get Pages site failed” error.
4. Re-run `Deploy ChainOS to GitHub Pages` from the Actions tab, or push another commit.
5. Wait for the workflow to complete; it exposes the live URL through the Pages environment.

## Vercel setup

1. Import the GitHub repository into Vercel.
2. Set the project root to the folder containing `vercel.json` if using a monorepo.
3. Keep the build command as `npm test` and the output directory as `.`.
4. Deploy a preview, then promote the production deployment and attach a custom domain if desired.

## Render setup

1. Create or sync a Blueprint from the Git repository.
2. Confirm the root directory is the folder containing `render.yaml`.
3. The Blueprint defines the existing static site and a Node web service named `chainos-api`; the API uses `npm test`, `npm start`, and `/api/health`.
4. After the API service is created, copy its public `onrender.com` URL and set that URL in the `chainos-api-url` meta tag in `index.html`, then redeploy the Vercel frontend.
5. Add custom domains from the Render dashboard when ready.

### Render API service

If you prefer to create the API service manually rather than syncing the Blueprint:

1. Choose **Web Service** rather than **Static Site**.
2. Set the build command to `npm test`.
3. Set the start command to `npm start`.
4. Set the health check path to `/api/health`.
5. The initial endpoints are `/api/health`, `/api/fixture`, and `/api/summary`. Set `CHAINOS_ALLOWED_ORIGIN` to the Vercel site origin before connecting browser requests.

To connect the Vercel frontend, set the `content` value of the `chainos-api-url` meta tag in `index.html` to the Render API service URL. The browser tries that API first and falls back to the local fixture if the service is unavailable.

## Before going public

- Replace the synthetic fixture label with a clear “demo data” notice if real-looking data is retained.
- Add a favicon and social preview image.
- Add a privacy-friendly analytics decision, if needed.
- Keep credentials and future API keys out of the static app; Phase 2 should introduce an API boundary before any live ERP or supplier data is connected.

## Platform references

- [Vercel static configuration](https://vercel.com/docs/project-configuration/vercel-json)
- [GitHub Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows)
- [Render static sites](https://render.com/docs/static-sites)
- [Render Blueprint specification](https://render.com/docs/blueprint-spec)
