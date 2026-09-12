# ChainOS roadmap

## Phase 1 — Control-tower foundation (current)

Ship a polished, independently runnable decision surface for one credible material-risk workflow.

- Domain model for parts, BOMs, suppliers, POs, shipments, plants, inventory, demand, lead times, shortages, constraints, and planner actions.
- Small realistic supply-network fixture.
- Control-tower shell and visual language.
- One end-to-end shortage slice with days of supply, affected production, and a recommended action.
- Explicit traceability from supplier commitment to plant impact.

## Phase 2 — Connected planning workspace

- Persisted workspaces and saved views.
- Import adapters for ERP/MRP exports and carrier milestone feeds.
- Material and supplier detail pages with event history.
- Planner action audit trail, approvals, and comments.
- Multi-shortage triage and exception ownership.

## Phase 3 — Scenario and network intelligence

- Multi-echelon inventory and substitution logic.
- Constraint-aware finite scheduling.
- What-if scenarios with side-by-side impact comparison.
- Supplier risk signals, confidence bands, and root-cause explanations.

## Deliberately out of scope for Phase 1

ChainOS does not yet attempt to be a full ERP, global optimizer, supplier portal, or universal logistics connector. Those systems require durable integrations, identity/permissions, domain governance, and a broader test dataset than this slice needs.
