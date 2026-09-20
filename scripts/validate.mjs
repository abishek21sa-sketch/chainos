import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { runApiTests } from './api.test.mjs';
import { runApiConnectionTests } from './api-connection.test.mjs';
import { runPostgresStoreTests } from './postgres-store.test.mjs';
import { runSnapshotValidationTests } from './snapshot-validation.test.mjs';
import { assertValidSnapshot } from '../db/validate-snapshot.mjs';

const root = process.cwd();
const requiredFiles = ['index.html', 'styles.css', 'views.css', 'state.css', 'trace.css', 'scenario.css', 'interaction.css', 'status.css', 'status-state.css', 'queue.css', 'guide.css', 'guide.js', 'export.js', 'hash-nav.js', 'date-window.css', 'date-window.js', 'assumptions.css', 'assumptions.js', 'activity.css', 'activity-review.css', 'activity-approval.css', 'activity-reset.css', 'activity-export.css', 'activity.js', 'supplier-detail.css', 'supplier-detail.js', 'po-detail.css', 'po-detail.js', 'po-milestones.css', 'material-detail.css', 'material-detail.js', 'fixture-import.css', 'fixture-import.js', 'ownership.css', 'ownership.js', 'saved-views.css', 'saved-views.js', 'comments.css', 'comments.js', 'resolution.css', 'resolution-queue.css', 'resolution.js', 'table-filter.css', 'table-filter.js', 'table-sort.css', 'table-sort.js', 'triage.css', 'triage.js', 'scenario-compare.css', 'scenario-compare.js', 'share-view.css', 'share-view.js', 'offline.css', 'responsive-fix.css', 'pwa.js', 'sw.js', 'app.js', 'server.mjs', 'db/001_workspace_snapshots.sql', 'db/postgres-store.mjs', 'db/pool.mjs', 'db/validate-snapshot.mjs', 'scripts/api.test.mjs', 'scripts/api-connection.test.mjs', 'scripts/postgres-store.test.mjs', 'scripts/snapshot-validation.test.mjs', 'scripts/migrate-database.mjs', 'scripts/seed-database.mjs', 'scripts/import-snapshot.mjs', 'data/fixture.json', 'package-lock.json', '.env.example', 'favicon.svg', 'site.webmanifest', 'robots.txt'];
for (const file of requiredFiles) {
  if (!existsSync(join(root, file))) throw new Error(`Missing required file: ${file}`);
}
for (const file of ['api-connection.js', 'api-connection.css', 'scripts/snapshot-revisions.mjs']) {
  if (!existsSync(join(root, file))) throw new Error(`Missing required file: ${file}`);
}

for (const file of [...requiredFiles.filter((entry) => entry.endsWith('.js') || entry.endsWith('.mjs')), 'api-connection.js', 'scripts/snapshot-revisions.mjs']) {
  try {
    execFileSync(process.execPath, ['--check', join(root, file)], { stdio: 'pipe' });
  } catch (error) {
    const detail = error.stderr?.toString().trim();
    throw new Error(`JavaScript syntax check failed for ${file}${detail ? `: ${detail}` : ''}`);
  }
}

const html = readFileSync(join(root, 'index.html'), 'utf8');
const fixture = JSON.parse(readFileSync(join(root, 'data/fixture.json'), 'utf8'));
const requiredMarkup = ['detail-drawer', 'secondary-view', 'scenario-modal', 'sync-popover', 'queue-filters', 'command-guide', 'date-window-popover', 'date-window-button', 'notification-button'];
for (const marker of requiredMarkup) {
  if (!html.includes(marker)) throw new Error(`Missing required markup: ${marker}`);
}
if (!fixture.shortages?.length) throw new Error('Fixture must contain at least one shortage');
if (!fixture.suppliers?.length || !fixture.purchaseOrders?.length) throw new Error('Fixture must contain suppliers and purchase orders');
assertValidSnapshot(fixture);
const supplierIds = new Set((fixture.suppliers || []).map((supplier) => supplier.id));
const partIds = new Set((fixture.parts || []).map((part) => part.id));
const poIds = new Set((fixture.purchaseOrders || []).map((order) => order.id));
const plantIds = new Set((fixture.plants || []).map((plant) => plant.id));
if ((fixture.purchaseOrders || []).some((order) => !supplierIds.has(order.supplierId) || !partIds.has(order.partId))) throw new Error('Purchase orders must reference existing suppliers and parts');
if ((fixture.shipments || []).some((shipment) => !poIds.has(shipment.purchaseOrderId))) throw new Error('Shipments must reference existing purchase orders');
if ((fixture.shortages || []).some((shortage) => !partIds.has(shortage.partId) || !plantIds.has(shortage.plantId))) throw new Error('Shortages must reference existing parts and plants');
console.log(`ChainOS validation passed: ${fixture.suppliers.length} suppliers, ${fixture.purchaseOrders.length} POs, ${fixture.shortages.length} shortage(s).`);
await runApiTests();
await runApiConnectionTests();
await runPostgresStoreTests();
runSnapshotValidationTests(root);
