import '../config/env.js';
import { sequelize, ChangeManagerCategory } from '../models/index.js';

const run = async () => {
  console.log('[seedCmCategories] Connecting to DB...');
  await sequelize.authenticate();

  const sampleCmCategories = [
    { id: 'cmc-usr-1-cat-srv', userId: 'usr-1', categoryId: 'cat-srv' },
    { id: 'cmc-usr-1-cat-net', userId: 'usr-1', categoryId: 'cat-net' },
    { id: 'cmc-usr-1-cat-acc', userId: 'usr-1', categoryId: 'cat-acc' },
    { id: 'cmc-usr-1-cat-asset', userId: 'usr-1', categoryId: 'cat-asset' }
  ];

  for (const item of sampleCmCategories) {
    await ChangeManagerCategory.upsert(item);
    console.log(`  ✓ Inserted ${item.id} (user: ${item.userId}, category: ${item.categoryId})`);
  }

  console.log('[seedCmCategories] Done seeding change_manager_categories!');
  await sequelize.close();
};

run().catch((err) => {
  console.error('[seedCmCategories] Error:', err.message);
  process.exit(1);
});
