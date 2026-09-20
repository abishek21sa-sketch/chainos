# ChainOS — Supply Control Tower

ChainOS is a supply-chain planning prototype with a static control-tower frontend, optional Node API, and optional PostgreSQL-backed workspace snapshots.

## Run locally

Open `index.html` in a modern browser. No build step, backend, or external service is required.

To run the optional API locally, use Node.js 22.9 or newer, install dependencies with `npm ci`, and start it with `npm start`. Without `DATABASE_URL`, it serves the bundled fixture. To enable PostgreSQL persistence, copy `.env.example` to `.env`, set a database URL, then run `npm run db:migrate` and `npm run db:seed` before `npm start`. Import a validated workspace snapshot with `npm run db:import -- path/to/snapshot.json`; list and restore saved revisions with `npm run db:history` and `npm run db:restore -- <revision>`. To point the browser app at an API, open **Data Health → Optional API Source** and enter its HTTPS origin; the URL is saved in that browser only.

## Phase 1 slice

The fixture models a small Northstar Mobility network with suppliers, purchase orders, shipments, plants, inventory coverage, and a constrained inverter housing. The UI makes the end-to-end relationship visible:

`Apex Metals → PO-8421 → inbound lane → MAT-2048 → Austin line 2 → 18.4 hours of production exposure`

The planner can open the shortage detail, inspect the impact, and accept/queue the recommended expedite action. Browser-only planner state remains local; database imports are currently an admin CLI workflow, with authenticated collaboration and live integrations still ahead.

The source fixture is [fixture.json](data/fixture.json). See [DOMAIN_MODEL.md](docs/DOMAIN_MODEL.md) for the model and [ROADMAP.md](docs/ROADMAP.md) for the intentional Phase 1 boundary.

Deployment-ready configs are included for GitHub Pages, Vercel, and Render. See [DEPLOYMENT.md](docs/DEPLOYMENT.md) for the recommended path and setup steps.
