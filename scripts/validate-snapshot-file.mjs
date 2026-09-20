import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { assertValidSnapshot } from '../db/validate-snapshot.mjs';

const inputPath = process.argv[2];
if (!inputPath) throw new Error('Usage: npm run db:validate -- path/to/snapshot.json');

let snapshot;
try {
  snapshot = JSON.parse(readFileSync(resolve(inputPath), 'utf8'));
} catch (error) {
  throw new Error(`Could not read a valid JSON snapshot: ${error.message}`);
}

assertValidSnapshot(snapshot);
const counts = ['parts', 'boms', 'suppliers', 'purchaseOrders', 'shipments', 'plants', 'inventoryPositions', 'demandSignals', 'leadTimes', 'shortages', 'constraints', 'plannerActions']
  .map((key) => `${key}=${snapshot[key]?.length || 0}`)
  .join(', ');
console.log(`Snapshot valid: ${snapshot.workspace} · ${counts}`);
