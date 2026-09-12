# ChainOS domain model — Phase 1

The model is intentionally small and event-friendly. IDs are stable across fixtures so a planner can trace one material signal through supply, logistics, inventory, and production impact.

## Core entities

| Entity | Purpose | Phase 1 fields |
| --- | --- | --- |
| Part | A material, component, or finished good | `id`, `partNumber`, `name`, `category`, `unit`, `criticality` |
| BOM | Parent/child material relationship | `id`, `parentPartId`, `componentPartId`, `quantityPer`, `operation` |
| Supplier | External source of material | `id`, `name`, `region`, `reliabilityScore`, `status` |
| PurchaseOrder | Commercial commitment for a part | `id`, `supplierId`, `partId`, `quantity`, `dueDate`, `status` |
| Shipment | Physical movement tied to a PO | `id`, `purchaseOrderId`, `mode`, `origin`, `destination`, `eta`, `status` |
| Plant | Production location | `id`, `name`, `region`, `lines`, `calendar` |
| InventoryPosition | On-hand and projected availability | `plantId`, `partId`, `onHand`, `allocated`, `safetyStock`, `asOf` |
| DemandSignal | Planned consumption | `plantId`, `partId`, `period`, `quantity`, `source` |
| LeadTime | Expected replenishment duration | `supplierId`, `partId`, `mode`, `nominalDays`, `p95Days` |
| Shortage | Derived risk signal | `partId`, `plantId`, `breachAt`, `daysOfSupply`, `severity`, `affectedHours` |
| Constraint | A finite resource or rule that limits a plan | `id`, `scope`, `type`, `capacity`, `consumed`, `window` |
| PlannerAction | A proposed or accepted intervention | `id`, `shortageId`, `type`, `costDelta`, `impactHours`, `status` |

## Relationship shape

```text
Supplier ──< PurchaseOrder ──< Shipment
     │             │
     └──< LeadTime │
                   ▼
Part ──< BOM >── Part ──< DemandSignal >── Plant
  │                                  │
  └──< InventoryPosition >──────────┘
                   │
                   ▼
             Shortage ──< PlannerAction
                   │
                   └── Constraint
```

## Derived calculations

### Days of supply

`daysOfSupply = usableOnHand / averageDailyDemand`

For the fixture, MAT-2048 has 432 usable housings and an average daily demand of 240, yielding 1.8 days of cover. The safety floor is 2.0 days.

### Affected production

The first production impact is the earliest period where projected available inventory falls below the BOM requirement plus safety stock. `affectedHours` is then derived from the constrained line's units-per-shift and available shift calendar.

### Recommendation fit

The Phase 1 recommendation ranks a small set of actions using safety-floor recovery, time-to-impact, cost delta, and whether the action can be performed against an existing open PO. It is a transparent heuristic, not a global optimizer.

## Fixture IDs

- `PART-MAT-2048` — inverter housing
- `SUP-APEX-01` — Apex Metals
- `PO-8421` — 1,200 housings due Sep 18
- `SHP-8421` — truck lane, Austin destination
- `PLANT-AUS-01` — Northstar Austin
- `SHORT-2048-AUS` — 1.8-day-cover shortage
- `ACT-EXPEDITE-8421` — proposed air-freight expedite
