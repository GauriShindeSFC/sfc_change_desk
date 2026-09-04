import '../config/env.js';
import { sequelize, Role, User } from '../models/index.js';
import { roles } from '../data/seed.js';
import { Op } from 'sequelize';

const run = async () => {
  console.log('[syncRoles] connecting to DB...');
  await sequelize.authenticate();
  
  console.log('[syncRoles] updating roles in DB...');
  for (const r of roles) {
    await Role.upsert(r);
    console.log(`  ✓ Synced role ${r.id} (${r.name})`);
  }

  const activeIds = roles.map((r) => r.id);
  const deleted = await Role.destroy({ where: { id: { [Op.notIn]: activeIds } } });
  if (deleted > 0) console.log(`  ✓ Deleted ${deleted} obsolete role(s)`);

  console.log('[syncRoles] DB roles table updated successfully!');
  await sequelize.close();
};

run().catch((err) => {
  console.error('[syncRoles] Error:', err.message);
  process.exit(1);
});
