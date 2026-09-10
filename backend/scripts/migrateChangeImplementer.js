import '../config/env.js';
import { sequelize, Role } from '../models/index.js';

export async function migrateChangeImplementer() {
  console.log('[Migration] Running migrateChangeImplementer...');

  // 1. Ensure role-5 exists in roles table
  await sequelize.query(`
    INSERT INTO roles (id, name, description, permissions)
    VALUES (
      'role-5',
      'Change Implementer',
      'Technical execution and implementation oversight for approved change requests in assigned categories.',
      '["Implement Approved CRs", "View Assigned Category Worklist", "View Worklist & Metrics"]'::jsonb
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      permissions = EXCLUDED.permissions;
  `);
  console.log('  ✓ Upserted role-5 (Change Implementer) in roles table');

  // 2. Create change_implementer_categories table if not exists
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS change_implementer_categories (
      id VARCHAR(255) PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL,
      category_id VARCHAR(255) NOT NULL REFERENCES catalog_categories(id) ON DELETE CASCADE
    );
  `);
  console.log('  ✓ Ensured change_implementer_categories table exists');

  // 3. Create unique index on (user_id, category_id)
  await sequelize.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS change_implementer_categories_user_category_unique
    ON change_implementer_categories (user_id, category_id);
  `);
  console.log('  ✓ Ensured unique index on (user_id, category_id)');

  console.log('[Migration] migrateChangeImplementer completed successfully.');
}

if (process.argv[1] && process.argv[1].includes('migrateChangeImplementer')) {
  migrateChangeImplementer()
    .then(() => {
      console.log('Migration finished.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
