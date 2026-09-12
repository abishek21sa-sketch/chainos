import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const requiredFiles = ['index.html', 'styles.css', 'views.css', 'state.css', 'trace.css', 'scenario.css', 'interaction.css', 'status.css', 'status-state.css', 'queue.css', 'app.js', 'data/fixture.json', 'favicon.svg', 'site.webmanifest', 'robots.txt'];
for (const file of requiredFiles) {
  if (!existsSync(join(root, file))) throw new Error(`Missing required file: ${file}`);
}

const html = readFileSync(join(root, 'index.html'), 'utf8');
const fixture = JSON.parse(readFileSync(join(root, 'data/fixture.json'), 'utf8'));
const requiredMarkup = ['detail-drawer', 'secondary-view', 'scenario-modal', 'sync-popover', 'queue-filters'];
for (const marker of requiredMarkup) {
  if (!html.includes(marker)) throw new Error(`Missing required markup: ${marker}`);
}
if (!fixture.shortages?.length) throw new Error('Fixture must contain at least one shortage');
if (!fixture.suppliers?.length || !fixture.purchaseOrders?.length) throw new Error('Fixture must contain suppliers and purchase orders');
console.log(`ChainOS validation passed: ${fixture.suppliers.length} suppliers, ${fixture.purchaseOrders.length} POs, ${fixture.shortages.length} shortage(s).`);
