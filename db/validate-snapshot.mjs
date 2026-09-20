const requiredArrays = ['parts', 'plants', 'suppliers', 'purchaseOrders', 'shortages'];
const optionalArrays = ['boms', 'shipments', 'inventoryPositions', 'demandSignals', 'leadTimes', 'constraints', 'plannerActions'];
const idCollections = ['parts', 'plants', 'suppliers', 'purchaseOrders', 'shipments', 'shortages', 'constraints', 'plannerActions', 'boms'];

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isDate(value) {
  return hasText(value) && !Number.isNaN(Date.parse(value));
}

function isNonNegativeNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function hasUniqueCompositeRows(rows, fields) {
  const keys = rows.map((row) => fields.map((field) => String(row[field] ?? '')).join('\u0000'));
  return new Set(keys).size === keys.length;
}

export function getSnapshotValidationErrors(snapshot) {
  const errors = [];
  if (!isRecord(snapshot)) return ['Snapshot root must be a JSON object.'];
  if (!hasText(snapshot.workspace)) errors.push('workspace is required.');
  if (!isDate(snapshot.asOf)) errors.push('asOf must be a valid date string.');

  for (const key of requiredArrays) {
    if (!Array.isArray(snapshot[key])) errors.push(`${key} must be an array.`);
  }
  for (const key of optionalArrays) {
    if (snapshot[key] !== undefined && !Array.isArray(snapshot[key])) errors.push(`${key} must be an array when provided.`);
  }
  if (errors.some((error) => error.includes('must be an array'))) return errors;

  const collections = [...requiredArrays, ...optionalArrays];
  for (const key of collections) {
    if ((snapshot[key] || []).some((entry) => !isRecord(entry))) errors.push(`${key} entries must be JSON objects.`);
  }
  if (errors.some((error) => error.includes('entries must be JSON objects'))) return errors;

  for (const collection of idCollections) {
    const rows = snapshot[collection] || [];
    if (rows.some((entry) => !hasText(entry.id))) errors.push(`Every ${collection} entry needs a string id.`);
    const ids = rows.map((entry) => entry.id).filter(hasText);
    if (new Set(ids).size !== ids.length) errors.push(`${collection} ids must be unique.`);
  }

  for (const collection of ['parts', 'plants', 'suppliers']) {
    if (snapshot[collection].some((entry) => !hasText(entry.name))) errors.push(`Every ${collection.slice(0, -1)} needs a name.`);
  }
  if (snapshot.purchaseOrders.some((entry) => !hasText(entry.partId) || !hasText(entry.supplierId) || !isNonNegativeNumber(entry.quantity))) {
    errors.push('Every purchase order needs part/supplier ids and a non-negative numeric quantity.');
  }
  if (snapshot.purchaseOrders.some((entry) => !isDate(entry.dueDate))) errors.push('Every purchase order needs a valid dueDate string.');
  if (snapshot.shortages.some((entry) => !hasText(entry.partId) || !hasText(entry.plantId) || !isNonNegativeNumber(entry.daysOfSupply) || !isNonNegativeNumber(entry.affectedHours))) {
    errors.push('Every shortage needs part/plant ids and non-negative numeric daysOfSupply and affectedHours.');
  }
  if (snapshot.shortages.some((entry) => entry.breachAt !== undefined && !isDate(entry.breachAt))) errors.push('Every shortage breachAt must be a valid date string.');

  const ids = Object.fromEntries(idCollections.map((key) => [key, new Set((snapshot[key] || []).map((entry) => entry.id).filter(hasText))]));
  if (snapshot.purchaseOrders.some((entry) => !ids.suppliers.has(entry.supplierId) || !ids.parts.has(entry.partId))) errors.push('Purchase orders must reference existing suppliers and parts.');
  if ((snapshot.shipments || []).some((entry) => !hasText(entry.purchaseOrderId) || !ids.purchaseOrders.has(entry.purchaseOrderId))) errors.push('Shipments must reference existing purchase orders.');
  if ((snapshot.shipments || []).some((entry) => entry.eta !== undefined && !isDate(entry.eta))) errors.push('Shipment eta values must be valid date strings.');
  if (snapshot.shortages.some((entry) => !ids.parts.has(entry.partId) || !ids.plants.has(entry.plantId))) errors.push('Shortages must reference existing parts and plants.');

  const boms = snapshot.boms || [];
  if (boms.some((entry) => !ids.parts.has(entry.parentPartId) || !ids.parts.has(entry.componentPartId) || !isNonNegativeNumber(entry.quantityPer) || entry.quantityPer === 0)) {
    errors.push('BOM rows must reference existing parts and have a positive numeric quantityPer.');
  }
  const lineIds = new Set((snapshot.plants || []).flatMap((plant) => Array.isArray(plant.lines) ? plant.lines.map((line) => line?.id).filter(hasText) : []));
  if ((snapshot.plants || []).some((plant) => plant.lines !== undefined && (!Array.isArray(plant.lines) || plant.lines.some((line) => !isRecord(line) || !hasText(line.id))))) {
    errors.push('Plant lines must be objects with string ids.');
  }
  if ((snapshot.constraints || []).some((entry) => !hasText(entry.scope) || (!ids.plants.has(entry.scope) && !lineIds.has(entry.scope)))) {
    errors.push('Constraints must reference an existing plant or plant line.');
  }
  if ((snapshot.constraints || []).some((entry) => !isNonNegativeNumber(entry.capacity) || !isNonNegativeNumber(entry.consumed))) {
    errors.push('Constraints need non-negative numeric capacity and consumed values.');
  }

  const inventory = snapshot.inventoryPositions || [];
  if (inventory.some((entry) => !ids.parts.has(entry.partId) || !ids.plants.has(entry.plantId))) errors.push('Inventory positions must reference existing parts and plants.');
  if (inventory.some((entry) => !isNonNegativeNumber(entry.onHand) || !isNonNegativeNumber(entry.allocated) || !isNonNegativeNumber(entry.safetyStock))) {
    errors.push('Inventory positions need non-negative numeric onHand, allocated, and safetyStock values.');
  }
  if (inventory.some((entry) => entry.asOf !== undefined && !isDate(entry.asOf))) errors.push('Inventory position asOf values must be valid date strings.');
  if (!hasUniqueCompositeRows(inventory, ['plantId', 'partId'])) errors.push('Inventory positions must be unique by plant and part.');

  const demand = snapshot.demandSignals || [];
  if (demand.some((entry) => !ids.parts.has(entry.partId) || !ids.plants.has(entry.plantId))) errors.push('Demand signals must reference existing parts and plants.');
  if (demand.some((entry) => !isNonNegativeNumber(entry.quantity))) errors.push('Demand signals need a non-negative numeric quantity.');
  if (demand.some((entry) => {
    const [start, end, extra] = String(entry.period || '').split('/');
    return extra !== undefined || !isDate(start) || !isDate(end) || Date.parse(start) > Date.parse(end);
  })) errors.push('Demand signal periods must be valid ascending date ranges.');
  if (!hasUniqueCompositeRows(demand, ['plantId', 'partId', 'period'])) errors.push('Demand signals must be unique by plant, part, and period.');

  const leadTimes = snapshot.leadTimes || [];
  if (leadTimes.some((entry) => !ids.suppliers.has(entry.supplierId) || !ids.parts.has(entry.partId))) errors.push('Lead times must reference existing suppliers and parts.');
  if (leadTimes.some((entry) => !isNonNegativeNumber(entry.nominalDays) || !isNonNegativeNumber(entry.p95Days) || entry.p95Days < entry.nominalDays)) {
    errors.push('Lead times need non-negative nominalDays and p95Days, with p95Days at least nominalDays.');
  }
  if (!hasUniqueCompositeRows(leadTimes, ['supplierId', 'partId', 'mode'])) errors.push('Lead times must be unique by supplier, part, and mode.');

  if ((snapshot.plannerActions || []).some((entry) => !hasText(entry.shortageId) || !ids.shortages.has(entry.shortageId) || !hasText(entry.type))) {
    errors.push('Planner actions must have a type and reference an existing shortage.');
  }

  return errors;
}

export function assertValidSnapshot(snapshot) {
  const errors = getSnapshotValidationErrors(snapshot);
  if (errors.length) throw new Error(errors.slice(0, 5).join(' '));
  return snapshot;
}
