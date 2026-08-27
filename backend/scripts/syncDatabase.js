// ────────────────────────────────────────────────────────────────
//  DB sync: connect, create every table, seed it.
//
//    npm run db:sync          -> create tables if missing, seed empty ones
//    npm run db:sync:force    -> DROP and recreate every table, then seed
//    node scripts/syncDatabase.js --alter   -> ALTER tables to match models
// ────────────────────────────────────────────────────────────────
import '../config/env.js';
import { sequelize, models } from '../models/index.js';
import { seedDatabase } from '../data/seed.js';

const args = process.argv.slice(2);
const force = args.includes('--force');
const alter = args.includes('--alter');

const run = async () => {
  console.log(`[db:sync] connecting to ${new URL(process.env.DATABASE_URI).host} ...`);
  await sequelize.authenticate();
  console.log('[db:sync] connection OK');

  const mode = force ? 'force (drop + recreate)' : alter ? 'alter' : 'safe (create if missing)';
  console.log(`[db:sync] syncing ${Object.keys(models).length} models — mode: ${mode}`);
  await sequelize.sync({ force, alter });
  console.log('[db:sync] tables synced');

  const results = await seedDatabase({ force });
  for (const r of results) {
    console.log(
      `  • ${r.table.padEnd(22)} ${r.skipped ? 'skipped (already populated)' : `seeded ${r.inserted} row(s)`}`
    );
  }

  await sequelize.close();
  console.log('[db:sync] done ✔');
};

run().catch(async (err) => {
  console.error('[db:sync] FAILED:', err.message);
  console.error(err);
  try {
    await sequelize.close();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
