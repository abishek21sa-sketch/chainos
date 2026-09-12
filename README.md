# ChainOS — Supply Control Tower

ChainOS is a standalone Phase 1 portfolio prototype for supply-chain planning, materials, logistics, and supplier-risk workflows.

## Run locally

Open `index.html` in a modern browser. No build step, backend, or external service is required.

## Phase 1 slice

The fixture models a small Northstar Mobility network with suppliers, purchase orders, shipments, plants, inventory coverage, and a constrained inverter housing. The UI makes the end-to-end relationship visible:

`Apex Metals → PO-8421 → inbound lane → MAT-2048 → Austin line 2 → 18.4 hours of production exposure`

The planner can open the shortage detail, inspect the impact, and accept/queue the recommended expedite action.

The source fixture is [fixture.json](data/fixture.json). See [DOMAIN_MODEL.md](docs/DOMAIN_MODEL.md) for the model and [ROADMAP.md](docs/ROADMAP.md) for the intentional Phase 1 boundary.

Deployment-ready configs are included for GitHub Pages, Vercel, and Render. See [DEPLOYMENT.md](docs/DEPLOYMENT.md) for the recommended path and setup steps.
