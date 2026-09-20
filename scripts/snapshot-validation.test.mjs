import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { assertValidSnapshot, getSnapshotValidationErrors } from '../db/validate-snapshot.mjs';

export function runSnapshotValidationTests(root) {
  const fixture = JSON.parse(readFileSync(`${root}/data/fixture.json`, 'utf8'));
  assert.equal(assertValidSnapshot(fixture), fixture, 'the checked-in fixture should satisfy import validation');
  assert.deepEqual(getSnapshotValidationErrors(null), ['Snapshot root must be a JSON object.']);

  const broken = structuredClone(fixture);
  broken.purchaseOrders[0].supplierId = 'SUPPLIER-MISSING';
  assert.ok(getSnapshotValidationErrors(broken).some((error) => error.includes('reference existing suppliers')));

  const duplicate = structuredClone(fixture);
  duplicate.parts.push({ ...duplicate.parts[0] });
  assert.ok(getSnapshotValidationErrors(duplicate).some((error) => error === 'parts ids must be unique.'));

  const invalidDate = structuredClone(fixture);
  invalidDate.purchaseOrders[0].dueDate = 'not-a-date';
  assert.ok(getSnapshotValidationErrors(invalidDate).some((error) => error.includes('valid dueDate')));

  const nullableQuantity = structuredClone(fixture);
  nullableQuantity.purchaseOrders[0].quantity = null;
  assert.ok(getSnapshotValidationErrors(nullableQuantity).some((error) => error.includes('numeric quantity')));

  const malformedOptionalRow = structuredClone(fixture);
  malformedOptionalRow.demandSignals.push(null);
  assert.ok(getSnapshotValidationErrors(malformedOptionalRow).some((error) => error.includes('entries must be JSON objects')));

  const orphanConstraint = structuredClone(fixture);
  orphanConstraint.constraints[0].scope = 'LINE-NOT-IN-PLANT';
  assert.ok(getSnapshotValidationErrors(orphanConstraint).some((error) => error.includes('existing plant or plant line')));

  const duplicateInventoryPosition = structuredClone(fixture);
  duplicateInventoryPosition.inventoryPositions.push({ ...duplicateInventoryPosition.inventoryPositions[0] });
  assert.ok(getSnapshotValidationErrors(duplicateInventoryPosition).some((error) => error.includes('unique by plant and part')));

  const reversedDemandPeriod = structuredClone(fixture);
  reversedDemandPeriod.demandSignals[0].period = '2025-09-18/2025-09-16';
  assert.ok(getSnapshotValidationErrors(reversedDemandPeriod).some((error) => error.includes('ascending date ranges')));

  const smallValidSnapshot = { workspace: 'Imported Workspace', asOf: '2026-09-20', parts: [{ id: 'P-1', name: 'Part' }], plants: [{ id: 'PL-1', name: 'Plant' }], suppliers: [{ id: 'S-1', name: 'Supplier' }], purchaseOrders: [{ id: 'PO-1', partId: 'P-1', supplierId: 'S-1', quantity: 3, dueDate: '2026-09-21' }], shortages: [] };
  assert.deepEqual(getSnapshotValidationErrors(smallValidSnapshot), [], 'optional empty collections should be accepted');
  console.log('ChainOS snapshot validation tests passed: types, references, unique keys, and date ranges.');
}
