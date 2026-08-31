import '../config/env.js';
import { sequelize, User } from '../models/index.js';
import { createChangeRequestService } from '../services/dashboardService.js';

async function runConcurrencyTest() {
  console.log('[test_id_concurrency] Starting 10 simultaneous ticket creations...');
  await sequelize.authenticate();

  const user = await User.findOne({ where: { status: 'Active' } });
  const requesterId = user ? user.id : 'usr-1';

  const promises = Array.from({ length: 10 }).map((_, i) =>
    createChangeRequestService({
      title: `Concurrent Test Ticket #${i + 1}`,
      category: 'Software & Applications',
      subCategory: 'Software Deployment',
      subcategoryId: 'subcat-srv-lc',
      customFieldValues: { actionRequired: 'New Provisioning', cpu: '4 Cores', ram: '16 GB', storage: '100 GB', operatingSystem: 'Ubuntu 22.04', hostingType: 'AWS Cloud' },
      justification: 'Automated concurrency verification test',
      requesterId,
      isDraft: true
    })
  );

  const results = await Promise.all(promises);
  const generatedIds = results.map((cr) => cr.id);

  console.log('[test_id_concurrency] Generated IDs:', generatedIds);

  const uniqueIds = new Set(generatedIds);
  if (uniqueIds.size === generatedIds.length) {
    console.log(`[test_id_concurrency] SUCCESS: All ${generatedIds.length} tickets received unique IDs with ZERO collisions! ✔`);
  } else {
    console.error(`[test_id_concurrency] FAILURE: Detected ID collisions! Unique count: ${uniqueIds.size} vs Total: ${generatedIds.length}`);
    process.exit(1);
  }

  await sequelize.close();
}

runConcurrencyTest().catch((err) => {
  console.error('[test_id_concurrency] ERROR:', err);
  process.exit(1);
});
